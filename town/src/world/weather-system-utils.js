(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.weatherData;
  const { weatherTypes, weatherAliases, seasonAliases } = D;

  const version = "weather-system-utils-v0.0.3-local";

  function clamp(value, min, max) {
    if (T.clamp) return T.clamp(value, min, max);
    return Math.max(min, Math.min(max, value));
  }

  function randomInt(min, max) {
    if (T.randomInt) return T.randomInt(min, max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function chooseWeighted(entries) {
    const usable = entries.filter((item) => item.weight > 0);
    if (!usable.length) return "cloudy";
    if (T.chooseWeighted) return T.chooseWeighted(usable);
    const total = usable.reduce((sum, item) => sum + item.weight, 0);
    let cursor = Math.random() * total;
    for (const item of usable) {
      cursor -= item.weight;
      if (cursor <= 0) return item.value;
    }
    return usable[usable.length - 1].value;
  }

  function normalizeSeason(value) {
    if (value && typeof value === "object") {
      return normalizeSeason(value.key || value.type || value.label || value.name);
    }
    return seasonAliases[String(value || "").trim()] || "spring";
  }

  function normalizeWeatherType(value) {
    if (value && typeof value === "object") {
      return normalizeWeatherType(value.type || value.key || value.weatherType || value.label || value.name);
    }
    const key = String(value || "").trim();
    return weatherAliases[key] || (weatherTypes[key] ? key : "");
  }

  function toNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function effectFor(weatherType) {
    const type = normalizeWeatherType(weatherType) || "cloudy";
    const weather = weatherTypes[type] || weatherTypes.cloudy;
    const numericSoil = typeof weather.soilMoisture === "number";
    return {
      type: weather.type,
      label: weather.label,
      soilMoisture: weather.soilMoisture,
      soilMoistureDelta: numericSoil ? weather.soilMoisture : 0,
      crop: weather.crop,
      cropText: weather.crop,
      labor: weather.labor,
      trade: weather.trade,
      social: weather.social,
      riskBase: weather.riskBase,
      riskBaseline: weather.riskBase
    };
  }

  function formatSoil(value) {
    if (typeof value === "number") return value > 0 ? `+${value}` : String(value);
    return String(value);
  }

  T.weatherSystemUtils = {
    version,
    clamp,
    randomInt,
    chooseWeighted,
    normalizeSeason,
    normalizeWeatherType,
    toNumber,
    effectFor,
    formatSoil
  };
}());
