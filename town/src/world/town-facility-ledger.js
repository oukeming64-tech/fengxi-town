(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.townLedgerData;
  const { facilityCatalog, processingRecipes, qualityOrder } = D;
  const { clamp, addLedgerEntry } = T.townLedgerCore;

  const version = "town-facility-v0.0.5-visual-facility-depth-local";

  function ensureFacilities(state) {
    state.facilities = state.facilities || {};
    Object.keys(facilityCatalog).forEach((id) => {
      if (!state.facilities[id]) {
        const item = facilityCatalog[id];
        state.facilities[id] = {
          id,
          name: item.name,
          group: item.group,
          level: item.startingLevel,
          maxLevel: item.maxLevel,
          condition: item.startingCondition,
          lastMaintenanceDay: null,
          upgradedDay: null,
          notes: []
        };
      }
    });
    state.processing = state.processing || { recipes: Object.keys(processingRecipes), proficiency: {}, lotsCreated: 0, lastRunDay: null, notes: [] };
    state.processing.proficiency = state.processing.proficiency || {};
    Object.keys(processingRecipes).forEach((id) => {
      if (!state.processing.proficiency[id]) {
        state.processing.proficiency[id] = { recipeId: id, level: 0, runs: 0, progress: 0 };
      }
    });
    return state.facilities;
  }

  function effectiveLevel(facility) {
    if (!facility) return 0;
    if (facility.condition < 35) return Math.max(0, facility.level - 1);
    if (facility.condition < 55) return Math.max(0, facility.level - 0.5);
    return facility.level;
  }

  function effects(state) {
    const facilities = ensureFacilities(state);
    const greenhouse = effectiveLevel(facilities.greenhouse);
    const barn = effectiveLevel(facilities.barn);
    const processingTable = effectiveLevel(facilities.processingTable);
    const deliveryVan = effectiveLevel(facilities.deliveryVan);
    const accountingDesk = effectiveLevel(facilities.accountingDesk);
    const marketStall = effectiveLevel(facilities.marketStall);
    return {
      greenhouseGrowthBonus: greenhouse >= 2 ? 1 : 0,
      greenhouseQualityBonus: greenhouse >= 3 ? 4 : greenhouse >= 2 ? 2 : 0,
      storageCapacityBonus: Math.round(Math.max(0, barn - 1) * 24),
      processingSlotBonus: Math.floor(Math.max(0, processingTable - 1)),
      processingYieldBonus: Math.max(0, processingTable - 1) * 0.04,
      processingCostDiscount: Math.max(0, processingTable - 1) * 0.04,
      logisticsDiscount: Math.max(0, deliveryVan - 1) * 0.06,
      accountingTransparencyBonus: Math.floor(Math.max(0, accountingDesk - 1) * 2),
      consignmentCapacityBonus: Math.floor(Math.max(0, marketStall - 1) * 2)
    };
  }

  function facilityUsePressure(id, weather, activitySummary) {
    const storm = ["storm", "flood", "wind", "iceStorm", "blizzard"].includes(weather.key) ? 2 : 0;
    const use = {
      greenhouse: storm + Math.ceil((activitySummary.irrigation + activitySummary.patrol + activitySummary.greenhouseRepair) / 5),
      barn: Math.ceil((activitySummary.barnAudit + activitySummary.packaging + activitySummary.processing) / 4),
      processingTable: Math.ceil(activitySummary.processing / 2),
      deliveryVan: Math.ceil(activitySummary.logistics / 2) + (weather.logisticsPressure >= 3 ? 1 : 0),
      accountingDesk: Math.ceil((activitySummary.accounting + activitySummary.receiptWork + activitySummary.contractBidWork) / 5),
      marketStall: Math.ceil((activitySummary.consignmentWork + activitySummary.packaging) / 4)
    };
    return use[id] || 0;
  }

  function maintainFacilities(state, weather, activitySummary, settlement) {
    const facilities = ensureFacilities(state);
    Object.keys(facilities).forEach((id) => {
      const facility = facilities[id];
      const pressure = facilityUsePressure(id, weather, activitySummary);
      if (!pressure) return;
      facility.condition = clamp(facility.condition - pressure, 0, 100);
      if (pressure >= 2) {
        facility.notes.push(`第 ${state.day} 日，${weather.label}和使用让${facility.name}状态降到 ${facility.condition}/100。`);
      }
    });

    let repairTokens = activitySummary.facilityRepair + activitySummary.toolMaintenance + Math.floor(activitySummary.greenhouseRepair / 2);
    const targets = Object.values(facilities)
      .filter((facility) => facility.condition < 92)
      .sort((a, b) => a.condition - b.condition);

    targets.forEach((facility) => {
      if (repairTokens <= 0) return;
      const data = facilityCatalog[facility.id];
      const used = Math.min(repairTokens, facility.condition < 45 ? 2 : 1);
      const before = facility.condition;
      const repair = used * 11 + (facility.id === "greenhouse" && activitySummary.greenhouseRepair ? 4 : 0);
      const cost = Math.round(data.maintenanceCostYsc * used * 0.38);
      repairTokens -= used;
      facility.condition = clamp(facility.condition + repair, 0, 100);
      facility.lastMaintenanceDay = state.day;
      addLedgerEntry(state, {
        day: state.day,
        type: "expense",
        account: "设施维护",
        source: facility.name,
        detail: `${facility.name}维护 ${before} -> ${facility.condition}`,
        amountYsc: cost
      });
      settlement.facilityChanges.push(`${facility.name}维护，状态 ${before}/100 -> ${facility.condition}/100，支出 ${cost} YSC。`);
    });
  }

  function upgradeScore(facility, activitySummary, state) {
    const id = facility.id;
    let score = 100 - facility.condition + facility.level * 3;
    if (id === "processingTable") score += activitySummary.processing * 12 + activitySummary.training * 4;
    if (id === "greenhouse") score += activitySummary.greenhouseRepair * 10 + (state.seasonKey === "winter" ? 8 : 0);
    if (id === "barn") score += activitySummary.barnAudit * 10 + activitySummary.packaging * 3;
    if (id === "deliveryVan") score += activitySummary.logistics * 9;
    if (id === "accountingDesk") score += activitySummary.accounting * 9 + activitySummary.receiptWork * 4;
    if (id === "marketStall") score += activitySummary.consignmentWork * 9;
    return score;
  }

  function maybeUpgradeFacility(state, activitySummary, settlement) {
    const facilities = ensureFacilities(state);
    const upgradeTokens = activitySummary.upgradePlanning + Math.floor(activitySummary.facilityRepair / 3) + Math.floor(activitySummary.training / 2);
    if (upgradeTokens <= 0) return;
    const candidates = Object.values(facilities)
      .filter((facility) => facility.level < facility.maxLevel && facility.condition >= 58)
      .sort((a, b) => upgradeScore(b, activitySummary, state) - upgradeScore(a, activitySummary, state));
    const target = candidates[0];
    if (!target) return;
    const data = facilityCatalog[target.id];
    const cost = Math.round(data.upgradeCostYsc * (1 + (target.level - 1) * 0.42));
    const lastUpgradeDay = Math.max(0, ...Object.values(facilities).map((facility) => Number(facility.upgradedDay || 0)));
    if (lastUpgradeDay && state.day - lastUpgradeDay < 7) return;
    if ((state.ledger?.cashYsc || 0) < cost + 1600) return;
    target.level += 1;
    target.condition = clamp(target.condition - 8, 0, 100);
    target.upgradedDay = state.day;
    const note = data.upgradeNotes[target.level - 1] || "做了一轮升级";
    target.notes.push(`第 ${state.day} 日升级到 ${target.level} 级：${note}。`);
    addLedgerEntry(state, {
      day: state.day,
      type: "expense",
      account: "设施升级",
      source: target.name,
      detail: `${target.name}升级到 ${target.level} 级：${note}`,
      amountYsc: cost
    });
    settlement.facilityChanges.push(`${target.name}升级到 ${target.level} 级，${note}，支出 ${cost} YSC。`);
  }

  function updateFacilities(state, weather, activitySummary, settlement) {
    ensureFacilities(state);
    state.inventory.capacity = 120 + effects(state).storageCapacityBonus;
    maintainFacilities(state, weather, activitySummary, settlement);
    maybeUpgradeFacility(state, activitySummary, settlement);
    state.inventory.capacity = 120 + effects(state).storageCapacityBonus;
    if (!settlement.facilityChanges.length) {
      settlement.facilityChanges.push("设施今日只做日常使用记录，没有升级。");
    }
  }

  function qualityLift(quality, steps) {
    const index = qualityOrder.indexOf(quality || "C");
    if (index < 0) return quality || "C";
    return qualityOrder[Math.min(qualityOrder.length - 1, index + steps)];
  }

  function recipeProficiency(state, recipeId) {
    ensureFacilities(state);
    return state.processing.proficiency[recipeId] || { level: 0, runs: 0, progress: 0 };
  }

  function recordProcessingRun(state, recipeId, inputQuantity, settlement) {
    const item = recipeProficiency(state, recipeId);
    const beforeLevel = item.level;
    item.runs += 1;
    item.progress += inputQuantity;
    const threshold = 10 + item.level * 8;
    if (item.progress >= threshold && item.level < 5) {
      item.progress -= threshold;
      item.level += 1;
    }
    state.processing.proficiency[recipeId] = item;
    if (item.level > beforeLevel) {
      const recipe = processingRecipes[recipeId];
      settlement.facilityChanges.push(`${recipe?.name || "加工"}熟练度升到 ${item.level} 级。`);
    }
    return item;
  }

  function publicSnapshot(state) {
    const facilities = ensureFacilities(state);
    const fx = effects(state);
    const proficiency = Object.keys(state.processing?.proficiency || {}).map((id) => {
      const recipe = processingRecipes[id];
      const item = state.processing.proficiency[id];
      return {
        id,
        name: recipe?.name || id,
        level: item.level,
        runs: item.runs
      };
    });
    return {
      version,
      facilities: Object.values(facilities).map((facility) => ({
        id: facility.id,
        name: facility.name,
        group: facility.group,
        level: facility.level,
        maxLevel: facility.maxLevel,
        condition: facility.condition
      })),
      effects: fx,
      proficiency
    };
  }

  T.townFacilityLedger = {
    version,
    ensureFacilities,
    effects,
    updateFacilities,
    qualityLift,
    recipeProficiency,
    recordProcessingRun,
    publicSnapshot
  };
}());
