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
  const trackingFrames = new WeakMap();

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
    const { minX, maxX, minY, maxY } = positionBounds(dialogueType);
    return offsets.map(([offsetX, offsetY]) => ({
      x: T.clamp(Math.round((baseX + direction * offsetX) * 100) / 100, minX, maxX),
      y: T.clamp(Math.round((baseY + offsetY) * 100) / 100, minY, maxY)
    }));
  }

  function positionBounds(dialogueType) {
    const size = dialogueSizes[dialogueTypeFor({ dialogueType })];
    return {
      minX: Math.max(10, size.halfWidth + 2),
      maxX: Math.min(90, 100 - size.halfWidth - 2),
      minY: Math.max(12, size.halfHeight + 3),
      maxY: Math.min(70, 100 - size.halfHeight - 3)
    };
  }

  function trackedPosition(anchorPoints, offset = {}, dialogueType = "exchange") {
    if (!anchorPoints.length) return null;
    const origin = anchorPoints.reduce((position, point) => ({
      x: position.x + Number(point.x || 0) / anchorPoints.length,
      y: position.y + Number(point.y || 0) / anchorPoints.length
    }), { x: 0, y: 0 });
    const { minX, maxX, minY, maxY } = positionBounds(dialogueType);
    return {
      x: Math.round(T.clamp(origin.x + Number(offset.x || 0), minX, maxX) * 100) / 100,
      y: Math.round(T.clamp(origin.y + Number(offset.y || 0), minY, maxY) * 100) / 100
    };
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
    const anchorResidentIds = (encounter.residentIds || []).filter(Boolean).join(",");
    const offsetX = Math.round((encounter.displayX - Number(encounter.x || 50)) * 100) / 100;
    const offsetY = Math.round((encounter.displayY - Number(encounter.y || 50)) * 100) / 100;
    return `
      <div class="stage-dialogue stage-dialogue--${encounter.dialogueType}" role="group" aria-label="${T.escapeHtml(ariaLabel)}" data-dialogue-id="${T.escapeHtml(dialogueId)}" data-dialogue-type="${encounter.dialogueType}" data-dialogue-motif="${T.escapeHtml(encounter.motif || "")}" data-archive-eligible="${Boolean(encounter.archiveEligible)}" data-dialogue-x="${encounter.displayX}" data-dialogue-y="${encounter.displayY}" data-anchor-resident-ids="${T.escapeHtml(anchorResidentIds)}" data-dialogue-offset-x="${offsetX}" data-dialogue-offset-y="${offsetY}" data-dialogue-anchor="resident-midpoint" data-avoids="residents facilities relationships controls" style="left: ${encounter.displayX}%; top: ${encounter.displayY}%;">
        ${importantCue}
        <div class="stage-dialogue__lines">${renderLines(encounter, lines)}</div>
      </div>
    `;
  }

  function residentPoint(resident, surfaceRect) {
    const rect = resident.getBoundingClientRect();
    return {
      x: ((rect.left + rect.width / 2 - surfaceRect.left) / surfaceRect.width) * 100,
      y: ((rect.top + rect.height / 2 - surfaceRect.top) / surfaceRect.height) * 100
    };
  }

  function hasActiveTravel(resident) {
    if (!resident.classList.contains("is-travelling")) return false;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    if (typeof resident.getAnimations !== "function") return true;
    return resident.getAnimations().some((animation) => (
      animation.animationName === "resident-travel" && animation.playState !== "finished"
    ));
  }

  function avoidControlRail(position, dialogue, mapRoot, surfaceRect) {
    const rail = mapRoot.closest?.(".stage-shell")?.querySelector?.(".stage-drawer-rail");
    if (!rail) return position;
    const railRect = rail.getBoundingClientRect();
    if (railRect.left >= surfaceRect.right || railRect.right <= surfaceRect.left) return position;
    const dialogueWidth = dialogue.getBoundingClientRect().width;
    const railLeft = ((railRect.left - surfaceRect.left) / surfaceRect.width) * 100;
    const safeX = railLeft - (dialogueWidth / surfaceRect.width) * 50 - 1.5;
    const { minX } = positionBounds(dialogue.dataset.dialogueType);
    return { ...position, x: Math.round(Math.max(minX, Math.min(position.x, safeX)) * 100) / 100 };
  }

  function syncTrackedDialogues(mapRoot) {
    const surface = mapRoot?.querySelector?.(".map-stage-surface");
    if (!surface) return false;
    const surfaceRect = surface.getBoundingClientRect();
    if (!surfaceRect.width || !surfaceRect.height) return false;
    const residents = new Map([...surface.querySelectorAll(".resident-token[data-villager-id]")]
      .map((resident) => [resident.dataset.villagerId, resident]));
    let hasActiveTracking = false;
    surface.querySelectorAll(".stage-dialogue[data-anchor-resident-ids]").forEach((dialogue) => {
      const anchors = String(dialogue.dataset.anchorResidentIds || "")
        .split(",")
        .map((residentId) => residents.get(residentId))
        .filter(Boolean);
      if (!anchors.length) return;
      let position = trackedPosition(
        anchors.map((resident) => residentPoint(resident, surfaceRect)),
        {
          x: Number(dialogue.dataset.dialogueOffsetX || 0),
          y: Number(dialogue.dataset.dialogueOffsetY || 0)
        },
        dialogue.dataset.dialogueType
      );
      if (!position) return;
      position = avoidControlRail(position, dialogue, mapRoot, surfaceRect);
      dialogue.style.left = `${position.x}%`;
      dialogue.style.top = `${position.y}%`;
      dialogue.dataset.dialogueX = position.x;
      dialogue.dataset.dialogueY = position.y;
      hasActiveTracking = anchors.some(hasActiveTravel) || hasActiveTracking;
    });
    return hasActiveTracking;
  }

  function stopTracking(mapRoot) {
    const frame = trackingFrames.get(mapRoot);
    if (frame !== undefined) window.cancelAnimationFrame?.(frame);
    trackingFrames.delete(mapRoot);
  }

  function bindTracking(mapRoot) {
    stopTracking(mapRoot);
    if (!mapRoot?.querySelector?.(".stage-dialogue[data-anchor-resident-ids]")) return;
    const tick = () => {
      if (syncTrackedDialogues(mapRoot)) {
        trackingFrames.set(mapRoot, window.requestAnimationFrame(tick));
      } else {
        trackingFrames.delete(mapRoot);
      }
    };
    trackingFrames.set(mapRoot, window.requestAnimationFrame(tick));
  }

  function render(engine, options = {}) {
    const activeStage = options.activeStage || null;
    const facilityFeedback = T.facilityMapLayer?.feedbackFor?.(engine, options) || [];
    return layoutDialogues(activeStage, facilityFeedback, options.socialCues || [])
      .map(renderDialogue)
      .join("");
  }

  T.townMapDialogueLayer = {
    version: "town-map-dialogue-layer-v0.2.3-resident-follow",
    dialogueTypeFor,
    socialBlocksFor,
    layoutDialogues,
    trackedPosition,
    syncTrackedDialogues,
    bindTracking,
    render
  };
}());
