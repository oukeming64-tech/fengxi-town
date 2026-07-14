(function () {
  const T = window.MorningTown;

  function factText(log) {
    return log?.localText || log?.text || "";
  }

  function logPayload(log) {
    return {
      id: log.id,
      residentId: log.residentId || "",
      day: log.day,
      slot: log.slot,
      place: log.place,
      kind: log.kind,
      zoneId: log.zoneId || "",
      activityId: log.activityId || "",
      activityTitle: log.activityTitle || "",
      text: factText(log)
    };
  }

  function uniqueById(logs) {
    return logs.filter((log, index, list) => log?.id && list.findIndex((item) => item.id === log.id) === index);
  }

  function residentsPayload(engine) {
    return engine.state.villagers.map((villager) => {
      const languageProfile = T.residentLanguageProfile?.profileFor?.(villager) || null;
      return {
        id: villager.id,
        name: villager.name,
        voiceStyle: languageProfile?.promptStyle || "用自然短句说眼前的事。",
        zone: villager.zone,
        health: villager.health,
        energy: villager.energy,
        coins: villager.coins,
        recentAction: villager.recentAction ? {
          activityId: villager.recentAction.activityId || "",
          activityTitle: villager.recentAction.activityTitle || "",
          zone: villager.recentAction.zone || "",
          text: villager.recentAction.localText || villager.recentAction.text || ""
        } : null
      };
    });
  }

  function weeklyPayload(engine) {
    const latestWeek = engine.latestWeekSnapshot ? engine.latestWeekSnapshot() : null;
    if (latestWeek) {
      return {
        weekId: latestWeek.weekId,
        weekNumber: latestWeek.weekNumber,
        range: latestWeek.rangeLabel,
        dayCount: latestWeek.dailySnapshots?.length || 7,
        immutableState: latestWeek.immutableState === true,
        source: latestWeek.source,
        startLedger: latestWeek.startSnapshot?.ledger || null,
        endLedger: latestWeek.endSnapshot?.ledger || null,
        ledgerDelta: latestWeek.ledgerDelta || null,
        debtSettlement: latestWeek.debtSettlement || null,
        stageEvaluations: latestWeek.stageEvaluations || [],
        localReport: latestWeek.localReport || null,
        keyLogRefs: (latestWeek.keyLogRefs || []).slice(0, 18),
        recentDays: (latestWeek.dailySnapshots || []).map((day) => ({
          day: day.day,
          scene: day.scene,
          weather: day.weather?.label || "",
          reportTitles: day.reportTitles || [],
          keyLogs: (day.keyLogRefs || []).slice(0, 8).map((log) => `${log.slot || ""} ${log.place || ""}：${log.text}`)
        })),
        relationshipSummary: latestWeek.endSnapshot?.relationships?.summaryLines || []
      };
    }
    const logs = engine.state.allLogs.filter((log) => log.day >= Math.max(1, engine.state.day - 7));
    const dayMap = new Map();
    logs.forEach((log) => {
      if (!dayMap.has(log.day)) {
        dayMap.set(log.day, {
          day: log.day,
          scene: engine.state.scene.label,
          weather: engine.state.currentWeather?.label || "",
          reportTitles: [],
          keyLogs: []
        });
      }
      const day = dayMap.get(log.day);
      const text = factText(log);
      if (day.keyLogs.length < 8 && text) {
        day.keyLogs.push(`${log.slot || ""} ${log.place || ""}：${text}`);
      }
    });
    const days = [...dayMap.values()].slice(-7);
    const firstDay = days[0]?.day || engine.state.lastReport?.day || engine.state.day;
    const lastDay = days[days.length - 1]?.day || engine.state.lastReport?.day || engine.state.day;
    const relationships = engine.publicTownSnapshot?.()?.relationships;
    return {
      range: firstDay === lastDay ? `第 ${lastDay} 天` : `第 ${firstDay}-${lastDay} 天`,
      dayCount: days.length || 1,
      recentDays: days,
      relationshipSummary: relationships?.summaryLines || []
    };
  }

  function buildShadowPayload(engine) {
    const report = engine.state.lastReport;
    const shadowPayload = T.promptContext?.buildShadowModePayload?.(engine) || {};
    return {
      mode: "model-shadow",
      world: {
        version: T.worldConfig?.version || "",
        title: T.worldConfig?.title || "枫溪镇",
        year: T.worldConfig?.year || 2006,
        townName: T.worldConfig?.townName || "枫溪镇",
        farmName: T.worldConfig?.farmName || "黄石农场",
        population: T.worldConfig?.population?.residents || 30,
        currency: T.worldConfig?.currency?.code || "YSC",
        zones: (T.worldConfig?.zones || []).map((zone) => ({ id: zone.id, name: zone.name }))
      },
      contract: {
        version: T.modelContract?.version || "",
        residentCount: T.modelContract?.residentCount || 30,
        currentMode: T.modelContract?.currentMode || "model-shadow-mode"
      },
      actionLayer: T.promptContext?.buildActionLayerSummary?.() || null,
      stateLayer: T.promptContext?.buildTownStateSummary?.(engine) || null,
      scene: engine.state.scene.label,
      residents: residentsPayload(engine),
      logs: engine.state.displayLogs.slice(-36).map(logPayload),
      report: report ? {
        day: report.day,
        scene: report.scene,
        sections: report.sections.map((section, index) => ({
          index,
          title: section.title,
          body: section.body || "",
          list: Array.isArray(section.list) ? section.list : null
        }))
      } : null,
      weekly: {
        ...(shadowPayload.weekly || {}),
        ...weeklyPayload(engine)
      }
    };
  }

  function buildActionPayload(engine) {
    const payload = T.promptContext?.buildActionControlPayload?.(engine);
    if (payload) return payload;
    return {
      mode: "action-control",
      actionControl: { day: engine.state.day, slots: engine.timeSlots },
      world: {
        title: T.worldConfig?.title || "枫溪镇",
        year: T.worldConfig?.year || 2006,
        population: T.worldConfig?.population?.residents || 30
      },
      contract: {
        version: T.modelContract?.version || "",
        residentCount: T.modelContract?.residentCount || 30,
        currentMode: T.modelContract?.currentMode || "resident-cognition-loop-local-audited"
      },
      actionLayer: T.promptContext?.buildActionLayerSummary?.({ includeActivities: true }) || null,
      stateLayer: T.promptContext?.buildTownStateSummary?.(engine) || null,
      scene: engine.state.scene.label,
      residents: residentsPayload(engine),
      weekly: weeklyPayload(engine)
    };
  }

  function buildInteractionPayload(engine) {
    const payload = buildShadowPayload(engine);
    const snapshot = payload.stateLayer?.snapshot || null;
    const acceptedInteractionIntents = (engine.state.modelActionControl?.interactionIntents || [])
      .filter((intent) => intent.accepted)
      .slice(0, 8)
      .map((intent) => ({
        residentId: intent.residentId,
        targetResidentId: intent.targetResidentId,
        mode: intent.mode,
        modeLabel: intent.modeLabel,
        slot: intent.slot,
        evidenceMemoryIds: intent.evidenceMemoryIds,
        publicSummary: intent.publicSummary
      }));
    const intentResidentIds = new Set(acceptedInteractionIntents
      .flatMap((intent) => [intent.residentId, intent.targetResidentId])
      .filter(Boolean));
    const interactionLogs = payload.logs
      .filter((log) => log.residentId && (
        log.kind === "talk"
        || /互动|送礼|表达好感|致谢|表彰|结盟|排挤|调停|公告|账|桥|争议|问价|帮|谈|TC-07|CH-06/.test(`${log.text || ""} ${log.activityTitle || ""} ${log.activityId || ""}`)
      ))
      .slice(-12);
    const relationshipEvents = (snapshot?.relationships?.recentInteractions || []).slice(0, 4);
    const relationshipLogs = relationshipEvents.map((item, index) => ({
      id: `relationship-${item.id || `${item.day || engine.state.day}-${index + 1}`}-${index + 1}`,
      day: Number(item.day || Math.max(1, engine.state.day - 1)),
      slot: item.slot || "清晨",
      place: item.place || "镇上",
      kind: item.type || "relationship",
      residentId: item.actorId || item.residentIds?.[0] || "",
      zoneId: item.zoneId || "",
      activityId: item.activityId || "",
      activityTitle: item.activityTitle || item.label || "居民互动",
      text: item.summary || ""
    })).filter((log) => log.residentId && log.text);
    const availableLogs = uniqueById([...engine.state.allLogs, ...engine.state.displayLogs].map(logPayload));
    const perIntentLogs = acceptedInteractionIntents
      .map((intent) => {
        const ids = new Set([intent.residentId, intent.targetResidentId].filter(Boolean));
        return [...availableLogs].reverse().find((log) => ids.has(log.residentId));
      })
      .filter(Boolean);
    const intentLogs = availableLogs
      .filter((log) => intentResidentIds.has(log.residentId))
      .slice(-8);
    const requiredLogIds = new Set([...perIntentLogs, ...relationshipLogs].map((log) => log.id).filter(Boolean));
    const candidateLogs = [...payload.logs.slice(-12), ...interactionLogs, ...intentLogs, ...perIntentLogs, ...relationshipLogs]
      .filter((log, index, list) => log?.id && list.findIndex((item) => item.id === log.id) === index);
    let logs = candidateLogs;
    if (logs.length > 12) {
      const requiredLogs = logs.filter((log) => requiredLogIds.has(log.id));
      const optionalLogs = logs.filter((log) => !requiredLogIds.has(log.id));
      const optionalCount = Math.max(0, 12 - requiredLogs.length);
      const selectedOptionalLogs = optionalCount > 0 ? optionalLogs.slice(-optionalCount) : [];
      const selectedIds = new Set([...selectedOptionalLogs, ...requiredLogs].map((log) => log.id));
      logs = logs.filter((log) => selectedIds.has(log.id));
    }
    const relationshipResidentIds = relationshipEvents.flatMap((item) => item.residentIds || []);
    const involvedIds = [...new Set([
      ...logs.map((log) => log.residentId),
      ...relationshipResidentIds
    ].filter(Boolean))];
    const focusedResidents = payload.residents
      .filter((resident) => involvedIds.includes(resident.id))
      .slice(0, 8);
    const residents = focusedResidents.length >= 2 ? focusedResidents : payload.residents.slice(0, 8);
    return {
      mode: "interaction-scenes",
      world: payload.world,
      contract: {
        ...payload.contract,
        currentMode: "interaction-scenes-local-facts"
      },
      stateLayer: payload.stateLayer ? {
        version: payload.stateLayer.version,
        weather: payload.stateLayer.weather,
        snapshot: snapshot ? {
          day: snapshot.day,
          seasonLabel: snapshot.seasonLabel,
          ledger: snapshot.ledger ? {
            cashYsc: snapshot.ledger.cashYsc,
            debtYsc: snapshot.ledger.debtYsc,
            accountingTransparency: snapshot.ledger.accountingTransparency
          } : null,
          relationships: snapshot.relationships ? {
            summary: snapshot.relationships.summary,
            summaryLines: (snapshot.relationships.summaryLines || []).slice(0, 3)
          } : null
        } : null
      } : null,
      scene: payload.scene,
      residents,
      logs,
      cognition: acceptedInteractionIntents.length ? {
        acceptedInteractionIntents
      } : null,
      weekly: {
        weekId: payload.weekly.weekId || "",
        range: payload.weekly.range || "",
        immutableState: payload.weekly.immutableState === true,
        relationshipSummary: (payload.weekly.relationshipSummary || []).slice(0, 3)
      }
    };
  }

  T.llmPayloads = {
    version: "llm-payloads-v0.1.0-resident-cognition",
    factText,
    residentsPayload,
    weeklyPayload,
    buildShadowPayload,
    buildActionPayload,
    buildInteractionPayload
  };
}());
