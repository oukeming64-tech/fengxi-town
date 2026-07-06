(function () {
  const T = window.MorningTown;
  const engine = T.engine;

  const el = {
    dayLabel: document.getElementById("dayLabel"),
    versionLabel: document.getElementById("versionLabel"),
    seasonLabel: document.getElementById("seasonLabel"),
    weatherLabel: document.getElementById("weatherLabel"),
    ledgerLabel: document.getElementById("ledgerLabel"),
    slotLabel: document.getElementById("slotLabel"),
    countLabel: document.getElementById("countLabel"),
    reportLabel: document.getElementById("reportLabel"),
    llmLabel: document.getElementById("llmLabel"),
    sceneSelect: document.getElementById("sceneSelect"),
    seasonSelect: document.getElementById("seasonSelect"),
    advanceSelect: document.getElementById("advanceSelect"),
    modelSelect: document.getElementById("modelSelect"),
    modelConfigBtn: document.getElementById("modelConfigBtn"),
    resetBtn: document.getElementById("resetBtn"),
    advanceBtn: document.getElementById("advanceBtn"),
    townMap: document.getElementById("townMap"),
    residentCard: document.getElementById("residentCard"),
    townStatePanel: document.getElementById("townStatePanel"),
    facilityPanel: document.getElementById("facilityPanel"),
    noticeBoardPanel: document.getElementById("noticeBoardPanel"),
    noticeBoardContent: document.getElementById("noticeBoardContent"),
    noticeBoardClose: document.getElementById("noticeBoardClose"),
    lifeOverlay: document.getElementById("lifeOverlay"),
    villagerList: document.getElementById("villagerList"),
    logList: document.getElementById("logList"),
    reportPanel: document.getElementById("reportPanel"),
    conversationPanel: document.getElementById("conversationPanel"),
    weeklyTimelinePanel: document.getElementById("weeklyTimelinePanel"),
    modelConfigPanel: document.getElementById("modelConfigPanel"),
    modelConfigClose: document.getElementById("modelConfigClose"),
    modelConfigStatus: document.getElementById("modelConfigStatus"),
    providerSelect: document.getElementById("providerSelect"),
    modelNameInput: document.getElementById("modelNameInput"),
    modelEndpointInput: document.getElementById("modelEndpointInput"),
    apiKeyInput1: document.getElementById("apiKeyInput1"),
    apiKeyInput2: document.getElementById("apiKeyInput2"),
    apiKeyInput3: document.getElementById("apiKeyInput3"),
    apiKeyInput4: document.getElementById("apiKeyInput4"),
    saveModelConfigBtn: document.getElementById("saveModelConfigBtn"),
    clearSessionKeyBtn: document.getElementById("clearSessionKeyBtn")
  };

  const noticeBoardAsset = T.assets.noticeBoard || "./assets/runtime/props/notice-board.png";
  let selectedVillagerId = null;
  let noticeBoardOpen = false;
  let modelConfigOpen = false;

  function selectedVillager() {
    const villagers = engine.state.villagers;
    if (!villagers.length) return null;
    if (!villagers.some((villager) => villager.id === selectedVillagerId)) {
      selectedVillagerId = villagers[0].id;
    }
    return villagers.find((villager) => villager.id === selectedVillagerId) || villagers[0];
  }

  function selectVillager(id) {
    if (!id || selectedVillagerId === id) return;
    selectedVillagerId = id;
    render();
  }

  function villagerNameById(id) {
    if (!id) return "";
    return engine.state.villagers.find((villager) => villager.id === id)?.name || id;
  }

  function renderMap() {
    T.residentMapPanel?.renderMap(el.townMap, engine, {
      current: selectedVillager(),
      noticeBoardOpen,
      noticeBoardAsset
    });
  }

  function renderResidentCard() {
    T.residentMapPanel?.renderResidentCard(el.residentCard, engine, {
      villager: selectedVillager()
    });
  }

  function renderTownState() {
    T.townStatePanel?.render(el.townStatePanel, engine);
  }

  function renderFacilityPanel() {
    T.facilityNoticePanel?.renderFacilityPanel(el.facilityPanel, engine);
  }

  function renderNoticeBoard() {
    T.facilityNoticePanel?.renderNoticeBoard({
      panel: el.noticeBoardPanel,
      content: el.noticeBoardContent
    }, engine, {
      open: noticeBoardOpen,
      villagerNameById
    });
  }

  function renderVillagers() {
    T.dailyPanels?.renderVillagers(el.villagerList, engine, { current: selectedVillager() });
  }

  function renderLogs() {
    T.dailyPanels?.renderLogs(el.logList, engine);
  }

  function renderReport() {
    T.dailyPanels?.renderReport(el.reportPanel, engine);
  }

  function renderConversations() {
    T.conversationPanel?.render(el.conversationPanel, engine, { villagerNameById });
  }

  function renderWeeklyTimeline() {
    T.weeklyTimelinePanel?.render(el.weeklyTimelinePanel, engine);
  }

  function configStatusText() {
    const config = T.llm?.config;
    if (!config) return T.llm?.lastError ? `配置读取失败：${T.llm.lastError}` : "尚未读取配置。";
    const keyCount = Number(config.keyCount || 0);
    const keyCountText = keyCount > 1 ? ` x${keyCount}` : "";
    const keyText = config.hasKey
      ? (config.keySource === "environment" ? `已读取保存的 key${keyCountText}` : `已使用页面临时 key${keyCountText}`)
      : "还没有可用 key";
    const provider = config.providerLabel || config.provider || "模型平台";
    const model = config.model || "未填写模型";
    return `${provider} · ${model} · ${keyText}`;
  }

  function renderModelConfig() {
    if (!el.modelConfigPanel) return;
    el.modelConfigPanel.hidden = !modelConfigOpen;
    if (!modelConfigOpen) return;
    const config = T.llm?.config || {};
    el.modelConfigStatus.textContent = configStatusText();
    if (config.provider && el.providerSelect.value !== config.provider) el.providerSelect.value = config.provider;
    if (document.activeElement !== el.modelNameInput) el.modelNameInput.value = config.model || "";
    if (document.activeElement !== el.modelEndpointInput) el.modelEndpointInput.value = config.endpoint || "";
  }

  function render() {
    const slot = engine.state.slotIndex === 0 ? "清晨待开始" : `${engine.timeSlots[engine.state.slotIndex - 1]}已过`;
    const townSnapshot = engine.publicTownSnapshot ? engine.publicTownSnapshot() : null;
    el.versionLabel.textContent = `${T.version.code} · ${T.version.status}`;
    el.dayLabel.textContent = `第 ${engine.state.day} 天`;
    el.seasonLabel.textContent = engine.state.season.label;
    el.weatherLabel.textContent = townSnapshot?.weather?.label || engine.state.currentWeather?.label || "阴天";
    el.ledgerLabel.textContent = townSnapshot?.ledger ? `YSC ${townSnapshot.ledger.cashYsc}` : "YSC 5000";
    el.slotLabel.textContent = slot;
    el.countLabel.textContent = `${engine.state.villagers.length} 人`;
    el.reportLabel.textContent = engine.state.lastReport ? `第 ${engine.state.lastReport.day} 天` : "尚未写成";
    el.llmLabel.textContent = el.modelSelect.value === "model" && T.llm ? T.llm.status : "未开启";
    document.body.classList.toggle("is-living", Boolean(T.llm?.busy));
    el.lifeOverlay.hidden = !T.llm?.busy;
    renderMap();
    renderResidentCard();
    renderTownState();
    renderFacilityPanel();
    renderVillagers();
    renderLogs();
    renderReport();
    renderConversations();
    renderWeeklyTimeline();
    renderNoticeBoard();
    renderModelConfig();
  }

  function openNoticeBoard() {
    noticeBoardOpen = true;
    renderMap();
    renderNoticeBoard();
    window.setTimeout(() => el.noticeBoardClose?.focus(), 0);
  }

  function closeNoticeBoard() {
    noticeBoardOpen = false;
    renderMap();
    renderNoticeBoard();
  }

  function openModelConfig() {
    modelConfigOpen = true;
    renderModelConfig();
    window.setTimeout(() => el.providerSelect?.focus(), 0);
  }

  function closeModelConfig() {
    modelConfigOpen = false;
    renderModelConfig();
  }

  function handleResidentPointer(event) {
    const target = event.target.closest("[data-villager-id]");
    if (!target) return;
    selectVillager(target.dataset.villagerId);
  }

  function handleMapClick(event) {
    const board = event.target.closest("[data-notice-board]");
    if (board) {
      openNoticeBoard();
      return;
    }
    handleResidentPointer(event);
  }

  function handleWeekClick(event) {
    T.weeklyTimelinePanel?.handleClick(event, render);
  }

  el.townMap.addEventListener("click", handleMapClick);
  el.townMap.addEventListener("mouseover", handleResidentPointer);
  el.townMap.addEventListener("focusin", handleResidentPointer);
  el.villagerList.addEventListener("click", handleResidentPointer);
  el.villagerList.addEventListener("mouseover", handleResidentPointer);
  el.villagerList.addEventListener("focusin", handleResidentPointer);
  el.weeklyTimelinePanel?.addEventListener("click", handleWeekClick);
  el.noticeBoardClose?.addEventListener("click", closeNoticeBoard);
  el.modelConfigClose?.addEventListener("click", closeModelConfig);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && noticeBoardOpen) closeNoticeBoard();
    if (event.key === "Escape" && modelConfigOpen) closeModelConfig();
  });

  T.ui = { el, render, openModelConfig, closeModelConfig };
}());
