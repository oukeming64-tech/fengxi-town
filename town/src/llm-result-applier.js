(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function create(engine) {
    function applyLogs(logs) {
      if (!Array.isArray(logs)) return;
      const byId = new Map(logs
        .filter((log) => log && typeof log.id === "string" && typeof log.text === "string")
        .map((log) => [log.id, log.text.trim()]));

      [engine.state.displayLogs, engine.state.dailyLogs, engine.state.allLogs].forEach((list) => {
        list.forEach((log) => {
          const text = byId.get(log.id);
          if (text) {
            if (!log.localText) log.localText = log.text;
            log.text = text;
            log.polished = true;
          }
        });
      });
    }

    function applyReport(sections) {
      const report = engine.state.lastReport;
      if (!report || !Array.isArray(sections)) return;

      sections.forEach((section) => {
        const index = Number(section?.index);
        const target = report.sections[index];
        if (!target) return;

        if (typeof section.title === "string" && section.title.trim()) {
          target.title = section.title.trim();
        }

        if (Array.isArray(target.list) && Array.isArray(section.list)) {
          const list = section.list.map((item) => String(item).trim()).filter(Boolean);
          if (list.length) target.list = list;
          return;
        }

        if (typeof section.body === "string" && section.body.trim()) {
          target.body = section.body.trim();
        }
      });
    }

    function residentExists(id) {
      return engine.state.villagers.some((villager) => villager.id === id);
    }

    function validateShadow(shadow) {
      if (!shadow || typeof shadow !== "object") return null;
      const conversations = Array.isArray(shadow.conversations)
        ? shadow.conversations.filter((conversation) => {
          const ids = conversation.residentIds || [];
          const lines = conversation.lines || [];
          return ids.length >= 2
            && ids.every(residentExists)
            && lines.length >= 2
            && lines.every((line) => residentExists(line.speakerId) && line.text);
        }).slice(0, 4)
        : [];
      const weeklyReport = shadow.weeklyReport && typeof shadow.weeklyReport === "object"
        ? {
          weekId: shadow.weeklyReport.weekId || engine.latestWeekSnapshot?.()?.weekId || "",
          title: shadow.weeklyReport.title || "互动周报",
          range: shadow.weeklyReport.range || "",
          sections: Array.isArray(shadow.weeklyReport.sections) ? shadow.weeklyReport.sections.slice(0, 4) : [],
          hooks: Array.isArray(shadow.weeklyReport.hooks) ? shadow.weeklyReport.hooks.slice(0, 5) : []
        }
        : null;
      const riskNotes = Array.isArray(shadow.riskNotes) ? shadow.riskNotes.slice(0, 5) : [];
      if (!conversations.length && !weeklyReport?.sections?.length && !riskNotes.length) return null;
      return { conversations, weeklyReport, riskNotes };
    }

    function archiveShadowConversations(shadow) {
      if (!shadow?.conversations?.length) return;
      const completedDay = Number(engine.state.lastReport?.day) || Math.max(1, Number(engine.state.day) - 1);
      T.stageRecapData?.archiveModelConversations?.(engine.state, shadow.conversations, completedDay);
    }

    return { applyLogs, applyReport, validateShadow, archiveShadowConversations };
  }

  T.llmResultApplier = { create };
}());
