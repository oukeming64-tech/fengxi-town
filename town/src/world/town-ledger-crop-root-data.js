(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const cropCatalog = {
    maple_radish: {
      id: "maple_radish",
      name: "枫溪萝卜",
      family: "root",
      category: "根茎类",
      seasons: ["spring", "fall"],
      daysToMature: 4,
      harvestWindow: 2,
      baseYield: 9,
      basePriceYsc: 14,
      shelfLifeDays: 7,
      moistureRange: [2, 4],
      minFertility: 2,
      storageType: "root"
    },
    yellow_potato: {
      id: "yellow_potato",
      name: "黄皮土豆",
      family: "root",
      category: "根茎类",
      seasons: ["fall", "spring"],
      daysToMature: 5,
      harvestWindow: 3,
      baseYield: 11,
      basePriceYsc: 16,
      shelfLifeDays: 7,
      moistureRange: [1, 3],
      minFertility: 2,
      storageType: "root"
    },
    glass_onion: {
      id: "glass_onion",
      name: "玻璃洋葱",
      family: "root",
      category: "根茎类",
      seasons: ["spring", "fall"],
      daysToMature: 5,
      harvestWindow: 3,
      baseYield: 10,
      basePriceYsc: 15,
      shelfLifeDays: 9,
      moistureRange: [1, 3],
      minFertility: 2,
      storageType: "root"
    },
    river_carrot: {
      id: "river_carrot",
      name: "河湾胡萝卜",
      family: "root",
      category: "根茎类",
      seasons: ["spring"],
      daysToMature: 4,
      harvestWindow: 2,
      baseYield: 9,
      basePriceYsc: 17,
      shelfLifeDays: 8,
      moistureRange: [2, 4],
      minFertility: 2,
      storageType: "root"
    },
    amber_beet: {
      id: "amber_beet",
      name: "琥珀甜菜",
      family: "root",
      category: "根茎类",
      seasons: ["fall", "winter"],
      daysToMature: 5,
      harvestWindow: 3,
      baseYield: 10,
      basePriceYsc: 18,
      shelfLifeDays: 9,
      moistureRange: [1, 3],
      minFertility: 2,
      storageType: "root"
    }
  };

  T.townLedgerCropRootData = {
    version: "town-ledger-crop-root-data-v0.0.6-local",
    cropCatalog
  };
}());
