(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const version = "town-ledger-weather-compat-data-v0.0.6-local";

  const weatherProfiles = {
    sunny: {
      key: "sunny",
      label: "晴天",
      riskIndex: 1,
      moistureDelta: -1,
      pestDelta: 0,
      diseaseDelta: 0,
      spoilagePressure: 1,
      logisticsPressure: 0
    },
    cloudy: {
      key: "cloudy",
      label: "阴天",
      riskIndex: 1,
      moistureDelta: 0,
      pestDelta: 0,
      diseaseDelta: 0,
      spoilagePressure: 0,
      logisticsPressure: 0
    },
    light_rain: {
      key: "light_rain",
      label: "小雨",
      riskIndex: 2,
      moistureDelta: 1,
      pestDelta: 0,
      diseaseDelta: 0,
      spoilagePressure: 0,
      logisticsPressure: 1
    },
    storm: {
      key: "storm",
      label: "暴雨",
      riskIndex: 4,
      moistureDelta: 2,
      pestDelta: 0,
      diseaseDelta: 1,
      spoilagePressure: 1,
      logisticsPressure: 3
    },
    heatwave: {
      key: "heatwave",
      label: "热浪",
      riskIndex: 4,
      moistureDelta: -2,
      pestDelta: 1,
      diseaseDelta: 0,
      spoilagePressure: 2,
      logisticsPressure: 1
    },
    frost: {
      key: "frost",
      label: "霜冻",
      riskIndex: 4,
      moistureDelta: -1,
      pestDelta: 0,
      diseaseDelta: 0,
      spoilagePressure: 0,
      logisticsPressure: 2
    },
    snow: {
      key: "snow",
      label: "雪",
      riskIndex: 3,
      moistureDelta: 0,
      pestDelta: 0,
      diseaseDelta: 0,
      spoilagePressure: 0,
      logisticsPressure: 2
    },
    drought: {
      key: "drought",
      label: "干旱",
      riskIndex: 4,
      moistureDelta: -3,
      pestDelta: 1,
      diseaseDelta: 0,
      spoilagePressure: 1,
      logisticsPressure: 1
    },
    wind: {
      key: "wind",
      label: "强风",
      riskIndex: 3,
      moistureDelta: -1,
      pestDelta: 0,
      diseaseDelta: 0,
      spoilagePressure: 0,
      logisticsPressure: 2
    },
    iceStorm: {
      key: "iceStorm",
      label: "冰暴",
      riskIndex: 5,
      moistureDelta: 0,
      pestDelta: 0,
      diseaseDelta: 0,
      spoilagePressure: 0,
      logisticsPressure: 3
    },
    blizzard: {
      key: "blizzard",
      label: "暴雪",
      riskIndex: 4,
      moistureDelta: 0,
      pestDelta: 0,
      diseaseDelta: 0,
      spoilagePressure: 0,
      logisticsPressure: 3
    },
    flood: {
      key: "flood",
      label: "山洪",
      riskIndex: 5,
      moistureDelta: 2,
      pestDelta: 0,
      diseaseDelta: 2,
      spoilagePressure: 1,
      logisticsPressure: 4
    },
    fog: {
      key: "fog",
      label: "雾天",
      riskIndex: 2,
      moistureDelta: 0,
      pestDelta: 0,
      diseaseDelta: 1,
      spoilagePressure: 0,
      logisticsPressure: 1
    }
  };

  const fallbackWeatherBySeason = {
    spring: ["cloudy", "light_rain", "sunny", "light_rain", "cloudy", "sunny", "storm"],
    summer: ["sunny", "sunny", "heatwave", "cloudy", "light_rain", "sunny", "storm"],
    fall: ["cloudy", "sunny", "fog", "light_rain", "sunny", "frost", "cloudy"],
    winter: ["snow", "cloudy", "sunny", "frost", "cloudy", "snow", "fog"]
  };

  T.townLedgerWeatherCompatData = {
    version,
    weatherProfiles,
    fallbackWeatherBySeason
  };
}());
