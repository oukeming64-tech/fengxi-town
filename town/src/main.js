(function () {
  const T = window.MorningTown;
  const engine = T.engine;
  const ui = T.ui;
  const llm = T.llm;

  let running = false;

  function setBusy(value) {
    [ui.el.resetBtn, ui.el.advanceBtn, ui.el.modelConfigBtn, ui.el.advanceSelect,
      ui.el.seasonSelect, ui.el.sceneSelect, ui.el.modelSelect].forEach((control) => {
      if (control) control.disabled = value;
    });
  }

  function useResidentAI() {
    return ui.el.modelSelect.value === "model";
  }

  function apiKeyInputs() {
    return [ui.el.apiKeyInput1, ui.el.apiKeyInput2, ui.el.apiKeyInput3, ui.el.apiKeyInput4].filter(Boolean);
  }

  function readApiKeys() {
    return apiKeyInputs()
      .map((input) => input.value.trim())
      .filter(Boolean);
  }

  function clearApiKeyInputs() {
    apiKeyInputs().forEach((input) => {
      input.value = "";
    });
  }

  async function configureModel() {
    ui.openModelConfig();
    await llm.loadConfig();
    ui.render();
  }

  async function advanceSelectedDays() {
    if (running) return;
    if (T.modelTransport.direct && useResidentAI() && !llm.config?.hasKey) {
      await configureModel();
      return;
    }
    running = true;
    setBusy(true);
    try {
      const days = Number(ui.el.advanceSelect.value) || 1;
      if (llm && useResidentAI()) {
        for (let i = 0; i < days; i += 1) {
          const decision = llm.generateActionPlan();
          ui.render();
          const planned = await decision;
          if (!planned && T.modelTransport.direct) break;
          engine.advanceDays(1);
          const dialogue = llm.generateInteractions();
          ui.render();
          await dialogue;
        }
      } else {
        engine.advanceDays(days);
      }
      ui.render();
      ui.openPendingStageRecap?.();
    } finally {
      running = false;
      setBusy(false);
    }
  }

  ui.el.resetBtn.addEventListener("click", () => {
    engine.reset();
    if (llm) llm.resetStatus();
    ui.render();
  });

  ui.el.advanceBtn.addEventListener("click", advanceSelectedDays);

  ui.el.sceneSelect?.addEventListener("change", () => {
    ui.render();
  });

  ui.el.seasonSelect.addEventListener("change", () => {
    engine.reset();
    if (llm) llm.resetStatus();
    ui.render();
  });

  ui.el.modelSelect.addEventListener("change", () => {
    if (!useResidentAI() && llm) llm.resetStatus();
    ui.render();
    if (T.modelTransport.direct && useResidentAI() && !llm.config?.hasKey) configureModel();
  });

  ui.el.modelConfigBtn?.addEventListener("click", configureModel);

  ui.el.saveModelConfigBtn?.addEventListener("click", async () => {
    if (!llm) return;
    const apiKeys = readApiKeys();
    const config = {
      provider: ui.el.providerSelect.value,
      model: ui.el.modelNameInput.value,
      endpoint: ui.el.modelEndpointInput.value
    };
    if (apiKeys.length) config.apiKeys = apiKeys;
    const saved = await llm.saveConfig(config);
    clearApiKeyInputs();
    if (saved?.hasKey && T.modelTransport.direct) ui.closeModelConfig();
    ui.render();
  });

  ui.el.clearSessionKeyBtn?.addEventListener("click", async () => {
    if (!llm) return;
    await llm.saveConfig({
      provider: ui.el.providerSelect.value,
      model: ui.el.modelNameInput.value,
      endpoint: ui.el.modelEndpointInput.value,
      clearSessionKey: true
    });
    clearApiKeyInputs();
    ui.render();
  });

  ui.el.providerSelect?.addEventListener("change", () => {
    const provider = llm?.config?.providers?.find((item) => item.id === ui.el.providerSelect.value);
    if (provider) {
      ui.el.modelNameInput.value = provider.model || "";
      ui.el.modelEndpointInput.value = provider.endpoint || "";
    }
  });

  if (T.modelTransport.direct) {
    document.querySelectorAll("[data-local-config]").forEach((field) => { field.hidden = true; });
    document.getElementById("modelConfigIntro").textContent = "Jev 安排居民的一天，DeepSeek 写对白。推进会使用你自己的 OpenRouter 额度。";
    document.getElementById("firstKeyLabel").textContent = "OpenRouter key";
    ui.el.apiKeyInput1.placeholder = "仅在当前标签页有效";
  }
  engine.reset();
  ui.render();
}());
