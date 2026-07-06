(function () {
  const T = window.MorningTown;
  const engine = T.engine;
  const ui = T.ui;
  const llm = T.llm;

  let running = false;

  function setBusy(value) {
    [ui.el.resetBtn, ui.el.advanceBtn, ui.el.modelConfigBtn].forEach((button) => {
      if (!button) return;
      button.disabled = value;
    });
  }

  function shouldUseModelText() {
    return ui.el.modelSelect.value === "model";
  }

  function shouldUseModelActionControl() {
    return localStorage.getItem("morningTownModelActionControl") !== "0";
  }

  function apiKeyInputs() {
    return [ui.el.apiKeyInput1, ui.el.apiKeyInput2, ui.el.apiKeyInput3, ui.el.apiKeyInput4].filter(Boolean);
  }

  function keyConfigInputs() {
    return [1, 2, 3, 4].map((index) => ({
      key: ui.el[`apiKeyInput${index}`],
      model: ui.el[`slotModelInput${index}`],
      endpoint: ui.el[`slotEndpointInput${index}`]
    })).filter((slot) => slot.key);
  }

  function readKeyConfigs() {
    const fallbackModel = ui.el.modelNameInput.value.trim();
    const fallbackEndpoint = ui.el.modelEndpointInput.value.trim();
    return keyConfigInputs()
      .map((slot) => ({
        provider: ui.el.providerSelect.value,
        model: slot.model?.value.trim() || fallbackModel,
        endpoint: slot.endpoint?.value.trim() || fallbackEndpoint,
        apiKey: slot.key.value.trim()
      }))
      .filter((slot) => slot.apiKey);
  }

  function clearApiKeyInputs() {
    apiKeyInputs().forEach((input) => {
      input.value = "";
    });
  }

  async function runAction(action) {
    if (running) return;
    running = true;
    setBusy(true);
    try {
      if (llm && shouldUseModelText() && shouldUseModelActionControl()) {
        const actionTask = llm.generateActionPlan();
        ui.render();
        await actionTask;
      }
      action();
      ui.render();
      if (llm && shouldUseModelText()) {
        const task = llm.generateInteractions ? llm.generateInteractions() : llm.generateLatest();
        ui.render();
        await task;
      }
      ui.render();
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

  ui.el.advanceBtn.addEventListener("click", () => {
    runAction(() => engine.advanceDays(ui.el.advanceSelect.value));
  });

  ui.el.sceneSelect.addEventListener("change", () => {
    ui.render();
  });

  ui.el.seasonSelect.addEventListener("change", () => {
    engine.reset();
    if (llm) llm.resetStatus();
    ui.render();
  });

  ui.el.modelSelect.addEventListener("change", () => {
    if (!shouldUseModelText() && llm) llm.resetStatus();
    ui.render();
  });

  ui.el.modelConfigBtn?.addEventListener("click", async () => {
    ui.openModelConfig();
    if (llm) {
      await llm.loadConfig();
      ui.render();
    }
  });

  ui.el.saveModelConfigBtn?.addEventListener("click", async () => {
    if (!llm) return;
    const keyConfigs = readKeyConfigs();
    const config = {
      provider: ui.el.providerSelect.value,
      model: ui.el.modelNameInput.value,
      endpoint: ui.el.modelEndpointInput.value
    };
    if (keyConfigs.length) config.keyConfigs = keyConfigs;
    await llm.saveConfig(config);
    clearApiKeyInputs();
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

  engine.reset();
  ui.render();
}());
