(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const rules = T.townRelationshipRules || {};

  const version = "town-relationship-interactions-v0.0.1-local";
  const typeLabels = rules.typeLabels || {};
  const typeEffects = rules.typeEffects || {};
  const groupProfiles = T.residentGroupProfiles || {};

  function residentsById(context) {
    const map = new Map();
    (context.villagers || context.residents || []).forEach((resident) => {
      if (resident?.id) map.set(resident.id, resident);
    });
    return map;
  }

  function normalizeLog(log, residentMap) {
    const residentId = log?.residentId || log?.villagerId || log?.actorId || log?.resident?.id;
    if (!residentId || !residentMap.has(residentId)) return null;
    const resident = residentMap.get(residentId);
    return {
      id: log.id || `${residentId}-${log.slot || "day"}-${log.activityId || log.kind || "action"}`,
      residentId,
      resident,
      displayName: rules.residentName(resident, residentId),
      slot: log.slot || "一天里",
      zoneId: log.zoneId || resident.zone || "",
      place: rules.cleanPlace(log.place || log.zone || log.activityTitle, "小路"),
      activityId: log.activityId || resident.recentAction?.activityId || "",
      activityTitle: log.activityTitle || resident.recentAction?.activityTitle || log.place || "今天的事",
      legacyAction: log.legacyAction || "",
      kind: log.kind || resident.recentAction?.kind || "quiet",
      score: Number(log.score || 0)
    };
  }

  function logsFromContext(context, residentMap) {
    const logs = (context.activityLogs || [])
      .map((log) => normalizeLog(log, residentMap))
      .filter(Boolean);
    if (logs.length) return logs;
    return [...residentMap.values()].map((resident) => normalizeLog({
      id: `${resident.id}-recent`,
      residentId: resident.id,
      slot: resident.recentAction?.slot || "一天里",
      zoneId: resident.zone,
      place: resident.recentAction?.place || resident.recentAction?.zone,
      activityId: resident.recentAction?.activityId || "",
      activityTitle: resident.recentAction?.activityTitle || "",
      kind: resident.recentAction?.kind || "quiet"
    }, residentMap)).filter(Boolean);
  }

  function groupKey(log) {
    return `${log.slot}|${log.zoneId || log.place}`;
  }

  function tagFor(log, otherLog, context) {
    const text = `${log.activityId} ${otherLog.activityId} ${log.activityTitle} ${otherLog.activityTitle} ${log.place} ${context.sceneKey || ""}`;
    if (/YF-07|YF-10|OM-02|OM-08|设施|维修|温室|谷仓/.test(text)) return "facility-care";
    if (/CH-|会堂|节日|bridge/.test(text)) return "community-hall";
    if (/AC-|账|会计/.test(text)) return "accounting";
    if (/GG-|采购|合同|招标/.test(text)) return "contract-board";
    if (/TC-|市场|餐馆|寄售/.test(text)) return "market-talk";
    if (/RW-|MF-|湿地|森林/.test(text)) return "field-path";
    return context.sceneKey || "daily-work";
  }

  function addAllianceTag(pair, tag) {
    if (!tag || pair.allianceTags.includes(tag)) return;
    pair.allianceTags.push(tag);
    if (pair.allianceTags.length > 6) pair.allianceTags.shift();
  }

  function chooseType(log, otherLog, pair, context) {
    const seed = rules.stableHash(`${context.day || ""}:${log.id}:${otherLog.id}:${pair.pairId}`);
    const text = `${log.activityId} ${otherLog.activityId} ${log.activityTitle} ${otherLog.activityTitle} ${log.kind} ${otherLog.kind} ${log.place}`;
    if (groupProfiles.sameGroup?.(log.residentId, otherLog.residentId)) {
      return seed % 3 === 0 ? "alliance" : "help";
    }
    const outsideHelp = groupProfiles.evaluateHelp?.(log.residentId, otherLog.residentId, { evidenceTexts: [text] });
    if (outsideHelp?.decision === "deprioritize" && (log.kind === "work" || /修|搬|巡|浇|除草|加工/.test(text))) return "exclusion";
    if (/TC-08|CH-03|抱怨|争议|投诉|排队/.test(text)) return "exclusion";
    if ((pair.friction >= 14 || pair.exclusion >= 10) && /CH-|AC-|TC-|会堂|账|餐馆|市场/.test(text)) return "mediation";
    if (/CH-01|CH-05|CH-09|AC-10|GG-03|SR-06|公告|会堂|计划|报价/.test(text)) return "alliance";
    if (/TC-05|CH-08|YF-09|RW-01|RW-09|餐馆|市场|寄售|采收|鱼/.test(text)) return "gift";
    if (log.kind === "work" || otherLog.kind === "work" || /YF-|OM-|SR-|修|搬|巡|浇|除草|加工/.test(text)) return "help";
    if (log.kind === "talk" && otherLog.kind === "talk") return seed % 3 === 0 ? "gift" : "alliance";
    return seed % 4 === 0 ? "gift" : "help";
  }

  function giftItemFor(log) {
    const text = `${log.activityId} ${log.activityTitle} ${log.place}`;
    if (/RW|湿地|鱼/.test(text)) return "一小包河边带回来的东西";
    if (/YF|农场|采收|谷仓/.test(text)) return "一份刚整理好的农场小物";
    if (/TC|市场|餐馆/.test(text)) return "一份顺手买下的小点心";
    if (/CH|会堂|节日/.test(text)) return "一张会堂桌边留下的纸签";
    return "一件今天用得上的小东西";
  }

  function allianceDetail(tag) {
    const details = {
      "facility-care": "把要修的地方、谁去找工具先记清楚",
      "community-hall": "把会后要继续说的顺序先写下来",
      accounting: "把账页、收据和要核对的数放到一起",
      "contract-board": "把交付确认、问价和谁去回话写成一张短单",
      "market-talk": "把问到的价格和要带回去的话记在一页",
      "field-path": "把路上看到的问题和回头要处理的事记下来"
    };
    return details[tag] || "把明天先做哪件事写在同一页";
  }

  function interactionSummary(type, actor, target, log, otherLog, tag) {
    const actorName = rules.residentName(actor, log.residentId);
    const targetName = rules.residentName(target, otherLog.residentId);
    const place = rules.cleanPlace(log.place || otherLog.place, "小路");
    const activity = log.activityTitle || otherLog.activityTitle || "今天的事";
    if (type === "help") return `${actorName}在${place}接过${targetName}手边一段活，${activity}没有断下来。`;
    if (type === "gift") return `${actorName}在${place}把${giftItemFor(log)}递给${targetName}，这件小事被记了下来。`;
    if (type === "alliance") return `${actorName}和${targetName}在${place}${allianceDetail(tag)}，这件事暂时有人一起盯着。`;
    if (type === "exclusion") return `${actorName}在${place}把${targetName}的想法搁到后面，旁边的人先照着另一套说法走。`;
    return `${actorName}在${place}替${targetName}把刚才那句话梳理了一遍，事情暂时回到桌面上。`;
  }

  function makeInteraction({ state, ledger, context, log, otherLog }) {
    if (!log || !otherLog || log.residentId === otherLog.residentId) return null;
    const pair = rules.ensurePair(ledger, log.residentId, otherLog.residentId);
    pair.residentLabels[log.residentId] = log.displayName;
    pair.residentLabels[otherLog.residentId] = otherLog.displayName;
    const type = chooseType(log, otherLog, pair, context);
    const effect = typeEffects[type] || typeEffects.help;
    const tag = tagFor(log, otherLog, context);
    const memory = {
      id: `rel-${state.day || context.day || 1}-${ledger.recentInteractions.length + 1}`,
      day: Number(state.day || context.day || 1),
      slot: log.slot || otherLog.slot || "一天里",
      type,
      label: typeLabels[type] || type,
      residentIds: [log.residentId, otherLog.residentId],
      actorId: log.residentId,
      targetId: otherLog.residentId,
      place: rules.cleanPlace(log.place || otherLog.place, "小路"),
      zoneId: log.zoneId || otherLog.zoneId || "",
      activityId: log.activityId || otherLog.activityId || "",
      activityTitle: log.activityTitle || otherLog.activityTitle || "",
      allianceTag: type === "alliance" ? tag : "",
      summary: interactionSummary(type, log.resident, otherLog.resident, log, otherLog, tag),
      sourceLogIds: [log.id, otherLog.id].filter(Boolean),
      effects: {
        familiarity: effect.familiarity,
        trust: effect.trust,
        friction: effect.friction,
        favorDebt: effect.favorDebt,
        exclusion: effect.exclusion
      }
    };

    pair.familiarity = rules.clamp(pair.familiarity + effect.familiarity, 0, 100);
    pair.trust = rules.clamp(pair.trust + effect.trust, 0, 100);
    pair.friction = rules.clamp(pair.friction + effect.friction, 0, 100);
    pair.exclusion = rules.clamp(pair.exclusion + effect.exclusion, 0, 100);
    if (effect.favorDebt > 0) {
      pair.favorDebt[otherLog.residentId] = rules.clamp((pair.favorDebt[otherLog.residentId] || 0) + effect.favorDebt, 0, 40);
    }
    if (type === "mediation") {
      pair.favorDebt[log.residentId] = rules.clamp((pair.favorDebt[log.residentId] || 0) - 1, 0, 40);
      pair.favorDebt[otherLog.residentId] = rules.clamp((pair.favorDebt[otherLog.residentId] || 0) - 1, 0, 40);
    }
    if (type === "alliance") addAllianceTag(pair, tag);

    pair.lastInteraction = memory;
    pair.recentMemories.push(memory);
    if (pair.recentMemories.length > rules.maxPairMemories) pair.recentMemories.shift();
    ledger.recentInteractions.push(memory);
    if (ledger.recentInteractions.length > rules.maxRecentInteractions) ledger.recentInteractions.shift();
    return memory;
  }

  function candidatePairs(logs, context, residentMap) {
    const candidates = [];
    const seen = new Set();
    const groups = new Map();
    logs.forEach((log) => {
      const key = groupKey(log);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(log);
    });

    groups.forEach((items) => {
      const sorted = [...items].sort((a, b) => b.score - a.score || a.residentId.localeCompare(b.residentId));
      const grouped = sorted.filter((item) => groupProfiles.profileFor?.(item.residentId));
      const centers = grouped.filter((item) => groupProfiles.roleFor?.(item.residentId) === "center");
      centers.forEach((center) => {
        grouped.filter((item) => item.residentId !== center.residentId).forEach((member) => {
          if (!groupProfiles.sameGroup?.(center.residentId, member.residentId)) return;
          const key = `${center.slot}|${rules.pairKey(center.residentId, member.residentId)}`;
          if (seen.has(key)) return;
          seen.add(key);
          candidates.push([center, member]);
        });
      });
      for (let i = 0; i < sorted.length - 1; i += 1) {
        const a = sorted[i];
        const b = sorted[i + 1];
        const key = `${a.slot}|${rules.pairKey(a.residentId, b.residentId)}`;
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push([a, b]);
        }
      }
    });

    if (candidates.length >= 3) return candidates;

    const byZone = new Map();
    residentMap.forEach((resident) => {
      const zoneId = resident.zone || "townCenter";
      if (!byZone.has(zoneId)) byZone.set(zoneId, []);
      byZone.get(zoneId).push(resident);
    });
    byZone.forEach((residents, zoneId) => {
      const sorted = [...residents].sort((a, b) => a.id.localeCompare(b.id));
      for (let i = 0; i < sorted.length - 1; i += 2) {
        const a = sorted[i];
        const b = sorted[i + 1];
        const key = `fallback|${rules.pairKey(a.id, b.id)}`;
        if (!a || !b || seen.has(key)) continue;
        seen.add(key);
        candidates.push([
          normalizeLog({ residentId: a.id, slot: "一天里", zoneId, place: a.recentAction?.zone, kind: a.recentAction?.kind, activityId: a.recentAction?.activityId, activityTitle: a.recentAction?.activityTitle }, residentMap),
          normalizeLog({ residentId: b.id, slot: "一天里", zoneId, place: b.recentAction?.zone, kind: b.recentAction?.kind, activityId: b.recentAction?.activityId, activityTitle: b.recentAction?.activityTitle }, residentMap)
        ]);
      }
    });
    return candidates.filter((pair) => pair[0] && pair[1]);
  }

  T.townRelationshipInteractions = {
    version,
    residentsById,
    normalizeLog,
    logsFromContext,
    candidatePairs,
    makeInteraction
  };
}());
