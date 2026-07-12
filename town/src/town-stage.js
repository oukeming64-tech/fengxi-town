(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const stageData = T.townStageData;
  if (!stageData) throw new Error("town-stage-data.js must load before town-stage.js");
  const stageRoutes = T.townStageRoutes;
  if (!stageRoutes) throw new Error("town-stage-routes.js must load before town-stage.js");

  const hotspots = stageData.mapHotspots || [];
  const animationAssets = stageData.actionAnimations || {};
  const byId = new Map(hotspots.map((hotspot) => [hotspot.id, hotspot]));
  const byZone = new Map();
  const byActivity = new Map();

  hotspots.forEach((hotspot) => {
    if (!byZone.has(hotspot.zoneId)) byZone.set(hotspot.zoneId, []);
    byZone.get(hotspot.zoneId).push(hotspot);
    (hotspot.activityIds || []).forEach((activityId) => byActivity.set(activityId, hotspot));
  });

  function idNumber(value) {
    return Number(String(value || "").replace(/\D/g, "")) || 1;
  }

  function activityFor(id) {
    return T.activityRules?.getActivity?.(id) || null;
  }

  function animationForKey(key) {
    const id = key || "idle";
    return animationAssets[id] || animationAssets.idle || { label: "停留", cueClass: "cue-idle", tone: "quiet" };
  }

  function homeHotspots() {
    return hotspots.filter((hotspot) => hotspot.kind === "home");
  }

  function homeHotspotFor(villager) {
    const homes = homeHotspots();
    return homes[(idNumber(villager?.id) - 1) % homes.length] || byId.get("home-west") || hotspots[0];
  }

  function matchesText(activity, pattern) {
    return pattern.test(`${activity?.title || ""} ${(activity?.tags || []).join(" ")} ${activity?.category || ""}`);
  }

  function scoreHotspot(hotspot, activity) {
    if (!hotspot || !activity) return 0;
    let score = hotspot.zoneId === activity.zoneId ? 20 : 0;
    if ((hotspot.activityIds || []).includes(activity.id)) score += 100;
    if (activity.legacyAction === "home" && hotspot.kind === "home") score += 80;
    if (matchesText(activity, /采购|报价|合同|谈判|赊购|租赁|行情/) && ["buy", "sell"].includes(hotspot.kind)) score += 14;
    if (matchesText(activity, /售卖|摆摊|交割|验收|寄售/) && hotspot.kind === "sell") score += 18;
    if (matchesText(activity, /播种|浇水|巡田|采收|灌溉|湿地|钓鱼|取水/) && hotspot.kind === "farm") score += 16;
    if (matchesText(activity, /修|维护|加固|抢险|抢通|设备|矿|车/) && hotspot.kind === "repair") score += 16;
    if (matchesText(activity, /公告|公示|查账|审计|预算|复核|会议|投票|周会/) && hotspot.kind === "notice") score += 16;
    if (matchesText(activity, /餐馆|碰头|偶遇|送礼|谈话|调解|闲聊|独处/) && hotspot.kind === "social") score += 14;
    if (hotspot.kind === activity.kind) score += 4;
    return score;
  }

  function hotspotForActivity(activityOrId, villager) {
    const activity = typeof activityOrId === "string" ? activityFor(activityOrId) : activityOrId;
    if (!activity) return homeHotspotFor(villager);
    if (activity.legacyAction === "home" || activity.id === "REST-01") return homeHotspotFor(villager);
    if (byActivity.has(activity.id)) return byActivity.get(activity.id);
    const candidates = byZone.get(activity.zoneId) || hotspots;
    return [...candidates].sort((a, b) => scoreHotspot(b, activity) - scoreHotspot(a, activity))[0] || hotspots[0];
  }

  function offsetPoint(point, seed, index, total, radius = 4) {
    if (!point) return { x: 50, y: 50 };
    if (total <= 1) return { x: point.x, y: point.y };
    const angle = ((index / total) * Math.PI * 2) + (seed % 17) * 0.11;
    const ring = Math.min(radius, 1.7 + Math.floor(index / 6) * 1.6);
    return {
      x: T.clamp(Math.round((point.x + Math.cos(angle) * ring) * 100) / 100, 3, 97),
      y: T.clamp(Math.round((point.y + Math.sin(angle) * ring) * 100) / 100, 3, 97)
    };
  }

  function eventFor(villager, log, slot, stageIndex) {
    const activity = activityFor(log?.activityId) || activityFor(villager?.todayPlan?.slots?.[stageIndex]?.activityId) || T.activityRules?.fallbackActivity;
    const hotspot = hotspotForActivity(activity, villager);
    const animation = animationForKey(hotspot?.animationKey || "idle");
    return {
      residentId: villager.id,
      residentName: villager.name,
      slot,
      activityId: activity?.id || log?.activityId || "REST-01",
      activityTitle: activity?.shortTitle || activity?.title || log?.activityTitle || "回小屋休息",
      zoneId: hotspot?.zoneId || activity?.zoneId || villager.zone || "townCenter",
      hotspotId: hotspot?.id || "",
      hotspotLabel: hotspot?.label || "",
      animationKey: hotspot?.animationKey || "idle",
      animationLabel: animation.label,
      animationCueClass: animation.cueClass,
      animationTone: animation.tone,
      animationSprite: animation.sprite || null,
      kind: log?.kind || activity?.kind || "quiet",
      text: log?.text || villager?.recentAction?.text || "",
      evidenceLogId: log?.id || ""
    };
  }

  function assignEventPoints(events) {
    const groups = new Map();
    events.forEach((event) => {
      const key = event.hotspotId || event.zoneId || "town";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    });
    groups.forEach((group) => {
      group.forEach((event, index) => {
        const hotspot = byId.get(event.hotspotId) || hotspots[0];
        const point = offsetPoint(hotspot, idNumber(event.residentId), index, group.length, hotspot?.radius || 4);
        event.x = point.x;
        event.y = point.y;
      });
    });
    return events;
  }

  function evidenceLine(event) {
    const title = event.activityTitle || "这件事";
    if (/查账|审计|预算|复核|合同/.test(title)) return "这张纸先放桌上。";
    if (/浇水|播种|巡田|采收|灌溉/.test(title)) return "这块地先看稳。";
    if (/修|维护|抢险|加固|车/.test(title)) return "工具还要再递一下。";
    if (/采购|报价|交割|售卖|摆摊/.test(title)) return "这个数先记清楚。";
    if (/餐馆|碰头|谈话|偶遇|送礼/.test(title)) return "你也在这边。";
    return "我把这件事处理完。";
  }

  function makeEncounters(events, slot) {
    const byHotspot = new Map();
    events.forEach((event) => {
      if (!event.hotspotId || event.hotspotId.startsWith("home-")) return;
      if (!byHotspot.has(event.hotspotId)) byHotspot.set(event.hotspotId, []);
      byHotspot.get(event.hotspotId).push(event);
    });
    const encounters = [];
    byHotspot.forEach((group, hotspotId) => {
      if (group.length < 2) return;
      const ordered = [...group].sort((a, b) => a.residentId.localeCompare(b.residentId));
      const first = ordered[0];
      const second = ordered[1];
      const hotspot = byId.get(hotspotId);
      encounters.push({
        id: `encounter-${slot}-${hotspotId}-${first.residentId}-${second.residentId}`,
        slot,
        hotspotId,
        hotspotLabel: hotspot?.label || first.hotspotLabel,
        x: Math.round(((first.x + second.x) / 2) * 100) / 100,
        y: Math.round(((first.y + second.y) / 2) * 100) / 100,
        residentIds: [first.residentId, second.residentId],
        lines: [
          { speakerId: first.residentId, speakerName: first.residentName, text: evidenceLine(first) },
          { speakerId: second.residentId, speakerName: second.residentName, text: evidenceLine(second) }
        ],
        evidenceLogIds: [first.evidenceLogId, second.evidenceLogId].filter(Boolean)
      });
    });
    return encounters.slice(0, 4);
  }

  function buildStage(state, slot, stageIndex, logs) {
    const logsByResident = new Map(logs.filter((log) => log.slot === slot && log.residentId).map((log) => [log.residentId, log]));
    const events = assignEventPoints((state.villagers || []).map((villager) => {
      return eventFor(villager, logsByResident.get(villager.id), slot, stageIndex);
    }));
    return {
      key: `slot-${stageIndex + 1}`,
      label: slot,
      kind: "action",
      durationSeconds: stageIndex === 2 ? 12 : 9,
      events,
      encounters: makeEncounters(events, slot)
    };
  }

  function buildHomeStage(state) {
    const events = assignEventPoints((state.villagers || []).map((villager) => {
      const hotspot = homeHotspotFor(villager);
      const animation = animationForKey("rest");
      return {
        residentId: villager.id,
        residentName: villager.name,
        slot: "归家",
        activityId: "REST-01",
        activityTitle: "回小屋休息",
        zoneId: hotspot.zoneId,
        hotspotId: hotspot.id,
        hotspotLabel: hotspot.label,
        animationKey: "rest",
        animationLabel: animation.label,
        animationCueClass: animation.cueClass,
        animationTone: animation.tone,
        animationSprite: animation.sprite || null,
        kind: "quiet",
        text: `${villager.name}回到${hotspot.label}门口休息。`,
        evidenceLogId: ""
      };
    }));
    return {
      key: "homecoming",
      label: "归家",
      kind: "home",
      durationSeconds: 8,
      events,
      encounters: []
    };
  }

  function buildPlayback(state, options = {}) {
    const timeSlots = options.timeSlots || T.engineStaticData?.timeSlots || ["清晨", "午后", "夜里"];
    const logs = options.activityLogs || state.dailyActivityLogs || [];
    const day = Number(options.day || state.day || 1);
    const stages = timeSlots.map((slot, index) => buildStage(state, slot, index, logs));
    stages.push(buildHomeStage(state));
    return {
      id: `stage-d${day}-${logs.length}-${state.villagers?.length || 0}`,
      version: "town-stage-v0.1.6-local-routes",
      day,
      source: logs.length ? "audited-action-logs" : "today-plan-preview",
      weatherType: state.currentWeather?.type || state.currentWeather?.key || "cloudy",
      stages
    };
  }

  function currentPlayback(engine) {
    const state = engine?.state || {};
    return state.lastStagePlayback || buildPlayback(state, {
      day: state.day,
      activityLogs: [],
      timeSlots: engine?.timeSlots || T.engineStaticData?.timeSlots
    });
  }

  function stageAt(playback, index) {
    if (!playback?.stages?.length) return null;
    return playback.stages[T.clamp(Number(index) || 0, 0, playback.stages.length - 1)] || playback.stages[0];
  }

  function movementBetween(playback, fromStageIndex, toStageIndex, residentId) {
    if (!playback?.stages?.length || !residentId) return null;
    const fromStage = stageAt(playback, fromStageIndex);
    const toStage = stageAt(playback, toStageIndex);
    const fromEvent = fromStage?.events?.find((event) => event.residentId === residentId);
    const toEvent = toStage?.events?.find((event) => event.residentId === residentId);
    if (!fromEvent || !toEvent) return null;
    const from = { x: Number(fromEvent.x), y: Number(fromEvent.y) };
    const to = { x: Number(toEvent.x), y: Number(toEvent.y) };
    const route = stageRoutes.routeBetween(fromEvent.hotspotId, toEvent.hotspotId, from, to);
    return {
      residentId,
      fromStageIndex: T.clamp(Number(fromStageIndex) || 0, 0, playback.stages.length - 1),
      toStageIndex: T.clamp(Number(toStageIndex) || 0, 0, playback.stages.length - 1),
      from,
      to,
      points: route.points,
      routeNodeIds: route.nodeIds,
      routeSource: route.source,
      animationKey: toEvent.animationKey || "idle",
      durationMs: T.clamp(Math.round((Number(toStage.durationSeconds) || 9) * 170), 1200, 2200),
      source: "local-audited-stage-events"
    };
  }

  function weatherView(weather) {
    const raw = weather?.type || weather?.key || weather?.label || "cloudy";
    const type = T.weatherSystemUtils?.normalizeWeatherType?.(raw) || raw || "cloudy";
    return {
      type,
      label: weather?.label || T.weatherData?.weatherTypes?.[type]?.label || "阴天"
    };
  }

  function activitiesForHotspot(hotspot) {
    return (hotspot?.activityIds || [])
      .map((id) => activityFor(id))
      .filter(Boolean);
  }

  T.townStage = {
    version: "town-stage-v0.1.6-local-routes",
    hotspots,
    animationAssets,
    byId,
    byZone,
    byActivity,
    homeHotspotFor,
    hotspotForActivity,
    animationForKey,
    buildPlayback,
    currentPlayback,
    stageAt,
    movementBetween,
    weatherView,
    activitiesForHotspot
  };
}());
