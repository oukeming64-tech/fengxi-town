(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.townLedgerData;
  const { processingRecipes } = D;
  const facilityLedger = T.townFacilityLedger || {};
  const {
    qualityText,
    downgradeQuality,
    addLedgerEntry
  } = T.townLedgerCore;

  const version = "town-crop-inventory-ledger-v0.0.6-local";

  function lotMatchesRecipe(lot, recipe) {
    if (lot.processed || lot.quantity < recipe.minimumInput) return false;
    return (recipe.inputFamilies || []).includes(lot.family);
  }

  function makeProcessedLot(state, lot, recipe, inputQuantity, runEffects, proficiency) {
    const proficiencyBonus = Math.min(0.18, (proficiency?.level || 0) * 0.03);
    const outputQuantity = Math.max(1, Math.floor(inputQuantity * recipe.yieldRate * (1 + (runEffects.processingYieldBonus || 0) + proficiencyBonus)));
    const quality = (proficiency?.level || 0) >= 3 && facilityLedger.qualityLift
      ? facilityLedger.qualityLift(lot.quality, 1)
      : lot.quality;
    return {
      id: `processed-d${state.day}-${recipe.id}-${lot.id}`,
      cropId: recipe.id,
      cropName: recipe.name,
      family: recipe.outputFamily,
      sourceFamily: lot.family,
      sourceCropId: lot.cropId,
      sourceCropName: lot.cropName,
      category: recipe.outputCategory,
      storageType: recipe.outputStorageType,
      quality,
      quantity: outputQuantity,
      basePriceYsc: Math.max(1, Math.round(lot.basePriceYsc * recipe.priceMultiplier * (1 + Math.min(0.1, (proficiency?.level || 0) * 0.02)))),
      shelfLifeDays: recipe.shelfLifeDays,
      ageDays: 0,
      harvestedDay: state.day,
      sourceLotId: lot.id,
      condition: "processed",
      valueModifier: 1,
      processed: true,
      recipeId: recipe.id,
      proficiencyLevel: proficiency?.level || 0
    };
  }

  function processLots(state, activitySummary, settlement) {
    const runEffects = facilityLedger.effects ? facilityLedger.effects(state) : {};
    let slots = Math.max(0, activitySummary.processing || 0) + (runEffects.processingSlotBonus || 0);
    if (!slots) return;
    const recipes = Object.values(processingRecipes);
    const candidates = state.inventory.lots
      .filter((lot) => lot.quantity > 0 && !lot.processed)
      .sort((a, b) => (a.shelfLifeDays - a.ageDays) - (b.shelfLifeDays - b.ageDays) || b.quantity - a.quantity);
    const created = [];

    candidates.forEach((lot) => {
      if (slots <= 0) return;
      const recipe = recipes.find((item) => lotMatchesRecipe(lot, item));
      if (!recipe) return;
      const inputQuantity = Math.min(lot.quantity, recipe.minimumInput + 2);
      const proficiency = facilityLedger.recipeProficiency ? facilityLedger.recipeProficiency(state, recipe.id) : { level: 0 };
      const processedLot = makeProcessedLot(state, lot, recipe, inputQuantity, runEffects, proficiency);
      const laborCost = Math.max(3, Math.round(recipe.laborCostYsc * (1 - (runEffects.processingCostDiscount || 0) - Math.min(0.12, (proficiency.level || 0) * 0.03))));
      lot.quantity -= inputQuantity;
      slots -= 1;
      created.push({ lot, recipe, processedLot, inputQuantity });
      state.inventory.lots.push(processedLot);
      state.processing.lotsCreated += processedLot.quantity;
      state.processing.lastRunDay = state.day;
      if (facilityLedger.recordProcessingRun) facilityLedger.recordProcessingRun(state, recipe.id, inputQuantity, settlement);
      addLedgerEntry(state, {
        day: state.day,
        type: "expense",
        account: "加工包装",
        source: "谷仓加工台",
        detail: `${lot.cropName}加工为${recipe.name}`,
        amountYsc: laborCost
      });
      created[created.length - 1].laborCost = laborCost;
    });

    if (created.length) {
      settlement.processedLots.push(...created.map((item) => item.processedLot));
      settlement.inventoryChanges.push(...created.map((item) => (
        `${item.lot.cropName} ${item.inputQuantity} 单位加工成${item.recipe.name} ${item.processedLot.quantity} 单位，品质${qualityText(item.processedLot.quality)}。`
      )));
      settlement.cashNotes.push(`加工包装支出 ${created.reduce((sum, item) => sum + item.laborCost, 0)} YSC。`);
    }
    state.inventory.lots = state.inventory.lots.filter((lot) => lot.quantity > 0);
  }

  function processInventory(state, weather, activitySummary, settlement) {
    state.processing = state.processing || { recipes: Object.keys(processingRecipes), lotsCreated: 0, lastRunDay: null, notes: [] };
    processLots(state, activitySummary, settlement);
    const losses = [];
    state.inventory.lots.forEach((lot) => {
      if (lot.quantity <= 0) return;
      const before = { quantity: lot.quantity, quality: lot.quality, ageDays: lot.ageDays, condition: lot.condition };
      if (lot.harvestedDay < state.day) lot.ageDays += 1;

      if (lot.storageType === "leaf" && lot.ageDays > lot.shelfLifeDays) {
        lot.quality = downgradeQuality(lot.quality);
        if (lot.quality === "C") lot.quantity = Math.max(0, lot.quantity - Math.ceil(lot.quantity * 0.2));
      }
      if (lot.storageType === "fruit" && (lot.ageDays > lot.shelfLifeDays || (weather.key === "heatwave" && lot.ageDays >= lot.shelfLifeDays - 1))) {
        lot.quality = downgradeQuality(lot.quality);
        const lossRate = weather.spoilagePressure >= 2 ? 0.25 : 0.1;
        lot.quantity = Math.max(0, lot.quantity - Math.ceil(lot.quantity * lossRate));
      }
      if (lot.storageType === "root" && lot.ageDays > lot.shelfLifeDays) {
        lot.condition = "discounted";
        lot.valueModifier = 0.7;
        if (lot.ageDays > lot.shelfLifeDays + 4) lot.quantity = Math.max(0, lot.quantity - 1);
      }
      if (lot.storageType === "grain" && ["storm", "light_rain", "fog"].includes(weather.key) && lot.ageDays > 2) {
        lot.condition = "moisture-watch";
        if (weather.key === "storm") lot.quality = downgradeQuality(lot.quality);
      }
      if (lot.storageType === "mushroom" && (weather.key === "heatwave" || lot.ageDays > lot.shelfLifeDays)) {
        lot.quality = downgradeQuality(lot.quality);
        if (lot.ageDays > lot.shelfLifeDays + 1) lot.quantity = Math.max(0, lot.quantity - Math.ceil(lot.quantity * 0.2));
      }
      if (lot.storageType === "processed" && lot.ageDays > lot.shelfLifeDays) {
        lot.condition = "aged";
        lot.valueModifier = 0.82;
        if (lot.ageDays > lot.shelfLifeDays + 5) lot.quantity = Math.max(0, lot.quantity - 1);
      }

      if (lot.quantity !== before.quantity || lot.quality !== before.quality || lot.condition !== before.condition) {
        losses.push({
          lotId: lot.id,
          cropName: lot.cropName,
          before,
          after: { quantity: lot.quantity, quality: lot.quality, ageDays: lot.ageDays, condition: lot.condition },
          note: `${lot.cropName}库存从 ${before.quantity}${qualityText(before.quality)} 调整为 ${lot.quantity}${qualityText(lot.quality)}。`
        });
      }
    });
    state.inventory.lots = state.inventory.lots.filter((lot) => lot.quantity > 0);
    state.inventory.lastLosses = losses;
    if (losses.length) settlement.inventoryChanges.push(...losses.map((item) => item.note));
    if (!settlement.inventoryChanges.length) settlement.inventoryChanges.push("库存无明显损耗。");
  }

  T.townCropInventoryLedger = {
    version,
    lotMatchesRecipe,
    makeProcessedLot,
    processLots,
    processInventory
  };
}());
