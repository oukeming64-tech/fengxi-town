(function () {
  const T = window.MorningTown;

  function createEngineTimeline({
    state,
    weeklyTimeline,
    debtLedger,
    publicTownSnapshot
  }) {
    function boundarySnapshot(day, label) {
      if (!weeklyTimeline.makeBoundarySnapshot) return null;
      return weeklyTimeline.makeBoundarySnapshot(publicTownSnapshot(), day, label);
    }

    function makeDailyFactSnapshot(completedDay, report, logs) {
      if (!weeklyTimeline.makeDailySnapshot) return null;
      return weeklyTimeline.makeDailySnapshot({
        day: completedDay,
        scene: state.scene.label,
        season: state.season.label,
        weather: state.lastSettlement?.settlement?.weather || state.currentWeather,
        publicSnapshot: publicTownSnapshot(),
        report,
        logs
      });
    }

    function latestWeekSnapshot() {
      return state.weeklyTimeline[state.weeklyTimeline.length - 1] || null;
    }

    function getWeekSnapshot(weekId) {
      return state.weeklyTimeline.find((week) => week.weekId === weekId) || null;
    }

    function maybeCreateStageEvaluation(completedDay, debtSettlement) {
      if (!weeklyTimeline.makeStageEvaluation || completedDay < 60 || completedDay % 60 !== 0) return null;
      const exists = state.stageEvaluations.some((item) => item.endDay === completedDay);
      if (exists) return null;
      const evaluation = weeklyTimeline.makeStageEvaluation({
        startDay: Math.max(1, completedDay - 59),
        endDay: completedDay,
        snapshot: boundarySnapshot(completedDay, "stage-evaluation"),
        villagers: state.villagers,
        debtSettlement
      });
      state.stageEvaluations.push(evaluation);
      return evaluation;
    }

    function closeWeekIfNeeded(completedDay) {
      if (!weeklyTimeline.makeWeekSnapshot || completedDay % 7 !== 0 || !state.dailySnapshots.length) return null;
      const weekNumber = state.weeklyTimeline.length + 1;
      const startDay = completedDay - 6;
      const debtSettlement = debtLedger.settleWeeklyDebt
        ? debtLedger.settleWeeklyDebt(state.townState, { startDay, endDay: completedDay, weekNumber })
        : null;
      state.lastWeeklyDebtSettlement = debtSettlement;
      const endSnapshot = boundarySnapshot(completedDay, "week-end");
      const weekEvaluations = state.stageEvaluations.filter((item) => item.endDay >= startDay && item.endDay <= completedDay);
      const week = weeklyTimeline.makeWeekSnapshot({
        weekNumber,
        days: state.dailySnapshots.slice(-7),
        startSnapshot: state.currentWeekStartSnapshot || boundarySnapshot(startDay, "week-start"),
        endSnapshot,
        debtSettlement,
        stageEvaluations: weekEvaluations
      });
      state.weeklyTimeline.push(week);
      state.currentWeekStartSnapshot = boundarySnapshot(completedDay + 1, "week-start");
      return week;
    }

    return {
      boundarySnapshot,
      makeDailyFactSnapshot,
      latestWeekSnapshot,
      getWeekSnapshot,
      maybeCreateStageEvaluation,
      closeWeekIfNeeded
    };
  }

  T.engineTimeline = {
    version: "engine-timeline-v0.1.0-local",
    create: createEngineTimeline
  };
}());
