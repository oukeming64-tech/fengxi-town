(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.townLedgerData;
  const { seasonLabels } = D;
  const { qualityText } = T.townLedgerCore;
  const riskLedger = T.townContractRiskLedger;
  if (!riskLedger) throw new Error("town-contract-risk-ledger must load before town-contract-report-ledger");
  const { inventoryTotals, computeRisks, triggerEvents } = riskLedger;

  function makeSettlement(state, weather, activitySummary, startCash, startEntryCount) {
    const entries = state.ledger.entries.slice(startEntryCount);
    const income = entries.filter((entry) => entry.type === "income" && entry.affectsCash !== false).reduce((sum, entry) => sum + entry.amountYsc, 0);
    const expense = entries.filter((entry) => entry.type === "expense" && entry.affectsCash !== false).reduce((sum, entry) => sum + entry.amountYsc, 0);
    return {
      day: state.day,
      seasonKey: state.seasonKey,
      seasonLabel: state.seasonLabel || seasonLabels[state.seasonKey],
      weather,
      actionSummary: activitySummary,
      facilityChanges: [],
      marketChanges: [],
      cropChanges: [],
      harvestedLots: [],
      processedLots: [],
      inventoryChanges: [],
      surplusSales: [],
      bidChanges: [],
      contractChanges: [],
      consignmentChanges: [],
      accountingEvents: [],
      cashNotes: [],
      cashFlow: {
        startCashYsc: startCash,
        incomeYsc: income,
        expenseYsc: expense,
        netYsc: income - expense,
        endCashYsc: state.ledger.cashYsc,
        entries
      },
      risks: null,
      events: []
    };
  }

  function finalizeCashFlow(state, settlement, startCash, startEntryCount) {
    const entries = state.ledger.entries.slice(startEntryCount);
    const income = entries.filter((entry) => entry.type === "income" && entry.affectsCash !== false).reduce((sum, entry) => sum + entry.amountYsc, 0);
    const expense = entries.filter((entry) => entry.type === "expense" && entry.affectsCash !== false).reduce((sum, entry) => sum + entry.amountYsc, 0);
    settlement.cashFlow = {
      startCashYsc: startCash,
      incomeYsc: income,
      expenseYsc: expense,
      netYsc: income - expense,
      endCashYsc: state.ledger.cashYsc,
      entries
    };
    settlement.cashNotes.push(`现金 ${startCash} -> ${state.ledger.cashYsc} YSC，净变动 ${income - expense >= 0 ? "+" : ""}${income - expense}。`);
    state.ledger.dailySummaries.push({
      day: state.day,
      incomeYsc: income,
      expenseYsc: expense,
      netYsc: income - expense,
      endCashYsc: state.ledger.cashYsc
    });
  }

  function makeReportSections(state, settlement) {
    const inventory = inventoryTotals(state.inventory);
    const contractLines = settlement.contractChanges.length
      ? settlement.contractChanges
      : state.contracts.map((contract) => `${contract.label}：${contract.deliveredQuantity}/${contract.quantity}，第 ${contract.dueDay} 日到期。`);
    const cropLines = settlement.cropChanges.length
      ? settlement.cropChanges.map((item) => item.note || `${item.cropName}状态更新。`)
      : state.fields.map((field) => `${field.name}：${field.cropName} ${field.status} ${field.growth}/${field.daysToMature}，品质${qualityText(field.quality)}。`);
    const inventoryLines = [
      `总库存 ${inventory.quantity} 单位；临近损耗 ${inventory.nearSpoilage} 单位。`,
      ...Object.keys(inventory.byCrop).map((name) => `${name} ${inventory.byCrop[name]} 单位。`),
      ...settlement.inventoryChanges
    ];
    const marketLines = settlement.marketChanges.length
      ? settlement.marketChanges
      : state.market?.current?.notes || ["行情平稳，今日没有明显渠道变化。"];
    const facilityLines = settlement.facilityChanges.length
      ? settlement.facilityChanges
      : ["设施今日没有明显变化。"];
    const bidLines = [
      ...(settlement.bidChanges.length ? settlement.bidChanges : ["今日没有新的动态招标接入。"]),
      ...(settlement.consignmentChanges.length ? settlement.consignmentChanges : ["寄售货架今日没有公开争议。"])
    ];
    const accountingLines = settlement.accountingEvents.length
      ? settlement.accountingEvents
      : ["账务事件按日常节奏推进，没有新增公开缺口。"];
    const riskLines = [
      `农业 ${settlement.risks.scores.agriculture}，库存 ${settlement.risks.scores.inventory}，合同 ${settlement.risks.scores.contracts}，财务 ${settlement.risks.scores.finance}，劳动 ${settlement.risks.scores.labor}，账务 ${settlement.risks.scores.accounting}。`,
      ...settlement.risks.notes,
      ...settlement.events.map((event) => `${event.title}：${event.detail}`)
    ];

    return [
      {
        title: "天气",
        body: `第 ${settlement.day} 日，${seasonLabels[state.seasonKey]}，${settlement.weather.label}，风险指数 ${settlement.weather.riskIndex}。`
      },
      {
        title: "作物",
        list: cropLines
      },
      {
        title: "库存",
        list: inventoryLines
      },
      {
        title: "设施与加工",
        list: facilityLines
      },
      {
        title: "市场",
        list: marketLines
      },
      {
        title: "招标与寄售",
        list: bidLines
      },
      {
        title: "合同",
        list: contractLines
      },
      {
        title: "账务事件",
        list: accountingLines
      },
      {
        title: "现金流",
        list: [
          `收入 ${settlement.cashFlow.incomeYsc} YSC，支出 ${settlement.cashFlow.expenseYsc} YSC，净额 ${settlement.cashFlow.netYsc >= 0 ? "+" : ""}${settlement.cashFlow.netYsc} YSC。`,
          `期末现金 ${settlement.cashFlow.endCashYsc} YSC；应收 ${state.ledger.accountsReceivable.reduce((sum, item) => sum + item.amountYsc, 0)} YSC；债务 ${state.ledger.debtYsc} YSC。`,
          `账务透明度 ${state.ledger.accountingTransparency}/100。`,
          ...settlement.cashNotes
        ]
      },
      {
        title: "风险",
        list: riskLines
      }
    ];
  }

  T.townContractReportLedger = {
    version: "town-contract-report-ledger-v0.0.6-local",
    inventoryTotals,
    computeRisks,
    triggerEvents,
    makeSettlement,
    finalizeCashFlow,
    makeReportSections
  };
}());
