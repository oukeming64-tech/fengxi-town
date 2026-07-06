function createModelStatePayloadCleaner({
  cleanString,
  cleanList
} = {}) {
  function cleanLedgerSummary(value) {
    if (!value || typeof value !== "object") return null;
    return {
      cashYsc: Number(value.cashYsc || 0),
      receivableYsc: Number(value.receivableYsc || 0),
      payableYsc: Number(value.payableYsc || 0),
      debtYsc: Number(value.debtYsc || 0),
      debtPrincipalYsc: Number(value.debtPrincipalYsc || value.principalYsc || 0),
      overdueWeeks: Number(value.overdueWeeks || 0),
      currentInterestRate: Number(value.currentInterestRate || 0),
      nextInterestDay: Number(value.nextInterestDay || value.interestStartDay || 0),
      accountingTransparency: Number(value.accountingTransparency || 0),
      goldkinDependency: Number(value.goldkinDependency || 0),
      cooperativeTrust: Number(value.cooperativeTrust || 0),
      townReputation: Number(value.townReputation || 0)
    };
  }

  function cleanLedgerDelta(value) {
    if (!value || typeof value !== "object") return null;
    return {
      cashYsc: Number(value.cashYsc || 0),
      receivableYsc: Number(value.receivableYsc || 0),
      payableYsc: Number(value.payableYsc || 0),
      debtYsc: Number(value.debtYsc || 0),
      accountingTransparency: Number(value.accountingTransparency || 0),
      goldkinDependency: Number(value.goldkinDependency || 0),
      cooperativeTrust: Number(value.cooperativeTrust || 0),
      townReputation: Number(value.townReputation || 0)
    };
  }

  function cleanDebtSettlement(value) {
    if (!value || typeof value !== "object") return null;
    return {
      weekNumber: Number(value.weekNumber || 0),
      startDay: Number(value.startDay || 0),
      endDay: Number(value.endDay || 0),
      status: cleanString(value.status, 20),
      interestEligible: value.interestEligible === true,
      interestStartDay: Number(value.interestStartDay || 0),
      baseInterestRate: Number(value.baseInterestRate || 0),
      currentInterestRate: Number(value.currentInterestRate || 0),
      nextInterestRate: Number(value.nextInterestRate || 0),
      scheduledPaymentYsc: Number(value.scheduledPaymentYsc || 0),
      paidThisWeekYsc: Number(value.paidThisWeekYsc || 0),
      interestAccruedYsc: Number(value.interestAccruedYsc || 0),
      unpaidYsc: Number(value.unpaidYsc || 0),
      remainingDebtYsc: Number(value.remainingDebtYsc || 0),
      overdueWeeks: Number(value.overdueWeeks || 0),
      debtPressure: cleanString(value.debtPressure, 30),
      goldkinLeverage: Number(value.goldkinLeverage || 0),
      note: cleanString(value.note, 220)
    };
  }

  function cleanWeeklyLocalReport(value) {
    if (!value || typeof value !== "object") return null;
    const sections = value.sections && typeof value.sections === "object" ? value.sections : {};
    return {
      title: cleanString(value.title, 60),
      oneLine: cleanString(value.oneLine, 260),
      sections: {
        keyInteractions: cleanList(sections.keyInteractions, 5, 220),
        ledgerTrend: cleanList(sections.ledgerTrend, 4, 220),
        facilityContractChanges: cleanList(sections.facilityContractChanges, 6, 220),
        unresolvedHooks: cleanList(sections.unresolvedHooks, 5, 220),
        nextPressure: cleanList(sections.nextPressure, 4, 220)
      }
    };
  }

  function cleanSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;
    return {
      day: Number(snapshot.day || 0),
      seasonLabel: cleanString(snapshot.seasonLabel, 20),
      promptBrief: cleanString(snapshot.promptBrief, 360),
      ledger: snapshot.ledger && typeof snapshot.ledger === "object" ? {
        cashYsc: Number(snapshot.ledger.cashYsc || 0),
        debtYsc: Number(snapshot.ledger.debtYsc || 0),
        receivableYsc: Number(snapshot.ledger.receivableYsc || 0),
        payableYsc: Number(snapshot.ledger.payableYsc || 0),
        accountingTransparency: Number(snapshot.ledger.accountingTransparency || 0),
        goldkinDependency: Number(snapshot.ledger.goldkinDependency || 0),
        debt: cleanDebtSettlement(snapshot.ledger.debt?.lastSettlement) || (snapshot.ledger.debt ? {
          interestStartDay: Number(snapshot.ledger.debt.interestStartDay || 0),
          principalYsc: Number(snapshot.ledger.debt.principalYsc || 0),
          baseInterestRate: Number(snapshot.ledger.debt.baseInterestRate || 0),
          currentInterestRate: Number(snapshot.ledger.debt.currentInterestRate || 0),
          overdueWeeks: Number(snapshot.ledger.debt.overdueWeeks || 0),
          debtPressure: cleanString(snapshot.ledger.debt.debtPressure, 30),
          goldkinLeverage: Number(snapshot.ledger.debt.goldkinLeverage || 0)
        } : null)
      } : null,
      processing: snapshot.processing && typeof snapshot.processing === "object" ? {
        lotsCreated: Number(snapshot.processing.lotsCreated || 0),
        lastRunDay: Number(snapshot.processing.lastRunDay || 0),
        proficiency: Array.isArray(snapshot.processing.proficiency)
          ? snapshot.processing.proficiency.slice(0, 6).map((item) => ({
            id: cleanString(item.id, 40),
            level: Number(item.level || 0),
            runs: Number(item.runs || 0)
          }))
          : []
      } : null,
      facilities: snapshot.facilities && typeof snapshot.facilities === "object" && Array.isArray(snapshot.facilities.facilities)
        ? snapshot.facilities.facilities.slice(0, 6).map((facility) => ({
          name: cleanString(facility.name, 40),
          level: Number(facility.level || 0),
          condition: Number(facility.condition || 0)
        }))
        : [],
      market: snapshot.market && typeof snapshot.market === "object" ? {
        seasonalDay: Number(snapshot.market.seasonalDay || 0),
        festival: snapshot.market.festival && typeof snapshot.market.festival === "object"
          ? cleanString(snapshot.market.festival.name, 40)
          : "",
        notes: cleanList(snapshot.market.notes, 3, 180)
      } : null,
      contracts: Array.isArray(snapshot.contracts) ? snapshot.contracts.slice(0, 6).map((contract) => ({
        label: cleanString(contract.label, 50),
        buyer: cleanString(contract.buyer, 40),
        channel: cleanString(contract.channel, 40),
        cropName: cleanString(contract.cropName, 40),
        delivered: cleanString(contract.delivered, 20),
        dueDay: Number(contract.dueDay || 0),
        status: cleanString(contract.status, 20)
      })) : [],
      contractBids: Array.isArray(snapshot.contractBids) ? snapshot.contractBids.slice(0, 4).map((bid) => ({
        buyer: cleanString(bid.buyer, 40),
        cropName: cleanString(bid.cropName, 40),
        quantity: Number(bid.quantity || 0),
        dueDay: Number(bid.dueDay || 0)
      })) : [],
      consignmentDisputes: Array.isArray(snapshot.consignmentDisputes) ? snapshot.consignmentDisputes.slice(-3).map((item) => ({
        status: cleanString(item.status, 20),
        amountYsc: Number(item.amountYsc || 0),
        detail: cleanString(item.detail, 160)
      })) : [],
      relationships: snapshot.relationships && typeof snapshot.relationships === "object" ? {
        summary: snapshot.relationships.summary && typeof snapshot.relationships.summary === "object" ? {
          activePairCount: Number(snapshot.relationships.summary.activePairCount || 0),
          recentInteractionCount: Number(snapshot.relationships.summary.recentInteractionCount || 0),
          tensePairCount: Number(snapshot.relationships.summary.tensePairCount || 0),
          alliancePairCount: Number(snapshot.relationships.summary.alliancePairCount || 0),
          averageTrust: Number(snapshot.relationships.summary.averageTrust || 0)
        } : null,
        summaryLines: cleanList(snapshot.relationships.summaryLines, 4, 180),
        recentInteractions: Array.isArray(snapshot.relationships.recentInteractions)
          ? snapshot.relationships.recentInteractions.slice(0, 6).map((item) => ({
            label: cleanString(item.label || item.type, 30),
            place: cleanString(item.place, 40),
            summary: cleanString(item.summary, 180),
            residentIds: cleanList(item.residentIds, 2, 12)
          }))
          : []
      } : null,
      fields: Array.isArray(snapshot.fields) ? snapshot.fields.slice(0, 6).map((field) => ({
        name: cleanString(field.name, 40),
        cropName: cleanString(field.cropName, 40),
        status: cleanString(field.status, 20),
        progress: cleanString(field.progress, 20),
        quality: cleanString(field.quality, 20)
      })) : []
    };
  }

  function cleanWeeklyPayload(weekly) {
    const source = weekly && typeof weekly === "object" ? weekly : {};
    return {
      weekId: cleanString(source.weekId || "", 40),
      weekNumber: Number(source.weekNumber || 0),
      range: cleanString(source.range || "", 40),
      dayCount: Number(source.dayCount || 0),
      immutableState: source.immutableState === true,
      source: cleanString(source.source || "", 80),
      startLedger: cleanLedgerSummary(source.startLedger),
      endLedger: cleanLedgerSummary(source.endLedger),
      ledgerDelta: cleanLedgerDelta(source.ledgerDelta),
      debtSettlement: cleanDebtSettlement(source.debtSettlement),
      stageEvaluations: Array.isArray(source.stageEvaluations) ? source.stageEvaluations.slice(0, 2).map((item) => ({
        id: cleanString(item.id, 50),
        startDay: Number(item.startDay || 0),
        endDay: Number(item.endDay || 0),
        grade: cleanString(item.grade, 3),
        gradeName: cleanString(item.gradeName, 40),
        average: Number(item.average || 0),
        publicText: cleanString(item.publicText, 220)
      })) : [],
      localReport: cleanWeeklyLocalReport(source.localReport),
      keyLogRefs: Array.isArray(source.keyLogRefs) ? source.keyLogRefs.slice(0, 18).map((log) => ({
        id: cleanString(log.id, 40),
        day: Number(log.day || 0),
        slot: cleanString(log.slot, 20),
        place: cleanString(log.place, 40),
        kind: cleanString(log.kind, 20),
        residentId: cleanString(log.residentId, 12),
        text: cleanString(log.text, 220)
      })) : [],
      recentDays: Array.isArray(source.recentDays) ? source.recentDays.slice(0, 7).map((day) => ({
        day: Number(day.day || 0),
        scene: cleanString(day.scene, 60),
        weather: cleanString(day.weather, 40),
        reportTitles: cleanList(day.reportTitles, 5, 40),
        keyLogs: cleanList(day.keyLogs, 8, 160)
      })) : [],
      relationshipSummary: cleanList(source.relationshipSummary, 5, 180)
    };
  }

  return {
    cleanLedgerSummary,
    cleanLedgerDelta,
    cleanDebtSettlement,
    cleanWeeklyLocalReport,
    cleanSnapshot,
    cleanWeeklyPayload
  };
}

module.exports = {
  createModelStatePayloadCleaner
};
