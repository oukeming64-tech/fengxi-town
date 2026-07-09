(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.townLedgerData;
  const {
    seasonLabels,
    cropCatalog,
    defaultSoils,
    seasonCropPlans,
    contractTemplates,
    contractCropChoices,
    marketChannels,
    familyMarketProfiles,
    processingRecipes,
    facilityCatalog
  } = D;
  const core = T.townLedgerCore || {};
  const {
    deepClone,
    normalizeSeasonKey,
    addLedgerEntry
  } = core;

  if (!deepClone || !normalizeSeasonKey || !addLedgerEntry) {
    throw new Error("town-ledger-core.js must load before town-ledger-initial-state.js");
  }

  function createField(planField, seasonKey, index) {
    const crop = cropCatalog[planField.cropId] || cropCatalog.maple_radish;
    const soil = {
      ...deepClone(defaultSoils[seasonKey]?.[index] || defaultSoils.spring[index % defaultSoils.spring.length]),
      cropFamily: crop.family
    };
    return {
      id: planField.id,
      name: planField.name,
      bedType: planField.bedType || "field",
      cropId: crop.id,
      cropName: crop.name,
      family: crop.family,
      category: crop.category,
      status: "growing",
      plantedDay: 1,
      growth: 0,
      daysToMature: crop.daysToMature,
      harvestWindow: crop.harvestWindow,
      readyDay: null,
      overripeDays: 0,
      stress: 0,
      quality: "B",
      qualityScore: 60,
      lastYield: 0,
      soil,
      notes: []
    };
  }

  function makeContract(templateId, seasonKey, index) {
    const template = contractTemplates[templateId];
    const cropId = contractCropChoices[seasonKey]?.[templateId];
    const crop = cropId ? (cropCatalog[cropId] || cropCatalog.maple_radish) : null;
    const channel = marketChannels[template.marketChannel] || marketChannels.goldkin_station;
    return {
      id: `${templateId}-${seasonKey}-d1`,
      templateId,
      label: template.label,
      buyer: template.buyer,
      channel: template.channel,
      marketChannel: channel.id,
      cropId: crop?.id || "",
      cropName: template.cropName || crop?.name || "加工品",
      family: crop?.family || "processed",
      minQuality: template.minQuality,
      quantity: template.quantity + (index === 0 ? 1 : 0),
      deliveredQuantity: 0,
      dueDay: 1 + template.dueInDays,
      unitBasePriceYsc: crop?.basePriceYsc || 28,
      channelMultiplier: template.channelMultiplier,
      advanceYsc: template.advanceYsc,
      advanceRemainingYsc: template.advanceYsc,
      penaltyYsc: template.penaltyYsc,
      paymentLagDays: template.paymentLagDays,
      reputationOnFulfill: template.reputationOnFulfill,
      reputationOnDefault: template.reputationOnDefault,
      acceptedFamilies: [...template.acceptedFamilies],
      riskNote: template.riskNote,
      status: "active",
      penaltyApplied: false,
      fulfilledDay: null,
      revenueYsc: 0,
      deliveryLog: []
    };
  }

  function createInitialContracts(seasonKey) {
    return ["goldkin_bulk", "city_restaurant", "school_lunch", "cooperative_pantry", "festival_stall", "preserves_shelf"].map((templateId, index) => (
      makeContract(templateId, seasonKey, index)
    ));
  }

  function createInitialMarket(seasonKey) {
    return {
      seasonKey,
      seasonalDay: 1,
      channels: Object.keys(marketChannels),
      priceProfiles: deepClone(familyMarketProfiles[seasonKey] || familyMarketProfiles.spring),
      activeFestival: null,
      current: {
        day: 1,
        seasonalDay: 1,
        channelMultipliers: {},
        familyMultipliers: deepClone(familyMarketProfiles[seasonKey] || familyMarketProfiles.spring),
        notes: ["开局行情平稳，镇上还在等第一批公开交易。"]
      },
      history: [],
      festivalsSeen: [],
      processingRecipes: Object.keys(processingRecipes)
    };
  }

  function createInitialFacilities() {
    const facilities = {};
    Object.keys(facilityCatalog).forEach((id) => {
      const item = facilityCatalog[id];
      facilities[id] = {
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
    });
    return facilities;
  }

  function createInitialProcessingState() {
    const proficiency = {};
    Object.keys(processingRecipes).forEach((id) => {
      proficiency[id] = {
        recipeId: id,
        level: 0,
        runs: 0,
        progress: 0
      };
    });
    return {
      recipes: Object.keys(processingRecipes),
      proficiency,
      lotsCreated: 0,
      lastRunDay: null,
      notes: ["加工会提高价值并拉长保质期，但需要劳动、包装和更清楚的账本。"]
    };
  }

  function createInitialState(rawSeasonKey) {
    const seasonKey = normalizeSeasonKey(rawSeasonKey);
    const plan = seasonCropPlans[seasonKey];
    const fields = plan.fields.map((field, index) => createField(field, seasonKey, index));
    const contracts = createInitialContracts(seasonKey);
    const state = {
      day: 1,
      seasonKey,
      seasonLabel: seasonLabels[seasonKey],
      weatherHistory: [],
      fields,
      inventory: {
        lots: [],
        capacity: 120,
        lastLosses: [],
        storageNotes: ["叶菜保质期短，根茎和谷物更适合压仓。"]
      },
      processing: createInitialProcessingState(),
      facilities: createInitialFacilities(),
      market: createInitialMarket(seasonKey),
      contracts,
      contractBids: [],
      ledger: {
        currency: "YSC",
        cashYsc: 5000,
        debtYsc: 15000,
        debt: {
          borrowedDay: 1,
          interestStartDay: 31,
          principalYsc: 15000,
          baseInterestRate: 0.04,
          currentInterestRate: 0.04,
          overdueWeeks: 0,
          scheduledPaymentYsc: 0,
          paidThisWeekYsc: 0,
          interestAccruedYsc: 0,
          totalPaidYsc: 0,
          debtPressure: "未起息",
          goldkinLeverage: 20,
          history: []
        },
        accountsReceivable: [],
        accountsPayable: [],
        fixedAssets: [
          { id: "greenhouse", name: "旧温室", valueYsc: 3200, condition: 64 },
          { id: "barn", name: "谷仓", valueYsc: 2600, condition: 72 }
        ],
        reputationAssets: {
          townReputation: 50,
          goldkinDependency: 20,
          cooperativeTrust: 35
        },
        accountingTransparency: 45,
        entries: [],
        dailySummaries: []
      },
      consignmentDisputes: [],
      accountingEvents: [],
      risks: {
        updatedDay: 1,
        scores: {
          agriculture: 20,
          inventory: 10,
          contracts: 25,
          finance: 35,
          labor: 10,
          accounting: 55
        },
        notes: ["开局现金够维持短期周转，但债务和合同依赖已经在账上。"]
      },
      events: []
    };

    addLedgerEntry(state, {
      day: 1,
      type: "income",
      account: "期初现金",
      source: "黄石农场旧账",
      detail: "期初可用现金登记",
      amountYsc: 0,
      affectsCash: false
    });
    contracts.forEach((contract) => {
      if (contract.advanceYsc > 0) {
        addLedgerEntry(state, {
          day: 1,
          type: "income",
          account: "合同预付款",
          source: contract.buyer,
          detail: `${contract.label}预付款`,
          amountYsc: contract.advanceYsc
        });
      }
    });
    return state;
  }

  T.townLedgerInitialState = {
    version: "town-ledger-initial-state-v0.0.6-local",
    createField,
    makeContract,
    createInitialContracts,
    createInitialMarket,
    createInitialFacilities,
    createInitialProcessingState,
    createInitialState
  };

  T.townLedgerCore.createInitialState = createInitialState;
}());
