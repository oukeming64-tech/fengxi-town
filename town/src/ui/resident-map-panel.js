(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function dotPosition(villager, index, total) {
    const seed = Number(String(villager.id || "").replace(/\D/g, "")) || index + 1;
    const cols = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(total))));
    const rows = Math.max(1, Math.ceil(total / cols));
    const col = index % cols;
    const row = Math.floor(index / cols);
    const jitterX = ((seed * 13) % 7) - 3;
    const jitterY = ((seed * 17) % 7) - 3;
    const x = cols === 1 ? 50 : 14 + (col * 72) / (cols - 1);
    const y = rows === 1 ? 62 : 42 + (row * 42) / (rows - 1);
    return {
      x: T.clamp(Math.round(x + jitterX), 16, 84),
      y: T.clamp(Math.round(y + jitterY), 38, 86)
    };
  }

  function mapTokenPosition(villager, index, total, zone) {
    const local = dotPosition(villager, index, total);
    const bounds = zone.mapBounds || { left: 8, top: 8, width: 24, height: 24 };
    return {
      x: Math.round((bounds.left + (bounds.width * local.x) / 100) * 100) / 100,
      y: Math.round((bounds.top + (bounds.height * local.y) / 100) * 100) / 100
    };
  }

  function playbackFor(engine, options) {
    return options.playback || T.townStage?.currentPlayback?.(engine) || null;
  }

  function activeStageFor(playback, stageIndex) {
    return T.townStage?.stageAt?.(playback, stageIndex) || null;
  }

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
    return `
      <div class="map-action-legend" aria-hidden="true">
        ${labels.slice(0, 8).map((label) => `<span>${T.escapeHtml(label)}</span>`).join("")}
      </div>
    `;
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

  function activityNames(hotspot) {
    return (T.townStage?.activitiesForHotspot?.(hotspot) || [])
      .slice(0, 5)
      .map((activity) => activity.shortTitle || activity.title || activity.id);
  }

  function renderHotspotButton(hotspot, options) {
    const selected = options.selectedHotspotId === hotspot.id ? " is-selected" : "";
    const title = `${hotspot.label} · ${activityNames(hotspot).slice(0, 3).join(" / ") || "本地活动锚点"}`;
    if (hotspot.id === "notice-board") {
      const boardLabel = options.noticeBoardOpen ? "公告板已打开" : "打开公告板：设施、招标、账务与居民互动";
      return `
        <button type="button" class="notice-board-hotspot${options.noticeBoardOpen ? " is-open" : ""}${selected}" data-hotspot-id="${T.escapeHtml(hotspot.id)}" data-notice-board="true" style="left: ${hotspot.x}%; top: ${hotspot.y}%;" aria-label="${T.escapeHtml(boardLabel)}" title="${T.escapeHtml(boardLabel)}">
          <img src="${T.escapeHtml(options.noticeBoardAsset)}" alt="">
          <span>${T.escapeHtml(hotspot.label)}</span>
        </button>
      `;
    }
    return `
      <button type="button" class="map-feature-hotspot kind-${T.escapeHtml(hotspot.kind)}${selected}" data-hotspot-id="${T.escapeHtml(hotspot.id)}" style="left: ${hotspot.x}%; top: ${hotspot.y}%; --hotspot-radius: ${hotspot.radius || 5};" title="${T.escapeHtml(title)}" aria-label="${T.escapeHtml(`热区：${hotspot.label}`)}">
        <span class="hotspot-dot" aria-hidden="true"></span>
        <span class="hotspot-label">${T.escapeHtml(hotspot.label)}</span>
      </button>
    `;
  }

  function renderHotspots(options = {}) {
    const hotspots = T.townStage?.hotspots || [];
    return hotspots.map((hotspot) => renderHotspotButton(hotspot, options)).join("");
  }

  function residentNamesNear(engine, activeStage, hotspot) {
    const byId = new Map(engine.state.villagers.map((villager) => [villager.id, villager]));
    const staged = (activeStage?.events || [])
      .filter((event) => event.hotspotId === hotspot.id)
      .map((event) => byId.get(event.residentId)?.name || event.residentName || event.residentId);
    if (staged.length) return staged.slice(0, 6);
    return engine.state.villagers
      .filter((villager) => villager.zone === hotspot.zoneId)
      .slice(0, 6)
      .map((villager) => villager.name);
  }

  function renderHotspotInspector(engine, activeStage, selectedHotspotId) {
    const hotspot = T.townStage?.byId?.get(selectedHotspotId);
    if (!hotspot) return "";
    const activities = activityNames(hotspot);
    const residents = residentNamesNear(engine, activeStage, hotspot);
    return `
      <aside class="map-hotspot-inspector" aria-live="polite">
        <div class="inspector-kicker">${T.escapeHtml(engine.zoneName(hotspot.zoneId))} · ${T.escapeHtml(hotspot.kind)}</div>
        <h3>${T.escapeHtml(hotspot.label)}</h3>
        <p>${T.escapeHtml(hotspot.description || "本地已审核活动的地图锚点。")}</p>
        <div class="inspector-list">
          <span>活动</span>
          <strong>${T.escapeHtml(activities.join(" / ") || "待绑定")}</strong>
        </div>
        <div class="inspector-list">
          <span>附近</span>
          <strong>${T.escapeHtml(residents.join("、") || "暂时没人停在这里")}</strong>
        </div>
      </aside>
    `;
  }

  function renderDialogues(activeStage) {
    return (activeStage?.encounters || []).slice(0, 3).map((encounter) => {
      const text = (encounter.lines || [])
        .map((line) => `${line.speakerName || line.speakerId}：${line.text}`)
        .join(" / ");
      return `
        <div class="stage-dialogue" style="left: ${encounter.x}%; top: ${encounter.y}%;">
          <span>${T.escapeHtml(encounter.hotspotLabel || "相遇")}</span>
          <p>${T.escapeHtml(text)}</p>
        </div>
      `;
    }).join("");
  }

  function renderActionCue(event) {
    if (!event) return "";
    const animation = T.townStage?.animationForKey?.(event.animationKey) || {};
    const cueClass = event.animationCueClass || animation.cueClass || "cue-idle";
    const label = event.animationLabel || animation.label || "行动";
    const iconKey = String(event.animationKey || "idle").replace(/[^a-z0-9-]/gi, "") || "idle";
    const sprite = event.animationSprite || animation.sprite || { col: 2, row: 2 };
    const atlas = T.townStageData?.actionCueAtlas || {};
    const columns = Math.max(1, Number(atlas.columns) || 4);
    const rows = Math.max(1, Number(atlas.rows) || 3);
    const x = columns <= 1 ? 0 : Math.round((T.clamp(Number(sprite.col) || 0, 0, columns - 1) / (columns - 1)) * 10000) / 100;
    const y = rows <= 1 ? 0 : Math.round((T.clamp(Number(sprite.row) || 0, 0, rows - 1) / (rows - 1)) * 10000) / 100;
    const iconPath = T.assets.actionCueDir ? `${T.assets.actionCueDir}/action-cue-${iconKey}-v0.1.4.png` : "";
    const atlasStyle = iconPath
      ? `--cue-icon: url('${T.escapeHtml(iconPath)}'); --cue-bg-size: contain; --cue-bg-position: center;`
      : `--cue-atlas: url('${T.escapeHtml(T.assets.actionCueAtlas)}'); --cue-bg-size: 400% 300%; --cue-bg-position: ${x}% ${y}%;`;
    const iconImage = iconPath ? `<img class="resident-action-icon" src="${T.escapeHtml(iconPath)}" alt="">` : "";
    return `
      <span class="resident-action-cue ${iconPath ? "has-icon " : ""}${T.escapeHtml(cueClass)}" style="${atlasStyle}" aria-hidden="true" title="${T.escapeHtml(label)}">
        ${iconImage}
        <i></i><i></i><i></i>
      </span>
    `;
  }

  function renderMap(container, engine, options = {}) {
    if (!container) return;
    const current = options.current || null;
    const noticeBoardAsset = options.noticeBoardAsset || T.assets.noticeBoard || "../assets/runtime/maple-creek-notice-board-v0.0.6.svg";
    const playback = playbackFor(engine, options);
    const stageIndex = T.clamp(Number(options.stageIndex) || 0, 0, Math.max(0, (playback?.stages?.length || 1) - 1));
    const activeStage = activeStageFor(playback, stageIndex);
    const activeEvents = new Map((activeStage?.events || []).map((event) => [event.residentId, event]));
    const animateStageMove = Boolean(options.animateStageMove);
    const previousStageIndex = Number.isInteger(options.previousStageIndex) ? options.previousStageIndex : stageIndex;
    const byZone = new Map(engine.zones.map((zone) => [zone.id, []]));
    engine.state.villagers.forEach((villager) => {
      const zoneId = byZone.has(villager.zone) ? villager.zone : "townCenter";
      byZone.get(zoneId).push(villager);
    });

    const labels = engine.zones.map((zone) => {
      const residents = byZone.get(zone.id) || [];
      const bounds = zone.mapBounds || { labelLeft: 10, labelTop: 10 };
      return `
        <div class="zone-marker" style="left: ${bounds.labelLeft}%; top: ${bounds.labelTop}%;">
          <span class="map-name">${T.escapeHtml(zone.name)}</span>
          <span class="map-count">${residents.length}</span>
        </div>
      `;
    }).join("");

    const tokens = engine.zones.map((zone) => {
      const residents = byZone.get(zone.id)
        .sort((a, b) => a.id.localeCompare(b.id));
      return residents.map((villager, index) => {
        const event = activeEvents.get(villager.id);
        const pos = event ? { x: event.x, y: event.y } : mapTokenPosition(villager, index, residents.length, zone);
        const selected = Boolean(current && current.id === villager.id);
        const title = event
          ? `${villager.name} · ${event.hotspotLabel} · ${event.activityTitle} · ${event.animationLabel || "行动"}`
          : `${villager.name} · ${villager.recentAction?.place || engine.placeName(villager.location)}`;
        const movement = animateStageMove && event
          ? T.townStage?.movementBetween?.(playback, previousStageIndex, stageIndex, villager.id)
          : null;
        if (T.residentSpriteLayer?.renderToken) {
          return T.residentSpriteLayer.renderToken({
            villager,
            event,
            position: pos,
            movement,
            selected,
            kind: event?.kind || villager.recentAction?.kind || "quiet",
            title,
            ariaLabel: `${villager.name}，${event?.hotspotLabel || zone.name}`,
            actionCueHtml: renderActionCue(event)
          });
        }
        return `<button type="button" class="resident-token ${event?.kind || "quiet"}${selected ? " is-selected" : ""}" data-villager-id="${T.escapeHtml(villager.id)}" style="left: ${pos.x}%; top: ${pos.y}%;" title="${T.escapeHtml(title)}"><img src="${T.escapeHtml(villager.avatar || T.residentAvatarPath(villager.id))}" alt=""></button>`;
      }).join("");
    }).join("");
    const hotspotOptions = {
      noticeBoardOpen: Boolean(options.noticeBoardOpen),
      noticeBoardAsset,
      selectedHotspotId: options.selectedHotspotId || ""
    };
    const mapClasses = [
      "map-visual",
      mapZoomClass(options.viewport),
      options.selectedHotspotId ? " has-selected-hotspot" : ""
    ].join("").trim();
    const mapScale = viewportScale(options.viewport);
    const residentSpriteSheet = T.escapeHtml(T.assets.residentSpriteSheet || "");

    container.innerHTML = `
      <div class="${mapClasses}" style="--map-scale: ${mapScale}; --resident-sprite-sheet: url('${residentSpriteSheet}');" aria-label="枫溪镇像素地图">
        ${renderMapControls(options.viewport)}
        ${renderStageHud(engine, playback, activeStage)}
        ${renderActionLegend(activeStage)}
        <div class="map-stage-viewport">
          <div class="map-stage-surface" style="${viewportStyle(options.viewport)}">
            <img class="map-image" src="${T.escapeHtml(T.assets.townMap)}" alt="枫溪镇 2D 小镇地图">
            <div class="map-shade" aria-hidden="true"></div>
            ${renderWeatherLayer(engine, options)}
            <div class="zone-marker-layer">${labels}</div>
            <div class="map-hotspot-layer">${renderHotspots(hotspotOptions)}</div>
            <div class="resident-token-layer">${tokens}</div>
            <div class="stage-dialogue-layer">${renderDialogues(activeStage)}</div>
          </div>
        </div>
        ${renderStageControls(playback, stageIndex, options.playbackPlaying !== false)}
        ${renderHotspotInspector(engine, activeStage, options.selectedHotspotId)}
      </div>
    `;
  }

  function renderResidentCard(container, engine, options = {}) {
    if (!container) return;
    const villager = options.villager || null;
    if (!villager) {
      container.innerHTML = `<div class="empty compact">镇上还没有居民。</div>`;
      return;
    }

    const recent = villager.recentAction || {};
    const planItems = (villager.todayPlan?.slots || []).map((plan) => `
      <li>
        <span>${T.escapeHtml(plan.slot)}</span>
        <strong>${T.escapeHtml(plan.shortTitle)}</strong>
        <em>${T.escapeHtml(plan.zoneName)}</em>
      </li>
    `).join("");

    container.className = `resident-card ${recent.kind || "quiet"}`;
    container.innerHTML = `
      <div class="resident-card-head">
        <span class="resident-avatar"><img src="${T.escapeHtml(villager.avatar || T.residentAvatarPath(villager.id))}" alt=""></span>
        <div>
          <h3>${T.escapeHtml(villager.name)}</h3>
          <p>${T.escapeHtml(recent.zone || engine.zoneName(villager.zone))}</p>
        </div>
      </div>
      <div class="resident-facts">
        <span>地点 ${T.escapeHtml(recent.place || engine.placeName(villager.location))}</span>
        <span>背包 ${T.escapeHtml(T.storageSummary(villager.storage))}</span>
        <span>健康 ${villager.health}</span>
        <span>体力 ${villager.energy}</span>
        <span>金币 ${villager.coins}</span>
      </div>
      <p class="resident-action">${T.escapeHtml(recent.text || `${villager.name}今天还没留下新的行动。`)}</p>
      <div class="resident-plan">
        <div class="resident-plan-title">今日计划</div>
        <ol>${planItems}</ol>
      </div>
      <div class="resident-bars" aria-label="${T.escapeHtml(villager.name)} 的基础状态">
        <span style="--value: ${T.clamp(villager.health, 0, 100)}%;">健康</span>
        <span style="--value: ${T.clamp(villager.energy, 0, 100)}%;">体力</span>
        <span style="--value: ${T.clamp(villager.coins / 3, 0, 100)}%;">金币</span>
      </div>
    `;
  }

  T.residentMapPanel = {
    renderMap,
    renderResidentCard
  };
}());
