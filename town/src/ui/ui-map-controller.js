(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function create({
    element,
    engine,
    noticeBoardAsset,
    selectedVillager,
    noticeBoardIsOpen,
    openNoticeBoard,
    selectVillager
  }) {
    const viewport = {
      scale: 1,
      x: 0,
      y: 0,
      reducedWeatherMotion: false,
      selectedHotspotId: "",
      stageIndex: 0,
      playbackId: "",
      playbackPlaying: true,
      renderedStageIndex: null,
      renderedPlaybackId: ""
    };
    let mapDrag = null;
    let stagePlaybackTimer = null;
    let stagePlaybackTimerKey = "";

    function clearStagePlaybackTimer() {
      if (stagePlaybackTimer !== null) window.clearTimeout?.(stagePlaybackTimer);
      stagePlaybackTimer = null;
      stagePlaybackTimerKey = "";
    }

    function scheduleStagePlayback(playback) {
      if (!viewport.playbackPlaying || !playback?.stages?.length || document.hidden) {
        clearStagePlaybackTimer();
        return;
      }
      const index = T.clamp(Number(viewport.stageIndex) || 0, 0, playback.stages.length - 1);
      const timerKey = `${playback.id}:${index}`;
      if (stagePlaybackTimer !== null && stagePlaybackTimerKey === timerKey) return;
      clearStagePlaybackTimer();
      stagePlaybackTimerKey = timerKey;
      const delayMs = Math.max(4000, Math.round((Number(playback.stages[index]?.durationSeconds) || 9) * 1000));
      stagePlaybackTimer = window.setTimeout(() => {
        stagePlaybackTimer = null;
        stagePlaybackTimerKey = "";
        const latest = T.townStage?.currentPlayback?.(engine) || null;
        if (!viewport.playbackPlaying || !latest?.stages?.length) return;
        if (latest.id !== playback.id) {
          render();
          return;
        }
        viewport.stageIndex = (index + 1) % latest.stages.length;
        render();
      }, delayMs);
    }

    function render() {
      const playback = T.townStage?.currentPlayback?.(engine) || null;
      const previousStageIndex = viewport.renderedPlaybackId === playback?.id
        ? viewport.renderedStageIndex
        : null;
      if (playback?.id && playback.id !== viewport.playbackId) {
        viewport.playbackId = playback.id;
        viewport.stageIndex = 0;
      }
      const stageIndex = playback?.stages?.length
        ? T.clamp(Number(viewport.stageIndex) || 0, 0, playback.stages.length - 1)
        : 0;
      const animateStageMove = Number.isInteger(previousStageIndex) && previousStageIndex !== stageIndex;
      T.residentMapPanel?.renderMap(element, engine, {
        current: selectedVillager(),
        noticeBoardOpen: noticeBoardIsOpen(),
        noticeBoardAsset,
        viewport: viewport,
        selectedHotspotId: viewport.selectedHotspotId,
        stageIndex,
        playback,
        previousStageIndex,
        animateStageMove,
        playbackPlaying: viewport.playbackPlaying
      });
      viewport.stageIndex = stageIndex;
      viewport.renderedStageIndex = stageIndex;
      viewport.renderedPlaybackId = playback?.id || "";
      applyMapTransform();
      scheduleStagePlayback(playback);
    }


    function clampMapViewport() {
      viewport.scale = T.clamp(Number(viewport.scale) || 1, 1, 2.8);
      const viewportElement = element.querySelector?.(".map-stage-viewport");
      const surface = element.querySelector?.(".map-stage-surface");
      const maxX = viewportElement && surface
        ? Math.max(0, Math.round((surface.offsetWidth * viewport.scale - viewportElement.clientWidth) / 2))
        : Math.round(220 * (viewport.scale - 1));
      const maxY = viewportElement && surface
        ? Math.max(0, Math.round((surface.offsetHeight * viewport.scale - viewportElement.clientHeight) / 2))
        : Math.round(150 * (viewport.scale - 1));
      viewport.x = T.clamp(Number(viewport.x) || 0, -maxX, maxX);
      viewport.y = T.clamp(Number(viewport.y) || 0, -maxY, maxY);
    }

    function applyMapTransform() {
      clampMapViewport();
      const surface = element.querySelector?.(".map-stage-surface");
      if (!surface) return;
      const visual = element.querySelector?.(".map-visual");
      surface.style.setProperty("--map-pan-x", `${Math.round(viewport.x * 10) / 10}px`);
      surface.style.setProperty("--map-pan-y", `${Math.round(viewport.y * 10) / 10}px`);
      surface.style.setProperty("--map-zoom", viewport.scale);
      if (!visual) return;
      const fade = T.clamp((viewport.scale - 1) / 0.9, 0, 1);
      const fadeValue = (start, end) => Math.round((start + (end - start) * fade) * 100) / 100;
      visual.style.setProperty("--map-scale", viewport.scale);
      visual.style.setProperty("--hotspot-fade-opacity", fadeValue(0.72, 0.08));
      visual.style.setProperty("--hotspot-dot-fade-opacity", fadeValue(1, 0.18));
      visual.style.setProperty("--zone-fade-opacity", fadeValue(1, 0.18));
      visual.classList.toggle("is-map-zoomed", viewport.scale >= 1.18);
      visual.classList.toggle("is-map-deep-zoom", viewport.scale >= 1.85);
    }

    function zoomMap(delta) {
      viewport.scale = T.clamp(Math.round((viewport.scale + delta) * 100) / 100, 1, 2.8);
      applyMapTransform();
    }

    function resetMapView() {
      viewport.scale = 1;
      viewport.x = 0;
      viewport.y = 0;
      render();
    }

    function handleMapAction(action) {
      if (action === "zoom-in") zoomMap(0.2);
      if (action === "zoom-out") zoomMap(-0.2);
      if (action === "reset-view") resetMapView();
      if (action === "toggle-weather-motion") {
        viewport.reducedWeatherMotion = !viewport.reducedWeatherMotion;
        render();
      }
    }


    function handleMapClick(event) {
      const action = event.target.closest("[data-map-action]");
      if (action) {
        handleMapAction(action.dataset.mapAction);
        return;
      }
      const playbackAction = event.target.closest("[data-stage-playback-action]");
      if (playbackAction?.dataset.stagePlaybackAction === "toggle") {
        viewport.playbackPlaying = !viewport.playbackPlaying;
        clearStagePlaybackTimer();
        render();
        return;
      }
      const stage = event.target.closest("[data-stage-index]");
      if (stage) {
        viewport.stageIndex = Number(stage.dataset.stageIndex) || 0;
        render();
        return;
      }
      const board = event.target.closest("[data-notice-board]");
      if (board) {
        openNoticeBoard();
        return;
      }
      const hotspot = event.target.closest("[data-hotspot-id]");
      if (hotspot) {
        viewport.selectedHotspotId = hotspot.dataset.hotspotId || "";
        render();
        return;
      }
      const resident = event.target.closest("[data-villager-id]");
      if (resident) {
        selectVillager(resident.dataset.villagerId);
        return;
      }
      if (viewport.selectedHotspotId) {
        viewport.selectedHotspotId = "";
        render();
      }
    }

    function handleMapPointerDown(event) {
      if (event.button !== 0) return;
      if (event.target.closest("button, aside")) return;
      const viewportElement = event.target.closest(".map-stage-viewport");
      if (!viewportElement) return;
      mapDrag = {
        startX: event.clientX,
        startY: event.clientY,
        x: viewport.x,
        y: viewport.y,
        viewport: viewportElement
      };
      viewportElement.classList.add("is-dragging");
    }

    function handleMapPointerMove(event) {
      if (!mapDrag) return;
      viewport.x = mapDrag.x + event.clientX - mapDrag.startX;
      viewport.y = mapDrag.y + event.clientY - mapDrag.startY;
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

    function handleMapAnimationEnd(event) {
      if (event.animationName !== "resident-travel") return;
      const resident = event.target.closest?.(".resident-token.is-travelling");
      if (!resident) return;
      resident.classList.remove("is-travelling");
    }

    function handleResidentPointer(event) {
      const target = event.target.closest("[data-villager-id]");
      if (target) selectVillager(target.dataset.villagerId);
    }

    element.addEventListener("click", handleMapClick);
    element.addEventListener("pointerdown", handleMapPointerDown);
    element.addEventListener("wheel", handleMapWheel, { passive: false });
    element.addEventListener("animationend", handleMapAnimationEnd);
    document.addEventListener("pointermove", handleMapPointerMove);
    document.addEventListener("pointerup", finishMapDrag);
    document.addEventListener("pointercancel", finishMapDrag);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearStagePlaybackTimer();
      else render();
    });
    element.addEventListener("mouseover", handleResidentPointer);
    element.addEventListener("focusin", handleResidentPointer);

    return {
      render,
      playbackState: () => ({
        playing: viewport.playbackPlaying,
        stageIndex: viewport.stageIndex,
        playbackId: viewport.playbackId
      })
    };
  }

  T.uiMapController = { create };
}());
