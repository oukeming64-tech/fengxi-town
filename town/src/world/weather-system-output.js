(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.weatherData;
  const {
    weatherTypes,
    dryStressTypes,
    wetRiskTypes,
    snowTypes,
    broadcastTemplates
  } = D;
  const utils = T.weatherSystemUtils || {};

  const version = "weather-system-output-v0.0.3-local";

  function buildEffects(type, modifiers) {
    const effects = utils.effectFor(type);
    effects.soilMoistureBase = effects.soilMoisture;
    effects.soilMoistureBonus = modifiers.soilMoistureBonus;
    if (typeof effects.soilMoisture === "number") {
      effects.soilMoisture += modifiers.soilMoistureBonus;
      effects.soilMoistureDelta = effects.soilMoisture;
    }
    effects.droughtPressure = modifiers.droughtPressure;
    effects.diseasePressure = modifiers.diseasePressure;
    effects.logisticsDelayChance = modifiers.logisticsDelayChance;
    effects.floodAftermath = modifiers.floodAftermath;
    return effects;
  }

  function riskFor(type, effects, modifiers, options = {}) {
    let riskIndex = effects.riskBase;
    if (modifiers.droughtPressure && dryStressTypes.has(type)) riskIndex += modifiers.droughtPressure;
    if (modifiers.diseasePressure && wetRiskTypes.has(type)) riskIndex += modifiers.diseasePressure;
    if (modifiers.floodAftermath) riskIndex += 1;
    if (modifiers.logisticsDelayChance && snowTypes.has(type)) riskIndex += 1;
    riskIndex += utils.toNumber(options.riskShift, 0);
    return utils.clamp(Math.round(riskIndex), 0, 5);
  }

  function buildBroadcast(type, profile, riskIndex, modifiers) {
    const parts = [broadcastTemplates[type] || `县城广播：今日天气为${weatherTypes[type]?.label || "阴天"}。`];
    if (modifiers.droughtPressure) parts.push("连续无雨让灌溉压力上升。");
    if (modifiers.diseasePressure) parts.push("连雨后的病害巡田要提前。");
    if (modifiers.floodAftermath) parts.push("溪流水位仍需巡查。");
    if (modifiers.logisticsDelayChance) parts.push("冬季物流延误概率增加。");
    if (riskIndex >= 4) parts.push("今日风险较高，先保作物、道路和人员安全。");
    parts.push(`预报准确率约 ${Math.round(profile.forecastAccuracy * 100)}%。`);
    return parts.join("");
  }

  function summarize(dayWeather) {
    if (!dayWeather) return "天气尚未生成。";
    const effects = dayWeather.effects || utils.effectFor(dayWeather.type);
    const label = dayWeather.label || weatherTypes[utils.normalizeWeatherType(dayWeather.type)]?.label || "阴天";
    const risk = Number.isFinite(Number(dayWeather.riskIndex)) ? Number(dayWeather.riskIndex) : effects.riskBase;
    return `${label}，风险 ${risk}/5。土壤水分 ${utils.formatSoil(effects.soilMoisture)}；作物：${effects.crop}；劳动：${effects.labor}；贸易：${effects.trade}；社交：${effects.social}。`;
  }

  T.weatherSystemOutput = {
    version,
    buildEffects,
    riskFor,
    buildBroadcast,
    summarize
  };
}());
