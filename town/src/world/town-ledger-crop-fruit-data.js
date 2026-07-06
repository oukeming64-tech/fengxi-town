(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const cropCatalog = {
    sun_tomato: {
      id: "sun_tomato",
      name: "太阳番茄",
      family: "fruiting",
      category: "果菜类",
      seasons: ["summer"],
      daysToMature: 5,
      harvestWindow: 2,
      baseYield: 9,
      basePriceYsc: 22,
      shelfLifeDays: 4,
      moistureRange: [2, 4],
      minFertility: 3,
      storageType: "fruit"
    },
    valley_pepper: {
      id: "valley_pepper",
      name: "山谷辣椒",
      family: "fruiting",
      category: "果菜类",
      seasons: ["summer"],
      daysToMature: 5,
      harvestWindow: 2,
      baseYield: 7,
      basePriceYsc: 24,
      shelfLifeDays: 5,
      moistureRange: [2, 3],
      minFertility: 2,
      storageType: "fruit"
    },
    honey_melon: {
      id: "honey_melon",
      name: "蜜纹瓜",
      family: "gourd",
      category: "瓜类",
      seasons: ["summer", "fall"],
      daysToMature: 7,
      harvestWindow: 2,
      baseYield: 6,
      basePriceYsc: 32,
      shelfLifeDays: 5,
      moistureRange: [2, 3],
      minFertility: 3,
      storageType: "fruit"
    },
    golden_pumpkin: {
      id: "golden_pumpkin",
      name: "金岭南瓜",
      family: "gourd",
      category: "瓜类",
      seasons: ["fall"],
      daysToMature: 7,
      harvestWindow: 3,
      baseYield: 7,
      basePriceYsc: 28,
      shelfLifeDays: 10,
      moistureRange: [1, 3],
      minFertility: 3,
      storageType: "root"
    },
    lantern_cucumber: {
      id: "lantern_cucumber",
      name: "灯笼黄瓜",
      family: "fruiting",
      category: "果菜类",
      seasons: ["summer"],
      daysToMature: 4,
      harvestWindow: 2,
      baseYield: 10,
      basePriceYsc: 18,
      shelfLifeDays: 3,
      moistureRange: [3, 4],
      minFertility: 2,
      storageType: "fruit"
    },
    cider_apple: {
      id: "cider_apple",
      name: "溪酒苹果",
      family: "fruiting",
      category: "果树",
      seasons: ["fall"],
      daysToMature: 8,
      harvestWindow: 3,
      baseYield: 8,
      basePriceYsc: 29,
      shelfLifeDays: 7,
      moistureRange: [1, 3],
      minFertility: 3,
      storageType: "fruit"
    }
  };

  T.townLedgerCropFruitData = {
    version: "town-ledger-crop-fruit-data-v0.0.6-local",
    cropCatalog
  };
}());
