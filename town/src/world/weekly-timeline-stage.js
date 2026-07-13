(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const utils = T.weeklyTimelineUtils || {};

  const version = "weekly-timeline-stage-v0.0.8-local";

  function fallbackLaborSnapshot(villagers) {
    const count = Math.max(1, (villagers || []).length);
    const lowEnergyRate = (villagers || []).filter((villager) => utils.number(villager.energy) < 35).length / count;
    const unhealthyRate = (villagers || []).filter((villager) => utils.number(villager.health) < 65).length / count;
    const sustainableWork = Math.round(100 - lowEnergyRate * 45 - unhealthyRate * 25);
    return {
      source: "current-wellbeing-fallback",
      score: T.clamp ? T.clamp(sustainableWork, 0, 100) : 50,
      components: { workloadBalance: null, heavyWorkBalance: null, restAccess: null, sustainableWork }
    };
  }

  function scoreCommunityStage(snapshot, villagers, debtSettlement, laborSnapshot) {
    const facilities = snapshot.facilities || [];
    const avgFacility = facilities.length
      ? facilities.reduce((sum, facility) => sum + utils.number(facility.condition), 0) / facilities.length
      : 60;
    const fulfilled = (snapshot.contracts || []).filter((contract) => /fulfilled/.test(contract.status)).length;
    const overdue = (snapshot.contracts || []).filter((contract) => contract.status === "overdue").length;
    const risks = snapshot.risks?.scores || {};
    const ledger = snapshot.ledger || {};
    const laborDetail = laborSnapshot?.components ? laborSnapshot : fallbackLaborSnapshot(villagers);

    const production = T.clamp ? T.clamp(Math.round(avgFacility * 0.55 + fulfilled * 4 - overdue * 8 - utils.number(risks.agriculture) * 0.2), 0, 100) : 50;
    const ledgerHealth = T.clamp ? T.clamp(Math.round(utils.number(ledger.accountingTransparency) * 0.45 + Math.min(40, utils.number(ledger.cashYsc) / 100) - utils.number(risks.finance) * 0.25 - (debtSettlement?.overdueWeeks || ledger.overdueWeeks || 0) * 6), 0, 100) : 50;
    const communityTrust = T.clamp ? T.clamp(Math.round(utils.number(ledger.cooperativeTrust) * 0.7 + utils.number(ledger.townReputation) * 0.25 - utils.number(risks.accounting) * 0.12), 0, 100) : 50;
    const laborFairness = T.clamp ? T.clamp(Math.round(laborDetail.score), 0, 100) : 50;
    const autonomy = T.clamp ? T.clamp(Math.round(100 - utils.number(ledger.goldkinDependency) * 0.85 - (debtSettlement?.goldkinLeverage || 0) * 0.25), 0, 100) : 50;

    const axes = { production, ledgerHealth, communityTrust, laborFairness, autonomy };
    const average = Math.round(Object.values(axes).reduce((sum, value) => sum + value, 0) / 5);
    const grade = average >= 82 ? "A" : average >= 66 ? "B" : average >= 50 ? "C" : average >= 34 ? "D" : "E";
    const gradeNames = {
      A: "自主生长",
      B: "稳步修复",
      C: "勉力维持",
      D: "外部压力加深",
      E: "来到重建关口"
    };

    return { axes, average, grade, gradeName: gradeNames[grade], laborFairnessDetail: laborDetail };
  }

  function makeStageEvaluation(options) {
    const snapshot = options.snapshot;
    const scores = scoreCommunityStage(snapshot, options.villagers, options.debtSettlement, options.laborSnapshot);
    return utils.deepFreeze({
      id: `stage-evaluation-d${options.endDay}`,
      startDay: options.startDay,
      endDay: options.endDay,
      cadenceDays: 60,
      source: "local-rules-community-stage-evaluation",
      immutableState: true,
      ...scores,
      relationshipHighlights: options.relationshipHighlights || null,
      publicText: `${scores.grade} · ${scores.gradeName}。评价只改变下一阶段压力，不结束模拟。`,
      nextStageEffects: {
        autonomyPressure: scores.grade === "D" ? "high" : scores.grade === "E" ? "rebuild" : "watch",
        debtPressure: scores.axes.ledgerHealth < 50 ? "high" : "normal",
        laborPressure: scores.axes.laborFairness < 50 ? "high" : "normal"
      }
    });
  }

  T.weeklyTimelineStage = {
    version,
    scoreCommunityStage,
    makeStageEvaluation
  };
}());
