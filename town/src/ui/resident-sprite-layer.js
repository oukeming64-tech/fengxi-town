(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function classToken(value, fallback = "quiet") {
    return String(value || fallback).replace(/[^a-z0-9-]/gi, "") || fallback;
  }

  function residentCell(villager) {
    const atlas = T.townStageData?.residentSpriteAtlas || { columns: 6, rows: 5 };
    const columns = Math.max(1, Number(atlas.columns) || 6);
    const rows = Math.max(1, Number(atlas.rows) || 5);
    const number = Number(String(villager?.id || "").replace(/\D/g, "")) || 1;
    const index = T.clamp(number - 1, 0, columns * rows - 1);
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      index,
      column,
      row,
      x: columns <= 1 ? 0 : Math.round((column / (columns - 1)) * 10000) / 100,
      y: rows <= 1 ? 0 : Math.round((row / (rows - 1)) * 10000) / 100
    };
  }

  function renderPhysicalProp(lifeCue) {
    if (lifeCue?.propKey === "watering-can") {
      return `
        <span class="resident-held-prop prop-watering-can" aria-hidden="true">
          <span class="watering-can-body"></span>
          <i></i><i></i><i></i>
        </span>
      `;
    }
    if (lifeCue?.propKey === "crate") {
      const source = T.assets.actionCueDir ? `${T.assets.actionCueDir}/action-cue-carry-v0.1.4.png` : "";
      return source
        ? `<span class="resident-held-prop prop-crate" aria-hidden="true"><img src="${T.escapeHtml(source)}" alt=""></span>`
        : "";
    }
    const assetByProp = {
      harvest: "field",
      field: "field",
      repair: "repair",
      trade: "trade",
      sell: "sell",
      notice: "notice",
      audit: "audit",
      chat: "chat",
      rest: "rest"
    };
    const assetKey = assetByProp[lifeCue?.propKey];
    const source = assetKey && T.assets.actionCueDir
      ? `${T.assets.actionCueDir}/action-cue-${assetKey}-v0.1.4.png`
      : "";
    if (source) {
      return `
        <span class="resident-held-prop prop-action prop-${classToken(lifeCue.propKey)}" aria-hidden="true">
          <img src="${T.escapeHtml(source)}" alt=""><i></i><i></i><i></i>
        </span>
      `;
    }
    return "";
  }

  function renderToken(options = {}) {
    const villager = options.villager || {};
    const event = options.event || null;
    const position = options.position || { x: 50, y: 50 };
    const depth = Math.round(T.clamp(Number(options.depth ?? position.y) || 0, 0, 100));
    const movement = options.movement || null;
    const lifeCue = options.lifeCue || null;
    const socialAssignment = options.socialAssignment || null;
    const socialCue = socialAssignment?.cue || null;
    const physicalPropHtml = renderPhysicalProp(lifeCue);
    const cell = residentCell(villager);
    const actionKey = classToken(event?.animationKey, "idle");
    const tone = classToken(event?.animationTone, "quiet");
    const kind = classToken(event?.kind || options.kind, "quiet");
    const selected = options.selected ? " is-selected" : "";
    const staged = event ? ` is-stage-token action-${actionKey} tone-${tone}` : "";
    const lifeMotion = lifeCue?.motionKey ? ` has-life-cue life-${classToken(lifeCue.motionKey, "idle")}` : "";
    const physicalProp = physicalPropHtml ? ` has-physical-prop prop-${classToken(lifeCue.propKey, "none")}` : "";
    const socialClass = socialCue?.socialCue
      ? ` has-social-cue social-${classToken(socialCue.socialCue)} social-role-${classToken(socialAssignment.role)}`
      : "";
    const travelling = movement?.from && movement?.to ? " is-travelling" : "";
    const durationMs = Math.max(1, Number(movement?.durationMs) || 1);
    const movementPoints = movement?.points?.length === 5
      ? movement.points
      : [movement?.from, movement?.from, movement?.to, movement?.to, movement?.to].filter(Boolean);
    const movementStyle = movement?.from && movement?.to
      ? movementPoints.map((point, index) => `--travel-point-${index}-x: ${point.x}%; --travel-point-${index}-y: ${point.y}%;`).join(" ") + ` --travel-duration: ${durationMs}ms;`
      : "";
    const socialStyle = socialCue ? ` --social-duration: ${Math.max(400, Number(socialCue.durationMs) || 1600)}ms;` : "";
    const avatar = villager.avatar || T.residentAvatarPath(villager.id);
    return `
      <button type="button" class="resident-token has-resident-sprite ${kind}${selected}${staged}${lifeMotion}${physicalProp}${socialClass}${travelling}" data-villager-id="${T.escapeHtml(villager.id)}" data-hotspot-id="${T.escapeHtml(event?.hotspotId || "")}" data-layout-index="${Number(event?.layoutIndex ?? 0)}" data-layout-size="${Number(event?.layoutSize ?? 1)}" data-action-key="${T.escapeHtml(actionKey)}" data-life-motion="${T.escapeHtml(lifeCue?.motionKey || "")}" data-prop-key="${T.escapeHtml(lifeCue?.propKey || "")}" data-cue-source="${T.escapeHtml(lifeCue?.sourceEventId || "")}" data-social-cue="${T.escapeHtml(socialCue?.socialCue || "")}" data-social-source="${T.escapeHtml(socialCue?.sourceEventId || "")}" data-social-role="${T.escapeHtml(socialAssignment?.role || "")}" data-sprite-index="${cell.index}" data-resident-depth="${depth}" style="left: ${position.x}%; top: ${position.y}%; --resident-depth: ${depth}; --resident-sprite-x: ${cell.x}%; --resident-sprite-y: ${cell.y}%; ${movementStyle}${socialStyle}" title="${T.escapeHtml(options.title || villager.name || "居民")}" aria-label="${T.escapeHtml(options.ariaLabel || villager.name || "居民")}">
        <span class="resident-ground-shadow" aria-hidden="true"></span>
        ${socialCue ? `<span class="resident-social-ring" aria-hidden="true"></span>` : ""}
        <span class="resident-sprite" aria-hidden="true"><span class="resident-sprite-frame"></span></span>
        ${physicalPropHtml}
        <span class="resident-avatar-pin" aria-hidden="true"><img src="${T.escapeHtml(avatar)}" alt=""></span>
        ${options.actionCueHtml || ""}
      </button>
    `;
  }

  T.residentSpriteLayer = {
    version: "resident-sprite-layer-v0.1.5-local",
    residentCell,
    renderPhysicalProp,
    renderToken
  };
}());
