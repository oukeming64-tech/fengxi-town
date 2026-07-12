(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const dialogueSize = { halfWidth: 10.5, halfHeight: 4.8 };

  function blockForPoint(point, halfWidth, halfHeight) {
    return { x: Number(point.x || 0), y: Number(point.y || 0), halfWidth, halfHeight };
  }

  function overlaps(left, right) {
    return Math.abs(left.x - right.x) < left.halfWidth + right.halfWidth &&
      Math.abs(left.y - right.y) < left.halfHeight + right.halfHeight;
  }

  function candidatePoints(encounter, index) {
    const baseX = Number(encounter.x || 50);
    const baseY = Number(encounter.y || 50);
    const direction = index % 2 ? -1 : 1;
    return [
      { x: baseX + direction * 17, y: baseY - 14 },
      { x: baseX - direction * 17, y: baseY - 14 },
      { x: baseX + direction * 21, y: baseY + 12 },
      { x: baseX - direction * 21, y: baseY + 12 },
      { x: baseX, y: baseY - 19 },
      { x: baseX + direction * 23, y: baseY },
      { x: baseX - direction * 23, y: baseY },
      { x: baseX, y: baseY + 16 }
    ].map((point) => ({
      x: T.clamp(Math.round(point.x * 100) / 100, 12, 88),
      y: T.clamp(Math.round(point.y * 100) / 100, 14, 68)
    }));
  }

  function candidateScore(candidate, origin, blocks, placed) {
    const rect = { ...candidate, ...dialogueSize };
    const blockedScore = blocks.reduce((score, block) => score + (overlaps(rect, block) ? 120 : 0), 0);
    const dialogueScore = placed.reduce((score, block) => score + (overlaps(rect, block) ? 260 : 0), 0);
    const bottomPenalty = candidate.y > 64 ? (candidate.y - 64) * 7 : 0;
    const travelDistance = Math.abs(candidate.x - origin.x) * 0.08 + Math.abs(candidate.y - origin.y) * 0.12;
    return blockedScore + dialogueScore + bottomPenalty + travelDistance;
  }

  function layoutDialogues(activeStage, facilityFeedback = []) {
    const activeResidentIds = new Set((activeStage?.events || []).map((event) => event.residentId));
    const encounters = (activeStage?.encounters || [])
      .filter((encounter) => (encounter.residentIds || []).every((id) => activeResidentIds.has(id)))
      .slice(0, 2);
    const residentBlocks = (activeStage?.events || []).map((event) => blockForPoint(event, 4.2, 5.8));
    const facilityBlocks = facilityFeedback.map((item) => blockForPoint({ x: item.x, y: item.y - 2 }, 3.6, 2.2));
    const placed = [];
    return encounters.map((encounter, index) => {
      const origin = { x: Number(encounter.x || 50), y: Number(encounter.y || 50) };
      const candidates = candidatePoints(encounter, index);
      const position = candidates
        .map((candidate) => ({ candidate, score: candidateScore(candidate, origin, [...residentBlocks, ...facilityBlocks], placed) }))
        .sort((a, b) => a.score - b.score)[0].candidate;
      placed.push({ ...position, ...dialogueSize });
      return { ...encounter, displayX: position.x, displayY: position.y };
    });
  }

  function render(engine, options = {}) {
    const activeStage = options.activeStage || null;
    const facilityFeedback = T.facilityMapLayer?.feedbackFor?.(engine, options) || [];
    return layoutDialogues(activeStage, facilityFeedback).map((encounter) => {
      const text = (encounter.lines || []).slice(0, 2).map((line) => `${line.speakerName || line.speakerId}：${line.text}`).join(" / ");
      return `
        <div class="stage-dialogue" data-dialogue-id="${T.escapeHtml(encounter.id)}" data-dialogue-x="${encounter.displayX}" data-dialogue-y="${encounter.displayY}" data-avoids="residents facilities controls" style="left: ${encounter.displayX}%; top: ${encounter.displayY}%;">
          <span>${T.escapeHtml(encounter.hotspotLabel || "相遇")}</span>
          <p>${T.escapeHtml(text)}</p>
        </div>
      `;
    }).join("");
  }

  T.townMapDialogueLayer = {
    version: "town-map-dialogue-layer-v0.1.6-local-collision-aware",
    layoutDialogues,
    render
  };
}());
