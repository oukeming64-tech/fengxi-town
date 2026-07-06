(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const { clamp, addLedgerEntry } = T.townLedgerCore;

  function tieredTokenCost(count, base, firstUnit, extraUnit) {
    const tokens = Number(count || 0);
    if (tokens <= 0) return 0;
    return Math.round(base + Math.min(tokens, 3) * firstUnit + Math.max(0, tokens - 3) * extraUnit);
  }

  function hasOpenSupplyPayable(state) {
    return (state.ledger.accountsPayable || []).some((item) => item.kind === "supply-credit" && item.dueDay > state.day);
  }

  function supplyRunNeeded(state) {
    const needsReplant = (state.fields || []).some((field) => ["harvested", "failed", "rotten"].includes(field.status));
    const lowSoil = (state.fields || []).filter((field) => Number(field.soil?.fertility || 0) <= 1).length >= 2;
    return needsReplant || lowSoil || (state.ledger.cashYsc || 0) < 900;
  }

  function applySupplyBenefit(state, batches, settlement) {
    const targets = (state.fields || [])
      .filter((field) => field.soil)
      .sort((a, b) => (a.soil.fertility + a.soil.organic) - (b.soil.fertility + b.soil.organic))
      .slice(0, Math.max(1, batches + 1));
    targets.forEach((field) => {
      field.soil.fertility = clamp(Number(field.soil.fertility || 0) + 1, 0, 5);
      field.soil.organic = clamp(Number(field.soil.organic || 0) + 1, 0, 5);
    });
    if (targets.length) {
      settlement.accountingEvents.push(`补给批次记入账本，${targets.length} 块地的土壤补给留到后续生长中体现。`);
    }
  }

  function applyOperatingCosts(state, activitySummary, weather, settlement) {
    const facilityEffects = T.townFacilityLedger?.effects?.(state) || {};
    const irrigationCost = tieredTokenCost(activitySummary.irrigation, 0, 2, 1);
    const compostCost = tieredTokenCost(activitySummary.compost, 0, 4, 2);
    const packagingCost = tieredTokenCost(activitySummary.packaging, 0, 3, 1);
    const logisticsBase = weather.logisticsPressure >= 2 ? 12 : 8;
    const rawLogisticsCost = tieredTokenCost(activitySummary.logistics, 0, logisticsBase, 3);
    const logisticsCost = Math.round(rawLogisticsCost * (1 - (facilityEffects.logisticsDiscount || 0)));
    const auditCost = activitySummary.accounting > 0 ? 8 : 0;
    const stormRepairReserve = weather.key === "storm" ? 24 : 0;
    const total = irrigationCost + compostCost + packagingCost + logisticsCost + auditCost + stormRepairReserve;

    if (total > 0) {
      addLedgerEntry(state, {
        day: state.day,
        type: "expense",
        account: "经营支出",
        source: "每日结算",
        detail: [
          irrigationCost ? `灌溉 ${irrigationCost}` : "",
          compostCost ? `改土 ${compostCost}` : "",
          packagingCost ? `包装 ${packagingCost}` : "",
          logisticsCost ? `物流 ${logisticsCost}` : "",
          auditCost ? `账务 ${auditCost}` : "",
          stormRepairReserve ? `风雨预备 ${stormRepairReserve}` : ""
        ].filter(Boolean).join("，"),
        amountYsc: total
      });
      settlement.cashNotes.push(`经营支出 ${total} YSC。`);
    }

    const transparencyDelta = (activitySummary.accounting > 0 || activitySummary.barnAudit > 0 ? 3 : -1) + (facilityEffects.accountingTransparencyBonus || 0);
    state.ledger.accountingTransparency = clamp(state.ledger.accountingTransparency + transparencyDelta, 0, 100);
    if (activitySummary.complaint > 0) {
      state.ledger.reputationAssets.cooperativeTrust = clamp(state.ledger.reputationAssets.cooperativeTrust - activitySummary.complaint, 0, 100);
    }
  }

  function collectPayables(state, settlement) {
    const remaining = [];
    (state.ledger.accountsPayable || []).forEach((item) => {
      if (item.dueDay <= state.day) {
        addLedgerEntry(state, {
          day: state.day,
          type: "expense",
          account: "应付款支付",
          source: item.source,
          detail: item.detail,
          amountYsc: item.amountYsc
        });
        settlement.accountingEvents.push(`${item.source}应付款 ${item.amountYsc} YSC 到期支付。`);
      } else {
        remaining.push(item);
      }
    });
    state.ledger.accountsPayable = remaining;
  }

  function applyAccountingEvents(state, activitySummary, weather, settlement) {
    state.accountingEvents = state.accountingEvents || [];
    state.ledger.accountsPayable = state.ledger.accountsPayable || [];
    collectPayables(state, settlement);

    if (activitySummary.creditPurchase > 0 && supplyRunNeeded(state) && !hasOpenSupplyPayable(state)) {
      const batches = Math.min(2, Math.ceil(activitySummary.creditPurchase / 4));
      const amount = Math.round(45 + batches * 24 + Math.max(0, 55 - state.ledger.accountingTransparency) * 0.35);
      const payable = {
        id: `ap-goldkin-d${state.day}-${state.ledger.accountsPayable.length + 1}`,
        day: state.day,
        dueDay: state.day + 4,
        source: "高金采购站",
        kind: "supply-credit",
        amountYsc: amount,
        detail: "种子和化肥赊购应付款"
      };
      state.ledger.accountsPayable.push(payable);
      addLedgerEntry(state, {
        day: state.day,
        type: "expense",
        account: "应付确认",
        source: payable.source,
        detail: payable.detail,
        amountYsc: amount,
        affectsCash: false
      });
      applySupplyBenefit(state, batches, settlement);
      settlement.accountingEvents.push(`补给赊购形成应付款 ${amount} YSC，第 ${payable.dueDay} 日到期。`);
    } else if (activitySummary.creditPurchase > 0) {
      settlement.accountingEvents.push("今日只记录补给询价，没有新增应付款。");
    }

    if (activitySummary.receiptWork > 0) {
      const before = state.ledger.accountingTransparency;
      state.ledger.accountingTransparency = clamp(state.ledger.accountingTransparency + 2 + activitySummary.receiptWork, 0, 100);
      settlement.accountingEvents.push(`收据和旧账整理让账务透明度 ${before}/100 -> ${state.ledger.accountingTransparency}/100。`);
    }

    const entryCount = state.ledger.entries.filter((entry) => entry.day === state.day).length;
    if (state.ledger.accountingTransparency < 45 && entryCount >= 3) {
      const event = {
        id: `accounting-gap-d${state.day}`,
        day: state.day,
        type: "accounting",
        title: "收据缺口",
        detail: "今日现金、应收和费用同时出现，账页旁边留下了需要复核的空格。",
        public: true
      };
      state.accountingEvents.push(event);
      settlement.accountingEvents.push(`${event.title}：${event.detail}`);
    }

    if (weather.logisticsPressure >= 3 && activitySummary.logistics > 0) {
      settlement.accountingEvents.push(`${weather.label}让路单和运费票据需要单独夹存。`);
    }
  }

  T.townContractAccountingLedger = {
    version: "town-contract-accounting-ledger-v0.0.6-local",
    applyOperatingCosts,
    collectPayables,
    applyAccountingEvents
  };
}());
