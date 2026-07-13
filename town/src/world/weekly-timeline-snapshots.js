(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const utils = T.weeklyTimelineUtils || {};

  const version = "weekly-timeline-snapshots-v0.0.8-local";

  function makeBoundarySnapshot(snapshot, day, label) {
    const source = snapshot || {};
    return utils.deepFreeze({
      day,
      label,
      seasonLabel: source.seasonLabel || "",
      weather: source.weather ? {
        label: source.weather.label || "",
        riskIndex: utils.number(source.weather.riskIndex),
        summary: source.weather.summary || ""
      } : null,
      ledger: utils.ledgerSummary(source),
      fields: (source.fields || []).slice(0, 8).map((field) => ({
        id: field.id,
        name: field.name,
        cropName: field.cropName,
        status: field.status,
        progress: field.progress,
        quality: field.quality,
        stress: utils.number(field.stress)
      })),
      facilities: (source.facilities?.facilities || []).map((facility) => ({
        id: facility.id,
        name: facility.name,
        level: utils.number(facility.level),
        condition: utils.number(facility.condition)
      })),
      contracts: (source.contracts || []).map((contract) => ({
        id: contract.id,
        label: contract.label,
        buyer: contract.buyer,
        cropName: contract.cropName,
        delivered: contract.delivered,
        dueDay: utils.number(contract.dueDay),
        status: contract.status
      })),
      inventory: {
        totalQuantity: utils.number(source.inventory?.totalQuantity),
        nearSpoilage: utils.number(source.inventory?.nearSpoilage),
        byCrop: utils.deepClone(source.inventory?.byCrop || {})
      },
      market: source.market ? {
        festival: source.market.festival?.name || "",
        notes: (source.market.notes || []).slice(0, 4)
      } : null,
      relationships: source.relationships ? {
        summary: utils.deepClone(source.relationships.summary || {}),
        summaryLines: (source.relationships.summaryLines || []).slice(0, 5),
        recentInteractions: (source.relationships.recentInteractions || []).slice(0, 5).map((item) => ({
          label: item.label || item.type || "",
          place: item.place || "",
          summary: item.summary || "",
          residentIds: (item.residentIds || []).slice(0, 2)
        }))
      } : null,
      risks: source.risks ? {
        updatedDay: source.risks.updatedDay,
        scores: utils.deepClone(source.risks.scores || {}),
        notes: (source.risks.notes || []).slice(0, 6)
      } : null,
      events: (source.events || []).slice(-6).map((event) => ({
        id: event.id,
        day: event.day,
        type: event.type,
        title: event.title,
        detail: event.detail
      }))
    });
  }

  function keyLogRefs(logs) {
    return (logs || [])
      .filter((log) => log?.id && (log.localText || log.text) && log.kind !== "system")
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 6)
      .map((log) => ({
        id: log.id,
        day: log.day,
        slot: log.slot,
        place: log.place,
        kind: log.kind,
        residentId: log.residentId || "",
        text: log.localText || log.text
      }));
  }

  function collectSectionLines(report, titlePattern, limit = 4) {
    const sections = report?.sections || [];
    return sections
      .filter((section) => titlePattern.test(section.title || ""))
      .flatMap((section) => section.list || [section.body || ""])
      .filter(Boolean)
      .slice(0, limit);
  }

  function makeDailySnapshot(options) {
    const snapshot = options.publicSnapshot || {};
    const report = options.report || null;
    const festivalResult = options.festivalResult || null;
    return utils.deepFreeze({
      day: options.day,
      scene: options.scene || "",
      season: options.season || "",
      weather: options.weather ? {
        label: options.weather.label || "",
        riskIndex: utils.number(options.weather.riskIndex)
      } : null,
      ledger: utils.ledgerSummary(snapshot),
      keyLogRefs: keyLogRefs(options.logs),
      reportTitles: (report?.sections || []).map((section) => section.title).filter(Boolean).slice(0, 10),
      interactionLines: collectSectionLines(report, /居民互动|听见的话|互动/, 4),
      ledgerLines: collectSectionLines(report, /现金流|账务事件|合同/, 5),
      facilityContractLines: collectSectionLines(report, /设施|招标|寄售|合同|市场/, 6),
      riskLines: collectSectionLines(report, /风险/, 5),
      festivalResult: festivalResult ? {
        id: festivalResult.id,
        festivalId: festivalResult.festivalId,
        festivalName: festivalResult.festivalName,
        phase: festivalResult.phase,
        phaseLabel: festivalResult.phaseLabel,
        participantIds: [...festivalResult.participantIds],
        actionCount: festivalResult.actionCount,
        resultTypeCounts: festivalResult.resultTypeCounts.map((item) => ({ label: item.label, count: item.count })),
        summaryLines: [...festivalResult.summaryLines],
        source: festivalResult.source,
        immutableState: true
      } : null,
      eventLines: (snapshot.events || []).slice(-4).map((event) => `${event.title}：${event.detail}`)
    });
  }

  T.weeklyTimelineSnapshots = {
    version,
    makeBoundarySnapshot,
    keyLogRefs,
    collectSectionLines,
    makeDailySnapshot
  };
}());
