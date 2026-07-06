(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const utils = T.weeklyTimelineUtils || {};
  const snapshots = T.weeklyTimelineSnapshots || {};
  const reports = T.weeklyTimelineReports || {};
  const stage = T.weeklyTimelineStage || {};

  const version = "weekly-timeline-v0.0.8-local-immutable";

  function makeWeekSnapshot(options) {
    const days = options.days || [];
    const startDay = days[0]?.day || options.startSnapshot?.day || 1;
    const endDay = days[days.length - 1]?.day || options.endSnapshot?.day || startDay;
    const record = {
      weekId: `week-${String(options.weekNumber || 1).padStart(2, "0")}`,
      weekNumber: options.weekNumber || 1,
      startDay,
      endDay,
      rangeLabel: `第 ${startDay}-${endDay} 天`,
      source: "local-rules-weekly-snapshot",
      immutableState: true,
      modelRole: "polish-or-candidate-text-only",
      createdFrom: {
        dayCount: days.length,
        logRefCount: days.reduce((sum, day) => sum + (day.keyLogRefs?.length || 0), 0),
        ledgerSource: "town-ledger-public-snapshot"
      },
      startSnapshot: options.startSnapshot,
      endSnapshot: options.endSnapshot,
      ledgerDelta: utils.ledgerDelta(options.startSnapshot, options.endSnapshot),
      dailySnapshots: days,
      keyLogRefs: days.flatMap((day) => day.keyLogRefs || []).slice(0, 18),
      debtSettlement: options.debtSettlement || null,
      stageEvaluations: options.stageEvaluations || []
    };
    record.localReport = reports.buildLocalReport(record);
    return utils.deepFreeze(record);
  }

  T.weeklyTimeline = {
    version,
    deepClone: utils.deepClone,
    deepFreeze: utils.deepFreeze,
    makeBoundarySnapshot: snapshots.makeBoundarySnapshot,
    makeDailySnapshot: snapshots.makeDailySnapshot,
    makeWeekSnapshot,
    makeStageEvaluation: stage.makeStageEvaluation
  };
}());
