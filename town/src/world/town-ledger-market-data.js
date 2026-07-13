(function () {
  const T = window.MorningTown || (window.MorningTown = {});

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

  T.townLedgerMarketData = { marketChannels, familyMarketProfiles };
}());
