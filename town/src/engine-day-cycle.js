(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function create(options) {
    const {
      state,
      zones = [],
      timeSlots = [],
      activityRules = {},
      townLedger = {},
      stageLaborFairness = {},
      weatherSystem = {},
      engineDailyReport = {},
      festivalResultLedger = {},
      actionRunner,
      timeline,
      currentSceneKey = () => "daily",
      currentSeasonKey = () => "spring",
      placeName = () => "小路",
      zoneName = () => "小路",
      snapshot = () => new Map(),
      systemLog = () => {},
      makeDeltaLabels = () => [],
      logScore = () => 0,
      nudgeBond = () => {}
    } = options || {};

    if (!state) throw new Error("engine-day-cycle requires engine state");
    if (!actionRunner) throw new Error("engine-day-cycle requires action runner");
    if (!timeline) throw new Error("engine-day-cycle requires timeline helper");

    function simulateSlot() {
      if (state.slotIndex === 0 && state.dailyLogs.length === 0) {
        state.displayLogs = [];
        state.dailyActivityLogs = [];
      }
      const slot = timeSlots[state.slotIndex];
      const produced = [];
      state.activityCounts = new Map();
      state.activityZoneCounts = new Map();

      T.shuffle(state.villagers).forEach((villager) => {
        const plan = actionRunner.chooseAction(villager);
        state.activityCounts.set(plan.activityId, (state.activityCounts.get(plan.activityId) || 0) + 1);
        if (plan.activity?.zoneId) {
          state.activityZoneCounts.set(plan.activity.zoneId, (state.activityZoneCounts.get(plan.activity.zoneId) || 0) + 1);
        }
        const action = plan.legacyAction;
        const delta = actionRunner.applyAction(villager, plan);
        stageLaborFairness.recordAction?.(state.stageLaborLedger, villager, plan);
        const samePlace = state.villagers.filter((item) => item.id !== villager.id && item.zone === villager.zone);
        const target = samePlace.length ? T.pick(samePlace) : T.pick(state.villagers.filter((item) => item.id !== villager.id));
        if (["inn", "market", "river", "bridge"].includes(action)) {
          nudgeBond(villager, target, { warmth: action === "inn" || action === "river" ? 2 : 1, debt: action === "inn" ? 1 : 0 });
        }
        if (action === "notice" && villager.renown > villager.help + 30) {
          villager.distance = T.clamp(villager.distance + 1, 0, 99);
          nudgeBond(villager, target, { rub: 1 });
        }
        const text = activityRules.formatLine
          ? activityRules.formatLine(villager, plan.activity, { scene: state.scene, slot, state })
          : villager.line(action, { scene: state.scene, slot, state });
        const placeLabel = plan.activity ? `${zoneName(villager.zone)} · ${plan.activity.shortTitle}` : placeName(action);
        const deltas = makeDeltaLabels(delta);
        villager.recentAction = {
          day: state.day,
          slot,
          place: plan.activity?.title || placeName(action),
          zone: zoneName(villager.zone),
          activityId: plan.activityId,
          activityTitle: plan.activity?.title || placeName(action),
          text,
          localText: text,
          deltas,
          kind: delta.kind,
          modelControl: plan.modelControl || null
        };

        produced.push({
          id: `log-d${state.day}-s${state.slotIndex + 1}-${villager.id}`,
          day: state.day,
          slot,
          place: placeLabel,
          kind: delta.kind,
          residentId: villager.id,
          zoneId: villager.zone,
          activityId: plan.activityId,
          activityTitle: plan.activity?.title || placeName(action),
          legacyAction: action,
          text,
          localText: text,
          deltas,
          modelControl: plan.modelControl || null,
          score: logScore(villager, action, delta)
        });
      });

      state.dailyActivityLogs.push(...produced.filter((log) => log.kind !== "system"));
      produced
        .sort((a, b) => b.score - a.score)
        .slice(0, slot === "夜里" ? 8 : 7)
        .forEach((log) => {
          state.dailyLogs.push(log);
          state.allLogs.push(log);
        });

      state.displayLogs = [...state.dailyLogs];
      state.slotIndex += 1;
      if (state.slotIndex >= timeSlots.length) closeDay();
    }

    function closeDay() {
      const finishedLogs = [...state.dailyLogs];
      const settlementActivityLogs = state.dailyActivityLogs?.length
        ? [...state.dailyActivityLogs]
        : finishedLogs.filter((log) => log.kind !== "system");
      const settlement = townLedger.settleDay && state.townState
        ? townLedger.settleDay(state.townState, {
          weather: state.currentWeather,
          villagers: state.villagers,
          activityLogs: settlementActivityLogs,
          includeRecentActions: false,
          sceneKey: currentSceneKey()
        })
        : null;
      if (settlement) {
        state.townState = settlement.state;
        state.lastSettlement = settlement;
      }
      const settlementLogs = engineDailyReport.makeSettlementLogs(settlement, state);
      const festivalResult = festivalResultLedger.recordDailyResult?.(state, {
        day: state.day,
        seasonKey: currentSeasonKey(),
        townState: state.townState,
        activityLogs: settlementActivityLogs
      }) || null;
      const report = engineDailyReport.generateReport({ state, zones, festivalResult });
      state.lastReport = report;
      if (T.townStage?.buildPlayback) {
        state.lastStagePlayback = T.townStage.buildPlayback(state, {
          day: state.day,
          activityLogs: settlementActivityLogs,
          timeSlots
        });
      }
      const daySnapshot = timeline.makeDailyFactSnapshot(state.day, report, [...finishedLogs, ...settlementLogs], festivalResult);
      if (daySnapshot) state.dailySnapshots.push(daySnapshot);
      stageLaborFairness.recordDay?.(state.stageLaborLedger, state.villagers, state.day);
      timeline.maybeCreateStageEvaluation(state.day, state.lastWeeklyDebtSettlement);
      timeline.closeWeekIfNeeded(state.day);
      const doneLog = {
        id: `log-${state.allLogs.length + settlementLogs.length + 1}`,
        day: state.day,
        slot: "收夜",
        place: "小路",
        kind: "system",
        text: `第 ${state.day} 天已经结束。枫溪小报已经写好，明天还是${state.scene.label}。`,
        localText: `第 ${state.day} 天已经结束。枫溪小报已经写好，明天还是${state.scene.label}。`,
        deltas: []
      };
      state.villagers.forEach((villager) => {
        villager.energy = T.clamp(villager.energy + 26, 0, 100);
        villager.health = T.clamp((villager.health || 100) + 8, 0, 100);
        villager.distance = T.clamp(villager.distance - 1, 0, 99);
      });
      if (state.modelActionControl?.day === state.day) {
        state.modelActionControl.completedDay = state.day;
      }
      state.day += 1;
      state.slotIndex = 0;
      state.dailyLogs = [];
      state.dailyActivityLogs = [];
      state.dayStart = snapshot();
      if (weatherSystem.generateDayWeather && state.townState) {
        state.currentWeather = weatherSystem.generateDayWeather(state.townState, { seasonKey: currentSeasonKey() });
        state.townState.currentWeather = state.currentWeather;
      }
      actionRunner.refreshDailyPlans();
      state.displayLogs = [...finishedLogs, ...settlementLogs, doneLog];
      state.allLogs.push(...settlementLogs, doneLog);
      if (state.currentWeather) {
        systemLog(weatherSystem.summarize ? weatherSystem.summarize(state.currentWeather) : `${state.currentWeather.label}压在镇上，农场先看天气再开工。`, state.day, "清晨");
      }
    }

    function advanceDay() {
      const target = state.day;
      while (state.day === target) simulateSlot();
    }

    function advanceDays(count) {
      const days = T.clamp(Number(count) || 1, 1, 30);
      for (let i = 0; i < days; i += 1) advanceDay();
    }

    function advanceWeek() {
      advanceDays(7);
    }

    return {
      simulateSlot,
      closeDay,
      advanceDay,
      advanceDays,
      advanceWeek
    };
  }

  T.engineDayCycle = {
    version: "engine-day-cycle-v0.1.0-local",
    create
  };
}());
