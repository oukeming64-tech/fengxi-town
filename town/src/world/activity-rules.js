(function () {
  const T = window.MorningTown;

  const activityData = T.activityData;
  if (!activityData) throw new Error("activity-data.js must load before activity-rules.js");

  const source = activityData.source;
  const zoneDefinitions = activityData.zoneDefinitions;
  const legacyPlaces = activityData.legacyPlaces;
  const skillLabels = activityData.skillLabels;
  const activityRows = activityData.activityRows;
  const activityEffects = T.activityEffects;
  const activityCopy = T.activityCopy;
  if (!activityEffects) throw new Error("activity-effects.js must load before activity-rules.js");
  if (!activityCopy) throw new Error("activity-copy.js must load before activity-rules.js");

  function splitList(value) {
    return String(value || "")
      .split(/[、，/；;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseLabor(cost) {
    const range = String(cost || "").match(/(\d+)\s*[—-]\s*(\d+)\s*点/);
    if (range) return Math.max(0, Math.round((Number(range[1]) + Number(range[2])) / 2));
    const single = String(cost || "").match(/(\d+)\s*点/);
    return single ? Number(single[1]) : 1;
  }

  function parseSkills(cost) {
    const skillPart = String(cost || "").split("；")[1] || "";
    const skills = splitList(skillPart).map((label) => skillLabels[label] || label).filter((label) => label !== "none");
    return skills.length ? skills : ["general"];
  }

  function inferLegacyAction(code, title) {
    if (/诊所|休养|独处|降压/.test(title)) return "home";
    if (/餐馆|晚宴|餐桌/.test(title)) return "inn";
    if (/公告|公示|周会|日程会|投票|公听会|调解|表彰|登记|备案/.test(title)) return code === "CH" ? "notice" : "bridge";
    if (/查账|收据|发票|合同审读|成本核算|审计|预算|复核|档案|取证/.test(title)) return "notice";
    return zoneDefinitions[code]?.defaultLegacy || "market";
  }

  function inferKind(activity) {
    if (activity.legacyAction === "home") return "quiet";
    if (activity.laborCost >= 3) return "work";
    if (activity.skills.includes("trade") || activity.skills.includes("social") || activity.skills.includes("accounting")) return "talk";
    if (activity.zoneCode === "MF" || activity.zoneCode === "RW") return "quiet";
    return activity.laborCost >= 2 ? "work" : "quiet";
  }

  function inferCategory(activity) {
    if (activity.legacyAction === "home" || /诊所|休养|独处|散步/.test(activity.title)) return "recovery";
    if (activity.skills.includes("accounting") || activity.zoneCode === "AC") return "accounting";
    if (activity.skills.includes("trade") || activity.zoneCode === "GG" || activity.zoneCode === "SR") return "trade";
    if (activity.zoneCode === "CH" || /会|投票|调解|公告|公示|表彰/.test(activity.title)) return "meeting";
    if (activity.zoneCode === "MF" || activity.zoneCode === "OM" || activity.zoneCode === "RW") return activity.kind === "work" ? "field" : "social";
    if (activity.zoneCode === "YF") return "production";
    if (activity.skills.includes("social")) return "social";
    return "default";
  }

  function makeTags(row) {
    const text = `${row.title} ${row.conditions} ${row.outputs} ${row.risks}`;
    const tags = [];
    [
      ["contract", /合同|订单|交付|报价|高金/],
      ["audit", /账|审计|收据|发票|预算|核算|公示/],
      ["weather", /雨|雪|暴风|霜冻|热浪|干旱|洪水|强风|雾/],
      ["repair", /修|维护|加固|工具|设备|零件/],
      ["social", /碰头|拜访|送礼|调解|晚宴|谈话|偶遇/],
      ["harvest", /采收|包装|交割|丰收|售卖/],
      ["risk", /风险|受伤|事故|塌方|泥陷|封路|救援|抢险/],
      ["quiet", /独处|散步|观察|夜听|档案/]
    ].forEach(([tag, pattern]) => {
      if (pattern.test(text)) tags.push(tag);
    });
    return tags;
  }

  function parseRow(line) {
    const [id, title, conditions, cost, outputs, risks] = line.split("|").map((item) => item.trim());
    const zoneCode = id.slice(0, 2);
    const zone = zoneDefinitions[zoneCode];
    const activity = {
      id,
      zoneCode,
      zoneId: zone.zoneId,
      zoneName: zone.name,
      title,
      shortTitle: title.split(" / ")[0],
      conditions: splitList(conditions),
      cost,
      laborCost: parseLabor(cost),
      skills: parseSkills(cost),
      outputs: splitList(outputs),
      risks: splitList(risks),
      riskLevel: zone.risk,
      legacyAction: inferLegacyAction(zoneCode, title),
      tags: []
    };
    activity.kind = inferKind(activity);
    activity.category = inferCategory(activity);
    activity.tags = makeTags({ title, conditions, outputs, risks });
    activity.baseWeight = Math.max(1, 8 - activity.riskLevel + (activity.laborCost <= 1 ? 2 : 0));
    return activity;
  }

  const sourceActivities = activityRows.trim().split("\n").map(parseRow);
  const fallbackActivity = {
    id: "REST-01",
    zoneCode: "TC",
    zoneId: "townCenter",
    zoneName: "街口",
    title: "回小屋休息 / 整理仓房",
    shortTitle: "回小屋休息",
    conditions: ["疲劳过高", "伤病", "没有合适行动"],
    cost: "0 点；无",
    laborCost: 0,
    skills: ["none"],
    outputs: ["体力恢复", "状态稳定"],
    risks: [],
    riskLevel: 0,
    legacyAction: "home",
    kind: "quiet",
    category: "recovery",
    tags: ["quiet"],
    baseWeight: 1
  };

  const activities = [...sourceActivities, fallbackActivity];
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  const byZone = new Map();
  const byLegacy = new Map();
  activities.forEach((activity) => {
    if (!byZone.has(activity.zoneId)) byZone.set(activity.zoneId, []);
    if (!byLegacy.has(activity.legacyAction)) byLegacy.set(activity.legacyAction, []);
    byZone.get(activity.zoneId).push(activity);
    byLegacy.get(activity.legacyAction).push(activity);
  });

  const seasonalBoosts = activityData.seasonalBoosts;
  const sceneBoosts = activityData.sceneBoosts;
  const safeAlternatives = activityData.safeAlternatives;

  function publicSummary(activity) {
    return {
      id: activity.id,
      title: activity.title,
      zoneId: activity.zoneId,
      zoneName: activity.zoneName,
      laborCost: activity.laborCost,
      riskLevel: activity.riskLevel,
      skills: activity.skills,
      tags: activity.tags
    };
  }

  T.activityRules = {
    version: "activity-rules-v0.2-normalized",
    source,
    zones: zoneDefinitions,
    legacyPlaces,
    activities,
    sourceActivities,
    fallbackActivity,
    seasonalBoosts,
    sceneBoosts,
    safeAlternatives,
    getActivity(id) {
      return byId.get(id) || null;
    },
    activitiesForZone(zoneId) {
      return byZone.get(zoneId) || [];
    },
    activitiesForLegacy(legacyAction) {
      return byLegacy.get(legacyAction) || [];
    },
    effectFor: activityEffects.effectFor,
    formatLine: activityCopy.formatLine,
    publicSummary
  };
}());
