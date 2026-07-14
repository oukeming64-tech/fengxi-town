(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const rules = T.townRelationshipRules || {};
  const interactions = T.townRelationshipInteractions || {};
  const publicLedger = T.townRelationshipPublic || {};

  const version = "town-relationship-ledger-v0.2.0-local";
  const mode = "local-rules-first";

  function ensureLedger(state) {
    if (!state.relationships || typeof state.relationships !== "object") {
      state.relationships = {};
    }
    const ledger = state.relationships;
    ledger.version = version;
    ledger.mode = mode;
    ledger.pairs = ledger.pairs || {};
    ledger.recentInteractions = Array.isArray(ledger.recentInteractions) ? ledger.recentInteractions : [];
    ledger.dailySummaries = Array.isArray(ledger.dailySummaries) ? ledger.dailySummaries : [];
    ledger.publicSummary = Array.isArray(ledger.publicSummary) ? ledger.publicSummary : [];
    return ledger;
  }

  function updateRelationships(state, context = {}, settlement = null) {
    const ledger = ensureLedger(state);
    const residentMap = interactions.residentsById(context);
    if (residentMap.size < 2) {
      return { interactions: [], summary: publicLedger.summarizeLedger(ledger) };
    }

    const logs = interactions.logsFromContext(context, residentMap);
    const candidates = interactions.candidatePairs(logs, context, residentMap);
    const targetCount = rules.clamp(Math.ceil(Math.max(logs.length, residentMap.size / 2) / 6), 3, 8);
    const relationshipChanges = [];
    const touchedPairs = new Set();

    candidates.forEach(([log, otherLog]) => {
      if (relationshipChanges.length >= targetCount) return;
      const key = rules.pairKey(log.residentId, otherLog.residentId);
      if (touchedPairs.has(key)) return;
      touchedPairs.add(key);
      const memory = interactions.makeInteraction({ state, ledger, context, log, otherLog });
      if (memory) relationshipChanges.push(memory);
    });

    const summary = publicLedger.summarizeLedger(ledger);
    ledger.summary = summary;
    ledger.publicSummary = publicLedger.relationshipSummaryLines(ledger, summary);
    ledger.dailySummaries.push({
      day: state.day,
      interactionCount: relationshipChanges.length,
      activePairCount: summary.activePairCount,
      tensePairCount: summary.tensePairCount,
      alliancePairCount: summary.alliancePairCount
    });
    if (ledger.dailySummaries.length > 30) ledger.dailySummaries.shift();
    if (settlement) {
      settlement.relationshipChanges = relationshipChanges;
      settlement.relationshipSummary = summary;
    }
    return { interactions: relationshipChanges, summary };
  }

  function publicSnapshot(state, options = {}) {
    return publicLedger.publicSnapshot(ensureLedger(state || {}), options);
  }

  function stageHighlights(state) {
    return publicLedger.stageHighlights?.(ensureLedger(state || {})) || null;
  }

  function makeReportSection(state, settlement) {
    return publicLedger.makeReportSection(state, settlement);
  }

  T.townRelationshipLedger = {
    version,
    mode,
    typeLabels: rules.typeLabels,
    ensureLedger,
    updateRelationships,
    publicSnapshot,
    stageHighlights,
    makeReportSection
  };
}());
