function createModelOutputGuards({ cleanString, cleanText, cleanList, forbiddenWords }) {
  function safeVisibleText(text, limit = 520) {
    const value = cleanText(text, limit);
    if (!value) return "";
    if (forbiddenWords.some((word) => value.includes(word))) return "";
    if (/[<>]/.test(value)) return "";
    return value;
  }

  function knownResidentMap(payload) {
    return new Map((payload.residents || []).map((resident) => [resident.id, resident]));
  }

  function resolveResidentId(value, residents) {
    const raw = cleanString(value, 40);
    if (!raw) return "";
    if (residents.has(raw)) return raw;
    const lower = raw.toLowerCase();
    for (const resident of residents.values()) {
      if (resident.name.toLowerCase() === lower) return resident.id;
    }
    return "";
  }

  function shadowHasContent(shadow) {
    return Boolean(
      shadow?.conversations?.length
      || shadow?.weeklyReport?.sections?.length
      || shadow?.riskNotes?.length
    );
  }

  function logResidentIds(log) {
    return [
      cleanString(log?.residentId, 40),
      cleanString(log?.actorId, 40),
      cleanString(log?.targetResidentId, 40),
      ...cleanList(log?.residentIds, 4, 40)
    ].filter(Boolean);
  }

  function buildEvidenceResidents(logs) {
    return new Map((logs || []).map((log) => [
      cleanString(log?.id, 40),
      new Set(logResidentIds(log))
    ]).filter(([id]) => id));
  }

  function normalizeModelOutput(raw, payload) {
    const result = raw && typeof raw === "object" ? raw : {};
    const payloadLogs = Array.isArray(payload.logs) ? payload.logs : [];
    const logIds = new Set(payloadLogs.map((log) => log.id));
    const sectionIndexes = new Set((payload.report?.sections || []).map((section) => section.index));
    const residents = knownResidentMap(payload);
    const accepted = { logs: 0, reportSections: 0, conversations: 0, weeklySections: 0, riskNotes: 0 };

    const logs = Array.isArray(result.logs) ? result.logs.map((log) => {
      const id = cleanString(log?.id, 40);
      const text = safeVisibleText(log?.text, 280);
      if (!id || !logIds.has(id) || !text) return null;
      accepted.logs += 1;
      return { id, text };
    }).filter(Boolean).slice(0, 36) : [];

    const reportSections = Array.isArray(result.reportSections) ? result.reportSections.map((section) => {
      const index = Number(section?.index);
      if (!Number.isInteger(index) || !sectionIndexes.has(index)) return null;
      const title = safeVisibleText(section?.title, 40);
      const body = safeVisibleText(section?.body, 460);
      const list = Array.isArray(section?.list)
        ? section.list.map((item) => safeVisibleText(item, 220)).filter(Boolean).slice(0, 6)
        : null;
      if (!title && !body && (!list || !list.length)) return null;
      accepted.reportSections += 1;
      return { index, title, body, list };
    }).filter(Boolean) : [];

    const shadow = normalizeShadow(result.shadow || result.modelShadow || result, payload, residents, accepted);
    return {
      logs,
      reportSections,
      shadow,
      audit: {
        mode: "weekly-timeline-shadow-local-immutable",
        accepted,
        immutableState: true
      }
    };
  }

  function normalizeShadow(source, payload, residents, accepted) {
    const logs = Array.isArray(payload.logs) ? payload.logs : [];
    const logIds = new Set(logs.map((log) => log.id));
    const evidenceResidents = buildEvidenceResidents(logs);
    const conversations = Array.isArray(source.conversations) ? source.conversations.map((item, index) => {
      const residentIds = [
        ...cleanList(item?.residentIds, 3, 40),
        ...cleanList(item?.residents, 3, 40)
      ].map((id) => resolveResidentId(id, residents)).filter(Boolean).slice(0, 3);
      const conversationResidents = new Set(residentIds);
      const evidenceLogIds = cleanList(item?.evidenceLogIds, 4, 40).filter((id) => {
        if (!logIds.has(id)) return false;
        const logResidents = evidenceResidents.get(id);
        return Boolean(logResidents && residentIds.some((residentId) => logResidents.has(residentId)));
      });
      const lines = Array.isArray(item?.lines) ? item.lines.map((line) => {
        const speakerId = resolveResidentId(line?.speakerId || line?.speakerName || line?.speaker, residents);
        if (!speakerId || !conversationResidents.has(speakerId)) return null;
        const text = safeVisibleText(line?.text, 110);
        if (!text) return null;
        return {
          speakerId,
          speakerName: residents.get(speakerId).name,
          text
        };
      }).filter(Boolean).slice(0, 5) : [];
      const title = safeVisibleText(item?.title, 36) || `镇上对话 ${index + 1}`;
      const place = safeVisibleText(item?.place, 30) || "镇上";
      const note = safeVisibleText(item?.note, 160);
      if (residentIds.length < 2 || lines.length < 2 || !evidenceLogIds.length) return null;
      accepted.conversations += 1;
      return {
        id: cleanString(item?.id, 40) || `shadow-conv-${index + 1}`,
        title,
        place,
        residentIds,
        evidenceLogIds,
        lines,
        note
      };
    }).filter(Boolean).slice(0, 4) : [];

    const weeklySource = source.weeklyReport && typeof source.weeklyReport === "object" ? source.weeklyReport : {};
    const weeklySections = Array.isArray(weeklySource.sections) ? weeklySource.sections.map((section) => {
      const title = safeVisibleText(section?.title, 36);
      const body = safeVisibleText(section?.body, 360);
      if (!title || !body) return null;
      accepted.weeklySections += 1;
      return { title, body };
    }).filter(Boolean).slice(0, 4) : [];

    const allowedRiskTypes = new Set(["fatigue", "conflict", "weather", "contract", "facility", "accounting", "none"]);
    const riskNotes = Array.isArray(source.riskNotes) ? source.riskNotes.map((item) => {
      const type = cleanString(item?.type, 20);
      const summary = safeVisibleText(item?.summary, 180);
      if (!allowedRiskTypes.has(type) || !summary) return null;
      accepted.riskNotes += 1;
      return {
        type,
        residentIds: cleanList(item?.residentIds, 3, 40).map((id) => resolveResidentId(id, residents)).filter(Boolean),
        summary
      };
    }).filter(Boolean).slice(0, 5) : [];

    return {
      conversations,
      weeklyReport: {
        weekId: cleanString(weeklySource.weekId, 40) === payload.weekly.weekId ? cleanString(weeklySource.weekId, 40) : payload.weekly.weekId,
        immutableState: payload.weekly.immutableState === true,
        title: safeVisibleText(weeklySource.title, 42) || `${payload.weekly.range || "最近几天"}互动周报`,
        range: safeVisibleText(weeklySource.range, 40) || payload.weekly.range || "",
        sections: weeklySections,
        hooks: cleanList(weeklySource.hooks, 5, 140).map((hook) => safeVisibleText(hook, 140)).filter(Boolean)
      },
      riskNotes
    };
  }

  return {
    safeVisibleText,
    knownResidentMap,
    normalizeModelOutput,
    normalizeShadow,
    shadowHasContent
  };
}

module.exports = {
  createModelOutputGuards
};
