(function () {
  const T = window.MorningTown;

  function buildActionLayerSummary(options = {}) {
    const rules = T.activityRules;
    if (!rules) return null;
    const summary = {
      version: rules.version,
      source: rules.source,
      mode: "local-rules-first",
      sourceActivityCount: rules.sourceActivities.length,
      zones: Object.values(rules.zones).map((zone) => ({
        id: zone.zoneId,
        name: zone.name,
        risk: zone.risk
      })),
      sampleActivities: rules.sourceActivities.slice(0, 18).map(rules.publicSummary),
      scoringFactors: [
        "身体状态",
        "角色责任",
        "性格倾向",
        "技能匹配",
        "季节与天气",
        "地点风险",
        "关系网络"
      ],
      visibilityRule: "观察者只看动作、对话、地点和公开结果；底层行动理由仅供调试和审计。"
    };
    if (options.includeActivities) {
      summary.activities = rules.activities.map(rules.publicSummary);
    }
    return summary;
  }

  function buildCognitionPayload(engine) {
    if (!T.residentCognition?.build) return null;
    return T.residentCognition.build(engine, { memoryLimit: 100 });
  }

  function buildTownStateSummary(engine) {
    const ledger = T.townLedger;
    const weather = engine?.state?.currentWeather || null;
    const snapshot = ledger?.publicSnapshot?.(engine?.state?.townState || null) || null;
    if (snapshot && T.townRelationshipLedger?.publicSnapshot) {
      snapshot.relationships = T.townRelationshipLedger.publicSnapshot(engine?.state?.townState || null);
    }
    return {
      version: ledger?.version || "",
      mode: "local-state-first",
      weather: weather ? {
        type: weather.type,
        label: weather.label,
        riskIndex: weather.riskIndex,
        summary: T.weatherSystem?.summarize?.(weather) || ""
      } : null,
      snapshot,
      visibilityRule: "观察者可看天气、作物、库存、设施、加工熟练度、市场、动态招标、寄售争议、合同、现金流、公开风险和居民互动摘要；不显示居民底层动机或行动评分。"
    };
  }

  function summarizeResident(villager) {
    return {
      id: villager.id,
      name: villager.name,
      tag: villager.tag,
      zone: villager.zone,
      health: villager.health,
      energy: villager.energy,
      coins: villager.coins,
      storage: villager.storage,
      recentAction: villager.recentAction ? {
        activityId: villager.recentAction.activityId || "",
        activityTitle: villager.recentAction.activityTitle || "",
        zone: villager.recentAction.zone || "",
        text: villager.recentAction.localText || villager.recentAction.text || ""
      } : null
    };
  }

  function buildFutureBatchPlanPayload(engine) {
    return {
      contractVersion: T.modelContract?.version || "",
      actionLayer: buildActionLayerSummary(),
      world: {
        title: T.worldConfig?.title || "枫溪镇",
        year: T.worldConfig?.year || 2006,
        population: T.worldConfig?.population?.residents || 30
      },
      state: {
        day: engine.state.day,
        scene: engine.state.scene.label,
        season: engine.state.season.label,
        townState: buildTownStateSummary(engine),
        residents: engine.state.villagers.map(summarizeResident)
      },
      expectedOutput: T.modelContract?.futureActionPlanSchema || null,
      rule: "模型只能给候选主行动、副行动、可见一句话和风险提示；本地规则必须重新校验后才能写入事实状态。"
    };
  }

  function buildActionControlPayload(engine) {
    const latestWeek = engine.latestWeekSnapshot ? engine.latestWeekSnapshot() : null;
    const cognition = buildCognitionPayload(engine);
    return {
      mode: "action-control",
      actionControl: {
        day: engine.state.day,
        slots: engine.timeSlots,
        request: "为下一天给 30 位居民提出候选行动日程；只返回 residentId 和三个 activityId，本地规则会重新审核后才执行。"
      },
      contractVersion: T.modelContract?.version || "",
      world: {
        version: T.worldConfig?.version || "",
        title: T.worldConfig?.title || "枫溪镇",
        year: T.worldConfig?.year || 2006,
        townName: T.worldConfig?.townName || "枫溪镇",
        farmName: T.worldConfig?.farmName || "田地",
        population: T.worldConfig?.population?.residents || 30,
        currency: T.worldConfig?.currency?.code || "YSC",
        zones: (T.worldConfig?.zones || []).map((zone) => ({ id: zone.id, name: zone.name }))
      },
      contract: {
        version: T.modelContract?.version || "",
        residentCount: T.modelContract?.residentCount || 30,
        currentMode: T.modelContract?.currentMode || "resident-cognition-loop-local-audited"
      },
      actionLayer: buildActionLayerSummary({ includeActivities: true }),
      stateLayer: buildTownStateSummary(engine),
      scene: engine.state.scene.label,
      dayPlanContext: {
        day: engine.state.day,
        season: engine.state.season.label,
        weather: engine.state.currentWeather ? {
          type: engine.state.currentWeather.type,
          label: engine.state.currentWeather.label,
          riskIndex: engine.state.currentWeather.riskIndex,
          summary: T.weatherSystem?.summarize?.(engine.state.currentWeather) || ""
        } : null,
        latestWeek: latestWeek ? {
          weekId: latestWeek.weekId,
          range: latestWeek.rangeLabel,
          ledgerDelta: latestWeek.ledgerDelta || null,
          debtSettlement: latestWeek.debtSettlement || null,
          localReport: latestWeek.localReport || null,
          stageEvaluations: latestWeek.stageEvaluations || []
        } : null
      },
      weekly: latestWeek ? {
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
        keyLogRefs: (latestWeek.keyLogRefs || []).slice(0, 12)
      } : {},
      residents: engine.state.villagers.map((villager) => ({
        ...summarizeResident(villager),
        todayPlan: villager.todayPlan ? {
          day: villager.todayPlan.day,
          source: villager.todayPlan.source || "local",
          slots: (villager.todayPlan.slots || []).map((slot) => ({
            slot: slot.slot,
            activityId: slot.activityId,
            title: slot.title,
            zoneId: slot.zoneId,
            intention: slot.intention,
            risk: slot.risk
          }))
        } : null
      })),
      cognition,
      expectedOutput: T.modelContract?.actionControlSchema || T.modelContract?.futureBatchPlanSchema || null,
      rule: "模型只能返回居民候选 activityId 数组、可选 interactionIntent 和可选 reflectionNote；不能写公开目标、对话、现金、债务、库存、关系数值、设施、合同或评价等级。interactionIntent 也只是候选，必须被本地认知 guard 和 action-policy 二次审核。"
    };
  }

  function buildShadowModePayload(engine) {
    const report = engine.state.lastReport;
    const logs = engine.state.displayLogs.slice(-36);
    const firstDay = logs.length ? logs[0].day : engine.state.day;
    const lastDay = logs.length ? logs[logs.length - 1].day : engine.state.day;
    const latestWeek = engine.latestWeekSnapshot ? engine.latestWeekSnapshot() : null;
    return {
      contractVersion: T.modelContract?.version || "",
      mode: "weekly-timeline-shadow-local-immutable",
      world: {
        title: T.worldConfig?.title || "枫溪镇",
        year: T.worldConfig?.year || 2006,
        population: T.worldConfig?.population?.residents || 30
      },
      state: {
        day: engine.state.day,
        scene: engine.state.scene.label,
        season: engine.state.season.label,
        townState: buildTownStateSummary(engine),
        residents: engine.state.villagers.map(summarizeResident)
      },
      recentLogs: logs.map((log) => ({
        id: log.id,
        residentId: log.residentId || "",
        day: log.day,
        slot: log.slot,
        place: log.place,
        kind: log.kind,
        text: log.localText || log.text
      })),
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
        weekId: latestWeek?.weekId || "",
        range: latestWeek?.rangeLabel || (firstDay === lastDay ? `第 ${lastDay} 天` : `第 ${firstDay}-${lastDay} 天`),
        dayCount: latestWeek?.dailySnapshots?.length || Math.max(1, lastDay - firstDay + 1),
        immutableState: latestWeek?.immutableState === true,
        source: latestWeek?.source || "recent-display-logs",
        localReport: latestWeek?.localReport || null,
        ledgerDelta: latestWeek?.ledgerDelta || null,
        debtSettlement: latestWeek?.debtSettlement || null
      },
      expectedOutput: T.modelContract?.shadowSchema || null,
      rule: "模型只能给候选会话、候选互动周报和风险提示；周报候选必须绑定本地 weekly.weekId 和 immutableState=true 的周快照，不能改现金、债务、关系、设施、合同或居民行动事实。"
    };
  }

  T.promptContext = {
    version: "prompt-context-v0.1.0-resident-cognition",
    buildActionLayerSummary,
    buildTownStateSummary,
    buildCognitionPayload,
    buildFutureBatchPlanPayload,
    buildActionControlPayload,
    buildShadowModePayload
  };
}());
