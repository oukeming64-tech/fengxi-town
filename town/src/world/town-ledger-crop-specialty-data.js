(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const cropCatalog = {
    creek_pea: {
      id: "creek_pea",
      name: "溪谷豌豆",
      family: "legume",
      category: "豆类",
      seasons: ["spring", "summer"],
      daysToMature: 5,
      harvestWindow: 2,
      baseYield: 8,
      basePriceYsc: 16,
      shelfLifeDays: 4,
      moistureRange: [2, 4],
      minFertility: 1,
      storageType: "fruit",
      improvesSoil: true
    },
    climbing_bean: {
      id: "climbing_bean",
      name: "攀藤豆",
      family: "legume",
      category: "豆类",
      seasons: ["summer"],
      daysToMature: 4,
      harvestWindow: 2,
      baseYield: 9,
      basePriceYsc: 15,
      shelfLifeDays: 4,
      moistureRange: [2, 4],
      minFertility: 1,
      storageType: "fruit",
      improvesSoil: true
    },
    silver_sage: {
      id: "silver_sage",
      name: "银叶鼠尾草",
      family: "herb",
      category: "草药",
      seasons: ["fall", "spring"],
      daysToMature: 4,
      harvestWindow: 2,
      baseYield: 5,
      basePriceYsc: 30,
      shelfLifeDays: 10,
      moistureRange: [1, 3],
      minFertility: 1,
      storageType: "herb"
    },
    mist_mushroom: {
      id: "mist_mushroom",
      name: "雾伞菇",
      family: "mushroom",
      category: "蘑菇",
      seasons: ["fall", "winter"],
      daysToMature: 4,
      harvestWindow: 2,
      baseYield: 7,
      basePriceYsc: 26,
      shelfLifeDays: 5,
      moistureRange: [4, 5],
      minFertility: 1,
      storageType: "mushroom",
      indoorFriendly: true
    },
    wood_ear_mushroom: {
      id: "wood_ear_mushroom",
      name: "木耳菇",
      family: "mushroom",
      category: "蘑菇",
      seasons: ["winter", "fall"],
      daysToMature: 5,
      harvestWindow: 2,
      baseYield: 8,
      basePriceYsc: 22,
      shelfLifeDays: 5,
      moistureRange: [4, 5],
      minFertility: 1,
      storageType: "mushroom",
      indoorFriendly: true
    },
    prairie_basil: {
      id: "prairie_basil",
      name: "草原罗勒",
      family: "herb",
      category: "草药",
      seasons: ["summer"],
      daysToMature: 4,
      harvestWindow: 2,
      baseYield: 6,
      basePriceYsc: 31,
      shelfLifeDays: 6,
      moistureRange: [2, 3],
      minFertility: 1,
      storageType: "herb"
    },
    pine_oyster: {
      id: "pine_oyster",
      name: "松影平菇",
      family: "mushroom",
      category: "蘑菇",
      seasons: ["winter", "fall"],
      daysToMature: 4,
      harvestWindow: 2,
      baseYield: 8,
      basePriceYsc: 25,
      shelfLifeDays: 5,
      moistureRange: [4, 5],
      minFertility: 1,
      storageType: "mushroom",
      indoorFriendly: true
    }
  };

  T.townLedgerCropSpecialtyData = {
    version: "town-ledger-crop-specialty-data-v0.0.6-local",
    cropCatalog
  };
}());
