(function () {
  const T = window.MorningTown;
  const engine = T.engine;

  const el = T.uiElements;
  if (!el) throw new Error("ui-elements must load before ui");

  const noticeBoardAsset = T.assets.noticeBoard || "../assets/runtime/maple-creek-notice-board-v0.0.6.svg";
  let selectedVillagerId = null;
  let noticeBoardOpen = false;
  let modelConfigOpen = false;
  let stageDrawerOpen = false;
  let stageDrawerPanel = "residents";
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

  if (!T.uiMapController?.create) throw new Error("ui-map-controller must load before ui");
  const mapController = T.uiMapController.create({
    element: el.townMap,
    engine,
    noticeBoardAsset,
    selectedVillager,
    noticeBoardIsOpen: () => noticeBoardOpen,
    openNoticeBoard,
    selectVillager
  });
  if (!T.uiStageRecapController?.create) throw new Error("ui-stage-recap-controller must load before ui");
  const stageRecapController = T.uiStageRecapController.create({
    engine,
    el,
    villagerNameById,
    openStageDrawer
  });

  function renderMap() {
    mapController.render();
  }

  function renderStageRecap() {
    stageRecapController.render();
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
      ? (config.keySource === "environment" ? `已复用本地环境 key${keyCountText}` : `已使用页面临时 key${keyCountText}`)
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

  function applyStageDrawerState() {
    const drawer = el.stageDrawer;
    if (!drawer) return;
    drawer.classList?.toggle("is-open", stageDrawerOpen);
    drawer.setAttribute?.("aria-expanded", stageDrawerOpen ? "true" : "false");
    const panelContainer = drawer.querySelector?.(".stage-drawer-panels");
    panelContainer?.setAttribute?.("aria-hidden", stageDrawerOpen ? "false" : "true");
    if (stageDrawerOpen) panelContainer?.removeAttribute?.("inert");
    else panelContainer?.setAttribute?.("inert", "");
    const buttons = drawer.querySelectorAll?.("[data-stage-drawer-target]") || [];
    buttons.forEach((button) => {
      const active = button.dataset.stageDrawerTarget === stageDrawerPanel;
      button.classList.toggle("is-active", active && stageDrawerOpen);
      button.setAttribute?.("aria-pressed", active && stageDrawerOpen ? "true" : "false");
    });
    const panels = drawer.querySelectorAll?.("[data-stage-drawer-panel]") || [];
    panels.forEach((panel) => {
      const active = panel.dataset.stageDrawerPanel === stageDrawerPanel;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
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
    el.llmLabel.textContent = el.modelSelect.value === "model" && T.llm ? T.llm.status : "本地";
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
    renderStageRecap();
    renderNoticeBoard();
    renderModelConfig();
    applyStageDrawerState();
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

  function openStageDrawer(panel) {
    stageDrawerPanel = panel || stageDrawerPanel;
    stageDrawerOpen = true;
    applyStageDrawerState();
  }

  function closeStageDrawer() {
    stageDrawerOpen = false;
    applyStageDrawerState();
  }

  function handleStageDrawerClick(event) {
    const action = event.target.closest("[data-stage-drawer-action]");
    if (action?.dataset.stageDrawerAction === "close") {
      closeStageDrawer();
      return;
    }
    const target = event.target.closest("[data-stage-drawer-target]");
    if (!target) return;
    openStageDrawer(target.dataset.stageDrawerTarget);
  }

  function handleResidentPointer(event) {
    const target = event.target.closest("[data-villager-id]");
    if (!target) return;
    selectVillager(target.dataset.villagerId);
  }

  function handleWeekClick(event) {
    const stageRecap = event.target.closest("[data-stage-recap-id]");
    if (stageRecap) {
      openStageRecap(stageRecap.dataset.stageRecapId);
      return;
    }
    T.weeklyTimelinePanel?.handleClick(event, render);
  }

  el.villagerList.addEventListener("click", handleResidentPointer);
  el.villagerList.addEventListener("mouseover", handleResidentPointer);
  el.villagerList.addEventListener("focusin", handleResidentPointer);
  el.weeklyTimelinePanel?.addEventListener("click", handleWeekClick);
  el.stageDrawer?.addEventListener("click", handleStageDrawerClick);
  el.noticeBoardClose?.addEventListener("click", closeNoticeBoard);
  el.modelConfigClose?.addEventListener("click", closeModelConfig);
  el.stageRecapClose?.addEventListener("click", () => stageRecapController.close());
  el.stageRecapContinue?.addEventListener("click", () => stageRecapController.close());
  el.stageRecapDetails?.addEventListener("click", stageRecapController.showDetails);
  document.addEventListener("keydown", (event) => {
    if (stageRecapController.handleKeyDown(event)) return;
    if (event.key === "Escape" && noticeBoardOpen) closeNoticeBoard();
    if (event.key === "Escape" && modelConfigOpen) closeModelConfig();
    if (event.key === "Escape" && stageDrawerOpen) closeStageDrawer();
  });

  T.ui = {
    el,
    render,
    openModelConfig,
    closeModelConfig,
    openStageRecap: stageRecapController.open,
    openPendingStageRecap: stageRecapController.openPending,
    closeStageRecap: stageRecapController.close,
    stageRecapState: stageRecapController.state,
    stagePlaybackState: mapController.playbackState
  };
}());
