(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.townLedgerData || {};
  const { cropCatalog = {}, seasonCropPlans = {} } = D;
  const facilityLedger = T.townFacilityLedger || {};
  const {
    clamp,
    fieldCrop,
    qualityText,
    consecutiveWeather,
    applyCareToken,
    calculateQuality,
    cropSeasonOk
  } = T.townLedgerCore;

  const version = "town-crop-field-ledger-v0.0.6-local";
  const replantableStatuses = new Set(["harvested", "failed", "rotten"]);

  function cropChangeNote(field, before) {
    if (field.status === "ready" && before.status !== "ready") return `${field.cropName}成熟，品质暂评${qualityText(field.quality)}。`;
    if (field.status === "failed" && before.status !== "failed") return `${field.cropName}因压力过高停产。`;
    if (field.status === "rotten" && before.status !== "rotten") return `${field.cropName}腐烂，不能再入库。`;
    if (field.growth > before.growth) return `${field.cropName}成长 ${before.growth}/${field.daysToMature} -> ${field.growth}/${field.daysToMature}。`;
    if (field.stress > before.stress) return `${field.cropName}压力上升到 ${field.stress}。`;
    if (field.quality !== before.quality) return `${field.cropName}品质调整为${qualityText(field.quality)}。`;
    return `${field.cropName}状态更新。`;
  }

  function plannedField(state, field) {
    const plan = seasonCropPlans[state.seasonKey] || seasonCropPlans.spring || { fields: [] };
    return (plan.fields || []).find((item) => item.id === field.id) || (plan.fields || [])[0] || {};
  }

  function estimatedCropCoverage(state, cropId) {
    const inventory = (state.inventory?.lots || [])
      .filter((lot) => lot.cropId === cropId)
      .reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);
    const fieldCoverage = (state.fields || [])
      .filter((field) => field.cropId === cropId && !replantableStatuses.has(field.status))
      .reduce((sum, field) => sum + Math.max(3, field.lastYield || fieldCrop(field).baseYield || 0), 0);
    return inventory + fieldCoverage;
  }

  function urgentContractCropId(state, field) {
    const contracts = (state.contracts || [])
      .filter((contract) => ["active", "overdue"].includes(contract.status))
      .filter((contract) => contract.cropId && contract.family !== "processed")
      .filter((contract) => Math.max(0, contract.quantity - contract.deliveredQuantity) > estimatedCropCoverage(state, contract.cropId))
      .sort((a, b) => a.dueDay - b.dueDay);
    const match = contracts.find((contract) => {
      const crop = cropCatalog[contract.cropId];
      return crop && cropSeasonOk(crop, field, state.seasonKey);
    });
    return match?.cropId || "";
  }

  function cropForReplant(state, field) {
    const contractCropId = urgentContractCropId(state, field);
    if (contractCropId && cropCatalog[contractCropId]) return cropCatalog[contractCropId];
    const planned = plannedField(state, field);
    return cropCatalog[planned.cropId] || cropCatalog.maple_radish || fieldCrop(field);
  }

  function resetFieldForCrop(field, crop, state) {
    field.cropId = crop.id;
    field.cropName = crop.name;
    field.family = crop.family;
    field.category = crop.category;
    field.status = "growing";
    field.plantedDay = state.day;
    field.growth = 0;
    field.daysToMature = crop.daysToMature;
    field.harvestWindow = crop.harvestWindow;
    field.readyDay = null;
    field.overripeDays = 0;
    field.stress = 0;
    field.quality = "B";
    field.qualityScore = 60;
    field.lastYield = 0;
    field.soil.cropFamily = crop.family;
    field.soil.fertility = clamp(field.soil.fertility - 1, 1, 5);
    field.soil.weeds = clamp(Math.floor(field.soil.weeds / 2), 0, 5);
    field.soil.pests = clamp(Math.floor(field.soil.pests / 2), 0, 5);
    field.soil.disease = clamp(Math.floor(field.soil.disease / 2), 0, 5);
  }

  function replantFields(state, activitySummary, settlement) {
    let slots = (
      Number(activitySummary.planting || 0) +
      Number(activitySummary.fieldWorkFallback || 0) +
      Math.min(2, Number(activitySummary.creditPurchase || 0)) +
      Math.min(1, Number(activitySummary.compost || 0))
    );
    if (slots <= 0) return;
    const fields = (state.fields || [])
      .filter((field) => replantableStatuses.has(field.status))
      .sort((a, b) => a.id.localeCompare(b.id));

    fields.forEach((field) => {
      if (slots <= 0) return;
      const beforeCrop = field.cropName;
      const crop = cropForReplant(state, field);
      resetFieldForCrop(field, crop, state);
      field.notes.push(`第 ${state.day} 日重新播下 ${crop.name}。`);
      settlement.cropChanges.push({
        fieldId: field.id,
        cropName: crop.name,
        note: `${field.name}重新播下${crop.name}，上一轮${beforeCrop}已经结束。`
      });
      slots -= 1;
    });
  }

  function updateCrops(state, weather, activitySummary, settlement) {
    const facilityEffects = facilityLedger.effects ? facilityLedger.effects(state) : {};
    let irrigation = activitySummary.irrigation;
    let weeding = activitySummary.weeding;
    let compost = activitySummary.compost;
    let patrol = activitySummary.patrol;
    const rainyStreak = consecutiveWeather(state, ["light_rain", "storm", "fog"]);
    const changes = [];

    replantFields(state, activitySummary, settlement);

    state.fields.forEach((field) => {
      const crop = fieldCrop(field);
      const soil = field.soil;
      const before = {
        status: field.status,
        growth: field.growth,
        moisture: soil.moisture,
        weeds: soil.weeds,
        pests: soil.pests,
        disease: soil.disease,
        quality: field.quality,
        stress: field.stress
      };

      const irrigationResult = applyCareToken(irrigation, soil.moisture < crop.moistureRange[1] ? 1 : 0);
      irrigation = irrigationResult.value;
      const weedResult = applyCareToken(weeding, soil.weeds > 0 ? 1 : 0);
      weeding = weedResult.value;
      const compostResult = applyCareToken(compost, soil.fertility < 5 || soil.organic < 5 ? 1 : 0);
      compost = compostResult.value;
      const patrolResult = applyCareToken(patrol, soil.pests > 0 || soil.disease > 0 ? 1 : 0);
      patrol = patrolResult.value;

      soil.moisture = clamp(soil.moisture + weather.moistureDelta + irrigationResult.used, 0, 5);
      soil.weeds = clamp(soil.weeds + (["spring", "summer"].includes(state.seasonKey) && weather.moistureDelta > 0 ? 1 : 0) - weedResult.used, 0, 5);
      soil.pests = clamp(soil.pests + weather.pestDelta + (soil.weeds >= 4 ? 1 : 0) - patrolResult.used, 0, 5);
      soil.disease = clamp(soil.disease + weather.diseaseDelta + (soil.moisture >= 5 || rainyStreak >= 3 ? 1 : 0) - patrolResult.used, 0, 5);
      soil.fertility = clamp(soil.fertility + compostResult.used, 0, 5);
      soil.organic = clamp(soil.organic + compostResult.used, 0, 5);

      if (field.status === "growing") {
        const moistureOk = soil.moisture >= crop.moistureRange[0] && soil.moisture <= crop.moistureRange[1];
        const seasonOk = cropSeasonOk(crop, field, state.seasonKey);
        const fertilityOk = soil.fertility >= crop.minFertility;
        const pressureOk = soil.pests + soil.disease + Math.max(0, soil.weeds - 2) <= 4;
        const failures = [moistureOk, seasonOk, fertilityOk, pressureOk].filter((item) => !item).length;

        if (failures <= 1) {
          const greenhouseBonus = (field.bedType === "greenhouse" || field.bedType === "indoor" || crop.indoorFriendly)
            ? facilityEffects.greenhouseGrowthBonus || 0
            : 0;
          field.growth = clamp(field.growth + 1 + greenhouseBonus, 0, field.daysToMature);
        } else {
          field.stress = clamp(field.stress + 1 + (weather.riskIndex >= 4 ? 1 : 0), 0, 9);
        }
        if (field.stress >= 5 && (soil.pests >= 5 || soil.disease >= 5)) {
          field.status = "failed";
          field.notes.push(`第 ${state.day} 日，病虫害压力过高，${field.cropName}停产。`);
        } else if (field.growth >= field.daysToMature) {
          field.status = "ready";
          field.readyDay = field.readyDay || state.day;
          field.notes.push(`第 ${state.day} 日，${field.cropName}成熟待采。`);
        }
      } else if (field.status === "ready") {
        field.overripeDays += 1;
        if (field.overripeDays > field.harvestWindow + 2) {
          field.status = "rotten";
          field.notes.push(`第 ${state.day} 日，${field.cropName}延迟太久，已经腐烂。`);
        }
      }

      const quality = calculateQuality(field);
      field.qualityScore = quality.score;
      field.quality = quality.quality;

      if (field.status !== before.status || field.growth !== before.growth || field.quality !== before.quality || field.stress !== before.stress) {
        changes.push({
          fieldId: field.id,
          cropName: field.cropName,
          before,
          after: {
            status: field.status,
            growth: field.growth,
            moisture: soil.moisture,
            weeds: soil.weeds,
            pests: soil.pests,
            disease: soil.disease,
            quality: field.quality,
            stress: field.stress
          },
          note: cropChangeNote(field, before)
        });
      }
    });

    settlement.cropChanges.push(...changes);
  }

  function harvestYield(field) {
    const soil = field.soil;
    const crop = fieldCrop(field);
    return clamp(
      crop.baseYield + soil.fertility + Math.floor(soil.organic / 2) - soil.pests - soil.disease - Math.floor(soil.weeds / 2) - field.stress,
      1,
      crop.baseYield + 6
    );
  }

  function contractUrgency(state, field) {
    const matching = state.contracts
      .filter((contract) => contract.status === "active" && contract.cropId === field.cropId)
      .map((contract) => contract.dueDay - state.day)
      .sort((a, b) => a - b);
    return matching.length ? matching[0] : 99;
  }

  function harvestReadyCrops(state, activitySummary, settlement) {
    let harvestSlots = activitySummary.harvest + activitySummary.fieldWorkFallback;
    const readyFields = state.fields
      .filter((field) => field.status === "ready")
      .sort((a, b) => contractUrgency(state, a) - contractUrgency(state, b) || b.overripeDays - a.overripeDays);

    readyFields.forEach((field) => {
      if (harvestSlots <= 0) {
        settlement.cropChanges.push({
          fieldId: field.id,
          cropName: field.cropName,
          note: `${field.cropName}已成熟但今日没有足够采收劳动。`
        });
        return;
      }
      harvestSlots -= 1;
      const crop = fieldCrop(field);
      const quantity = harvestYield(field);
      const lot = {
        id: `lot-d${state.day}-${field.id}-${crop.id}`,
        cropId: crop.id,
        cropName: crop.name,
        family: crop.family,
        category: crop.category,
        storageType: crop.storageType,
        quality: field.quality,
        quantity,
        basePriceYsc: crop.basePriceYsc,
        shelfLifeDays: crop.shelfLifeDays,
        ageDays: 0,
        harvestedDay: state.day,
        sourceFieldId: field.id,
        condition: "fresh",
        valueModifier: 1
      };
      state.inventory.lots.push(lot);
      field.status = "harvested";
      field.lastYield = quantity;
      field.notes.push(`第 ${state.day} 日采收入库 ${quantity} 单位。`);
      if (crop.improvesSoil) {
        field.soil.fertility = clamp(field.soil.fertility + 1, 0, 5);
      }
      settlement.harvestedLots.push(lot);
      settlement.inventoryChanges.push(`${crop.name}入库 ${quantity} 单位，品质${qualityText(lot.quality)}。`);
      settlement.cropChanges.push({
        fieldId: field.id,
        cropName: crop.name,
        note: `${crop.name}采收入库 ${quantity} 单位，品质${qualityText(lot.quality)}。`
      });
    });
  }

  T.townCropFieldLedger = {
    version,
    cropChangeNote,
    updateCrops,
    harvestYield,
    contractUrgency,
    harvestReadyCrops
  };
}());
