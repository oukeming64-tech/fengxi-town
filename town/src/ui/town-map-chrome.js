(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function viewportScale(viewport = {}) {
    return T.clamp(Number(viewport.scale) || 1, 1, 2.8);
  }

  function mapZoomClass(viewport = {}) {
    const scale = viewportScale(viewport);
    return `${scale >= 1.18 ? " is-map-zoomed" : ""}${scale >= 1.85 ? " is-map-deep-zoom" : ""}`;
  }

  function viewportStyle(viewport = {}) {
    const scale = viewportScale(viewport);
    const x = Math.round((Number(viewport.x) || 0) * 10) / 10;
    const y = Math.round((Number(viewport.y) || 0) * 10) / 10;
    return `--map-pan-x: ${x}px; --map-pan-y: ${y}px; --map-zoom: ${scale};`;
  }

  function renderMapControls(viewport = {}) {
    const reduced = Boolean(viewport.reducedWeatherMotion);
    return `
      <div class="map-view-controls" aria-label="地图视图">
        <button type="button" data-map-action="zoom-out" title="缩小" aria-label="缩小">-</button>
        <button type="button" data-map-action="zoom-in" title="放大" aria-label="放大">+</button>
        <button type="button" data-map-action="reset-view" title="重置视图" aria-label="重置视图">0</button>
        <button type="button" class="${reduced ? "is-active" : ""}" data-map-action="toggle-weather-motion" title="减少天气动画" aria-label="减少天气动画">~</button>
      </div>
    `;
  }

  function renderStageControls(playback, stageIndex, playbackPlaying) {
    if (!playback?.stages?.length) return "";
    return `
      <div class="map-stage-controls" aria-label="居民行动分幕">
        <span>第 ${playback.day} 天</span>
        <button type="button" class="stage-playback-toggle${playbackPlaying ? " is-playing" : ""}" data-stage-playback-action="toggle" aria-pressed="${playbackPlaying ? "true" : "false"}" title="${playbackPlaying ? "暂停分幕自动播放" : "继续分幕自动播放"}">
          ${playbackPlaying ? "暂停" : "播放"}
        </button>
        ${playback.stages.map((stage, index) => `
          <button type="button" class="${index === stageIndex ? "is-active" : ""}" data-stage-index="${index}" title="${T.escapeHtml(stage.label)}">
            ${T.escapeHtml(stage.label)}
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderStageHud(engine, playback, activeStage) {
    const weather = T.townStage?.weatherView?.(engine.state.currentWeather) || { label: "阴天" };
    return `
      <div class="map-stage-hud" aria-live="polite">
        <span>第 ${playback?.day || engine.state.day} 天</span>
        <span>${T.escapeHtml(weather.label)}</span>
        <span>${T.escapeHtml(activeStage?.label || "清晨")}</span>
      </div>
    `;
  }

  function renderActionLegend(activeStage) {
    const labels = [];
    (activeStage?.events || []).forEach((event) => {
      const label = event.animationLabel || T.townStage?.animationForKey?.(event.animationKey)?.label || "";
      if (label && !labels.includes(label)) labels.push(label);
    });
    if (!labels.length) return "";
    return `<div class="map-action-legend" aria-hidden="true">${labels.slice(0, 8).map((label) => `<span>${T.escapeHtml(label)}</span>`).join("")}</div>`;
  }

  function renderWeatherLayer(engine, options = {}) {
    const weather = T.townStage?.weatherView?.(engine.state.currentWeather) || { type: "cloudy", label: "阴天" };
    const reduced = options.viewport?.reducedWeatherMotion ? " is-reduced" : "";
    return `
      <div class="weather-layer weather-${T.escapeHtml(weather.type)}${reduced}" aria-label="${T.escapeHtml(weather.label)}天气蒙版">
        <span class="weather-particles" aria-hidden="true"></span>
      </div>
    `;
  }

  T.townMapChrome = {
    version: "town-map-chrome-v0.1.6-local",
    viewportScale,
    mapZoomClass,
    viewportStyle,
    renderMapControls,
    renderStageControls,
    renderStageHud,
    renderActionLegend,
    renderWeatherLayer
  };
}());
