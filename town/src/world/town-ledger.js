(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.townLedgerData;
  const { version, sourceRefs, seasonLabels, seasonCropPlans, contractTemplates } = D;
  const { deepClone, normalizeSeasonKey, normalizeWeather, createInitialState, summarizeActivities, qualityText } = T.townLedgerCore;
  const { updateFacilities, publicSnapshot: publicFacilitySnapshot } = T.townFacilityLedger;
  const { updateMarketState, publicSnapshot: publicMarketSnapshot } = T.townMarketLedger;
  const { updateCrops, harvestReadyCrops, processInventory } = T.townCropLedger;
  const { updateContractBids, updateContracts, applyOperatingCosts, applyAccountingEvents, updateConsignmentDisputes, computeRisks, triggerEvents, makeSettlement, finalizeCashFlow, makeReportSections, inventoryTotals } = T.townContractLedger;
  const surplusSalesLedger = T.townSurplusSalesLedger || {};
  const relationshipLedger = T.townRelationshipLedger;

  function settleDay(rawTownState, context = {}) {
    const state = rawTownState ? deepClone(rawTownState) : createInitialState(context.seasonKey);
    state.seasonKey = normalizeSeasonKey(state.seasonKey);
    state.seasonLabel = seasonLabels[state.seasonKey];
    state.weatherHistory = state.weatherHistory || [];
    state.events = state.events || [];

    const startCash = state.ledger.cashYsc;
    const startEntryCount = state.ledger.entries.length;
    const weather = normalizeWeather(context.weather, state);
    const activitySummary = summarizeActivities(context);
    const settlement = makeSettlement(state, weather, activitySummary, startCash, startEntryCount);

    state.weatherHistory.push({
      day: state.day,
      key: weather.key,
      label: weather.label,
      riskIndex: weather.riskIndex,
      moistureDelta: weather.moistureDelta
    });

    updateMarketState(state, weather, activitySummary, settlement);
    updateFacilities(state, weather, activitySummary, settlement);
    updateCrops(state, weather, activitySummary, settlement);
    harvestReadyCrops(state, activitySummary, settlement);
    processInventory(state, weather, activitySummary, settlement);
    updateContractBids(state, weather, activitySummary, settlement);
    updateContracts(state, settlement);
    if (surplusSalesLedger.sellSurplusInventory) {
      surplusSalesLedger.sellSurplusInventory(state, activitySummary, settlement);
    }
    applyOperatingCosts(state, activitySummary, weather, settlement);
    updateConsignmentDisputes(state, activitySummary, settlement);
    applyAccountingEvents(state, activitySummary, weather, settlement);
    settlement.risks = computeRisks(state, weather, activitySummary);
    triggerEvents(state, weather, activitySummary, settlement.risks, settlement);
    finalizeCashFlow(state, settlement, startCash, startEntryCount);
    if (relationshipLedger?.updateRelationships) {
      relationshipLedger.updateRelationships(state, { ...context, weather, activitySummary }, settlement);
    }

    const reportSections = makeReportSections(state, settlement);
    const relationshipSection = relationshipLedger?.makeReportSection?.(state, settlement);
    if (relationshipSection) reportSections.splice(4, 0, relationshipSection);
    state.day += 1;
    return { state, settlement, reportSections };
  }

  function publicSnapshot(townState) {
    const state = townState || createInitialState("spring");
    const inventory = inventoryTotals(state.inventory || { lots: [] });
    const lastWeather = state.weatherHistory?.[state.weatherHistory.length - 1] || null;
    const currentWeather = state.currentWeather || null;
    const receivableTotal = (state.ledger?.accountsReceivable || []).reduce((sum, item) => sum + item.amountYsc, 0);
    const payableTotal = (state.ledger?.accountsPayable || []).reduce((sum, item) => sum + item.amountYsc, 0);
    const openContracts = (state.contracts || []).filter((contract) => ["active", "overdue"].includes(contract.status));

    return {
      version,
      day: state.day,
      seasonKey: state.seasonKey,
      seasonLabel: state.seasonLabel || seasonLabels[state.seasonKey],
      weather: currentWeather ? {
        label: currentWeather.label,
        riskIndex: currentWeather.riskIndex,
        summary: T.weatherSystem?.summarize?.(currentWeather) || `${currentWeather.label}，风险 ${currentWeather.riskIndex}`
      } : lastWeather ? {
        label: lastWeather.label,
        riskIndex: lastWeather.riskIndex,
        summary: `${lastWeather.label}，风险 ${lastWeather.riskIndex}`
      } : null,
      fields: (state.fields || []).map((field) => ({
        id: field.id,
        name: field.name,
        cropName: field.cropName,
        status: field.status,
        progress: `${field.growth}/${field.daysToMature}`,
        quality: qualityText(field.quality),
        stress: field.stress,
        soil: {
          fertility: field.soil.fertility,
          moisture: field.soil.moisture,
          weeds: field.soil.weeds,
          pests: field.soil.pests,
          disease: field.soil.disease
        }
      })),
      inventory: {
        totalQuantity: inventory.quantity,
        byCrop: inventory.byCrop,
        byQuality: inventory.byQuality,
        nearSpoilage: inventory.nearSpoilage,
        lots: (state.inventory?.lots || []).slice(0, 8).map((lot) => ({
          cropName: lot.cropName,
          quantity: lot.quantity,
          quality: qualityText(lot.quality),
          ageDays: lot.ageDays,
          condition: lot.condition
        }))
      },
      processing: {
        lotsCreated: state.processing?.lotsCreated || 0,
        lastRunDay: state.processing?.lastRunDay || null,
        recipes: state.processing?.recipes || [],
        proficiency: Object.keys(state.processing?.proficiency || {}).slice(0, 6).map((id) => ({
          id,
          level: state.processing.proficiency[id].level,
          runs: state.processing.proficiency[id].runs
        }))
      },
      facilities: publicFacilitySnapshot ? publicFacilitySnapshot(state) : null,
      contracts: (state.contracts || []).map((contract) => ({
        id: contract.id,
        label: contract.label,
        buyer: contract.buyer,
        channel: contract.channel,
        marketChannel: contract.marketChannel,
        cropName: contract.cropName,
        minQuality: contract.minQuality,
        delivered: `${contract.deliveredQuantity}/${contract.quantity}`,
        dueDay: contract.dueDay,
        status: contract.status
      })),
      contractBids: (state.contractBids || []).filter((bid) => bid.status === "open").slice(0, 4).map((bid) => ({
        id: bid.id,
        label: bid.label,
        buyer: bid.buyer,
        cropName: bid.cropName,
        quantity: bid.quantity,
        dueDay: bid.dueDay,
        expiresDay: bid.expiresDay
      })),
      market: publicMarketSnapshot ? publicMarketSnapshot(state) : null,
      ledger: {
        cashYsc: state.ledger?.cashYsc || 0,
        debtYsc: state.ledger?.debtYsc || 0,
        debt: state.ledger?.debt ? {
          borrowedDay: state.ledger.debt.borrowedDay,
          interestStartDay: state.ledger.debt.interestStartDay,
          principalYsc: state.ledger.debt.principalYsc,
          baseInterestRate: state.ledger.debt.baseInterestRate,
          currentInterestRate: state.ledger.debt.currentInterestRate,
          overdueWeeks: state.ledger.debt.overdueWeeks,
          scheduledPaymentYsc: state.ledger.debt.scheduledPaymentYsc,
          paidThisWeekYsc: state.ledger.debt.paidThisWeekYsc,
          interestAccruedYsc: state.ledger.debt.interestAccruedYsc,
          debtPressure: state.ledger.debt.debtPressure,
          goldkinLeverage: state.ledger.debt.goldkinLeverage,
          lastSettlement: state.ledger.debt.history?.[state.ledger.debt.history.length - 1] || null
        } : null,
        receivableYsc: receivableTotal,
        payableYsc: payableTotal,
        accountingTransparency: state.ledger?.accountingTransparency || 0,
        townReputation: state.ledger?.reputationAssets?.townReputation || 0,
        goldkinDependency: state.ledger?.reputationAssets?.goldkinDependency || 0,
        cooperativeTrust: state.ledger?.reputationAssets?.cooperativeTrust || 0
      },
      consignmentDisputes: (state.consignmentDisputes || []).slice(-4),
      accountingEvents: (state.accountingEvents || []).slice(-4),
      relationships: relationshipLedger?.publicSnapshot ? relationshipLedger.publicSnapshot(state) : null,
      risks: state.risks || null,
      events: (state.events || []).slice(-5),
      promptBrief: [
        `${state.seasonLabel || seasonLabels[state.seasonKey]}第 ${state.day} 日待结算。`,
        `公开库存 ${inventory.quantity} 单位，开放合同 ${openContracts.length} 份。`,
        `现金 ${state.ledger?.cashYsc || 0} YSC，账务透明度 ${state.ledger?.accountingTransparency || 0}/100。`
      ].join(" ")
    };
  }


  T.townLedger = {
    version,
    sourceRefs,
    seasonCropPlans,
    contractTemplates,
    createInitialState,
    settleDay,
    publicSnapshot
  };
}());
