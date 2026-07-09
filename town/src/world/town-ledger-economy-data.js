(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const version = "town-ledger-economy-data-v0.0.6-local";

  const contractTemplates = {
    goldkin_bulk: {
      templateId: "goldkin_bulk",
      label: "高金农业大宗采购",
      buyer: "高金农业",
      channel: "高金农业采购站",
      minQuality: "C",
      quantity: 9,
      dueInDays: 6,
      marketChannel: "goldkin_station",
      channelMultiplier: 0.88,
      advanceYsc: 120,
      penaltyYsc: 160,
      paymentLagDays: 0,
      reputationOnFulfill: 1,
      reputationOnDefault: -2,
      acceptedFamilies: ["root", "grain", "legume", "gourd", "mushroom"],
      riskNote: "稳定现金流，但会推高合同依赖。"
    },
    city_restaurant: {
      templateId: "city_restaurant",
      label: "城市餐厅精品订单",
      buyer: "城市餐厅",
      channel: "南部公路冷链",
      minQuality: "A",
      quantity: 4,
      dueInDays: 5,
      marketChannel: "city_cold_chain",
      channelMultiplier: 1.45,
      advanceYsc: 50,
      penaltyYsc: 120,
      paymentLagDays: 1,
      reputationOnFulfill: 3,
      reputationOnDefault: -3,
      acceptedFamilies: ["leaf", "fruiting", "herb", "mushroom"],
      riskNote: "单价高，品质和期限严格。"
    },
    school_lunch: {
      templateId: "school_lunch",
      label: "学校午餐供应",
      buyer: "学校午餐",
      channel: "镇议会午餐账本",
      minQuality: "B",
      quantity: 7,
      dueInDays: 7,
      marketChannel: "school_board",
      channelMultiplier: 0.98,
      advanceYsc: 0,
      penaltyYsc: 90,
      paymentLagDays: 0,
      reputationOnFulfill: 4,
      reputationOnDefault: -2,
      acceptedFamilies: ["root", "legume", "leaf", "fruiting", "grain"],
      riskNote: "利润普通，但社区声望稳定。"
    },
    cooperative_pantry: {
      templateId: "cooperative_pantry",
      label: "合作社储备单",
      buyer: "枫溪合作社",
      channel: "合作社粮架",
      minQuality: "B",
      quantity: 6,
      dueInDays: 8,
      marketChannel: "cooperative_pantry",
      channelMultiplier: 1.02,
      advanceYsc: 0,
      penaltyYsc: 70,
      paymentLagDays: 0,
      reputationOnFulfill: 3,
      reputationOnDefault: -1,
      acceptedFamilies: ["root", "grain", "mushroom", "processed"],
      riskNote: "现金不猛，但能分散高金依赖。"
    },
    festival_stall: {
      templateId: "festival_stall",
      label: "节日摊位备货",
      buyer: "会堂节日摊",
      channel: "会堂临时摊位",
      minQuality: "B",
      quantity: 5,
      dueInDays: 4,
      marketChannel: "festival_stall",
      channelMultiplier: 1.18,
      advanceYsc: 0,
      penaltyYsc: 60,
      paymentLagDays: 0,
      reputationOnFulfill: 4,
      reputationOnDefault: -1,
      acceptedFamilies: ["leaf", "fruiting", "herb", "mushroom", "processed"],
      riskNote: "节日能带动口碑，也会挤占农活和包装时间。"
    },
    preserves_shelf: {
      templateId: "preserves_shelf",
      label: "小镇货架加工品",
      buyer: "枫溪杂货铺",
      channel: "镇中心寄售货架",
      minQuality: "B",
      quantity: 4,
      dueInDays: 9,
      marketChannel: "preserve_shop",
      channelMultiplier: 1.22,
      advanceYsc: 0,
      penaltyYsc: 50,
      paymentLagDays: 1,
      reputationOnFulfill: 2,
      reputationOnDefault: -1,
      acceptedFamilies: ["processed"],
      cropName: "加工品",
      riskNote: "加工品单价稳，但要占用谷仓和账本记录。"
    }
  };

  const contractCropChoices = {
    spring: {
      goldkin_bulk: "maple_radish",
      city_restaurant: "cold_lettuce",
      school_lunch: "creek_pea",
      cooperative_pantry: "glass_onion",
      festival_stall: "blue_chard"
    },
    summer: {
      goldkin_bulk: "climbing_bean",
      city_restaurant: "sun_tomato",
      school_lunch: "valley_pepper",
      cooperative_pantry: "ember_corn",
      festival_stall: "lantern_cucumber"
    },
    fall: {
      goldkin_bulk: "brown_wheat",
      city_restaurant: "silver_sage",
      school_lunch: "yellow_potato",
      cooperative_pantry: "golden_pumpkin",
      festival_stall: "cider_apple"
    },
    winter: {
      goldkin_bulk: "mist_mushroom",
      city_restaurant: "greenhouse_lettuce",
      school_lunch: "winter_wheat",
      cooperative_pantry: "moon_rye",
      festival_stall: "frost_kale"
    }
  };

  const marketChannels = {
    goldkin_station: {
      id: "goldkin_station",
      label: "高金采购站",
      baseMultiplier: 0.92,
      volatility: 0.04,
      paymentLagDays: 0,
      pressureNote: "现金快，议价权偏弱。"
    },
    city_cold_chain: {
      id: "city_cold_chain",
      label: "南部公路冷链",
      baseMultiplier: 1.28,
      volatility: 0.07,
      paymentLagDays: 1,
      logisticsSensitive: true,
      pressureNote: "单价高，天气和品质要求更严。"
    },
    school_board: {
      id: "school_board",
      label: "学校午餐账本",
      baseMultiplier: 0.98,
      volatility: 0.02,
      paymentLagDays: 0,
      pressureNote: "利润平，但社区信任稳定。"
    },
    cooperative_pantry: {
      id: "cooperative_pantry",
      label: "合作社粮架",
      baseMultiplier: 1.04,
      volatility: 0.03,
      paymentLagDays: 0,
      pressureNote: "适合压仓和分散买方。"
    },
    festival_stall: {
      id: "festival_stall",
      label: "会堂临时摊位",
      baseMultiplier: 1.16,
      volatility: 0.08,
      paymentLagDays: 0,
      festivalSensitive: true,
      pressureNote: "节日前热，节后容易回落。"
    },
    preserve_shop: {
      id: "preserve_shop",
      label: "镇中心寄售货架",
      baseMultiplier: 1.14,
      volatility: 0.04,
      paymentLagDays: 1,
      processedOnly: true,
      pressureNote: "加工品更稳，但需要账务清楚。"
    }
  };

  const familyMarketProfiles = {
    spring: { root: 1.02, legume: 1.05, leaf: 1.08, grain: 0.95, fruiting: 1, gourd: 0.98, herb: 1.12, mushroom: 1.04, processed: 1.06 },
    summer: { root: 0.96, legume: 1.02, leaf: 0.94, grain: 1.02, fruiting: 1.08, gourd: 1.06, herb: 1.08, mushroom: 0.98, processed: 1.04 },
    fall: { root: 1.04, legume: 0.98, leaf: 1.02, grain: 1.05, fruiting: 1.08, gourd: 1.1, herb: 1.12, mushroom: 1.08, processed: 1.08 },
    winter: { root: 1.08, legume: 1, leaf: 1.18, grain: 1.04, fruiting: 1.15, gourd: 1.05, herb: 1.18, mushroom: 1.14, processed: 1.1 }
  };

  const festivalCalendar = {
    spring: [
      { id: "seed_swap", name: "换种日", startDay: 3, endDay: 4, demandFamilies: ["root", "legume", "leaf"], commercialPressure: 1, accountingPressure: 0, note: "会堂换种，合作社和学校午餐都会多看新鲜菜。" },
      { id: "rain_gutter_day", name: "清沟义工日", startDay: 10, endDay: 10, demandFamilies: ["grain", "processed"], commercialPressure: 0, accountingPressure: 1, note: "雨季前查沟渠，账本会被顺手翻一遍。" }
    ],
    summer: [
      { id: "roadside_picnic", name: "南路野餐周", startDay: 6, endDay: 8, demandFamilies: ["fruiting", "gourd", "leaf"], commercialPressure: 2, accountingPressure: 0, note: "南路摊位热闹，冷链和摊贩都会抢好货。" },
      { id: "water_meeting", name: "用水协调会", startDay: 16, endDay: 16, demandFamilies: ["processed"], commercialPressure: 0, accountingPressure: 2, note: "热天用水账容易起争议。" }
    ],
    fall: [
      { id: "harvest_fair", name: "丰收集市", startDay: 5, endDay: 7, demandFamilies: ["gourd", "fruiting", "grain", "processed"], commercialPressure: 2, accountingPressure: 1, note: "节日摊位涨价，也会把包装和账本推到台前。" },
      { id: "barn_audit_day", name: "谷仓盘点日", startDay: 14, endDay: 14, demandFamilies: ["root", "grain"], commercialPressure: 1, accountingPressure: 2, note: "合作社查库存，模糊账会引来争议。" }
    ],
    winter: [
      { id: "candle_market", name: "灯烛夜市", startDay: 4, endDay: 5, demandFamilies: ["mushroom", "leaf", "processed"], commercialPressure: 1, accountingPressure: 1, note: "冬夜市场喜欢温室菜、菇类和加工小食。" },
      { id: "year_end_books", name: "年末账本夜", startDay: 18, endDay: 18, demandFamilies: ["processed", "grain"], commercialPressure: 0, accountingPressure: 3, note: "会计协会要求把应收、库存和寄售说清楚。" }
    ]
  };

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

  T.townLedgerEconomyData = {
    version,
    contractTemplates,
    contractCropChoices,
    marketChannels,
    familyMarketProfiles,
    festivalCalendar,
    processingRecipes
  };
}());
