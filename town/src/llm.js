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

  function applyLogs(logs) {
    if (!Array.isArray(logs)) return;
    const byId = new Map(logs
      .filter((log) => log && typeof log.id === "string" && typeof log.text === "string")
      .map((log) => [log.id, log.text.trim()]));

    [engine.state.displayLogs, engine.state.dailyLogs, engine.state.allLogs].forEach((list) => {
      list.forEach((log) => {
        const text = byId.get(log.id);
        if (text) {
          if (!log.localText) log.localText = log.text;
          log.text = text;
          log.polished = true;
        }
      });
    });
  }

  function applyReport(sections) {
    const report = engine.state.lastReport;
    if (!report || !Array.isArray(sections)) return;

    sections.forEach((section) => {
      const index = Number(section?.index);
      const target = report.sections[index];
      if (!target) return;

      if (typeof section.title === "string" && section.title.trim()) {
        target.title = section.title.trim();
      }

      if (Array.isArray(target.list) && Array.isArray(section.list)) {
        const list = section.list.map((item) => String(item).trim()).filter(Boolean);
        if (list.length) target.list = list;
        return;
      }

      if (typeof section.body === "string" && section.body.trim()) {
        target.body = section.body.trim();
      }
    });
  }

  function residentExists(id) {
    return engine.state.villagers.some((villager) => villager.id === id);
  }

  function validateShadow(shadow) {
    if (!shadow || typeof shadow !== "object") return null;
    const conversations = Array.isArray(shadow.conversations)
      ? shadow.conversations.filter((conversation) => {
        const ids = conversation.residentIds || [];
        const lines = conversation.lines || [];
        return ids.length >= 2
          && ids.every(residentExists)
          && lines.length >= 2
          && lines.every((line) => residentExists(line.speakerId) && line.text);
      }).slice(0, 4)
      : [];
    const weeklyReport = shadow.weeklyReport && typeof shadow.weeklyReport === "object"
      ? {
        weekId: shadow.weeklyReport.weekId || engine.latestWeekSnapshot?.()?.weekId || "",
        title: shadow.weeklyReport.title || "互动周报",
        range: shadow.weeklyReport.range || "",
        sections: Array.isArray(shadow.weeklyReport.sections) ? shadow.weeklyReport.sections.slice(0, 4) : [],
        hooks: Array.isArray(shadow.weeklyReport.hooks) ? shadow.weeklyReport.hooks.slice(0, 5) : []
      }
      : null;
    const riskNotes = Array.isArray(shadow.riskNotes) ? shadow.riskNotes.slice(0, 5) : [];
    if (!conversations.length && !weeklyReport?.sections?.length && !riskNotes.length) return null;
    return { conversations, weeklyReport, riskNotes };
  }

  function archiveShadowConversations(shadow) {
    if (!shadow?.conversations?.length) return;
    const completedDay = Number(engine.state.lastReport?.day) || Math.max(1, Number(engine.state.day) - 1);
    T.stageRecapData?.archiveModelConversations?.(engine.state, shadow.conversations, completedDay);
  }

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
