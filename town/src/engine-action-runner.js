(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function create(options) {
    const {
      state,
      activityRules = {},
      actionPolicy = {},
      activityPlaces = [],
      actionEffects = {},
      scenePlanIds = {},
      timeSlots = [],
      currentSceneKey = () => "daily",
      currentSeasonKey = () => "spring",
      placeName = () => "小路",
      zoneName = () => "小路"
    } = options || {};

    if (!state) throw new Error("engineActionRunner requires engine state");

    function zoneForActivity(villager, action) {
      const activity = activityRules.getActivity?.(typeof action === "string" ? action : action?.activityId);
      if (activity) return activity.zoneId;

      const place = activityPlaces.find((item) => item.id === action);
      if (!place) return "townCenter";

      const makerTags = new Set(["守桥", "石锤", "木尺", "风箱", "榆木"]);
      const idNumber = Number(String(villager?.id || "").replace(/\D/g, "")) || 0;
      const worksWithHands = (villager?.traits?.work || 1) > 1.08 || (villager?.traits?.risk || 1) > 1.18;

      if ((action === "bridge" || action === "market" || action === "mine") && (makerTags.has(villager?.tag) || (worksWithHands && idNumber % 5 === 0))) {
        return action === "mine" ? "oldMine" : "yellowstoneFarm";
      }

      if (action === "market" && ((villager?.traits?.trade || 1) > 1.12 || idNumber % 6 === 0)) {
        return "goldkinStation";
      }

      if (action === "notice" && ((villager?.traits?.order || 1) > 1.12 || idNumber % 7 === 0)) {
        return "accountingOffice";
      }

      if (action === "river" && ((villager?.traits?.quiet || 1) > 1.14 || idNumber % 8 === 0)) {
        return "mapleForest";
      }

      return place.zone;
    }

    function assignPlace(villager, action, zoneOverride) {
      villager.location = action;
      villager.zone = zoneOverride || zoneForActivity(villager, action);
    }

    function applyStorage(storage, changes) {
      Object.keys(changes || {}).forEach((key) => {
        storage[key] = T.clamp((storage[key] || 0) + changes[key], 0, 99);
      });
    }

    function normalizePlan(villager, planOrAction) {
      if (planOrAction?.activity) return planOrAction;
      const preferredAction = typeof planOrAction === "string" ? planOrAction : "home";
      const activity = activityRules.activitiesForLegacy?.(preferredAction)?.[0] || activityRules.fallbackActivity;
      return {
        activity,
        activityId: activity?.id || "",
        legacyAction: activity?.legacyAction || preferredAction,
        score: 0,
        internalReason: {}
      };
    }

    function applyAction(villager, planOrAction) {
      const plan = normalizePlan(villager, planOrAction);
      const action = plan.legacyAction || "home";
      const effect = activityRules.effectFor?.(plan.activity) || actionEffects[action] || actionEffects.home;
      const tradeBonus = action === "market" ? Math.round((villager.traits.trade - 1) * 5) : 0;
      const workBonus = ["farm", "bridge"].includes(action) ? Math.round((villager.traits.work - 1) * 4) : 0;
      const talkBonus = ["notice", "inn", "market"].includes(action) ? Math.round((villager.traits.talk - 1) * 4) : 0;
      const riskBonus = action === "mine" ? T.randomInt(-4, Math.round(villager.traits.risk * 5)) : 0;

      const delta = {
        coins: effect.coins + tradeBonus + riskBonus,
        health: effect.health,
        energy: effect.energy,
        renown: effect.renown + talkBonus,
        help: effect.help + workBonus,
        favor: effect.favor,
        standing: effect.standing,
        distance: effect.distance
      };

      villager.coins = T.clamp(villager.coins + delta.coins, 0, 999);
      villager.health = T.clamp((villager.health || 100) + delta.health, 0, 100);
      villager.energy = T.clamp(villager.energy + delta.energy, 0, 100);
      villager.renown = T.clamp(villager.renown + delta.renown, 0, 999);
      villager.help = T.clamp(villager.help + delta.help, 0, 999);
      villager.favor = T.clamp(villager.favor + delta.favor, 0, 99);
      villager.standing = T.clamp(villager.standing + delta.standing, 0, 999);
      villager.distance = T.clamp(villager.distance + delta.distance, 0, 99);
      applyStorage(villager.storage, effect.storage);
      assignPlace(villager, action, plan.activity?.zoneId);
      villager.lastActionPlan = {
        activityId: plan.activityId,
        activityTitle: plan.activity?.title || placeName(action),
        score: plan.score,
        modelControl: plan.modelControl || null,
        internalReason: plan.internalReason || {}
      };
      return { ...delta, storage: effect.storage, kind: effect.kind, activity: plan.activity, plan };
    }

    function chooseFallback(villager) {
      const scene = state.scene;
      if (villager.energy < 18) return "home";
      return T.chooseWeighted(activityPlaces.map((place) => {
        let weight = scene.weights[place.id] || 1;
        if (place.id === "farm") weight *= villager.traits.work;
        if (place.id === "bridge") weight *= villager.traits.work * villager.traits.order;
        if (place.id === "market") weight *= villager.traits.trade;
        if (place.id === "notice" || place.id === "inn") weight *= villager.traits.talk;
        if (place.id === "mine") weight *= villager.traits.risk;
        if (place.id === "home" || place.id === "river") weight *= villager.traits.quiet;
        return { value: place.id, weight };
      }));
    }

    function makeActionContext(villager, scheduled) {
      return {
        scene: state.scene,
        sceneKey: currentSceneKey(),
        season: state.season,
        seasonKey: currentSeasonKey(),
        slot: timeSlots[state.slotIndex],
        preferredActivityId: scheduled?.activityId || "",
        activityCounts: state.activityCounts,
        activityZoneCounts: state.activityZoneCounts,
        weather: state.currentWeather,
        townState: state.townState,
        state
      };
    }

    function chooseAction(villager) {
      const scheduled = villager.todayPlan?.slots?.[state.slotIndex] || null;
      const ctx = makeActionContext(villager, scheduled);
      const preferred = villager.decide ? villager.decide(ctx, villager) : chooseFallback(villager);
      if (scheduled?.source === "model-action-control" && scheduled.activityId && actionPolicy.auditPreferredActivity) {
        const audit = actionPolicy.auditPreferredActivity(villager, scheduled.activityId, ctx);
        return {
          ...audit.plan,
          modelControl: {
            ...(scheduled.model || {}),
            scheduledActivityId: scheduled.activityId,
            finalActivityId: audit.plan.activityId,
            decision: audit.decision,
            reason: audit.reason
          }
        };
      }
      if (actionPolicy.chooseActivity) {
        return actionPolicy.chooseActivity(villager, { ...ctx, preferredAction: preferred || chooseFallback(villager) });
      }
      return normalizePlan(villager, preferred || chooseFallback(villager));
    }

    function planSummaryFor(plan) {
      return `${plan.slot}去${plan.zoneName}，${plan.intention}。`;
    }

    function makeDailyPlan(villager, planningCounts = []) {
      const preferredIds = scenePlanIds[currentSceneKey()] || scenePlanIds.daily;
      const slots = timeSlots.map((slot, index) => {
        const counts = planningCounts[index] || {
          activities: new Map(),
          zones: new Map()
        };
        planningCounts[index] = counts;
        const preferredActivityId = villager.energy < 20 && index > 0 ? "REST-01" : preferredIds[index] || preferredIds[0];
        const plan = actionPolicy.chooseActivity
          ? actionPolicy.chooseActivity(villager, {
            scene: state.scene,
            sceneKey: currentSceneKey(),
            season: state.season,
            seasonKey: currentSeasonKey(),
            slot,
            preferredActivityId,
            activityCounts: counts.activities,
            activityZoneCounts: counts.zones,
            weather: state.currentWeather,
            townState: state.townState,
            state
          })
          : normalizePlan(villager, chooseFallback(villager));
        const zoneId = plan.activity?.zoneId || zoneForActivity(villager, plan);
        counts.activities.set(plan.activityId, (counts.activities.get(plan.activityId) || 0) + 1);
        counts.zones.set(zoneId, (counts.zones.get(zoneId) || 0) + 1);
        return {
          slot,
          activityId: plan.activityId,
          title: plan.activity?.title || placeName(plan.legacyAction),
          shortTitle: plan.activity?.shortTitle || plan.activity?.title || placeName(plan.legacyAction),
          zoneId,
          zoneName: zoneName(zoneId),
          intention: plan.activity?.outputs?.[0] || "把今天的事稳住",
          risk: plan.activity?.risks?.[0] || "临时变化"
        };
      });
      return {
        day: state.day,
        scene: state.scene.label,
        weather: state.currentWeather?.label || "阴天",
        slots,
        summary: slots.map(planSummaryFor).join(" ")
      };
    }

    function refreshDailyPlans() {
      const planningCounts = timeSlots.map(() => ({ activities: new Map(), zones: new Map() }));
      state.villagers.forEach((villager) => {
        villager.todayPlan = makeDailyPlan(villager, planningCounts);
      });
    }

    return {
      zoneForActivity,
      assignPlace,
      normalizePlan,
      applyAction,
      chooseFallback,
      chooseAction,
      makeDailyPlan,
      refreshDailyPlans
    };
  }

  T.engineActionRunner = {
    version: "engine-action-runner-v0.1.0-local",
    create
  };
}());
