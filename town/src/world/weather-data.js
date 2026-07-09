(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const version = "weather-system-v0.0.3-local";
  const sourceRefs = [
    "04_AI班级小镇/world/00_source/枫溪镇_黄石农场_世界规则文件_v0.1_原文.md §5.1 天气类型",
    "04_AI班级小镇/world/00_source/枫溪镇_黄石农场_世界规则文件_v0.1_原文.md §5.2 季节天气概率",
    "04_AI班级小镇/world/00_source/枫溪镇_黄石农场_世界规则文件_v0.1_原文.md §5.3 天气惯性",
    "04_AI班级小镇/world/00_source/枫溪镇_黄石农场_世界规则文件_v0.1_原文.md §5.4 天气对系统的影响",
    "04_AI班级小镇/world/00_source/枫溪镇_黄石农场_世界规则文件_v0.1_原文.md §5.5 天气风险指数"
  ];

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

  const allProbabilityKeys = [
    "sunny",
    "cloudy",
    "rainy",
    "storm",
    "fog",
    "snow",
    "heatwave",
    "drought",
    "frost",
    "wind",
    "iceStorm",
    "blizzard",
    "flood"
  ];

  function makeSeasonProfile(key, label, weights, note) {
    const probabilities = allProbabilityKeys.reduce((profile, weatherKey) => {
      profile[weatherKey] = weights[weatherKey] || 0;
      return profile;
    }, {});
    return {
      key,
      label,
      probabilities,
      forecastAccuracy: 0.7,
      note
    };
  }

  const seasonProfiles = {
    spring: makeSeasonProfile("spring", "春", {
      sunny: 35,
      cloudy: 25,
      rainy: 25,
      storm: 5,
      fog: 5,
      frost: 5
    }, "极端天气按 5% 霜冻落地。"),
    summer: makeSeasonProfile("summer", "夏", {
      sunny: 50,
      cloudy: 15,
      rainy: 10,
      storm: 10,
      fog: 3,
      heatwave: 6,
      drought: 6
    }, "极端天气 12% 拆分为热浪 6%、干旱 6%。"),
    fall: makeSeasonProfile("fall", "秋", {
      sunny: 35,
      cloudy: 25,
      rainy: 18,
      storm: 5,
      fog: 7,
      frost: 5,
      wind: 5
    }, "极端天气 10% 拆分为霜冻 5%、强风 5%。"),
    winter: makeSeasonProfile("winter", "冬", {
      sunny: 20,
      cloudy: 20,
      fog: 5,
      snow: 43,
      blizzard: 6,
      iceStorm: 6
    }, "雪天/冰冻列按雪天 43% 落地，极端天气 12% 拆分为暴雪 6%、冰暴 6%。")
  };

  const weatherAliases = {
    晴天: "sunny",
    晴: "sunny",
    sunny: "sunny",
    阴天: "cloudy",
    阴: "cloudy",
    cloudy: "cloudy",
    雨天: "rainy",
    雨: "rainy",
    rainy: "rainy",
    rain: "rainy",
    暴风雨: "storm",
    暴雨: "storm",
    storm: "storm",
    雾天: "fog",
    雾: "fog",
    fog: "fog",
    雪天: "snow",
    雪: "snow",
    snow: "snow",
    热浪: "heatwave",
    heatwave: "heatwave",
    干旱: "drought",
    drought: "drought",
    霜冻: "frost",
    frost: "frost",
    强风: "wind",
    wind: "wind",
    冰暴: "iceStorm",
    冰冻: "iceStorm",
    iceStorm: "iceStorm",
    ice_storm: "iceStorm",
    暴雪: "blizzard",
    blizzard: "blizzard",
    山洪: "flood",
    洪水: "flood",
    flood: "flood"
  };

  const seasonAliases = {
    spring: "spring",
    春: "spring",
    春季: "spring",
    summer: "summer",
    夏: "summer",
    夏季: "summer",
    fall: "fall",
    autumn: "fall",
    秋: "fall",
    秋季: "fall",
    winter: "winter",
    冬: "winter",
    冬季: "winter"
  };

  const broadcastTemplates = {
    sunny: "县城广播：今天枫溪镇以晴天为主，田里要安排浇水。",
    cloudy: "县城广播：云层压低，适合巡田、拜访和补账。",
    rainy: "县城广播：今日有雨，露地可少浇水，湿害和泥路要多看一眼。",
    storm: "县城广播：暴风雨风险较高，户外任务和鲜货运输需要改排。",
    fog: "县城广播：清晨有雾，早市和林缘移动请放慢。",
    snow: "县城广播：雪天到来，露地农活暂停，南部公路运费可能上升。",
    heatwave: "县城广播：热浪预警，灌溉、休息和饮水要排在前面。",
    drought: "县城广播：干旱压力上升，非灌溉作物可能停滞。",
    frost: "县城广播：清晨霜冻，敏感作物和早班户外劳动要小心。",
    wind: "县城广播：强风经过山谷，果树、棚架和森林道路需要巡查。",
    iceStorm: "县城广播：冰暴警报，公路可能封闭，社区互助优先。",
    blizzard: "县城广播：暴雪正在靠近，物流和户外行动都要压缩。",
    flood: "县城广播：山洪风险进入警戒，溪流、湿地和公路先保安全。"
  };

  T.weatherData = {
    version,
    sourceRefs,
    weatherTypes,
    seasonProfiles,
    weatherAliases,
    seasonAliases,
    rainyTypes: new Set(["rainy", "storm", "flood"]),
    snowTypes: new Set(["snow", "blizzard", "iceStorm"]),
    dryStressTypes: new Set(["sunny", "heatwave", "drought", "wind"]),
    wetRiskTypes: new Set(["rainy", "storm", "fog", "flood"]),
    broadcastTemplates
  };
}());
