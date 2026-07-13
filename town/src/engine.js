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
  const stageLaborFairness = T.stageLaborFairness || {};
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
    stageLaborLedger: null,
    modelConversationArchive: [],
    stageConversationRecaps: [],
    acknowledgedStageEvaluationIds: [],
    lastStagePlayback: null,
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

  if (!T.engineResidentFactory?.create) throw new Error("engine-resident-factory must load before engine");
  const residentFactory = T.engineResidentFactory.create({
    namePool,
    genderTargets,
    genderPlan,
    startingPositions,
    activityRules,
    actionRunner,
    placeName,
    zoneName
  });
  const { genderCounts, buildVillagers } = residentFactory;

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
    relationshipLedger,
    stageLaborFairness,
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
    if (villager.tag !== "草帽" && villager.tag !== "豆袋") score += 2;
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
    stageLaborFairness,
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
    state.stageLaborLedger = stageLaborFairness.create
      ? stageLaborFairness.create(state.villagers.map((resident) => resident.id), 1)
      : null;
    state.modelConversationArchive = [];
    state.stageConversationRecaps = [];
    state.acknowledgedStageEvaluationIds = [];
    state.lastStagePlayback = null;
    state.modelActionControl = null;
    state.residentCognition = null;
    state.bonds = new Map();
    state.activityCounts = new Map();
    state.activityZoneCounts = new Map();
    actionRunner.refreshDailyPlans();
    systemLog("枫溪镇重新醒来。30 位居民各自散开，清晨第一批动静已经落在地图上。");
    if (state.currentWeather) {
      systemLog(weatherSystem.summarize ? weatherSystem.summarize(state.currentWeather) : `${state.currentWeather.label}压在镇上，农场先看天气再开工。`);
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
