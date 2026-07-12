(function () {
  const T = window.MorningTown || (window.MorningTown = {});

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
    return (T.townStage?.hotspots || []).map((hotspot) => renderHotspotButton(hotspot, options)).join("");
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

  function renderInspector(engine, activeStage, selectedHotspotId) {
    const hotspot = T.townStage?.byId?.get(selectedHotspotId);
    if (!hotspot) return "";
    const activities = activityNames(hotspot);
    const residents = residentNamesNear(engine, activeStage, hotspot);
    return `
      <aside class="map-hotspot-inspector" aria-live="polite">
        <div class="inspector-kicker">${T.escapeHtml(engine.zoneName(hotspot.zoneId))} · ${T.escapeHtml(hotspot.kind)}</div>
        <h3>${T.escapeHtml(hotspot.label)}</h3>
        <p>${T.escapeHtml(hotspot.description || "本地已审核活动的地图锚点。")}</p>
        <div class="inspector-list"><span>活动</span><strong>${T.escapeHtml(activities.join(" / ") || "待绑定")}</strong></div>
        <div class="inspector-list"><span>附近</span><strong>${T.escapeHtml(residents.join("、") || "暂时没人停在这里")}</strong></div>
      </aside>
    `;
  }

  T.townMapHotspotLayer = {
    version: "town-map-hotspot-layer-v0.1.6-local",
    activityNames,
    renderHotspots,
    renderInspector
  };
}());
