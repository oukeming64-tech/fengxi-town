(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.townLedgerData;
  const { marketChannels, familyMarketProfiles, festivalCalendar } = D;
  const { clamp, deepClone, qualityText } = T.townLedgerCore;

  const version = "town-market-v0.0.4-state-depth-local";

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  function seasonalDay(state) {
    return ((Number(state.day || 1) - 1) % 30) + 1;
  }

  function stableWave(day, key, amplitude) {
    const seed = String(key || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const step = ((day * 17 + seed) % 9) - 4;
    return (step / 4) * amplitude;
  }

  function activeFestivalForDay(state) {
    const day = seasonalDay(state);
    return (festivalCalendar[state.seasonKey] || []).find((festival) => (
      day >= festival.startDay && day <= festival.endDay
    )) || null;
  }

  function weatherFamilyAdjustment(family, weather) {
    if (!weather) return 0;
    if (weather.key === "heatwave") {
      if (family === "leaf") return -0.08;
      if (family === "fruiting" || family === "gourd") return 0.04;
      if (family === "processed") return 0.03;
    }
    if (weather.key === "storm" || weather.key === "flood") {
      if (family === "leaf" || family === "mushroom") return -0.04;
      if (family === "processed" || family === "grain") return 0.04;
    }
    if (weather.key === "frost" || weather.key === "snow" || weather.key === "blizzard") {
      if (family === "leaf" || family === "mushroom") return 0.05;
      if (family === "fruiting") return -0.05;
    }
    return 0;
  }

  function buildFamilyMultipliers(state, weather, festival) {
    const base = familyMarketProfiles[state.seasonKey] || familyMarketProfiles.spring;
    const output = {};
    Object.keys(base).forEach((family) => {
      const festivalBoost = festival?.demandFamilies?.includes(family)
        ? 0.07 + (festival.commercialPressure || 0) * 0.015
        : 0;
      output[family] = round2(clamp(
        base[family] + stableWave(state.day, `${state.seasonKey}-${family}`, 0.04) + weatherFamilyAdjustment(family, weather) + festivalBoost,
        0.82,
        1.3
      ));
    });
    return output;
  }

  function buildChannelMultipliers(state, weather, festival) {
    const output = {};
    Object.keys(marketChannels).forEach((id) => {
      const channel = marketChannels[id];
      let value = channel.baseMultiplier + stableWave(state.day, id, channel.volatility || 0.03);
      if (channel.logisticsSensitive && (weather?.logisticsPressure || 0) >= 2) value -= 0.08;
      if (channel.festivalSensitive && festival) value += 0.08 + (festival.commercialPressure || 0) * 0.02;
      if (channel.processedOnly && festival?.demandFamilies?.includes("processed")) value += 0.04;
      if (id === "goldkin_station" && (state.ledger?.reputationAssets?.goldkinDependency || 0) >= 60) value -= 0.04;
      if (id === "preserve_shop" && (state.ledger?.accountingTransparency || 0) < 45) value -= 0.03;
      output[id] = round2(clamp(value, 0.78, 1.38));
    });
    return output;
  }

  function updateMarketState(state, weather, activitySummary, settlement) {
    const festival = activeFestivalForDay(state);
    const familyMultipliers = buildFamilyMultipliers(state, weather, festival);
    const channelMultipliers = buildChannelMultipliers(state, weather, festival);
    const notes = [];

    if (festival) {
      notes.push(`${festival.name}临近：${festival.note}`);
      if ((festival.accountingPressure || 0) > 0 && (activitySummary.accounting || 0) <= 0) {
        notes.push("会堂和会计协会会多看寄售、库存和应收记录。");
      }
    } else {
      notes.push("今日没有大型节日，价格只随天气、渠道和库存预期轻微波动。");
    }

    if ((weather?.logisticsPressure || 0) >= 2) {
      notes.push(`${weather.label}让冷链和南路运输报价变谨慎。`);
    }

    const current = {
      day: state.day,
      seasonalDay: seasonalDay(state),
      activeFestival: festival ? deepClone(festival) : null,
      familyMultipliers,
      channelMultipliers,
      notes
    };

    state.market = state.market || { history: [] };
    state.market.current = current;
    state.market.activeFestival = current.activeFestival;
    state.market.seasonalDay = current.seasonalDay;
    state.market.history = [...(state.market.history || []), current].slice(-14);
    if (festival && !(state.market.festivalsSeen || []).includes(festival.id)) {
      state.market.festivalsSeen = [...(state.market.festivalsSeen || []), festival.id];
    }
    settlement.marketChanges.push(...notes);
    return current;
  }

  function priceMultiplierForLot(state, channelId, lot) {
    const current = state.market?.current || {};
    const channelMultiplier = current.channelMultipliers?.[channelId] || marketChannels[channelId]?.baseMultiplier || 1;
    const familyMultiplier = current.familyMultipliers?.[lot.family] || current.familyMultipliers?.[lot.sourceFamily] || 1;
    return round2(clamp(channelMultiplier * familyMultiplier, 0.68, 1.65));
  }

  function marketNoteForLot(state, channelId, lot) {
    const channel = marketChannels[channelId] || marketChannels.goldkin_station;
    const multiplier = priceMultiplierForLot(state, channel.id, lot);
    return `${channel.label}按 ${qualityText(lot.quality)} ${lot.cropName} 给出 ${multiplier} 倍行情。`;
  }

  function publicSnapshot(state) {
    const current = state.market?.current || {};
    const festival = current.activeFestival || null;
    const channelLines = Object.keys(current.channelMultipliers || {}).slice(0, 4).map((id) => ({
      id,
      label: marketChannels[id]?.label || id,
      multiplier: current.channelMultipliers[id]
    }));
    const familyLines = Object.keys(current.familyMultipliers || {}).slice(0, 6).map((family) => ({
      family,
      multiplier: current.familyMultipliers[family]
    }));
    return {
      version,
      seasonalDay: current.seasonalDay || seasonalDay(state),
      festival: festival ? { id: festival.id, name: festival.name, note: festival.note } : null,
      channels: channelLines,
      families: familyLines,
      notes: current.notes || []
    };
  }

  T.townMarketLedger = {
    version,
    seasonalDay,
    activeFestivalForDay,
    updateMarketState,
    priceMultiplierForLot,
    marketNoteForLot,
    publicSnapshot
  };
}());
