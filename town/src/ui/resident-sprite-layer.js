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

  function renderToken(options = {}) {
    const villager = options.villager || {};
    const event = options.event || null;
    const position = options.position || { x: 50, y: 50 };
    const movement = options.movement || null;
    const cell = residentCell(villager);
    const actionKey = classToken(event?.animationKey, "idle");
    const tone = classToken(event?.animationTone, "quiet");
    const kind = classToken(event?.kind || options.kind, "quiet");
    const selected = options.selected ? " is-selected" : "";
    const staged = event ? ` is-stage-token action-${actionKey} tone-${tone}` : "";
    const travelling = movement?.from && movement?.to ? " is-travelling" : "";
    const durationMs = Math.max(1, Number(movement?.durationMs) || 1);
    const movementStyle = movement?.from && movement?.to
      ? `--travel-from-x: ${movement.from.x}%; --travel-from-y: ${movement.from.y}%; --travel-to-x: ${movement.to.x}%; --travel-to-y: ${movement.to.y}%; --travel-duration: ${durationMs}ms;`
      : "";
    const avatar = villager.avatar || T.residentAvatarPath(villager.id);
    return `
      <button type="button" class="resident-token has-resident-sprite ${kind}${selected}${staged}${travelling}" data-villager-id="${T.escapeHtml(villager.id)}" data-action-key="${T.escapeHtml(actionKey)}" data-sprite-index="${cell.index}" style="left: ${position.x}%; top: ${position.y}%; --resident-sprite-x: ${cell.x}%; --resident-sprite-y: ${cell.y}%; ${movementStyle}" title="${T.escapeHtml(options.title || villager.name || "居民")}" aria-label="${T.escapeHtml(options.ariaLabel || villager.name || "居民")}">
        <span class="resident-ground-shadow" aria-hidden="true"></span>
        <span class="resident-sprite" aria-hidden="true"><span class="resident-sprite-frame"></span></span>
        <span class="resident-avatar-pin" aria-hidden="true"><img src="${T.escapeHtml(avatar)}" alt=""></span>
        ${options.actionCueHtml || ""}
      </button>
    `;
  }

  T.residentSpriteLayer = {
    version: "resident-sprite-layer-v0.1.5-local",
    residentCell,
    renderToken
  };
}());
