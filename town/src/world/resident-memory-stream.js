(function () {
  const T = window.MorningTown;

  const version = "resident-memory-stream-v0.1.0-local-public";
  const maxNodes = 120;
  const keywordRules = [
    ["contract", /合同|采购|报价|交割|招标|高金/],
    ["accounting", /账|收据|现金|应收|应付|透明|审计/],
    ["facility", /温室|谷仓|设施|工具|维修|升级|桥|木头|钉子/],
    ["field", /田|作物|采收|浇水|播种|湿地|森林|矿/],
    ["weather", /雨|雪|风|暴|热浪|干旱|天气|防洪/],
    ["gift", /送礼|递给|礼物|小东西|点心|鱼|纸签/],
    ["affection", /致谢|表彰|亲近|好感|晚宴|餐桌|碰头/],
    ["conflict", /抱怨|争议|投诉|排挤|摩擦|不服|紧绷/],
    ["help", /帮|接过|救援|调解|梳理|一起|合作/]
  ];

  function clamp(value, min, max) {
    return T.clamp ? T.clamp(value, min, max) : Math.max(min, Math.min(max, value));
  }

  function cleanText(value, limit = 220) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
  }

  function unique(values) {
    const seen = new Set();
    return values.filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  function keywordsFor(text, extras = []) {
    const value = String(text || "");
    const words = keywordRules
      .filter(([, pattern]) => pattern.test(value))
      .map(([key]) => key);
    return unique([...extras, ...words]).slice(0, 8);
  }

  function visibleResidentIds(ids) {
    return unique((ids || [])
      .map((id) => cleanText(id, 12))
      .filter((id) => /^v\d{2}$/.test(id)));
  }

  function factualLogText(log) {
    const localText = cleanText(log?.localText, 220);
    if (localText) return localText;
    if (log?.polished) return "";
    return cleanText(log?.text, 220);
  }

  function logMemory(log) {
    const text = factualLogText(log);
    if (!log?.id || !text) return null;
    const residentIds = visibleResidentIds([log.residentId]);
    const type = log.kind === "talk" ? "chat" : "event";
    const salience = clamp(
      1
      + (log.kind === "talk" ? 1 : 0)
      + (log.modelControl ? 1 : 0)
      + (Number(log.score || 0) >= 8 ? 1 : 0),
      1,
      5
    );
    return {
      id: `mem-${log.id}`,
      residentId: residentIds[0] || "town",
      day: Number(log.day || 0),
      type,
      publicText: text,
      sourceLogIds: [log.id],
      residentIds,
      zoneId: cleanText(log.zoneId || "", 40),
      keywords: keywordsFor(`${log.activityId || ""} ${log.activityTitle || ""} ${log.place || ""} ${text}`, [log.kind || "event"]),
      salience,
      expiresAfterDay: Number(log.day || 0) + 30
    };
  }

  function relationshipMemory(item) {
    const summary = cleanText(item?.summary, 220);
    if (!item?.id || !summary) return null;
    const residentIds = visibleResidentIds(item.residentIds);
    if (!residentIds.length) return null;
    return {
      id: `mem-${item.id}`,
      residentId: residentIds[0],
      day: Number(item.day || 0),
      type: item.type === "gift" ? "chat" : "event",
      publicText: summary,
      sourceLogIds: visibleResidentIds([]).concat(item.sourceLogIds || []).map((id) => cleanText(id, 40)).filter(Boolean).slice(0, 4),
      residentIds,
      zoneId: cleanText(item.zoneId || "", 40),
      keywords: keywordsFor(`${item.type || ""} ${item.label || ""} ${summary}`, [item.type || "relationship"]),
      salience: item.type === "gift" || item.type === "alliance" || item.type === "exclusion" ? 5 : 4,
      expiresAfterDay: Number(item.day || 0) + 42
    };
  }

  function weeklyMemory(week) {
    if (!week?.weekId) return null;
    const oneLine = cleanText(week.localReport?.oneLine || week.localReport?.title || week.rangeLabel || "", 220);
    if (!oneLine) return null;
    return {
      id: `mem-${week.weekId}`,
      residentId: "town",
      day: Number(week.endDay || 0),
      type: "event",
      publicText: oneLine,
      sourceLogIds: (week.keyLogRefs || []).slice(0, 4).map((log) => cleanText(log.id, 40)).filter(Boolean),
      residentIds: visibleResidentIds((week.keyLogRefs || []).map((log) => log.residentId)),
      zoneId: "",
      keywords: keywordsFor(oneLine, ["weekly"]),
      salience: 4,
      expiresAfterDay: Number(week.endDay || 0) + 60
    };
  }

  function riskMemories(snapshot) {
    const notes = snapshot?.risks?.notes || snapshot?.riskNotes || [];
    return notes.slice(0, 4).map((note, index) => {
      const text = cleanText(typeof note === "string" ? note : note?.summary || note?.note, 220);
      if (!text) return null;
      const day = Number(snapshot?.day || 0);
      return {
        id: `mem-risk-d${day}-${index + 1}`,
        residentId: "town",
        day,
        type: "event",
        publicText: text,
        sourceLogIds: [],
        residentIds: [],
        zoneId: "",
        keywords: keywordsFor(text, ["risk"]),
        salience: 4,
        expiresAfterDay: day + 21
      };
    }).filter(Boolean);
  }

  function dedupe(nodes) {
    const seen = new Set();
    return nodes.filter((node) => {
      if (!node?.id || seen.has(node.id) || !node.publicText) return false;
      seen.add(node.id);
      return true;
    });
  }

  function build(engine, options = {}) {
    const state = engine?.state || {};
    const currentDay = Number(state.day || 1);
    const snapshot = engine?.publicTownSnapshot?.() || null;
    const relationshipSnapshot = snapshot?.relationships || null;
    const recentLogs = [
      ...(state.allLogs || []),
      ...(state.displayLogs || [])
    ].filter((log) => Number(log.day || 0) >= currentDay - 10);

    const nodes = dedupe([
      ...recentLogs.map(logMemory),
      ...(relationshipSnapshot?.recentInteractions || []).map(relationshipMemory),
      ...(state.weeklyTimeline || []).slice(-4).map(weeklyMemory),
      ...riskMemories(snapshot)
    ].filter(Boolean))
      .filter((node) => !node.expiresAfterDay || node.expiresAfterDay >= currentDay)
      .sort((a, b) => (
        (b.day - a.day)
        || (b.salience - a.salience)
        || a.id.localeCompare(b.id)
      ))
      .slice(0, Number(options.limit || maxNodes));

    return {
      version,
      day: currentDay,
      mode: "local-public-memory-stream",
      nodes
    };
  }

  function memoryIndex(stream) {
    return new Map((stream?.nodes || []).map((node) => [node.id, node]));
  }

  function isVisibleToResident(node, residentId, zoneId = "") {
    if (!node) return false;
    if (node.residentId === "town" || !node.residentIds?.length) return true;
    if (node.residentIds.includes(residentId)) return true;
    return Boolean(zoneId && node.zoneId && node.zoneId === zoneId);
  }

  function retrieve(stream, resident, context = {}) {
    const currentDay = Number(context.day || stream?.day || 1);
    const pressureKeywords = new Set(context.pressureKeywords || []);
    return (stream?.nodes || [])
      .filter((node) => isVisibleToResident(node, resident.id, resident.zone))
      .map((node) => {
        let score = Number(node.salience || 1) * 2;
        if (node.residentIds?.includes(resident.id)) score += 8;
        if (node.zoneId && node.zoneId === resident.zone) score += 4;
        score += Math.max(0, 8 - Math.abs(currentDay - Number(node.day || currentDay)));
        (node.keywords || []).forEach((keyword) => {
          if (pressureKeywords.has(keyword)) score += 3;
        });
        return { node, score };
      })
      .sort((a, b) => b.score - a.score || b.node.day - a.node.day)
      .slice(0, Number(context.limit || 5))
      .map((item) => item.node);
  }

  T.residentMemoryStream = {
    version,
    build,
    memoryIndex,
    retrieve,
    isVisibleToResident,
    keywordsFor
  };
}());
