(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const dialogueSizes = {
    ambient: { halfWidth: 9.5, halfHeight: 3.2 },
    exchange: { halfWidth: 12.5, halfHeight: 7.4 },
    important: { halfWidth: 11.6, halfHeight: 5 }
  };
  const typeLabels = {
    ambient: "现场碎语",
    exchange: "现场交流",
    important: "重要交流"
  };

  function dialogueTypeFor(encounter) {
    return Object.hasOwn(dialogueSizes, encounter?.dialogueType)
      ? encounter.dialogueType
      : "exchange";
  }

  function blockForPoint(point, halfWidth, halfHeight) {
    return { x: Number(point.x || 0), y: Number(point.y || 0), halfWidth, halfHeight };
  }

  function overlaps(left, right) {
    return Math.abs(left.x - right.x) < left.halfWidth + right.halfWidth &&
      Math.abs(left.y - right.y) < left.halfHeight + right.halfHeight;
  }

  function candidatePoints(encounter, index, dialogueType) {
    const baseX = Number(encounter.x || 50);
    const baseY = Number(encounter.y || 50);
    const direction = index % 2 ? -1 : 1;
    const offsets = dialogueType === "ambient"
      ? [[0, -9], [11, -6], [-11, -6], [12, 6], [-12, 6], [0, 10], [14, 0], [-14, 0]]
      : dialogueType === "important"
        ? [[0, -11], [13, -8], [-13, -8], [14, 8], [-14, 8], [0, 12], [16, 0], [-16, 0]]
        : [[0, -13], [14, -9], [-14, -9], [15, 9], [-15, 9], [0, 14], [17, 0], [-17, 0]];
    const size = dialogueSizes[dialogueType];
    const minX = Math.max(10, size.halfWidth + 2);
    const maxX = Math.min(90, 100 - size.halfWidth - 2);
    const minY = Math.max(12, size.halfHeight + 3);
    const maxY = Math.min(70, 100 - size.halfHeight - 3);
    return offsets.map(([offsetX, offsetY]) => ({
      x: T.clamp(Math.round((baseX + direction * offsetX) * 100) / 100, minX, maxX),
      y: T.clamp(Math.round((baseY + offsetY) * 100) / 100, minY, maxY)
    }));
  }

  function candidateScore(candidate, origin, size, blocks, placed) {
    const rect = { ...candidate, ...size };
    const blockedScore = blocks.reduce((score, block) => score + (overlaps(rect, block) ? 160 : 0), 0);
    const dialogueScore = placed.reduce((score, block) => score + (overlaps(rect, block) ? 10000 : 0), 0);
    const bottomPenalty = candidate.y > 64 ? (candidate.y - 64) * 8 : 0;
    const travelDistance = Math.abs(candidate.x - origin.x) * 0.16 + Math.abs(candidate.y - origin.y) * 0.24;
    return blockedScore + dialogueScore + bottomPenalty + travelDistance;
  }

  function socialBlocksFor(selectedSocialCues = []) {
    return selectedSocialCues.map(({ actor, target }) => blockForPoint({
      x: (Number(actor?.x || 0) + Number(target?.x || 0)) / 2,
      y: (Number(actor?.y || 0) + Number(target?.y || 0)) / 2 - 3
    }, 5.8, 3.2));
  }

  function layoutDialogues(activeStage, facilityFeedback = [], selectedSocialCues = []) {
    const activeResidentIds = new Set((activeStage?.events || []).map((event) => event.residentId));
    const encounters = (activeStage?.encounters || [])
      .filter((encounter) => (encounter.residentIds || []).every((id) => activeResidentIds.has(id)))
      .slice(0, 2);
    const residentBlocks = (activeStage?.events || []).map((event) => blockForPoint(event, 4.2, 5.8));
    const facilityBlocks = facilityFeedback.map((item) => blockForPoint({ x: item.x, y: item.y - 2 }, 3.6, 2.2));
    const blocks = [...residentBlocks, ...facilityBlocks, ...socialBlocksFor(selectedSocialCues)];
    const placed = [];
    return encounters.map((encounter, index) => {
      const dialogueType = dialogueTypeFor(encounter);
      const size = dialogueSizes[dialogueType];
      const origin = { x: Number(encounter.x || 50), y: Number(encounter.y || 50) };
      const ranked = candidatePoints(encounter, index, dialogueType)
        .map((candidate) => ({ candidate, score: candidateScore(candidate, origin, size, blocks, placed) }))
        .sort((a, b) => a.score - b.score);
      const selected = placed.length
        ? ranked.find(({ candidate }) => !placed.some((block) => overlaps({ ...candidate, ...size }, block)))
        : ranked[0];
      if (!selected) return null;
      const position = selected.candidate;
      placed.push({ ...position, ...size });
      return { ...encounter, dialogueType, displayX: position.x, displayY: position.y };
    }).filter(Boolean);
  }

  function visibleLinesFor(encounter) {
    const source = Array.isArray(encounter.lines)
      ? encounter.lines
      : encounter.text
        ? [{ speakerId: encounter.residentIds?.[0] || "", speakerName: encounter.speakerName || "", text: encounter.text }]
        : [];
    const limit = encounter.dialogueType === "ambient" || encounter.dialogueType === "important" ? 1 : 3;
    return source.filter((line) => String(line?.text || "").trim()).slice(0, limit);
  }

  function renderLines(encounter, lines) {
    const residentOrder = encounter.residentIds || [];
    return lines.map((line, index) => {
      const speakerId = line.speakerId || "";
      const knownOrder = residentOrder.indexOf(speakerId);
      const speakerOrder = knownOrder >= 0 ? knownOrder % 2 : index % 2;
      const speakerName = line.speakerName || speakerId;
      return `
        <p class="stage-dialogue__line" data-speaker-id="${T.escapeHtml(speakerId)}" data-speaker-order="${speakerOrder}">
          ${speakerName ? `<b class="stage-dialogue__speaker">${T.escapeHtml(speakerName)}</b>` : ""}
          <span class="stage-dialogue__text">${T.escapeHtml(line.text || "")}</span>
        </p>
      `;
    }).join("");
  }

  function renderDialogue(encounter, index) {
    const lines = visibleLinesFor(encounter);
    if (!lines.length && encounter.dialogueType !== "important") return "";
    const speakers = [...new Set(lines.map((line) => line.speakerName || line.speakerId).filter(Boolean))];
    const ariaLabel = `${speakers.length ? `${speakers.join("、")}，` : ""}${typeLabels[encounter.dialogueType]}`;
    const importantCue = encounter.dialogueType === "important"
      ? `<span class="stage-dialogue__cue">有件事值得听完</span>`
      : "";
    const dialogueId = encounter.id || `encounter-${index + 1}`;
    return `
      <div class="stage-dialogue stage-dialogue--${encounter.dialogueType}" role="group" aria-label="${T.escapeHtml(ariaLabel)}" data-dialogue-id="${T.escapeHtml(dialogueId)}" data-dialogue-type="${encounter.dialogueType}" data-dialogue-motif="${T.escapeHtml(encounter.motif || "")}" data-archive-eligible="${Boolean(encounter.archiveEligible)}" data-dialogue-x="${encounter.displayX}" data-dialogue-y="${encounter.displayY}" data-avoids="residents facilities relationships controls" style="left: ${encounter.displayX}%; top: ${encounter.displayY}%;">
        ${importantCue}
        <div class="stage-dialogue__lines">${renderLines(encounter, lines)}</div>
      </div>
    `;
  }

  function render(engine, options = {}) {
    const activeStage = options.activeStage || null;
    const facilityFeedback = T.facilityMapLayer?.feedbackFor?.(engine, options) || [];
    return layoutDialogues(activeStage, facilityFeedback, options.socialCues || [])
      .map(renderDialogue)
      .join("");
  }

  T.townMapDialogueLayer = {
    version: "town-map-dialogue-layer-v0.2.3-local-dialogues",
    dialogueTypeFor,
    socialBlocksFor,
    layoutDialogues,
    render
  };
}());
