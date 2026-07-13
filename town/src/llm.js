(function () {
  const T = window.MorningTown;
  const engine = T.engine;
  const payloads = T.llmPayloads;
  if (!payloads) throw new Error("llm-payloads.js must load before llm.js");

  const state = {
    endpoint: localStorage.getItem("morningTownApi") || "http://127.0.0.1:8787/api/town-text",
    actionEndpoint: localStorage.getItem("morningTownActionApi") || "http://127.0.0.1:8787/api/town-actions",
    interactionEndpoint: localStorage.getItem("morningTownInteractionApi") || "http://127.0.0.1:8787/api/town-interactions",
    configEndpoint: localStorage.getItem("morningTownConfigApi") || "http://127.0.0.1:8787/api/config",
    status: "本地",
    lastError: "",
    busy: false,
    config: null,
    shadow: null,
    audit: null,
    actionControl: null,
    actionAudit: null
  };

  if (!T.llmResultApplier?.create) throw new Error("llm-result-applier must load before llm");
  const { applyLogs, applyReport, validateShadow, archiveShadowConversations } = T.llmResultApplier.create(engine);

  function keyStatusLabel(config) {
    const count = Number(config?.keyCount || 0);
    const suffix = count > 1 ? ` x${count}` : "";
    if (config?.keySource === "environment+session") return `环境+页面 key${suffix}`;
    return config?.keySource === "environment" ? `环境 key${suffix}` : `页面 key${suffix}`;
  }

  async function loadConfig() {
    try {
      const response = await fetch(state.configEndpoint);
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "config_failed");
      state.config = result.config || null;
      if (state.config?.hasKey) {
        state.status = keyStatusLabel(state.config);
      }
      return state.config;
    } catch (error) {
      state.lastError = error.message || "config_failed";
      return null;
    }
  }

  async function saveConfig(config) {
    state.busy = true;
    state.lastError = "";
    try {
      const response = await fetch(state.configEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config || {})
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "config_failed");
      state.config = result.config || null;
      state.status = state.config?.hasKey ? keyStatusLabel(state.config) : "缺少 key";
      return state.config;
    } catch (error) {
      state.lastError = error.message || "config_failed";
      state.status = "配置失败";
      return null;
    } finally {
      state.busy = false;
    }
  }

  async function generateLatest() {
    if (state.busy) return false;
    const payload = payloads.buildShadowPayload(engine);
    if (!payload.logs.length && !payload.report) return false;

    state.busy = true;
      state.status = "整理文本中";
    state.lastError = "";

    try {
      const response = await fetch(state.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "model_shadow_failed");
      }

      applyLogs(result.logs);
      applyReport(result.reportSections);
      state.shadow = validateShadow(result.shadow);
      archiveShadowConversations(state.shadow);
      state.audit = result.audit || null;
      state.config = result.config || state.config;
      state.status = "文本已整理";
      return true;
    } catch (error) {
      state.status = "本地";
      state.lastError = error.message || "model_shadow_failed";
      return false;
    } finally {
      state.busy = false;
    }
  }

  async function generateActionPlan() {
    if (state.busy) return false;
    const payload = payloads.buildActionPayload(engine);
    if (!payload.residents?.length) return false;

    state.busy = true;
    state.status = "安排明日中";
    state.lastError = "";

    try {
      const response = await fetch(state.actionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "model_action_control_failed");
      }

      const control = T.modelActionProposals?.applyToEngine?.(engine, result.actionPlan, result.actionAudit || result.audit) || null;
      state.actionControl = control;
      state.actionAudit = control?.audit || result.actionAudit || result.audit || null;
      state.config = result.config || state.config;
      state.status = control?.audit?.accepted ? "已安排" : "本地";
      return Boolean(control);
    } catch (error) {
      state.status = "本地";
      state.lastError = error.message || "model_action_control_failed";
      T.modelActionProposals?.clear?.(engine);
      state.actionControl = null;
      state.actionAudit = null;
      return false;
    } finally {
      state.busy = false;
    }
  }

  async function generateInteractions() {
    if (state.busy) return false;
    const payload = payloads.buildInteractionPayload(engine);
    if (!payload.logs.length) return false;

    state.busy = true;
    state.status = "整理对话中";
    state.lastError = "";
    state.shadow = null;

    try {
      const response = await fetch(state.interactionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "model_interaction_failed");
      }

      state.shadow = validateShadow(result.shadow);
      archiveShadowConversations(state.shadow);
      state.audit = result.audit || null;
      state.config = result.config || state.config;
      if (state.shadow) {
        state.status = "有新对话";
        return true;
      }
      if (state.audit?.parseError) state.lastError = state.audit.parseError;
      state.status = "本地";
      return false;
    } catch (error) {
      state.status = "本地";
      state.lastError = error.message || "model_interaction_failed";
      return false;
    } finally {
      state.busy = false;
    }
  }

  function resetStatus() {
    state.status = "本地";
    state.lastError = "";
    state.busy = false;
    state.shadow = null;
    state.audit = null;
    state.actionControl = null;
    state.actionAudit = null;
    T.modelActionProposals?.clear?.(engine);
  }

  T.llm = {
    get endpoint() {
      return state.endpoint;
    },
    get actionEndpoint() {
      return state.actionEndpoint;
    },
    get interactionEndpoint() {
      return state.interactionEndpoint;
    },
    get configEndpoint() {
      return state.configEndpoint;
    },
    get status() {
      return state.status;
    },
    get lastError() {
      return state.lastError;
    },
    get busy() {
      return state.busy;
    },
    get config() {
      return state.config;
    },
    get shadow() {
      return state.shadow;
    },
    get audit() {
      return state.audit;
    },
    get actionControl() {
      return state.actionControl;
    },
    get actionAudit() {
      return state.actionAudit;
    },
    loadConfig,
    saveConfig,
    generateActionPlan,
    generateInteractions,
    generateLatest,
    polishLatest: generateLatest,
    resetStatus
  };
}());
