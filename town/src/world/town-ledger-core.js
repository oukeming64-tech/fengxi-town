(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.townLedgerData;
  const {
    qualityOrder,
    qualityLabels,
    cropCatalog,
    seasonCropPlans,
    weatherProfiles,
    fallbackWeatherBySeason
  } = D;

  function clamp(value, min, max) {
    if (T.clamp) return T.clamp(value, min, max);
    return Math.max(min, Math.min(max, value));
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeSeasonKey(value) {
    const raw = String(value || "").toLowerCase();
    if (seasonCropPlans[raw]) return raw;
    if (/夏|summer/.test(raw)) return "summer";
    if (/秋|fall|autumn/.test(raw)) return "fall";
    if (/冬|winter/.test(raw)) return "winter";
    return "spring";
  }

  function normalizeWeather(rawWeather, state) {
    if (rawWeather && typeof rawWeather === "object") {
      const rawKey = String(rawWeather.key || rawWeather.type || rawWeather.id || rawWeather.label || rawWeather.name || "").toLowerCase();
      const profile = weatherProfiles[weatherKeyFromText(rawKey)] || weatherProfiles.cloudy;
      const effectMoisture = rawWeather.effects?.soilMoistureDelta;
      const effectDisease = rawWeather.effects?.diseasePressure;
      const effectDrought = rawWeather.effects?.droughtPressure;
      const effectLogistics = rawWeather.effects?.logisticsDelayChance;
      return {
        ...profile,
        label: rawWeather.label || rawWeather.name || profile.label,
        riskIndex: Number(rawWeather.riskIndex ?? rawWeather.risk ?? profile.riskIndex),
        moistureDelta: Number(rawWeather.moistureDelta ?? effectMoisture ?? profile.moistureDelta),
        diseaseDelta: Number(rawWeather.diseaseDelta ?? effectDisease ?? profile.diseaseDelta),
        pestDelta: Number(rawWeather.pestDelta ?? (effectDrought ? 1 : profile.pestDelta)),
        logisticsPressure: Number(rawWeather.logisticsPressure ?? (effectLogistics ? Math.ceil(effectLogistics / 10) : profile.logisticsPressure)),
        source: "context"
      };
    }
    if (rawWeather) {
      const profile = weatherProfiles[weatherKeyFromText(rawWeather)] || weatherProfiles.cloudy;
      return { ...profile, source: "context" };
    }
    const seasonKey = normalizeSeasonKey(state?.seasonKey);
    const plan = fallbackWeatherBySeason[seasonKey] || fallbackWeatherBySeason.spring;
    const key = plan[((Number(state?.day) || 1) - 1) % plan.length];
    return { ...weatherProfiles[key], source: "season-default" };
  }

  function weatherKeyFromText(value) {
    const text = String(value || "").toLowerCase();
    if (/暴|storm|thunder|typhoon/.test(text)) return "storm";
    if (/山洪|洪水|flood/.test(text)) return "flood";
    if (/雨|rain|shower/.test(text)) return "light_rain";
    if (/干旱|drought|旱/.test(text)) return "drought";
    if (/热|heat|dry/.test(text)) return "heatwave";
    if (/霜|frost|freeze/.test(text)) return "frost";
    if (/冰暴|ice/.test(text)) return "iceStorm";
    if (/暴雪|blizzard/.test(text)) return "blizzard";
    if (/雪|snow/.test(text)) return "snow";
    if (/强风|wind/.test(text)) return "wind";
    if (/雾|fog|mist/.test(text)) return "fog";
    if (/晴|sun|clear/.test(text)) return "sunny";
    if (/阴|cloud|overcast/.test(text)) return "cloudy";
    return "cloudy";
  }

  function qualityRank(quality) {
    return Math.max(0, qualityOrder.indexOf(quality || "C"));
  }

  function scoreToQuality(score) {
    if (score >= 85) return "S";
    if (score >= 70) return "A";
    if (score >= 50) return "B";
    return "C";
  }

  function downgradeQuality(quality, steps = 1) {
    const nextRank = clamp(qualityRank(quality) - steps, 0, qualityOrder.length - 1);
    return qualityOrder[nextRank];
  }

  function qualityText(quality) {
    return `${quality} ${qualityLabels[quality] || ""}`.trim();
  }

  function isQualityAtLeast(actual, required) {
    return qualityRank(actual) >= qualityRank(required);
  }

  function fieldCrop(field) {
    return cropCatalog[field.cropId] || cropCatalog.maple_radish;
  }

  function seasonalScarcity(crop, seasonKey) {
    if (crop.seasons.includes(seasonKey)) return 1;
    if (crop.indoorFriendly && seasonKey === "winter") return 1.15;
    return 1.25;
  }

  function reputationMultiplier(reputation) {
    if (reputation >= 81) return 1.2;
    if (reputation >= 61) return 1.1;
    if (reputation >= 31) return 1;
    return 0.9;
  }

  function addLedgerEntry(state, entry) {
    const amount = Math.round(Number(entry.amountYsc || 0));
    const type = entry.type || (amount < 0 ? "expense" : "income");
    const signed = type === "expense" ? -Math.abs(amount) : Math.abs(amount);
    const normalized = {
      id: entry.id || `entry-${state.ledger.entries.length + 1}`,
      day: Number(entry.day || state.day || 1),
      type,
      account: entry.account || (type === "expense" ? "支出" : "收入"),
      source: entry.source || "",
      detail: entry.detail || "",
      amountYsc: Math.abs(amount),
      affectsCash: entry.affectsCash !== false,
      balanceAfter: state.ledger.cashYsc
    };
    if (normalized.affectsCash) {
      state.ledger.cashYsc = Math.round((state.ledger.cashYsc || 0) + signed);
      normalized.balanceAfter = state.ledger.cashYsc;
    }
    state.ledger.entries.push(normalized);
    return normalized;
  }

  function countPrefix(counts, prefix) {
    let total = 0;
    Object.keys(counts).forEach((key) => {
      if (key.indexOf(prefix) === 0) total += counts[key];
    });
    return total;
  }

  function readActivityId(item) {
    return item?.activityId || item?.activity?.id || item?.plan?.activityId || item?.recentAction?.activityId || "";
  }

  function summarizeActivities(context = {}) {
    const counts = {};
    const visibleLogs = [];
    const addLog = (item) => {
      if (!item) return;
      const id = readActivityId(item);
      if (id) counts[id] = (counts[id] || 0) + 1;
      visibleLogs.push(item);
    };
    (context.activityLogs || []).forEach(addLog);
    if (context.includeRecentActions !== false) {
      (context.villagers || []).forEach((villager) => {
        if (villager?.recentAction) addLog(villager.recentAction);
      });
    }

    const textBlob = visibleLogs.map((log) => `${log.place || ""} ${log.text || ""}`).join(" ");
    const sceneHarvest = context.sceneKey === "harvest" ? 2 : 0;
    const lowEnergyVillagers = (context.villagers || []).filter((villager) => Number(villager.energy || 100) < 35).length;
    const unhealthyVillagers = (context.villagers || []).filter((villager) => Number(villager.health || 100) < 65).length;

    return {
      counts,
      totalLogs: visibleLogs.length,
      irrigation: (counts["YF-02"] || 0) * 2 + (counts["RW-04"] || 0) * 2,
      patrol: (counts["YF-03"] || 0) + (counts["MF-03"] || 0) + (counts["RW-06"] || 0),
      weeding: (counts["YF-04"] || 0) * 2,
      compost: (counts["YF-05"] || 0) + (counts["MF-08"] || 0),
      planting: (counts["YF-01"] || 0) * 2 + (counts["RW-07"] || 0) + Math.floor(((counts["TC-02"] || 0) + (counts["GG-02"] || 0) + (counts["SR-09"] || 0)) / 2),
      harvest: (counts["YF-06"] || 0) * 2 + sceneHarvest,
      packaging: (counts["YF-09"] || 0) * 2,
      processing: (counts["YF-09"] || 0) + (counts["YF-08"] || 0) + (counts["CH-04"] || 0) + (context.sceneKey === "harvest" ? 1 : 0),
      barnAudit: (counts["YF-08"] || 0),
      logistics: (counts["SR-01"] || 0) + (counts["SR-03"] || 0) + (counts["SR-07"] || 0) + (counts["SR-08"] || 0),
      contractWork: (counts["TC-01"] || 0) + countPrefix(counts, "GG") + (counts["SR-02"] || 0) + (counts["SR-07"] || 0),
      contractBidWork: (counts["TC-01"] || 0) + (counts["GG-03"] || 0) + (counts["SR-02"] || 0) + (counts["SR-07"] || 0) + (counts["AC-04"] || 0),
      accounting: countPrefix(counts, "AC") + (counts["YF-08"] || 0) + (counts["SR-07"] || 0),
      receiptWork: (counts["AC-01"] || 0) + (counts["AC-03"] || 0) + (counts["AC-07"] || 0) + (counts["CH-11"] || 0),
      facilityRepair: (counts["YF-07"] || 0) * 2 + (counts["YF-10"] || 0) + (counts["OM-02"] || 0) + (counts["OM-08"] || 0) + (counts["GG-04"] || 0),
      greenhouseRepair: (counts["YF-07"] || 0) * 2 + (counts["YF-12"] || 0),
      toolMaintenance: (counts["YF-10"] || 0) + (counts["TC-10"] || 0),
      upgradePlanning: (counts["AC-10"] || 0) + (counts["CH-09"] || 0) + (counts["SR-06"] || 0),
      training: (counts["CH-05"] || 0) + (counts["YF-15"] || 0) + (counts["SR-10"] || 0),
      consignmentWork: (counts["CH-08"] || 0) + (counts["YF-09"] || 0) + (counts["TC-05"] || 0) + (counts["CH-11"] || 0),
      creditPurchase: (counts["GG-02"] || 0),
      complaint: (counts["TC-08"] || 0) + (counts["CH-03"] || 0),
      fieldWorkFallback: /黄石农场|采收|巡田|浇水|除草|播种/.test(textBlob) ? 1 : 0,
      lowEnergyVillagers,
      unhealthyVillagers
    };
  }

  function consecutiveWeather(state, keys) {
    let count = 0;
    for (let i = state.weatherHistory.length - 1; i >= 0; i -= 1) {
      if (!keys.includes(state.weatherHistory[i].key)) break;
      count += 1;
    }
    return count;
  }

  function applyCareToken(value, amount) {
    if (amount <= 0) return { value, used: 0 };
    const used = Math.min(value, amount);
    return { value: value - used, used };
  }

  function calculateQuality(field) {
    const soil = field.soil;
    const score = clamp(
      40 +
      soil.fertility * 5 +
      soil.organic * 3 -
      soil.pests * 6 -
      soil.disease * 8 -
      soil.weeds * 4 -
      field.stress * 7 -
      field.overripeDays * 8,
      0,
      100
    );
    return { score, quality: scoreToQuality(score) };
  }

  function cropSeasonOk(crop, field, seasonKey) {
    if (crop.seasons.includes(seasonKey)) return true;
    if (field.bedType === "greenhouse" || field.bedType === "indoor" || crop.indoorFriendly) return seasonKey === "winter";
    return false;
  }


  T.townLedgerCore = {
    clamp,
    deepClone,
    normalizeSeasonKey,
    normalizeWeather,
    qualityRank,
    qualityText,
    downgradeQuality,
    isQualityAtLeast,
    fieldCrop,
    seasonalScarcity,
    reputationMultiplier,
    addLedgerEntry,
    summarizeActivities,
    consecutiveWeather,
    applyCareToken,
    calculateQuality,
    cropSeasonOk
  };
}());
