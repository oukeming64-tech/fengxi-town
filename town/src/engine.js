(function () {
  const T = window.MorningTown;
  const world = T.worldConfig || {};
  const activityRules = T.activityRules || {};
  const actionPolicy = T.actionPolicy || {};
  const weatherSystem = T.weatherSystem || {};
  const townLedger = T.townLedger || {};
  const debtLedger = T.townDebtLedger || {};
  const weeklyTimeline = T.weeklyTimeline || {};
  const relationshipLedger = T.townRelationshipLedger || {};
  const engineDailyReport = T.engineDailyReport || {};
  const staticData = T.engineStaticData || {};

  const namePool = staticData.namePool || { first: { male: [], female: [] }, last: [] };
  const genderTargets = staticData.genderTargets || { male: 17, female: 13 };
  const genderPlan = staticData.genderPlan || [];
  const zones = world.zones || staticData.zones || [];
  const mapBounds = staticData.mapBounds || {};

  zones.forEach((zone) => {
    zone.mapBounds = zone.mapBounds || mapBounds[zone.id] || { left: 8, top: 8, width: 24, height: 24, labelLeft: 12, labelTop: 12 };
  });

  const activityPlaces = activityRules.legacyPlaces || staticData.activityPlaces || [];
  const startingPositions = staticData.startingPositions || [];
  const scenes = staticData.scenes || {};
  const seasons = world.seasons || staticData.seasons || {};
  const timeSlots = staticData.timeSlots || ["清晨", "午后", "夜里"];
  const actionEffects = staticData.actionEffects || {};
  const scenePlanIds = staticData.scenePlanIds || {};

  const state = {
    day: 1,
    slotIndex: 0,
    villagers: [],
    dayStart: null,
    dailyLogs: [],
    dailyActivityLogs: [],
    displayLogs: [],
    allLogs: [],
    lastReport: null,
    townState: null,
    currentWeather: null,
    lastSettlement: null,
    dailySnapshots: [],
    weeklyTimeline: [],
    currentWeekStartSnapshot: null,
    lastWeeklyDebtSettlement: null,
    stageEvaluations: [],
    modelActionControl: null,
    residentCognition: null,
    bonds: new Map(),
    activityCounts: new Map(),
    activityZoneCounts: new Map(),
    get scene() {
      return scenes[document.getElementById("sceneSelect")?.value] || scenes.daily;
    },
    get season() {
      return seasons[document.getElementById("seasonSelect")?.value] || seasons.spring;
    }
  };

  function normalizeGender(value) {
    return value === "female" ? "female" : "male";
  }

  function genderCounts(list) {
    return list.reduce((counts, item) => {
      const gender = normalizeGender(item.gender || item);
      counts[gender] = (counts[gender] || 0) + 1;
      return counts;
    }, { male: 0, female: 0 });
  }

  function validateGenderPlan() {
    const counts = genderCounts(genderPlan);
    if (genderPlan.length !== T.villagerFactories.length || counts.male !== genderTargets.male || counts.female !== genderTargets.female) {
      throw new Error(`Expected ${genderTargets.male} male and ${genderTargets.female} female resident slots, got ${counts.male} male and ${counts.female} female across ${genderPlan.length} slots.`);
    }
  }

  function makeName(used, gender) {
    const firstPool = namePool.first[normalizeGender(gender)] || namePool.first.male;
    for (let i = 0; i < 200; i += 1) {
      const name = `${T.pick(firstPool)} ${T.pick(namePool.last)}`;
      if (!used.has(name)) {
        used.add(name);
        return name;
      }
    }
    const fallback = `${T.pick(firstPool)} ${T.pick(namePool.last)} ${T.randomInt(10, 99)}`;
    used.add(fallback);
    return fallback;
  }

  function placeName(id) {
    const activity = activityRules.getActivity?.(id);
    if (activity) return activity.title;
    return activityPlaces.find((place) => place.id === id)?.name || "小路";
  }

  function zoneName(id) {
    return zones.find((zone) => zone.id === id)?.name || "小路";
  }

  function cloneStats(villager) {
    return {
      coins: villager.coins,
      energy: villager.energy,
      health: villager.health,
      renown: villager.renown,
      help: villager.help,
      favor: villager.favor,
      standing: villager.standing,
      distance: villager.distance
    };
  }

  function snapshot() {
    const map = new Map();
    state.villagers.forEach((villager) => map.set(villager.id, cloneStats(villager)));
    return map;
  }

  function diff(villager) {
    const start = state.dayStart?.get(villager.id) || cloneStats(villager);
    return {
      coins: villager.coins - start.coins,
      health: villager.health - start.health,
      renown: villager.renown - start.renown,
      help: villager.help - start.help,
      favor: villager.favor - start.favor,
      standing: villager.standing - start.standing,
      distance: villager.distance - start.distance
    };
  }

  function currentSceneKey() {
    return document.getElementById("sceneSelect")?.value || "daily";
  }

  function currentSeasonKey() {
    return document.getElementById("seasonSelect")?.value || "spring";
  }

  if (!T.engineActionRunner?.create) throw new Error("engine-action-runner must load before engine");
  const actionRunner = T.engineActionRunner.create({
    state,
    activityRules,
    actionPolicy,
    activityPlaces,
    actionEffects,
    scenePlanIds,
    timeSlots,
    currentSceneKey,
    currentSeasonKey,
    placeName,
    zoneName
  });

  function publicTownSnapshot() {
    if (!townLedger.publicSnapshot || !state.townState) return null;
    const snapshot = townLedger.publicSnapshot(state.townState);
    if (!snapshot.relationships && relationshipLedger.publicSnapshot) {
      snapshot.relationships = relationshipLedger.publicSnapshot(state.townState);
    }
    return snapshot;
  }

  if (!T.engineTimeline?.create) throw new Error("engine-timeline must load before engine");
  const timeline = T.engineTimeline.create({
    state,
    weeklyTimeline,
    debtLedger,
    publicTownSnapshot
  });

  function bondKey(a, b) {
    return [a.id, b.id].sort().join(":");
  }

  function nudgeBond(a, b, amount) {
    if (!a || !b || a.id === b.id) return;
    const key = bondKey(a, b);
    const current = state.bonds.get(key) || { a: a.id, b: b.id, warmth: 0, debt: 0, rub: 0 };
    current.warmth = T.clamp(current.warmth + (amount.warmth || 0), -30, 80);
    current.debt = T.clamp(current.debt + (amount.debt || 0), 0, 40);
    current.rub = T.clamp(current.rub + (amount.rub || 0), 0, 60);
    state.bonds.set(key, current);
  }

  function makeDeltaLabels(delta) {
    const labels = [];
    if (delta.coins) labels.push(`金币 ${delta.coins > 0 ? "+" : ""}${delta.coins}`);
    if (delta.energy) labels.push(`体力 ${delta.energy > 0 ? "+" : ""}${delta.energy}`);
    if (delta.health) labels.push(`健康 ${delta.health > 0 ? "+" : ""}${delta.health}`);
    return labels;
  }

  function logScore(villager, action, delta) {
    let score = Math.abs(delta.renown) + Math.abs(delta.help) + Math.abs(delta.favor) * 2 + Math.abs(delta.standing) * 2 + Math.abs(delta.distance);
    if (["bridge", "notice", "inn", "market"].includes(action)) score += 3;
    if (!["Sac de Fèves"].includes(villager.tag)) score += 2;
    return score + Math.random() * 4;
  }

  function systemLog(text, day = state.day, slot = timeSlots[state.slotIndex] || "清晨") {
    const log = {
      id: `log-${state.allLogs.length + 1}`,
      day, slot, place: "小路", kind: "system", text, localText: text, deltas: []
    };
    state.dailyLogs.push(log);
    state.displayLogs.push(log);
    state.allLogs.push(log);
  }

  if (!T.engineDayCycle?.create) throw new Error("engine-day-cycle must load before engine");
  const dayCycle = T.engineDayCycle.create({
    state,
    zones,
    timeSlots,
    activityRules,
    townLedger,
    weatherSystem,
    engineDailyReport,
    actionRunner,
    timeline,
    currentSceneKey,
    currentSeasonKey,
    placeName,
    zoneName,
    snapshot,
    systemLog,
    makeDeltaLabels,
    logScore,
    nudgeBond
  });

  function buildVillagers() {
    validateGenderPlan();
    const used = new Set();
    return T.villagerFactories.map((factory, index) => {
      const gender = normalizeGender(genderPlan[index]);
      const villager = factory(makeName(used, gender));
      villager.id = `v${String(index + 1).padStart(2, "0")}`;
      villager.gender = gender;
      villager.avatar = T.residentAvatarPath(villager.id);
      const start = startingPositions[index % startingPositions.length];
      actionRunner.assignPlace(villager, start.action, start.zone);
      villager.recentAction = {
        day: 1,
        slot: "清晨",
        place: placeName(start.action),
        zone: zoneName(villager.zone),
        activityId: activityRules.fallbackActivity?.id || "REST-01",
        activityTitle: activityRules.fallbackActivity?.title || "回小屋休息",
        text: `${villager.name}在${zoneName(villager.zone)}收拾今天要用的东西。`,
        deltas: [],
        kind: "quiet"
      };
      return villager;
    });
  }

  function reset() {
    state.day = 1;
    state.slotIndex = 0;
    state.townState = townLedger.createInitialState ? townLedger.createInitialState(currentSeasonKey()) : null;
    state.currentWeather = weatherSystem.generateDayWeather && state.townState
      ? weatherSystem.generateDayWeather(state.townState, { seasonKey: currentSeasonKey() })
      : state.townState?.currentWeather || null;
    if (state.townState) state.townState.currentWeather = state.currentWeather;
    state.lastSettlement = null;
    state.villagers = buildVillagers();
    state.dayStart = snapshot();
    state.dailyLogs = [];
    state.dailyActivityLogs = [];
    state.displayLogs = [];
    state.allLogs = [];
    state.lastReport = null;
    state.dailySnapshots = [];
    state.weeklyTimeline = [];
    state.currentWeekStartSnapshot = timeline.boundarySnapshot(1, "week-start");
    state.lastWeeklyDebtSettlement = null;
    state.stageEvaluations = [];
    state.modelActionControl = null;
    state.residentCognition = null;
    state.bonds = new Map();
    state.activityCounts = new Map();
    state.activityZoneCounts = new Map();
    actionRunner.refreshDailyPlans();
    systemLog("枫溪镇重新醒来。30 位居民各自散开，清晨第一批动静已经落在地图上。");
    if (state.currentWeather) {
      systemLog(weatherSystem.summarize ? weatherSystem.summarize(state.currentWeather) : `${state.currentWeather.label}压在镇上，田地先看天气再开工。`);
    }
  }

  T.engine = {
    state,
    places: activityPlaces,
    zones,
    seasons,
    timeSlots,
    scenes,
    genderPlan,
    genderTargets,
    genderCounts,
    reset,
    simulateSlot: dayCycle.simulateSlot,
    advanceDay: dayCycle.advanceDay,
    advanceDays: dayCycle.advanceDays,
    advanceWeek: dayCycle.advanceWeek,
    publicTownSnapshot,
    latestWeekSnapshot: timeline.latestWeekSnapshot,
    getWeekSnapshot: timeline.getWeekSnapshot,
    placeName,
    zoneName,
    diff
  };
}());
