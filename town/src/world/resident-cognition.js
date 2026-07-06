(function () {
  const T = window.MorningTown;

  const payloadModule = T.residentCognitionPayload;
  if (!payloadModule?.build || !payloadModule?.ensureState) throw new Error("resident-cognition-payload must load before resident-cognition");

  const version = payloadModule.cognitionVersion;
  const slotLabels = payloadModule.slotLabels;
  const intentModes = new Set(payloadModule.intentModes || []);
  const intentLabels = payloadModule.intentLabels || {};
  const replacementActivities = payloadModule.replacementActivities || {};
  const build = payloadModule.build;
  const ensureState = payloadModule.ensureState;

  function cleanText(value, limit = 180) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
  }

  function safeText(value, limit = 180) {
    const text = cleanText(value, limit);
    if (!text) return "";
    const forbidden = T.modelContract?.forbiddenWords || [];
    if (forbidden.some((word) => text.includes(word))) return "";
    if (/[<>]/.test(text)) return "";
    return text;
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

  function pairKey(aId, bId) {
    return [aId, bId].sort().join(":");
  }

  function normalizeSlot(value) {
    const raw = cleanText(value, 20).toLowerCase();
    if (raw === "清晨" || raw === "morning") return "morning";
    if (raw === "午后" || raw === "下午" || raw === "afternoon") return "afternoon";
    if (raw === "夜里" || raw === "晚上" || raw === "evening" || raw === "night") return "evening";
    return "";
  }

  function replacementActivityId(mode, slotKey) {
    return replacementActivities[mode]?.[slotKey] || "";
  }

  function targetFrom(engine, id) {
    return engine.state.villagers.find((villager) => villager.id === id) || null;
  }

  function evidenceVisible(memoryIndex, residentId, evidenceIds, zoneId) {
    return evidenceIds
      .map((id) => memoryIndex.get(id))
      .filter((node) => T.residentMemoryStream.isVisibleToResident(node, residentId, zoneId));
  }

  function targetVisible(targetId, packet, evidenceNodes) {
    if ((packet?.nearbyResidentIds || []).includes(targetId)) return true;
    return evidenceNodes.some((node) => (node.residentIds || []).includes(targetId));
  }

  function reject(reason, base) {
    return {
      ...base,
      accepted: false,
      reason,
      replacementActivityId: ""
    };
  }

  function auditInteractionIntent(engine, villager, rawIntent, rawPlan = {}) {
    const cognition = ensureState(engine);
    const payload = cognition.lastBuild || build(engine);
    const packet = (payload.perceptionPackets || []).find((item) => item.residentId === villager.id) || null;
    const memoryIndex = T.residentMemoryStream.memoryIndex(payload.memoryStream);
    const mode = cleanText(rawIntent?.mode, 24);
    const targetResidentId = cleanText(rawIntent?.targetResidentId || rawIntent?.targetId || rawIntent?.residentId, 12);
    const slotKey = normalizeSlot(rawIntent?.slot || rawIntent?.slotKey || rawPlan?.slot);
    const evidenceMemoryIds = unique((rawIntent?.evidenceMemoryIds || rawIntent?.memoryIds || [])
      .map((id) => cleanText(id, 60))
      .filter(Boolean))
      .slice(0, 4);
    const base = {
      residentId: villager.id,
      targetResidentId,
      mode,
      modeLabel: intentLabels[mode] || mode,
      slotKey,
      slot: slotLabels[slotKey] || "",
      evidenceMemoryIds,
      reflectionNote: safeText(rawPlan?.reflectionNote || rawIntent?.reflectionNote || "", 160),
      publicSummary: "",
      reason: ""
    };

    if (!rawIntent || typeof rawIntent !== "object") return reject("missing_interaction_intent", base);
    if (!intentModes.has(mode)) return reject("unknown_intent_mode", base);
    if (!targetResidentId || !targetFrom(engine, targetResidentId)) return reject("unknown_target_resident", base);
    if (targetResidentId === villager.id) return reject("self_target", base);
    if (!slotKey) return reject("unknown_intent_slot", base);
    if (!evidenceMemoryIds.length) return reject("missing_evidence_memory", base);

    const evidenceNodes = evidenceVisible(memoryIndex, villager.id, evidenceMemoryIds, villager.zone);
    if (evidenceNodes.length !== evidenceMemoryIds.length) return reject("invalid_or_invisible_evidence_memory", base);
    if (!targetVisible(targetResidentId, packet, evidenceNodes)) return reject("target_not_visible_from_packet", base);

    const cooldownKey = pairKey(villager.id, targetResidentId);
    const lastDay = Number(cognition.chatCooldowns[cooldownKey] || 0);
    if (lastDay && Number(engine.state.day || 1) - lastDay < 1) return reject("chat_cooldown_active", base);
    if (mode === "help" && (fatiguePressure(villager) === "high" || healthPressure(villager) === "high")) {
      return reject("body_pressure_too_high_for_help", base);
    }
    if (mode === "gift" && Number(villager.energy || 0) < 12) return reject("body_pressure_too_high_for_gift", base);

    const replacement = replacementActivityId(mode, slotKey);
    if (!replacement || !T.activityRules.getActivity(replacement)) return reject("missing_replacement_activity", base);

    const target = targetFrom(engine, targetResidentId);
    const zone = engine.zoneName?.(villager.zone) || villager.zone || "镇上";
    const publicSummary = `${villager.name}想在${zone}${intentLabels[mode]}${target.name}，证据来自 ${evidenceMemoryIds.slice(0, 2).join("、")}。`;
    cognition.chatCooldowns[cooldownKey] = Number(engine.state.day || 1);
    const accepted = {
      ...base,
      accepted: true,
      reason: "local_cognition_guard_allowed",
      targetName: target.name,
      zoneId: villager.zone || target.zone || "",
      replacementActivityId: replacement,
      publicSummary,
      evidenceTexts: evidenceNodes.map((node) => node.publicText).slice(0, 2)
    };
    cognition.acceptedIntents.push(accepted);
    if (cognition.acceptedIntents.length > 48) cognition.acceptedIntents.shift();
    return accepted;
  }

  function summarizeIntents(intents) {
    const total = intents.length;
    const accepted = intents.filter((item) => item.accepted).length;
    const byMode = intents.reduce((counts, item) => {
      const key = item.mode || "none";
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
    const rejectedReasons = intents.reduce((counts, item) => {
      if (item.accepted) return counts;
      counts[item.reason] = (counts[item.reason] || 0) + 1;
      return counts;
    }, {});
    return {
      mode: "resident-cognition-local-audit",
      total,
      accepted,
      rejected: total - accepted,
      byMode,
      rejectedReasons
    };
  }

  T.residentCognition = {
    version,
    intentLabels,
    build,
    ensureState,
    auditInteractionIntent,
    summarizeIntents,
    replacementActivityId
  };
}());
