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

  const weatherTypes = T.weatherTypeData?.weatherTypes;
  if (!weatherTypes) throw new Error("weather-types-data must load before weather-data");

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
