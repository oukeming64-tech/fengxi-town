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

  function socialCuesForStage(engine, playback, activeStage) {
    const relationshipSnapshot = T.townRelationshipLedger?.publicSnapshot?.(engine.state) || null;
    const events = (relationshipSnapshot?.recentInteractions || []).filter((event) => (
      Number(event.day) === Number(playback?.day)
      && String(event.slot || "") === String(activeStage?.label || "")
    ));
    return T.relationshipVisualCues?.fromSources?.({ events }) || Object.freeze([]);
  }

  function bindMapImageFallback(container, festivalTheme) {
    if (!festivalTheme?.isFestivalMap) return;
    const image = container.querySelector?.(".map-image");
    if (!image) return;
    image.addEventListener("error", () => {
      if (image.dataset.fallbackApplied === "true") return;
      image.dataset.fallbackApplied = "true";
      image.src = festivalTheme.fallbackMapAsset;
      image.alt = "枫溪镇默认 2D 小镇地图";
      const surface = image.closest?.(".map-stage-surface");
      if (surface) {
        surface.dataset.mapPackageId = "default";
        surface.dataset.mapFallback = "asset-load-error";
      }
    }, { once: true });
  }

  function renderMap(container, engine, options = {}) {
    if (!container) return;
    const current = options.current || null;
    const noticeBoardAsset = options.noticeBoardAsset || T.assets.noticeBoard || "../assets/runtime/maple-creek-notice-board-v0.0.6.svg";
    const playback = playbackFor(engine, options);
    const stageIndex = T.clamp(Number(options.stageIndex) || 0, 0, Math.max(0, (playback?.stages?.length || 1) - 1));
    const activeStage = activeStageFor(playback, stageIndex);
    const activeEvents = new Map((activeStage?.events || []).map((event) => [event.residentId, event]));
    const socialCues = socialCuesForStage(engine, playback, activeStage);
    const selectedSocialCues = T.residentSocialCueLayer?.selectForStage?.(socialCues, activeStage) || [];
    const socialAssignments = T.residentSocialCueLayer?.residentAssignments?.(selectedSocialCues) || new Map();
    const animateStageMove = Boolean(options.animateStageMove);
    const festivalTheme = T.townStageFestivalTheme?.resolveForState?.({
      day: engine.state.townState?.day || engine.state.day || playback?.day,
      seasonKey: engine.state.townState?.seasonKey || "spring"
    }) || null;
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
        const lifeCue = event
          ? T.townStageLifeCues?.forEvent?.(event, { startsAt: `${playback?.day || "day"}:${activeStage?.key || stageIndex}` })
          : null;
        const socialAssignment = socialAssignments.get(villager.id) || null;
        const visibleAction = T.townStageLifeCues?.labelFor?.(lifeCue) || event?.animationLabel || "停留";
        const visibleRelationship = T.residentSocialCueLayer?.labelFor?.(socialAssignment?.cue);
        if (T.residentSpriteLayer?.renderToken) {
          return T.residentSpriteLayer.renderToken({
            villager,
            event,
            position: pos,
            depth: event?.depth ?? pos.y,
            movement,
            lifeCue,
            socialAssignment,
            selected,
            kind: event?.kind || villager.recentAction?.kind || "quiet",
            title,
            ariaLabel: `${villager.name}，${event?.hotspotLabel || zone.name}，${visibleAction}${visibleRelationship ? `，关系动作：${visibleRelationship}` : ""}`,
            actionCueHtml: T.residentActionCue?.render?.(event) || ""
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
      T.townMapChrome.mapZoomClass(options.viewport),
      options.selectedHotspotId ? " has-selected-hotspot" : ""
    ].join("").trim();
    const mapScale = T.townMapChrome.viewportScale(options.viewport);
    const residentSpriteSheet = T.escapeHtml(T.assets.residentSpriteSheet || "");

    container.innerHTML = `
      <div class="${mapClasses}" style="--map-scale: ${mapScale}; --resident-sprite-sheet: url('${residentSpriteSheet}');" aria-label="枫溪镇像素地图">
        ${T.townMapChrome.renderMapControls(options.viewport)}
        ${T.townMapChrome.renderStageHud(engine, playback, activeStage, festivalTheme)}
        ${T.townMapChrome.renderActionLegend(activeStage)}
        <div class="map-stage-viewport">
          <div class="map-stage-surface" data-map-package-id="${T.escapeHtml(festivalTheme?.mapPackage?.id || "default")}" data-festival-id="${T.escapeHtml(festivalTheme?.festivalId || "")}" data-festival-phase="${T.escapeHtml(festivalTheme?.phase || "none")}" style="${T.townMapChrome.viewportStyle(options.viewport)}">
            <img class="map-image" src="${T.escapeHtml(festivalTheme?.mapAsset || T.assets.townMap)}" alt="${T.escapeHtml(festivalTheme?.mapAlt || "枫溪镇 2D 小镇地图")}">
            <div class="map-shade" aria-hidden="true"></div>
            ${T.townMapChrome.renderWeatherLayer(engine, options)}
            <div class="zone-marker-layer">${labels}</div>
            <div class="map-hotspot-layer">${T.townMapHotspotLayer.renderHotspots(hotspotOptions)}</div>
            ${T.facilityMapLayer?.render?.(engine, { playback, activeStage }) || ""}
            <div class="resident-token-layer">${tokens}</div>
            ${T.residentSocialCueLayer?.render?.(selectedSocialCues) || ""}
            <div class="stage-dialogue-layer">${T.townMapDialogueLayer?.render?.(engine, { playback, activeStage, socialCues: selectedSocialCues }) || ""}</div>
          </div>
        </div>
        ${T.residentSocialCueLayer?.renderLegend?.() || ""}
        ${T.townMapChrome.renderStageControls(playback, stageIndex, options.playbackPlaying !== false)}
        ${T.townMapHotspotLayer.renderInspector(engine, activeStage, options.selectedHotspotId)}
      </div>
    `;
    bindMapImageFallback(container, festivalTheme);
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
