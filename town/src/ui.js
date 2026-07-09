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
    stageDrawer: document.getElementById("stageDrawer"),
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

  const noticeBoardAsset = T.assets.noticeBoard || "../assets/runtime/maple-creek-notice-board-v0.0.6.svg";
  let selectedVillagerId = null;
  let noticeBoardOpen = false;
  let modelConfigOpen = false;
  let stageDrawerOpen = false;
  let stageDrawerPanel = "residents";
  const mapViewport = {
    scale: 1,
    x: 0,
    y: 0,
    reducedWeatherMotion: false,
    selectedHotspotId: "",
    stageIndex: 0,
    playbackId: ""
  };
  let mapDrag = null;

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
    const playback = T.townStage?.currentPlayback?.(engine) || null;
    if (playback?.id && playback.id !== mapViewport.playbackId) {
      mapViewport.playbackId = playback.id;
      mapViewport.stageIndex = 0;
    }
    T.residentMapPanel?.renderMap(el.townMap, engine, {
      current: selectedVillager(),
      noticeBoardOpen,
      noticeBoardAsset,
      viewport: mapViewport,
      selectedHotspotId: mapViewport.selectedHotspotId,
      stageIndex: mapViewport.stageIndex,
      playback
    });
    applyMapTransform();
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

  function clampMapViewport() {
    mapViewport.scale = T.clamp(Number(mapViewport.scale) || 1, 1, 2.8);
    const maxX = Math.round(220 * (mapViewport.scale - 1));
    const maxY = Math.round(150 * (mapViewport.scale - 1));
    mapViewport.x = T.clamp(Number(mapViewport.x) || 0, -maxX, maxX);
    mapViewport.y = T.clamp(Number(mapViewport.y) || 0, -maxY, maxY);
  }

  function applyMapTransform() {
    clampMapViewport();
    const surface = el.townMap.querySelector?.(".map-stage-surface");
    if (!surface) return;
    const visual = el.townMap.querySelector?.(".map-visual");
    surface.style.transform = `translate(${Math.round(mapViewport.x * 10) / 10}px, ${Math.round(mapViewport.y * 10) / 10}px) scale(${mapViewport.scale})`;
    if (!visual) return;
    const fade = T.clamp((mapViewport.scale - 1) / 0.9, 0, 1);
    const fadeValue = (start, end) => Math.round((start + (end - start) * fade) * 100) / 100;
    visual.style.setProperty("--map-scale", mapViewport.scale);
    visual.style.setProperty("--hotspot-fade-opacity", fadeValue(0.72, 0.08));
    visual.style.setProperty("--hotspot-dot-fade-opacity", fadeValue(1, 0.18));
    visual.style.setProperty("--zone-fade-opacity", fadeValue(1, 0.18));
    visual.classList.toggle("is-map-zoomed", mapViewport.scale >= 1.18);
    visual.classList.toggle("is-map-deep-zoom", mapViewport.scale >= 1.85);
  }

  function zoomMap(delta) {
    mapViewport.scale = T.clamp(Math.round((mapViewport.scale + delta) * 100) / 100, 1, 2.8);
    applyMapTransform();
  }

  function resetMapView() {
    mapViewport.scale = 1;
    mapViewport.x = 0;
    mapViewport.y = 0;
    renderMap();
  }

  function handleMapAction(action) {
    if (action === "zoom-in") zoomMap(0.2);
    if (action === "zoom-out") zoomMap(-0.2);
    if (action === "reset-view") resetMapView();
    if (action === "toggle-weather-motion") {
      mapViewport.reducedWeatherMotion = !mapViewport.reducedWeatherMotion;
      renderMap();
    }
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

  function handleMapClick(event) {
    const action = event.target.closest("[data-map-action]");
    if (action) {
      handleMapAction(action.dataset.mapAction);
      return;
    }
    const stage = event.target.closest("[data-stage-index]");
    if (stage) {
      mapViewport.stageIndex = Number(stage.dataset.stageIndex) || 0;
      renderMap();
      return;
    }
    const board = event.target.closest("[data-notice-board]");
    if (board) {
      openNoticeBoard();
      return;
    }
    const hotspot = event.target.closest("[data-hotspot-id]");
    if (hotspot) {
      mapViewport.selectedHotspotId = hotspot.dataset.hotspotId || "";
      renderMap();
      return;
    }
    const resident = event.target.closest("[data-villager-id]");
    if (resident) {
      handleResidentPointer(event);
      return;
    }
    if (mapViewport.selectedHotspotId) {
      mapViewport.selectedHotspotId = "";
      renderMap();
    }
  }

  function handleMapPointerDown(event) {
    if (event.button !== 0) return;
    if (event.target.closest("button, aside")) return;
    const viewport = event.target.closest(".map-stage-viewport");
    if (!viewport) return;
    mapDrag = {
      startX: event.clientX,
      startY: event.clientY,
      x: mapViewport.x,
      y: mapViewport.y,
      viewport
    };
    viewport.classList.add("is-dragging");
  }

  function handleMapPointerMove(event) {
    if (!mapDrag) return;
    mapViewport.x = mapDrag.x + event.clientX - mapDrag.startX;
    mapViewport.y = mapDrag.y + event.clientY - mapDrag.startY;
    applyMapTransform();
  }

  function finishMapDrag() {
    if (!mapDrag) return;
    mapDrag.viewport?.classList.remove("is-dragging");
    mapDrag = null;
  }

  function handleMapWheel(event) {
    if (!event.target.closest(".map-stage-viewport")) return;
    event.preventDefault();
    zoomMap(event.deltaY < 0 ? 0.12 : -0.12);
  }

  function handleWeekClick(event) {
    T.weeklyTimelinePanel?.handleClick(event, render);
  }

  el.townMap.addEventListener("click", handleMapClick);
  el.townMap.addEventListener("pointerdown", handleMapPointerDown);
  el.townMap.addEventListener("wheel", handleMapWheel, { passive: false });
  document.addEventListener("pointermove", handleMapPointerMove);
  document.addEventListener("pointerup", finishMapDrag);
  document.addEventListener("pointercancel", finishMapDrag);
  el.townMap.addEventListener("mouseover", handleResidentPointer);
  el.townMap.addEventListener("focusin", handleResidentPointer);
  el.villagerList.addEventListener("click", handleResidentPointer);
  el.villagerList.addEventListener("mouseover", handleResidentPointer);
  el.villagerList.addEventListener("focusin", handleResidentPointer);
  el.weeklyTimelinePanel?.addEventListener("click", handleWeekClick);
  el.stageDrawer?.addEventListener("click", handleStageDrawerClick);
  el.noticeBoardClose?.addEventListener("click", closeNoticeBoard);
  el.modelConfigClose?.addEventListener("click", closeModelConfig);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && noticeBoardOpen) closeNoticeBoard();
    if (event.key === "Escape" && modelConfigOpen) closeModelConfig();
    if (event.key === "Escape" && stageDrawerOpen) closeStageDrawer();
  });

  T.ui = { el, render, openModelConfig, closeModelConfig };
}());
