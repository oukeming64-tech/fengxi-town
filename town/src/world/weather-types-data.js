(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const weatherTypes = {
    sunny: {
      type: "sunny",
      label: "晴天",
      group: "basic",
      soilMoisture: -2,
      crop: "正常生长，需浇水",
      labor: "正常",
      trade: "市集客流正常",
      social: "户外活动增加",
      riskBase: 0
    },
    cloudy: {
      type: "cloudy",
      label: "阴天",
      group: "basic",
      soilMoisture: -1,
      crop: "蒸发较低",
      labor: "轻微提效",
      trade: "价格稳定",
      social: "适合拜访",
      riskBase: 1
    },
    rainy: {
      type: "rainy",
      label: "雨天",
      group: "basic",
      soilMoisture: 3,
      crop: "无需浇水，湿害风险",
      labor: "户外效率 -10%",
      trade: "蘑菇、草药需求 +10%",
      social: "室内社交增加",
      riskBase: 2
    },
    storm: {
      type: "storm",
      label: "暴风雨",
      group: "basic",
      soilMoisture: 4,
      crop: "倒伏、冲刷、病害",
      labor: "户外效率 -40%",
      trade: "物流延误，鲜货折损",
      social: "多数 NPC 留在室内",
      riskBase: 4
    },
    fog: {
      type: "fog",
      label: "雾天",
      group: "basic",
      soilMoisture: 0,
      crop: "光照不足，成长 -10%",
      labor: "移动效率 -10%",
      trade: "早市人流 -15%",
      social: "神秘传闻增加",
      riskBase: 1
    },
    snow: {
      type: "snow",
      label: "雪天",
      group: "basic",
      soilMoisture: "冻结",
      crop: "露地停止生长",
      labor: "户外效率 -25%",
      trade: "运费 +20%",
      social: "室内节庆增加",
      riskBase: 2
    },
    heatwave: {
      type: "heatwave",
      label: "热浪",
      group: "extreme",
      soilMoisture: -3,
      crop: "缺水、灼伤",
      labor: "疲劳 +40%",
      trade: "冷饮、灌溉设备需求上升",
      social: "冲突概率上升",
      riskBase: 3
    },
    drought: {
      type: "drought",
      label: "干旱",
      group: "extreme",
      soilMoisture: -4,
      crop: "非灌溉作物停滞",
      labor: "疲劳 +25%",
      trade: "灌溉作物价格 +15%",
      social: "资源争夺增加",
      riskBase: 4
    },
    frost: {
      type: "frost",
      label: "霜冻",
      group: "extreme",
      soilMoisture: -1,
      crop: "敏感作物受损",
      labor: "清晨工作风险 +20%",
      trade: "幸存作物溢价",
      social: "抱怨与互助并存",
      riskBase: 3
    },
    wind: {
      type: "wind",
      label: "强风",
      group: "extreme",
      soilMoisture: -2,
      crop: "果树落果、棚架风险",
      labor: "户外风险 +30%",
      trade: "运输延误",
      social: "森林关闭",
      riskBase: 3
    },
    iceStorm: {
      type: "iceStorm",
      label: "冰暴",
      group: "extreme",
      soilMoisture: "冻结",
      crop: "温室需加热",
      labor: "移动风险 +50%",
      trade: "公路可能封闭",
      social: "社区互助事件",
      riskBase: 5
    },
    blizzard: {
      type: "blizzard",
      label: "暴雪",
      group: "extreme",
      soilMoisture: "冻结",
      crop: "露地停止生长，设施需保温",
      labor: "户外效率 -40%",
      trade: "物流延误，运费上升",
      social: "居民集中到室内避寒",
      riskBase: 4
    },
    flood: {
      type: "flood",
      label: "山洪",
      group: "extreme",
      soilMoisture: 5,
      crop: "冲刷、积水、病害风险",
      labor: "抢险优先，户外效率 -60%",
      trade: "道路封闭，鲜货折损",
      social: "社区避难和救援优先",
      riskBase: 5
    }
  };

  T.weatherTypeData = { weatherTypes };
}());
