(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const rules = T.townRelationshipRules || {};

  const version = "town-relationship-public-v0.0.1-local";

  function summarizeLedger(ledger) {
    const pairs = Object.values(ledger.pairs || {});
    const active = pairs.filter((pair) => pair.lastInteraction);
    const trustTotal = active.reduce((sum, pair) => sum + pair.trust, 0);
    return {
      pairCount: pairs.length,
      activePairCount: active.length,
      recentInteractionCount: ledger.recentInteractions.length,
      tensePairCount: active.filter((pair) => pair.friction >= 16 || pair.exclusion >= 12).length,
      alliancePairCount: active.filter((pair) => pair.allianceTags.length > 0).length,
      averageTrust: active.length ? Math.round(trustTotal / active.length) : rules.defaultTrust
    };
  }

  function relationshipSummaryLines(ledger, summary) {
    const recent = ledger.recentInteractions[ledger.recentInteractions.length - 1];
    const lines = [
      `活跃关系 ${summary.activePairCount} 组，最近互动 ${summary.recentInteractionCount} 条。`,
      `结盟 ${summary.alliancePairCount} 组，紧绷关系 ${summary.tensePairCount} 组，平均信任 ${summary.averageTrust}/100。`
    ];
    if (recent) lines.push(`最近：${recent.summary}`);
    return lines;
  }

  function relationshipTone(pair) {
    if (pair.exclusion >= 18 || pair.friction >= 24) return "紧绷";
    if (pair.allianceTags.length && pair.trust >= 55) return "结盟";
    if (pair.favorDebt && Object.values(pair.favorDebt).some((value) => value >= 5)) return "欠着帮手";
    if (pair.trust >= 54) return "熟络";
    return "普通";
  }

  function publicMemory(memory) {
    if (!memory) return null;
    return {
      id: memory.id,
      day: memory.day,
      slot: memory.slot,
      type: memory.type,
      label: memory.label,
      residentIds: [...memory.residentIds],
      actorId: memory.actorId,
      targetId: memory.targetId,
      place: memory.place,
      zoneId: memory.zoneId,
      activityId: memory.activityId,
      activityTitle: memory.activityTitle,
      allianceTag: memory.allianceTag || "",
      summary: memory.summary
    };
  }

  function publicPair(pair) {
    const labels = pair.residentIds.map((id) => pair.residentLabels[id] || id);
    return {
      pairId: pair.pairId,
      residentIds: [...pair.residentIds],
      labels,
      familiarity: pair.familiarity,
      trust: pair.trust,
      friction: pair.friction,
      favorDebt: { ...pair.favorDebt },
      exclusion: pair.exclusion,
      allianceTags: [...pair.allianceTags],
      tone: relationshipTone(pair),
      lastInteraction: publicMemory(pair.lastInteraction),
      recentMemories: pair.recentMemories.slice(-3).reverse().map(publicMemory).filter(Boolean)
    };
  }

  function publicSnapshot(ledger, options = {}) {
    const summary = summarizeLedger(ledger);
    const pairs = Object.values(ledger.pairs || {})
      .filter((pair) => pair.lastInteraction)
      .sort((a, b) => (
        (b.familiarity + b.trust + b.allianceTags.length * 4 - b.friction) -
        (a.familiarity + a.trust + a.allianceTags.length * 4 - a.friction)
      ));
    const tensePairs = [...pairs]
      .filter((pair) => pair.friction >= 12 || pair.exclusion >= 10)
      .sort((a, b) => (b.friction + b.exclusion) - (a.friction + a.exclusion));
    const recentLimit = rules.clamp(Number(options.recentLimit || 8), 1, 18);
    const pairLimit = rules.clamp(Number(options.pairLimit || 6), 1, 12);
    return {
      version: "town-relationship-ledger-v0.0.6-local",
      mode: "local-rules-first",
      summary,
      summaryLines: relationshipSummaryLines(ledger, summary),
      relationships: pairs.slice(0, pairLimit).map(publicPair),
      tenseRelationships: tensePairs.slice(0, 4).map(publicPair),
      recentInteractions: ledger.recentInteractions.slice(-recentLimit).reverse().map(publicMemory).filter(Boolean)
    };
  }

  function makeReportSection(state, settlement) {
    const interactions = settlement?.relationshipChanges || [];
    if (!interactions.length) return null;
    return {
      title: "居民互动",
      list: interactions.slice(0, 5).map((item) => item.summary)
    };
  }

  T.townRelationshipPublic = {
    version,
    summarizeLedger,
    relationshipSummaryLines,
    relationshipTone,
    publicMemory,
    publicPair,
    publicSnapshot,
    makeReportSection
  };
}());
