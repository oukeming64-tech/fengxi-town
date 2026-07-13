(function () {
  const T = window.MorningTown || (window.MorningTown = {});

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

  T.townLedgerContractData = { contractTemplates, contractCropChoices };
}());
