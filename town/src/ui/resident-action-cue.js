(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function render(event) {
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
        ${iconImage}<i></i><i></i><i></i>
      </span>
    `;
  }

  T.residentActionCue = {
    version: "resident-action-cue-v0.1.6-local",
    render
  };
}());
