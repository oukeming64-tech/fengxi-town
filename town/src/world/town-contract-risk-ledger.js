(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const { clamp, consecutiveWeather } = T.townLedgerCore;

  function currentGoldkinDependency(state) {
    const incomeEntries = state.ledger.entries.filter((entry) => entry.type === "income" && entry.account !== "期初现金");
    const income = incomeEntries.reduce((sum, entry) => sum + entry.amountYsc, 0);
    if (!income) return state.ledger.reputationAssets.goldkinDependency;
    const goldkin = incomeEntries
      .filter((entry) => /高金/.test(entry.source))
      .reduce((sum, entry) => sum + entry.amountYsc, 0);
    const observed = Math.round((goldkin / income) * 100);
    return clamp(Math.round((state.ledger.reputationAssets.goldkinDependency + observed) / 2), 0, 100);
  }

  function inventoryTotals(inventory) {
    const totals = { quantity: 0, byCrop: {}, byQuality: { C: 0, B: 0, A: 0, S: 0 }, nearSpoilage: 0 };
    (inventory.lots || []).forEach((lot) => {
      totals.quantity += lot.quantity;
      totals.byCrop[lot.cropName] = (totals.byCrop[lot.cropName] || 0) + lot.quantity;
      totals.byQuality[lot.quality] = (totals.byQuality[lot.quality] || 0) + lot.quantity;
      if (lot.shelfLifeDays - lot.ageDays <= 1) totals.nearSpoilage += lot.quantity;
    });
    return totals;
  }

  function computeRisks(state, weather, activitySummary) {
    const fieldCount = Math.max(1, state.fields.length);
    const fieldPressure = state.fields.reduce((sum, field) => (
      sum + field.stress * 8 + field.soil.pests * 5 + field.soil.disease * 6 + (field.status === "ready" ? field.overripeDays * 8 : 0)
    ), 0) / fieldCount;
    const inventory = inventoryTotals(state.inventory);
    const openContracts = state.contracts.filter((contract) => ["active", "overdue"].includes(contract.status));
    const duePressure = openContracts.reduce((sum, contract) => {
      const remaining = contract.quantity - contract.deliveredQuantity;
      const daysLeft = contract.dueDay - state.day;
      return sum + (remaining > 0 && daysLeft <= 2 ? (3 - daysLeft) * 12 : 0) + (contract.status === "overdue" ? 30 : 0);
    }, 0);
    const receivableTotal = state.ledger.accountsReceivable.reduce((sum, item) => sum + item.amountYsc, 0);
    const payableTotal = (state.ledger.accountsPayable || []).reduce((sum, item) => sum + item.amountYsc, 0);
    const cash = state.ledger.cashYsc || 0;
    const openDisputes = (state.consignmentDisputes || []).filter((item) => item.status === "open").length;
    const openBids = (state.contractBids || []).filter((item) => item.status === "open").length;

    state.ledger.reputationAssets.goldkinDependency = currentGoldkinDependency(state);

    const scores = {
      agriculture: clamp(Math.round(fieldPressure + weather.riskIndex * 8), 0, 100),
      inventory: clamp(Math.round(inventory.nearSpoilage * 4 + weather.spoilagePressure * 12), 0, 100),
      contracts: clamp(Math.round(duePressure + openBids * 4 + Math.max(0, state.ledger.reputationAssets.goldkinDependency - 55)), 0, 100),
      finance: clamp(Math.round((cash < 1000 ? 40 : cash < 2500 ? 20 : 8) + receivableTotal / 30 + payableTotal / 35 + state.ledger.debtYsc / 600), 0, 100),
      labor: clamp(Math.round(activitySummary.lowEnergyVillagers * 15 + activitySummary.unhealthyVillagers * 10), 0, 100),
      accounting: clamp(100 - state.ledger.accountingTransparency + openDisputes * 8, 0, 100)
    };

    const notes = [];
    if (scores.agriculture >= 60) notes.push("农业风险偏高：天气、病虫害或作物压力需要处理。");
    if (scores.inventory >= 50) notes.push("库存风险偏高：鲜货接近损耗点。");
    if (scores.contracts >= 55) notes.push("合同风险偏高：交付期限或高金依赖需要注意。");
    if (scores.finance >= 60) notes.push("财务风险偏高：现金、应收和债务压力叠加。");
    if (scores.labor >= 45) notes.push("劳动风险上升：疲劳或健康不佳居民偏多。");
    if (scores.accounting >= 50) notes.push("账务透明度不足，后续审计容易起争执。");
    if (!notes.length) notes.push("今日主要风险可控。");

    state.risks = { updatedDay: state.day, scores, notes };
    return state.risks;
  }

  function pushEvent(state, settlement, event) {
    const normalized = {
      id: event.id || `event-d${state.day}-${state.events.length + 1}`,
      day: state.day,
      type: event.type || "system",
      title: event.title,
      detail: event.detail,
      public: event.public !== false
    };
    state.events.push(normalized);
    settlement.events.push(normalized);
  }

  function triggerEvents(state, weather, activitySummary, risks, settlement) {
    const rainyStreak = consecutiveWeather(state, ["light_rain", "storm", "fog"]);
    const festival = state.market?.current?.activeFestival || null;
    if (festival) {
      pushEvent(state, settlement, {
        type: "market",
        title: festival.name,
        detail: festival.note
      });
    }
    if (festival?.accountingPressure >= 2 && activitySummary.accounting <= 0) {
      pushEvent(state, settlement, {
        type: "accounting",
        title: "节日账务争议苗头",
        detail: "节日备货和寄售记录被放大，明日最好有人补盘点或交付确认。"
      });
    }
    if (rainyStreak >= 3 && risks.scores.agriculture >= 55) {
      pushEvent(state, settlement, {
        type: "agriculture",
        title: "霉病预警",
        detail: "连续潮湿天气叠加田间压力，温室和叶菜需要通风巡查。"
      });
    }
    if (state.ledger.reputationAssets.goldkinDependency >= 60) {
      pushEvent(state, settlement, {
        type: "contract",
        title: "高金依赖被注意到",
        detail: "今日账本里高金相关收入占比偏高，镇上开始讨论是否该分散买方。"
      });
    }
    if (activitySummary.lowEnergyVillagers >= 4) {
      pushEvent(state, settlement, {
        type: "labor",
        title: "过劳争执苗头",
        detail: "有多名居民体力偏低，明日排班若继续压实，容易出现公开抱怨。"
      });
    }
    if (state.seasonKey === "winter" && state.ledger.accountingTransparency < 60) {
      pushEvent(state, settlement, {
        type: "accounting",
        title: "冬季审计压力",
        detail: "会计协会办公室开始要求更清楚的库存与应收记录。"
      });
    }
    if (state.ledger.reputationAssets.townReputation >= 80) {
      pushEvent(state, settlement, {
        type: "community",
        title: "志愿者支援",
        detail: "社区声望足够高，明日可以更容易找到临时帮手。"
      });
    }
    state.contracts
      .filter((contract) => ["active", "overdue"].includes(contract.status) && contract.dueDay - state.day <= 1)
      .forEach((contract) => {
        pushEvent(state, settlement, {
          type: "contract",
          title: "合同临近到期",
          detail: `${contract.label}还差 ${Math.max(0, contract.quantity - contract.deliveredQuantity)} 单位，最低品质 ${contract.minQuality}。`
        });
      });
    if (weather.riskIndex >= 4) {
      pushEvent(state, settlement, {
        type: "weather",
        title: `${weather.label}风险`,
        detail: "天气风险较高，物流、库存和田间状态都要在日报里提示。"
      });
    }
  }

  T.townContractRiskLedger = {
    inventoryTotals,
    computeRisks,
    triggerEvents
  };
}());
