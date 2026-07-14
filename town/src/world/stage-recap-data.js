(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const topicRules = Object.freeze([
    Object.freeze({ id: "work", label: "修理与劳动", pattern: /修|工具|设备|桥|木料|搬|维护/ }),
    Object.freeze({ id: "farm", label: "田地与天气", pattern: /田|农场|庄稼|种|收割|浇|雨|风|天气/ }),
    Object.freeze({ id: "trade", label: "交易与账务", pattern: /账|钱|合同|货|卖|买|价格|采购|交付/ }),
    Object.freeze({ id: "community", label: "协作与安排", pattern: /帮|一起|安排|会堂|公告|名单|商量|照应/ }),
    Object.freeze({ id: "friction", label: "分歧与调解", pattern: /争议|排挤|拒绝|摩擦|调解|不理|搁到后面/ })
  ]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function cleanText(value, limit = 180) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
  }

  function cleanEvidenceId(value) {
    const id = String(value || "").trim();
    return /^(?:log|relationship)-[a-z0-9-]+$/i.test(id) ? id : "";
  }

  function cleanConversation(conversation, day) {
    const residentIds = [...new Set((conversation?.residentIds || []).filter((id) => /^v\d{2}$/.test(String(id))))].slice(0, 4);
    const evidenceLogIds = [...new Set((conversation?.evidenceLogIds || []).map(cleanEvidenceId).filter(Boolean))].slice(0, 4);
    const lines = (conversation?.lines || []).map((line) => ({
      speakerId: String(line?.speakerId || ""),
      text: cleanText(line?.text, 180)
    })).filter((line) => residentIds.includes(line.speakerId) && line.text).slice(0, 4);
    if (residentIds.length < 2 || evidenceLogIds.length < 1 || lines.length < 2) return null;
    const id = cleanText(conversation?.id, 80) || `model-conversation-d${day}-${evidenceLogIds[0]}`;
    return deepFreeze({
      id,
      day,
      title: cleanText(conversation?.title, 80) || "镇上对话",
      place: cleanText(conversation?.place, 60) || "镇上",
      residentIds,
      evidenceLogIds,
      lines,
      source: "accepted-model-conversation",
      immutableState: true
    });
  }

  function archiveModelConversations(state, conversations, day) {
    if (!state || !Array.isArray(conversations)) return Object.freeze([]);
    state.modelConversationArchive = Array.isArray(state.modelConversationArchive) ? state.modelConversationArchive : [];
    const completedDay = Math.max(1, Number(day) || Number(state.day) - 1 || 1);
    const keys = new Set(state.modelConversationArchive.map((item) => `${item.day}:${item.id}`));
    const accepted = [];
    conversations.forEach((conversation) => {
      const record = cleanConversation(conversation, completedDay);
      const key = record ? `${record.day}:${record.id}` : "";
      if (!record || keys.has(key)) return;
      keys.add(key);
      state.modelConversationArchive.push(record);
      accepted.push(record);
    });
    if (state.modelConversationArchive.length > 420) {
      state.modelConversationArchive.splice(0, state.modelConversationArchive.length - 420);
    }
    return Object.freeze(accepted);
  }

  function rankedCounts(items, labelFor, limit = 3) {
    const counts = new Map();
    items.forEach((item) => {
      const label = labelFor(item);
      if (!label) return;
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-CN"))
      .slice(0, limit);
  }

  function topicCounts(records) {
    const hits = [];
    records.forEach((record) => {
      const text = `${record.title} ${record.lines.map((line) => line.text).join(" ")}`;
      const matched = topicRules.filter((rule) => rule.pattern.test(text));
      (matched.length ? matched : [{ label: "日常碰面" }]).forEach((rule) => hits.push(rule.label));
    });
    return rankedCounts(hits, (label) => label, 4);
  }

  function representativeConversations(records) {
    const selected = [];
    const usedPairs = new Set();
    const ranked = [...records]
      .sort((a, b) => b.evidenceLogIds.length - a.evidenceLogIds.length || a.day - b.day);
    function select(record) {
      selected.push({
        id: record.id,
        day: record.day,
        title: record.title,
        place: record.place,
        residentIds: [...record.residentIds],
        evidenceLogIds: [...record.evidenceLogIds],
        lines: record.lines.map((line) => ({ ...line }))
      });
    }
    ranked.forEach((record) => {
        const pair = [...record.residentIds].sort().join(":");
        if (selected.length >= 3 || usedPairs.has(pair)) return;
        usedPairs.add(pair);
        select(record);
      });
    ranked.forEach((record) => {
      if (selected.length >= 3 || selected.some((item) => item.id === record.id && item.day === record.day)) return;
      select(record);
    });
    return selected;
  }

  function buildConversationRecap(state, evaluation) {
    const archive = Array.isArray(state?.modelConversationArchive) ? state.modelConversationArchive : [];
    const records = archive.filter((item) => item.day >= evaluation.startDay && item.day <= evaluation.endDay);
    const residentIds = new Set(records.flatMap((item) => item.residentIds));
    const pairs = new Set(records.map((item) => [...item.residentIds].sort().join(":")));
    return deepFreeze({
      id: `stage-conversation-recap-d${evaluation.endDay}`,
      evaluationId: evaluation.id,
      startDay: evaluation.startDay,
      endDay: evaluation.endDay,
      conversationCount: records.length,
      residentCount: residentIds.size,
      pairCount: pairs.size,
      topPlaces: rankedCounts(records, (item) => item.place, 3),
      topics: topicCounts(records),
      representatives: representativeConversations(records),
      sourceConversationIds: records.map((item) => item.id),
      source: "accepted-model-conversation-archive",
      immutableState: true,
      relationshipInference: false
    });
  }

  function ensureConversationRecap(state, evaluation) {
    if (!state || !evaluation) return null;
    state.stageConversationRecaps = Array.isArray(state.stageConversationRecaps) ? state.stageConversationRecaps : [];
    const existing = state.stageConversationRecaps.find((item) => item.evaluationId === evaluation.id);
    if (existing) return existing;
    const recap = buildConversationRecap(state, evaluation);
    state.stageConversationRecaps.push(recap);
    state.modelConversationArchive = (state.modelConversationArchive || []).filter((item) => item.day > evaluation.endDay);
    return recap;
  }

  function conversationRecapFor(state, evaluationId) {
    return (state?.stageConversationRecaps || []).find((item) => item.evaluationId === evaluationId) || null;
  }

  T.stageRecapData = {
    version: "stage-recap-data-v0.1.8-e-local",
    archiveModelConversations,
    buildConversationRecap,
    ensureConversationRecap,
    conversationRecapFor
  };
}());
