(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.weatherData;
  const { weatherTypes, rainyTypes, snowTypes } = D;
  const utils = T.weatherSystemUtils || {};

  const version = "weather-system-inertia-v0.0.3-local";

  function getPreviousWeather(townState = {}, options = {}) {
    return options.previousWeather ||
      options.lastWeather ||
      townState.previousWeather ||
      townState.lastWeather ||
      townState.dayWeather ||
      townState.weather ||
      null;
  }

  function getWeatherStreak(townState = {}, options = {}, previousType = "") {
    const streak = options.consecutiveWeather ||
      options.weatherStreak ||
      townState.consecutiveWeather ||
      townState.weatherStreak ||
      townState.weatherRun ||
      null;

    if (typeof streak === "number") {
      return { type: previousType, count: Math.max(0, streak) };
    }

    if (streak && typeof streak === "object") {
      return {
        type: utils.normalizeWeatherType(streak.type || streak.key || streak.weatherType || streak.label) || previousType,
        count: Math.max(0, utils.toNumber(streak.count ?? streak.days ?? streak.length, previousType ? 1 : 0))
      };
    }

    const type = utils.normalizeWeatherType(options.consecutiveWeatherType || townState.consecutiveWeatherType) || previousType;
    const count = utils.toNumber(options.consecutiveWeatherCount ?? townState.consecutiveWeatherCount, previousType ? 1 : 0);
    return { type, count: Math.max(0, count) };
  }

  function getDryDays(townState = {}, options = {}) {
    return Math.max(0, utils.toNumber(
      options.consecutiveDryDays ??
      options.daysWithoutRain ??
      options.dryStreak ??
      townState.consecutiveDryDays ??
      townState.daysWithoutRain ??
      townState.dryStreak,
      0
    ));
  }

  function getRainStreak(townState = {}, options = {}, weatherStreak) {
    const explicit = options.consecutiveRainDays ??
      options.rainStreak ??
      townState.consecutiveRainDays ??
      townState.rainStreak;
    if (explicit !== undefined) return Math.max(0, utils.toNumber(explicit, 0));
    return rainyTypes.has(weatherStreak.type) ? weatherStreak.count : 0;
  }

  function getDaysSinceStorm(townState = {}, options = {}, previousType = "") {
    const explicit = options.daysSinceStorm ?? townState.daysSinceStorm;
    if (explicit !== undefined) return Math.max(0, utils.toNumber(explicit, 0));
    return previousType === "storm" ? 1 : 99;
  }

  function addWeight(weights, type, amount, reason, modifiers) {
    weights[type] = Math.max(0, (weights[type] || 0) + amount);
    modifiers.weightAdjustments.push({ type, amount, reason });
  }

  function shiftProbability(weights, targets, amount, reason, modifiers) {
    const targetSet = new Set(targets.filter((type) => weatherTypes[type]));
    const targetList = [...targetSet];
    const sourceList = Object.keys(weights).filter((type) => !targetSet.has(type) && weights[type] > 0);
    const sourceTotal = sourceList.reduce((sum, type) => sum + weights[type], 0);
    if (!targetList.length || sourceTotal <= 0 || amount <= 0) return;

    const safeAmount = Math.min(amount, sourceTotal);
    const targetLift = safeAmount / targetList.length;
    targetList.forEach((type) => {
      weights[type] = (weights[type] || 0) + targetLift;
    });
    sourceList.forEach((type) => {
      weights[type] = Math.max(0, weights[type] - safeAmount * (weights[type] / sourceTotal));
    });
    modifiers.weightAdjustments.push({ types: targetList, amount: safeAmount, reason });
  }

  function buildEntries(weights) {
    return Object.keys(weights).map((type) => ({
      value: type,
      weight: weights[type]
    }));
  }

  function applyInertia(weights, townState, options, seasonKey, modifiers) {
    const previousType = utils.normalizeWeatherType(getPreviousWeather(townState, options));
    const weatherStreak = getWeatherStreak(townState, options, previousType);
    const dryDays = getDryDays(townState, options);
    const rainStreak = getRainStreak(townState, options, weatherStreak);
    const daysSinceStorm = getDaysSinceStorm(townState, options, previousType);

    modifiers.previousType = previousType;
    modifiers.consecutiveWeather = weatherStreak;
    modifiers.consecutiveDryDays = dryDays;

    if (weatherStreak.type === "sunny" && weatherStreak.count >= 2) {
      if (seasonKey === "summer") {
        shiftProbability(weights, ["sunny", "heatwave"], 10, "连续 2 天晴天后，晴天或热浪概率合计 +10%", modifiers);
      } else {
        shiftProbability(weights, ["sunny"], 10, "连续 2 天晴天后，晴天或热浪概率 +10%", modifiers);
      }
    }

    if (seasonKey === "summer" && dryDays >= 3) {
      modifiers.droughtPressure += 1;
      addWeight(weights, "drought", 8, "连续 3 天无雨后，夏季干旱压力 +1", modifiers);
    }

    if (rainStreak >= 2) {
      modifiers.soilMoistureBonus += 1;
      modifiers.diseasePressure += 1;
      modifiers.weatherInertia.push("连续 2 天降雨后，土壤湿度 +1，病害压力 +1");
    }

    if (daysSinceStorm === 1) {
      if (utils.randomInt(1, 100) <= 30) {
        modifiers.forcedWeather = "sunny";
        modifiers.weatherInertia.push("暴风雨后第 2 天 30% 晴天判定命中");
      }
      if (utils.randomInt(1, 100) <= 10) {
        modifiers.floodAftermath = true;
        modifiers.weatherInertia.push("暴风雨后第 2 天触发洪水后遗症");
      }
    }

    if (seasonKey === "winter" && snowTypes.has(weatherStreak.type) && weatherStreak.count >= 2) {
      modifiers.logisticsDelayChance += 20;
      modifiers.weatherInertia.push("冬季连续雪天后，物流延误概率 +20%");
    }
  }

  T.weatherSystemInertia = {
    version,
    getPreviousWeather,
    getWeatherStreak,
    getDryDays,
    getRainStreak,
    getDaysSinceStorm,
    addWeight,
    shiftProbability,
    buildEntries,
    applyInertia
  };
}());
