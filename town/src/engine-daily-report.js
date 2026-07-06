(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function factText(log) {
    return log?.localText || log?.text || "";
  }

  function listFor(logs, fallback) {
    const source = logs.length ? logs : fallback;
    return source.map((log) => `${log.slot}，${factText(log)}`);
  }

  function generateReport({ state, zones }) {
    const visibleLogs = state.dailyLogs.filter((log) => log.kind !== "system");
    const work = visibleLogs.filter((log) => log.kind === "work").slice(0, 4);
    const talk = visibleLogs.filter((log) => log.kind === "talk").slice(0, 4);
    const quiet = visibleLogs.filter((log) => log.kind === "quiet").slice(0, 4);
    const placeCounts = zones
      .map((zone) => ({
        zone,
        count: state.villagers.filter((villager) => villager.zone === zone.id).length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const fallbackList = visibleLogs.slice(0, 4).map((log) => `${log.slot}，${factText(log)}`);
    const quietSection = quiet.length
      ? { title: "安静角落", list: listFor(quiet, visibleLogs.slice(0, 4)) }
      : { title: "路过的事", list: fallbackList };
    const settlementSections = state.lastSettlement?.reportSections || [];

    return {
      day: state.day,
      scene: `${state.season.label} · ${state.scene.label}`,
      sections: [
        { title: "今日公告", body: `${state.season.field} ${state.scene.task}走过了一天，镇上的动静都留在田地、街口、河湾湿地和山坡上。` },
        ...settlementSections,
        { title: "做过的事", list: work.length ? listFor(work, visibleLogs.slice(0, 4)) : fallbackList },
        { title: "听见的话", list: talk.length ? listFor(talk, visibleLogs.slice(0, 4)) : fallbackList },
        quietSection,
        { title: "最热闹的地方", list: placeCounts.map((item) => `${item.zone.name}：今天有 ${item.count} 位居民停留。`) },
        { title: "明天继续", body: `明天还是${state.scene.label}。新的行动和对话会继续记录在地图和小报里。` }
      ]
    };
  }

  function settlementNote(item) {
    return typeof item === "string" ? item : item?.note || item?.detail || "";
  }

  function uniqueNotes(items) {
    const seen = new Set();
    return (items || [])
      .map(settlementNote)
      .filter(Boolean)
      .filter((item) => {
        if (seen.has(item)) return false;
        seen.add(item);
        return true;
      });
  }

  function makeSettlementLogs(result, state) {
    const settlement = result?.settlement;
    if (!settlement) return [];
    const logs = [];
    const day = settlement.day;
    const add = (kind, place, text) => {
      if (!text) return;
      logs.push({
        id: `log-${state.allLogs.length + logs.length + 1}`,
        day,
        slot: "收夜",
        place,
        kind,
        text,
        localText: text,
        deltas: []
      });
    };

    uniqueNotes(settlement.cropChanges)
      .filter((note) => !/状态更新/.test(note))
      .slice(0, 2)
      .forEach((note) => add("work", "田地 · 作物", note));

    uniqueNotes(settlement.inventoryChanges)
      .filter((note) => !/无明显损耗/.test(note))
      .slice(0, 2)
      .forEach((note) => add("work", "谷仓 · 库存", note));

    uniqueNotes(settlement.marketChanges)
      .slice(0, 1)
      .forEach((note) => add("talk", "街口 · 行情", note));

    uniqueNotes(settlement.contractChanges)
      .filter((note) => !/今日无交割/.test(note))
      .slice(0, 2)
      .forEach((note) => add("talk", "采购站 · 合同", note));

    const riskNote = (settlement.risks?.notes || []).find((note) => !/可控/.test(note));
    if (riskNote) add("system", "会计协会办公室 · 风险", riskNote);

    return logs.slice(0, 7);
  }

  T.engineDailyReport = {
    generateReport,
    makeSettlementLogs
  };
}());
