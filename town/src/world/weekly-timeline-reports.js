(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const utils = T.weeklyTimelineUtils || {};

  const version = "weekly-timeline-reports-v0.0.8-local";

  function buildLocalReport(record) {
    const end = record.endSnapshot;
    const delta = record.ledgerDelta;
    const interactionLines = [
      ...(end.relationships?.summaryLines || []),
      ...record.dailySnapshots.flatMap((day) => day.interactionLines || []),
      ...record.keyLogRefs.filter((log) => log.kind === "talk").map((log) => `第 ${log.day} 天 ${log.place}：${log.text}`)
    ].filter(Boolean).slice(0, 5);
    const facilityContractLines = [
      ...record.dailySnapshots.flatMap((day) => day.facilityContractLines || []),
      ...end.contracts
        .filter((contract) => ["active", "overdue"].includes(contract.status))
        .slice(0, 4)
        .map((contract) => `${contract.buyer} ${contract.cropName} ${contract.delivered}，第 ${contract.dueDay} 天到期。`)
    ].filter(Boolean).slice(0, 7);
    const unresolved = [
      ...(end.risks?.notes || []),
      ...record.dailySnapshots.flatMap((day) => day.eventLines || [])
    ].filter(Boolean).slice(0, 6);
    const topPressure = utils.pressureFromRisks(end.risks);
    const pressureText = topPressure.length
      ? topPressure.map((item) => `${utils.pressureLabel(item.key)} ${item.value}/100`).join("，")
      : "暂无明显高压项";
    const debt = record.debtSettlement;
    const debtLine = debt
      ? `本周债务：应还 ${debt.scheduledPaymentYsc} YSC，已还 ${debt.paidThisWeekYsc} YSC，新增利息 ${debt.interestAccruedYsc} YSC，压力 ${debt.debtPressure}。`
      : `债务 ${record.startSnapshot.ledger.debtYsc} -> ${end.ledger.debtYsc} YSC。`;
    const festivalResults = T.festivalResultLedger?.weeklyLines?.(record.dailySnapshots) || [];

    return {
      title: `第 ${record.startDay}-${record.endDay} 天周报`,
      oneLine: `现金 ${record.startSnapshot.ledger.cashYsc} -> ${end.ledger.cashYsc} YSC，债务 ${record.startSnapshot.ledger.debtYsc} -> ${end.ledger.debtYsc} YSC，账务透明度 ${record.startSnapshot.ledger.accountingTransparency} -> ${end.ledger.accountingTransparency}/100。`,
      sections: {
        keyInteractions: interactionLines.length ? interactionLines : ["本周居民互动主要留在行动日志和公告板摘要里。"],
        ...(festivalResults.length ? { festivalResults } : {}),
        ledgerTrend: [
          `现金 ${utils.signed(delta.cashYsc)} YSC，应收 ${utils.signed(delta.receivableYsc)} YSC，应付 ${utils.signed(delta.payableYsc)} YSC，债务 ${utils.signed(delta.debtYsc)} YSC。`,
          `账务透明度 ${utils.signed(delta.accountingTransparency)}，高金依赖 ${utils.signed(delta.goldkinDependency)}，合作信任 ${utils.signed(delta.cooperativeTrust)}。`,
          debtLine
        ],
        facilityContractChanges: facilityContractLines.length ? facilityContractLines : ["设施、合同和市场本周按日常节奏推进，没有形成额外公开条目。"],
        unresolvedHooks: unresolved.length ? unresolved : ["本周没有新的高压未解决线索。"],
        nextPressure: [
          `下周压力：${pressureText}。`,
          end.contracts.some((contract) => contract.status === "overdue")
            ? "已有合同逾期，下周会继续压到账本和高金依赖上。"
            : "合同仍按公开到期日推进。",
          debt?.overdueWeeks ? `债务已连续逾期 ${debt.overdueWeeks} 周。` : "债务状态暂未进入连续逾期。"
        ]
      }
    };
  }

  T.weeklyTimelineReports = {
    version,
    buildLocalReport
  };
}());
