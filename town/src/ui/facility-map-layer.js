(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function render(engine, options = {}) {
    const snapshot = engine.publicTownSnapshot?.();
    if (!snapshot || !T.townStageFacilityFeedback?.feedbackFor) return "";
    const feedback = T.townStageFacilityFeedback.feedbackFor(snapshot, {
      activeStage: options.activeStage,
      day: options.playback?.day || snapshot.day
    });
    if (!feedback.length) return "";
    return `
      <div class="facility-state-layer" aria-label="设施公开状态">
        ${feedback.map((item) => `
          <div class="facility-state-marker is-${T.escapeHtml(item.key)}" data-facility-id="${T.escapeHtml(item.facilityId)}" data-facility-source="${T.escapeHtml(item.source)}" style="left: ${item.x}%; top: ${item.y}%;" role="status" aria-label="${T.escapeHtml(`${item.facilityName}：${item.label}，${item.detail}`)}">
            <span class="facility-state-dot" aria-hidden="true"></span>
            <span class="facility-state-copy"><strong>${T.escapeHtml(item.label)}</strong></span>
          </div>
        `).join("")}
      </div>
    `;
  }

  T.facilityMapLayer = {
    version: "facility-map-layer-v0.1.6-local",
    render
  };
}());
