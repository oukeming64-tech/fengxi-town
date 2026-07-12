(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const cognitionVersion = "resident-cognition-v0.1.0-local-audited";
  const slotKeys = ["morning", "afternoon", "evening"];
  const slotLabels = { morning: "清晨", afternoon: "午后", evening: "夜里" };
  const intentModes = ["talk", "wait", "avoid", "help", "gift", "appreciate"];
  const intentLabels = {
    talk: "交谈",
    wait: "等一等",
    avoid: "先避开",
    help: "帮忙",
    gift: "送小礼",
    appreciate: "表达好感"
  };
  const replacementActivities = {
    talk: { morning: "TC-12", afternoon: "TC-03", evening: "CH-10" },
    wait: { morning: "TC-12", afternoon: "SR-12", evening: "RW-10" },
    avoid: { morning: "MF-06", afternoon: "MF-06", evening: "REST-01" },
    help: { morning: "YF-15", afternoon: "CH-07", evening: "CH-07" },
    gift: { morning: "TC-07", afternoon: "TC-07", evening: "CH-10" },
    appreciate: { morning: "CH-06", afternoon: "CH-06", evening: "TC-03" }
  };

  function cleanText(value, limit = 180) {
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

  function pressure(value, medium, high) {
    if (value >= high) return "high";
    if (value >= medium) return "medium";
    return "low";
  }

  function fatiguePressure(villager) {
    return pressure(100 - Number(villager.energy || 0), 45, 70);
  }

  function healthPressure(villager) {
    return pressure(100 - Number(villager.health || 0), 30, 55);
  }

  function ensureState(engine) {
    const state = engine.state;
    if (!state.residentCognition || typeof state.residentCognition !== "object") {
      state.residentCognition = {};
    }
    const cognition = state.residentCognition;
    cognition.version = cognitionVersion;
    cognition.chatCooldowns = cognition.chatCooldowns || {};
    cognition.acceptedIntents = Array.isArray(cognition.acceptedIntents) ? cognition.acceptedIntents : [];
    cognition.rejectedIntents = Array.isArray(cognition.rejectedIntents) ? cognition.rejectedIntents : [];
    return cognition;
  }

  function compactSlot(slot) {
    return slot?.activityId || "";
  }

  function currentSlotPlan(villager) {
    return slotKeys.map((key, index) => compactSlot(villager.todayPlan?.slots?.[index]) || "");
  }

  function planGoal(villager) {
    return cleanText(
      villager.todayPlan?.modelGoal
      || villager.todayPlan?.summary
      || villager.recentAction?.text
      || "把今天的事稳住",
      180
    );
  }

  function chatCooldownsFor(cognition, residentId, currentDay) {
    return Object.entries(cognition.chatCooldowns || {}).map(([key, lastDay]) => {
      const ids = key.split(":");
      if (!ids.includes(residentId)) return null;
      const elapsed = Number(currentDay || 1) - Number(lastDay || 0);
      const days = Math.max(0, 1 - elapsed);
      if (days <= 0) return null;
      return {
        residentId: ids.find((id) => id !== residentId) || "",
        days
      };
    }).filter((item) => item?.residentId).slice(0, 5);
  }

  function systemPressure(snapshot, weather) {
    const ledger = snapshot?.ledger || {};
    const risks = snapshot?.risks?.scores || {};
    const contracts = Array.isArray(snapshot?.contracts) ? snapshot.contracts : [];
    const facilities = Array.isArray(snapshot?.facilities?.facilities) ? snapshot.facilities.facilities : [];
    const result = [];
    if (Number(weather?.riskIndex || 0) >= 3) result.push(`weather-${Number(weather.riskIndex) >= 4 ? "high" : "medium"}`);
    if (Number(ledger.debtYsc || 0) > 0) result.push(Number(ledger.debtYsc) > 14000 ? "debt-high" : "debt-medium");
    if (Number(ledger.accountingTransparency || 0) < 55) result.push("accounting-low");
    if (contracts.some((contract) => Number(contract.dueDay || 99) - Number(snapshot?.day || 1) <= 1 && !/完成|fulfilled/i.test(contract.status || ""))) {
      result.push("contract-due");
    }
    if (facilities.some((facility) => Number(facility.condition || 100) < 55)) result.push("facility-repair-needed");
    if (Number(risks.finance || 0) >= 50) result.push("cash-pressure");
    if (Number(risks.relationship || 0) >= 50) result.push("relationship-pressure");
    return unique(result).slice(0, 8);
  }

  function pressureKeywords(pressures) {
    return unique((pressures || []).flatMap((item) => {
      if (/weather/.test(item)) return ["weather"];
      if (/debt|cash|accounting/.test(item)) return ["accounting", "contract"];
      if (/contract/.test(item)) return ["contract"];
      if (/facility/.test(item)) return ["facility", "help"];
      if (/relationship/.test(item)) return ["help", "conflict", "gift", "affection"];
      return [];
    }));
  }

  function nearbyResidents(engine, villager) {
    return engine.state.villagers
      .filter((item) => item.id !== villager.id && item.zone === villager.zone)
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 6)
      .map((item) => item.id);
  }

  function relationshipHints(residentId, relationshipSnapshot) {
    const pairs = [
      ...(relationshipSnapshot?.relationships || []),
      ...(relationshipSnapshot?.tenseRelationships || [])
    ];
    return pairs
      .filter((pair) => pair.residentIds?.includes(residentId))
      .map((pair) => {
        const otherId = pair.residentIds.find((id) => id !== residentId) || "";
        const trust = Number(pair.trust || 0);
        const friction = Number(pair.friction || 0);
        const favorDebt = pair.favorDebt?.[residentId] || pair.favorDebt?.[otherId] || 0;
        const labels = [];
        labels.push(trust >= 55 ? "trust-warm" : trust <= 38 ? "trust-low" : "trust-ordinary");
        if (friction >= 16) labels.push("recent-friction");
        if ((pair.allianceTags || []).length) labels.push("shared-work");
        if (favorDebt >= 4) labels.push("favor-open");
        return `${otherId}: ${labels.join(", ")}`;
      })
      .slice(0, 5);
  }

  function publicEvents(snapshot, weather) {
    const events = [];
    if (weather?.summary) events.push(weather.summary);
    if (snapshot?.promptBrief) events.push(snapshot.promptBrief);
    (snapshot?.risks?.notes || []).slice(0, 2).forEach((note) => events.push(note));
    (snapshot?.contractBids || []).slice(0, 2).forEach((bid) => {
      if (bid?.buyer && bid?.cropName) events.push(`${bid.buyer}在公告板留下${bid.cropName}的询价。`);
    });
    return unique(events.map((item) => cleanText(item, 180))).slice(0, 5);
  }

  function buildScratch(engine, villager, memories, cognition) {
    const recentMemoryIds = memories.map((node) => node.id);
    const day = Number(engine.state.day || 1);
    return {
      residentId: villager.id,
      day,
      currentZoneId: villager.zone || "",
      currentActionId: villager.recentAction?.activityId || "",
      todayGoal: planGoal(villager),
      slotPlan: currentSlotPlan(villager),
      fatiguePressure: fatiguePressure(villager),
      healthPressure: healthPressure(villager),
      chatCooldowns: chatCooldownsFor(cognition, villager.id, day),
      recentMemoryIds
    };
  }

  function build(engine, options = {}) {
    const cognition = ensureState(engine);
    const snapshot = engine.publicTownSnapshot?.() || null;
    const pressures = systemPressure(snapshot, engine.state.currentWeather);
    const stream = T.residentMemoryStream.build(engine, { limit: options.memoryLimit || 120 });
    const relationshipSnapshot = snapshot?.relationships || null;

    const residents = engine.state.villagers.map((villager) => {
      const memories = T.residentMemoryStream.retrieve(stream, villager, {
        day: engine.state.day,
        pressureKeywords: pressureKeywords(pressures),
        limit: 5
      });
      const packet = {
        residentId: villager.id,
        day: Number(engine.state.day || 1),
        visibleZone: villager.zone || "",
        nearbyResidentIds: nearbyResidents(engine, villager),
        publicEvents: publicEvents(snapshot, engine.state.currentWeather),
        retrievedMemoryIds: memories.map((node) => node.id),
        relationshipHints: relationshipHints(villager.id, relationshipSnapshot),
        systemPressure: pressures,
        groupContext: T.residentGroupProfiles?.contextFor?.(villager.id) || null
      };
      return {
        scratch: buildScratch(engine, villager, memories, cognition),
        perceptionPacket: packet
      };
    });

    const payload = {
      version: cognitionVersion,
      mode: "resident-cognition-loop-local-public",
      rule: "scratch、memoryStream 和 perceptionPackets 都由本地公开状态生成；模型只能提出候选行动、互动意图和公开反思摘要，事实仍由本地规则写入。",
      memoryStream: stream,
      residentScratch: residents.map((item) => item.scratch),
      perceptionPackets: residents.map((item) => item.perceptionPacket),
      groupProfiles: T.residentGroupProfiles?.modelProfiles?.() || [],
      allowedIntentModes: intentModes,
      expectedCandidateFields: {
        interactionIntent: {
          targetResidentId: "v02",
          mode: "talk | wait | avoid | help | gift | appreciate",
          slot: "morning | afternoon | evening",
          evidenceMemoryIds: ["mem-log-1"]
        },
        reflectionNote: "一句候选公开摘要，必须绑定已有记忆或真实日志后才可能进入长期记忆"
      }
    };
    cognition.lastBuild = payload;
    return payload;
  }

  T.residentCognitionPayload = {
    version: "resident-cognition-payload-v0.1.0-local",
    cognitionVersion,
    slotLabels,
    intentModes,
    intentLabels,
    replacementActivities,
    ensureState,
    build
  };
}());
