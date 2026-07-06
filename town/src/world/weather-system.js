(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.weatherData;
  const { version, sourceRefs, weatherTypes, seasonProfiles } = D;
  const utils = T.weatherSystemUtils || {};
  const inertia = T.weatherSystemInertia || {};
  const output = T.weatherSystemOutput || {};

  function generateDayWeather(townState = {}, options = {}) {
    const seasonKey = utils.normalizeSeason(options.seasonKey || options.season || townState.seasonKey || townState.season);
    const profile = seasonProfiles[seasonKey] || seasonProfiles.spring;
    const weights = { ...profile.probabilities };
    const modifiers = {
      seasonKey,
      sourceProfile: profile.label,
      forecastAccuracy: profile.forecastAccuracy,
      previousType: "",
      consecutiveWeather: { type: "", count: 0 },
      consecutiveDryDays: 0,
      weatherInertia: [],
      weightAdjustments: [],
      soilMoistureBonus: 0,
      diseasePressure: 0,
      droughtPressure: 0,
      logisticsDelayChance: 0,
      floodAftermath: false,
      forcedWeather: ""
    };

    inertia.applyInertia(weights, townState, options, seasonKey, modifiers);

    const type = utils.normalizeWeatherType(options.forceWeather || options.weatherType) ||
      modifiers.forcedWeather ||
      utils.chooseWeighted(inertia.buildEntries(weights));
    const effects = output.buildEffects(type, modifiers);
    const riskIndex = output.riskFor(type, effects, modifiers, options);

    return {
      type,
      label: weatherTypes[type]?.label || "阴天",
      riskIndex,
      effects,
      broadcast: output.buildBroadcast(type, profile, riskIndex, modifiers),
      modifiers: {
        ...modifiers,
        finalWeights: weights
      }
    };
  }

  T.weatherSystem = {
    version,
    sourceRefs,
    weatherTypes,
    seasonProfiles,
    effectFor: utils.effectFor,
    generateDayWeather,
    summarize: output.summarize
  };
}());
