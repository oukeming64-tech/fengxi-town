(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const visuals = Object.freeze({
    gift: Object.freeze({ label: "送礼", icon: "🎁" }),
    help: Object.freeze({ label: "帮忙", icon: "🔧" }),
    closeness: Object.freeze({ label: "靠近", icon: "●●" }),
    friction: Object.freeze({ label: "摩擦", icon: "⚡" }),
    mediation: Object.freeze({ label: "调解", icon: "⇄" })
  });

  function acceptedCue(cue) {
    return Boolean(
      cue?.cueType === "social"
      && visuals[cue.socialCue]
      && cue.immutableState === true
      && Object.isFrozen(cue)
      && ["local-relationship-event", "public-relationship-memory"].includes(cue.source)
      && /^rel-[a-z0-9-]+$/i.test(String(cue.sourceEventId || ""))
      && /^v\d{2}$/.test(String(cue.residentId || ""))
      && /^v\d{2}$/.test(String(cue.targetResidentId || ""))
      && cue.residentId !== cue.targetResidentId
    );
  }

  function labelFor(cue) {
    return visuals[cue?.socialCue]?.label || "";
  }

  function selectForStage(cues = [], activeStage = null, limit = 5) {
    const positions = new Map((activeStage?.events || []).map((event) => [event.residentId, event]));
    const usedResidents = new Set();
    const hotspotCounts = new Map();
    const selected = [];
    cues.forEach((cue) => {
      if (selected.length >= limit || !acceptedCue(cue)) return;
      if (!positions.has(cue.residentId) || !positions.has(cue.targetResidentId)) return;
      if (usedResidents.has(cue.residentId) || usedResidents.has(cue.targetResidentId)) return;
      const actor = positions.get(cue.residentId);
      const target = positions.get(cue.targetResidentId);
      const sharedHotspot = actor.hotspotId && actor.hotspotId === target.hotspotId ? actor.hotspotId : "";
      if (sharedHotspot && (hotspotCounts.get(sharedHotspot) || 0) >= 2) return;
      usedResidents.add(cue.residentId);
      usedResidents.add(cue.targetResidentId);
      if (sharedHotspot) hotspotCounts.set(sharedHotspot, (hotspotCounts.get(sharedHotspot) || 0) + 1);
      selected.push(Object.freeze({
        cue,
        actor,
        target
      }));
    });
    return Object.freeze(selected);
  }

  function residentAssignments(selected = []) {
    const assignments = new Map();
    selected.forEach(({ cue }) => {
      assignments.set(cue.residentId, Object.freeze({ cue, role: "actor" }));
      assignments.set(cue.targetResidentId, Object.freeze({ cue, role: "target" }));
    });
    return assignments;
  }

  function renderOne(item) {
    const { cue, actor, target } = item;
    const visual = visuals[cue.socialCue];
    const x1 = Number(actor.x) || 0;
    const y1 = Number(actor.y) || 0;
    const x2 = Number(target.x) || 0;
    const y2 = Number(target.y) || 0;
    const midX = Math.round(((x1 + x2) / 2) * 100) / 100;
    const midY = Math.round(((y1 + y2) / 2) * 100) / 100;
    return `
      <div class="resident-social-link social-${cue.socialCue}" data-social-cue="${cue.socialCue}" data-cue-source="${T.escapeHtml(cue.sourceEventId)}" style="--social-mid-x:${midX}%; --social-mid-y:${midY}%; --social-duration:${Math.max(400, Number(cue.durationMs) || 1600)}ms;">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>
        </svg>
        <span class="resident-social-badge" aria-hidden="true">
          <span class="resident-social-icon">${visual.icon}</span>
          <strong>${visual.label}</strong>
        </span>
      </div>
    `;
  }

  function render(selected = []) {
    if (!selected.length) return "";
    return `<div class="resident-social-cue-layer" aria-label="当前关系行动">${selected.map(renderOne).join("")}</div>`;
  }

  function renderLegend() {
    return `<div class="resident-social-legend" aria-label="关系动作图例">${Object.entries(visuals).map(([key, value]) => (
      `<span class="social-${key}"><i aria-hidden="true">${value.icon}</i>${value.label}</span>`
    )).join("")}</div>`;
  }

  T.residentSocialCueLayer = {
    version: "resident-social-cue-layer-v0.1.8-c",
    acceptedCue,
    labelFor,
    selectForStage,
    residentAssignments,
    render,
    renderLegend
  };
}());
