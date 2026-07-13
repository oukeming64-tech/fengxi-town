(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const SOURCE = "executed-local-actions-and-festival-calendar";

  const resultTypes = Object.freeze({
    preparation: Object.freeze({ label: "筹备与公示", activityIds: Object.freeze(["CH-04", "TC-01", "CH-11"]) }),
    trade: Object.freeze({ label: "摆摊与采购", activityIds: Object.freeze(["TC-02", "CH-08"]) }),
    gift: Object.freeze({ label: "送礼与拜访", activityIds: Object.freeze(["TC-07"]) }),
    thanks: Object.freeze({ label: "致谢与表彰", activityIds: Object.freeze(["CH-06"]) }),
    sharedWork: Object.freeze({ label: "共同劳动", activityIds: Object.freeze(["YF-04", "RW-03", "RW-06"]) }),
    harvest: Object.freeze({ label: "收成与种子", activityIds: Object.freeze(["YF-01", "YF-06", "YF-09", "YF-13"]) }),
    dinner: Object.freeze({ label: "共同晚宴", activityIds: Object.freeze(["CH-10"]) }),
    cleanup: Object.freeze({ label: "清点与收尾", activityIds: Object.freeze(["YF-08", "AC-01"]) })
  });

  const typeByActivity = Object.freeze(Object.fromEntries(
    Object.entries(resultTypes).flatMap(([type, config]) => config.activityIds.map((activityId) => [activityId, type]))
  ));

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function phaseActivityIds(festivalId, phase) {
    const phaseProfile = T.festivalResidentBehavior?.festivalProfiles?.[festivalId]?.[phase] || {};
    return new Set(Object.values(phaseProfile).flatMap((weights) => Object.keys(weights || {})));
  }

  function uniqueLogs(logs) {
    const seen = new Set();
    return (logs || []).filter((log) => {
      if (!log?.residentId || !log?.activityId) return false;
      const key = log.id || `${log.day}:${log.slot}:${log.residentId}:${log.activityId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function countBy(items, keyFor, detailFor) {
    const counts = new Map();
    items.forEach((item) => {
      const key = keyFor(item);
      if (!key) return;
      const current = counts.get(key) || { key, count: 0, ...detailFor(item, key) };
      current.count += 1;
      counts.set(key, current);
    });
    return [...counts.values()].sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key), "zh-CN"));
  }

  function summaryLines(result) {
    if (!result.actionCount) {
      return [`${result.festivalName}·${result.phaseLabel}：今天没有记录到相关行动，镇上的普通生活照常推进。`];
    }
    const types = result.resultTypeCounts.slice(0, 4).map((item) => `${item.label} ${item.count} 次`).join("、");
    const places = result.locationCounts.slice(0, 3).map((item) => `${item.label} ${item.count} 次`).join("、");
    return [
      `${result.festivalName}·${result.phaseLabel}：${result.participantCount} 位居民留下 ${result.actionCount} 次已执行行动。`,
      `行动结果：${types}。`,
      places ? `发生地点：${places}。` : ""
    ].filter(Boolean);
  }

  function createDailyResult(options = {}) {
    const day = Number(options.day || options.townState?.day || 1);
    const seasonKey = String(options.seasonKey || options.townState?.seasonKey || "spring");
    const festival = T.townStageFestivalTheme?.festivalPhaseForState?.({ day, seasonKey });
    if (!festival?.festivalId || festival.phase === "none") return null;
    if (!T.festivalResidentBehavior?.festivalProfiles?.[festival.festivalId]) return null;

    const allowedIds = phaseActivityIds(festival.festivalId, festival.phase);
    const actions = uniqueLogs(options.activityLogs).filter((log) => allowedIds.has(log.activityId));
    const participantIds = [...new Set(actions.map((log) => log.residentId))].sort();
    const activityCounts = countBy(
      actions,
      (log) => log.activityId,
      (log, key) => ({ activityId: key, title: log.activityTitle || key, type: typeByActivity[key] || "other" })
    );
    const resultTypeCounts = countBy(
      actions,
      (log) => typeByActivity[log.activityId] || "other",
      (_log, key) => ({ type: key, label: resultTypes[key]?.label || "其他节日行动" })
    );
    const locationCounts = countBy(
      actions,
      (log) => log.zoneId || log.place,
      (log, key) => ({
        zoneId: log.zoneId || "",
        label: log.zoneId ? String(log.place || key).split(" · ")[0] : log.place || key
      })
    );
    const result = {
      id: `festival-result-${festival.festivalId}-d${day}`,
      day,
      festivalId: festival.festivalId,
      festivalName: festival.festivalName,
      phase: festival.phase,
      phaseLabel: festival.phaseLabel,
      seasonKey,
      seasonalDay: festival.seasonalDay,
      participantIds,
      participantCount: participantIds.length,
      actionCount: actions.length,
      activityCounts,
      resultTypeCounts,
      locationCounts,
      evidenceRefs: actions.map((log) => ({
        logId: log.id || "",
        residentId: log.residentId,
        activityId: log.activityId,
        slot: log.slot || "",
        zoneId: log.zoneId || ""
      })),
      source: SOURCE,
      immutableState: true
    };
    result.summaryLines = summaryLines(result);
    return deepFreeze(result);
  }

  function recordDailyResult(state, options = {}) {
    if (!state) return null;
    if (!Array.isArray(state.festivalResults)) state.festivalResults = [];
    const result = createDailyResult(options);
    if (!result) return null;
    const existingIndex = state.festivalResults.findIndex((item) => item.id === result.id);
    if (existingIndex >= 0) state.festivalResults[existingIndex] = result;
    else state.festivalResults.push(result);
    return result;
  }

  function reportSection(result) {
    return result ? { title: "节日结果", list: result.summaryLines } : null;
  }

  function weeklyLines(dailySnapshots = []) {
    const groups = new Map();
    dailySnapshots.forEach((day) => {
      const result = day.festivalResult;
      if (!result) return;
      const group = groups.get(result.festivalId) || {
        festivalName: result.festivalName,
        phases: new Set(),
        participantIds: new Set(),
        actionCount: 0,
        typeCounts: new Map()
      };
      group.phases.add(result.phaseLabel);
      result.participantIds.forEach((id) => group.participantIds.add(id));
      group.actionCount += result.actionCount;
      result.resultTypeCounts.forEach((item) => group.typeCounts.set(item.label, (group.typeCounts.get(item.label) || 0) + item.count));
      groups.set(result.festivalId, group);
    });
    return [...groups.values()].flatMap((group) => {
      const types = [...group.typeCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
        .slice(0, 4)
        .map(([label, count]) => `${label} ${count} 次`)
        .join("、");
      return [
        `${group.festivalName}：本周经过${[...group.phases].join("、")}，${group.participantIds.size} 位居民留下 ${group.actionCount} 次已执行行动。`,
        types ? `主要结果：${types}。` : ""
      ].filter(Boolean);
    });
  }

  T.festivalResultLedger = {
    version: "festival-result-ledger-v0.1.9-f",
    source: SOURCE,
    resultTypes,
    createDailyResult,
    recordDailyResult,
    reportSection,
    weeklyLines
  };
}());
