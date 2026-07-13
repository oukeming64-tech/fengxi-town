(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const processingRecipes = {
    root_cellar_crate: {
      id: "root_cellar_crate",
      name: "地窖根茎箱",
      inputFamilies: ["root"],
      outputFamily: "processed",
      outputCategory: "加工品",
      outputStorageType: "processed",
      minimumInput: 4,
      yieldRate: 0.75,
      priceMultiplier: 1.35,
      shelfLifeDays: 20,
      laborCostYsc: 10,
      note: "根茎清理后入箱，价格温和上升，保质期拉长。"
    },
    grain_flour_sack: {
      id: "grain_flour_sack",
      name: "枫溪粗面粉",
      inputFamilies: ["grain"],
      outputFamily: "processed",
      outputCategory: "加工品",
      outputStorageType: "processed",
      minimumInput: 5,
      yieldRate: 0.7,
      priceMultiplier: 1.42,
      shelfLifeDays: 24,
      laborCostYsc: 14,
      note: "谷物磨成粗面粉，适合学校和寄售货架。"
    },
    fruit_sun_jar: {
      id: "fruit_sun_jar",
      name: "日晒果菜罐",
      inputFamilies: ["fruiting", "gourd"],
      outputFamily: "processed",
      outputCategory: "加工品",
      outputStorageType: "processed",
      minimumInput: 4,
      yieldRate: 0.65,
      priceMultiplier: 1.55,
      shelfLifeDays: 18,
      laborCostYsc: 16,
      note: "果菜做成罐装，节日摊位更愿意收。"
    },
    herb_bundle: {
      id: "herb_bundle",
      name: "银线草药束",
      inputFamilies: ["herb"],
      outputFamily: "processed",
      outputCategory: "加工品",
      outputStorageType: "processed",
      minimumInput: 3,
      yieldRate: 0.8,
      priceMultiplier: 1.5,
      shelfLifeDays: 22,
      laborCostYsc: 8,
      note: "草药束轻巧好卖，但需要清楚标记来源。"
    },
    dried_mushroom_box: {
      id: "dried_mushroom_box",
      name: "干菇木盒",
      inputFamilies: ["mushroom"],
      outputFamily: "processed",
      outputCategory: "加工品",
      outputStorageType: "processed",
      minimumInput: 4,
      yieldRate: 0.7,
      priceMultiplier: 1.48,
      shelfLifeDays: 20,
      laborCostYsc: 12,
      note: "菇类烘干后损耗变慢，冬季夜市更容易出手。"
    }
  };

  T.townLedgerProcessingData = { processingRecipes };
}());
