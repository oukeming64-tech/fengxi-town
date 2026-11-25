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
    actionAudit: null,
    actionError: ""
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
      const result = await T.modelTransport.request("config", state.configEndpoint);
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
      const result = await T.modelTransport.request("config", state.configEndpoint, config || {});
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
      const result = await T.modelTransport.request("text", state.endpoint, payload);

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
    state.status = "Jev 安排今日行动中";
    state.actionError = "";
    state.lastError = "";

    try {
      const result = await T.modelTransport.request("actions", state.actionEndpoint, payload);

      const control = T.modelActionProposals?.applyToEngine?.(engine, result.actionPlan, result.actionAudit || result.audit) || null;
      state.actionControl = control;
      state.actionAudit = control?.audit || result.actionAudit || result.audit || null;
      state.config = result.config || state.config;
      state.status = control?.audit?.accepted ? "已安排" : "本地";
      return Boolean(control);
    } catch (error) {
      state.actionError = state.lastError = error.message || "model_action_control_failed";
      state.status = !T.modelTransport.direct ? "本地"
        : (/401|403/.test(state.actionError) ? "请检查 OpenRouter key 权限"
          : /402/.test(state.actionError) ? "OpenRouter 额度不足" : "Jev 未完成，请重试");
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
    const payload = T.jevDay.dialoguePayload(engine);
    const eventIds = payload.logs.map((log) => log.id);
    const previous = (state.shadow?.conversations || []).filter((c) => eventIds.includes(c.id));
    state.shadow = previous.length ? { ...state.shadow, conversations: previous } : null;
    state.audit = null;
    T.jevDay.attachDialogue(engine, previous);
    if (!payload.logs.length) {
      state.status = state.actionError ? "本地" : "当天无对白";
      return false;
    }

    state.busy = true;
    state.status = "撰写对白中";
    state.lastError = state.actionError;

    try {
      const result = await T.modelTransport.request("interactions", state.interactionEndpoint, payload);

      const fresh = validateShadow(result.shadow);
      archiveShadowConversations(fresh, eventIds);
      const displayed = new Map(previous.map((c) => [c.id, c]));
      for (const c of fresh?.conversations || []) displayed.set(c.id, c);
      if (displayed.size) state.shadow = { ...fresh, conversations: [...displayed.values()] };
      T.jevDay.attachDialogue(engine, state.shadow?.conversations || []);
      state.audit = result.audit || null;
      state.config = result.config || state.config;
      if (fresh) {
        state.status = state.actionError ? "本地行动 · 有新对话" : "有新对话";
        return true;
      }
      if (state.audit?.parseError) state.lastError = state.audit.parseError;
      state.status = previous.length ? "对白未更新" : (state.actionError ? "本地" : "当天无对白");
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
    state.actionError = "";
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
