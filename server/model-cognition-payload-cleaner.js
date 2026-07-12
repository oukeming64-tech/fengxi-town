function createCognitionPayloadCleaner({
  cleanString,
  cleanList,
  safeVisibleText
} = {}) {
  function cleanMemoryNode(node) {
    if (!node || typeof node !== "object") return null;
    const id = cleanString(node.id, 60);
    const publicText = safeVisibleText(node.publicText, 220);
    if (!id || !publicText) return null;
    return {
      id,
      residentId: cleanString(node.residentId || "town", 12),
      day: Number(node.day || 0),
      type: cleanString(node.type || "event", 20),
      publicText,
      sourceLogIds: cleanList(node.sourceLogIds, 4, 40),
      residentIds: cleanList(node.residentIds, 4, 12),
      zoneId: cleanString(node.zoneId, 40),
      keywords: cleanList(node.keywords, 8, 24),
      salience: Number(node.salience || 1),
      expiresAfterDay: Number(node.expiresAfterDay || 0)
    };
  }

  function cleanResidentScratch(item) {
    if (!item || typeof item !== "object") return null;
    const residentId = cleanString(item.residentId, 12);
    if (!residentId) return null;
    return {
      residentId,
      day: Number(item.day || 0),
      currentZoneId: cleanString(item.currentZoneId, 40),
      currentActionId: cleanString(item.currentActionId, 20),
      todayGoal: safeVisibleText(item.todayGoal, 180),
      slotPlan: cleanList(item.slotPlan, 3, 20),
      fatiguePressure: cleanString(item.fatiguePressure, 12),
      healthPressure: cleanString(item.healthPressure, 12),
      chatCooldowns: Array.isArray(item.chatCooldowns) ? item.chatCooldowns.slice(0, 5).map((cooldown) => ({
        residentId: cleanString(cooldown.residentId, 12),
        days: Number(cooldown.days || 0)
      })).filter((cooldown) => cooldown.residentId) : [],
      recentMemoryIds: cleanList(item.recentMemoryIds, 6, 60)
    };
  }

  function cleanPerceptionPacket(item) {
    if (!item || typeof item !== "object") return null;
    const residentId = cleanString(item.residentId, 12);
    if (!residentId) return null;
    const group = item.groupContext && typeof item.groupContext === "object" ? item.groupContext : null;
    return {
      residentId,
      day: Number(item.day || 0),
      visibleZone: cleanString(item.visibleZone, 40),
      nearbyResidentIds: cleanList(item.nearbyResidentIds, 8, 12),
      publicEvents: cleanList(item.publicEvents, 5, 180).map((event) => safeVisibleText(event, 180)).filter(Boolean),
      retrievedMemoryIds: cleanList(item.retrievedMemoryIds, 6, 60),
      relationshipHints: cleanList(item.relationshipHints, 6, 120),
      systemPressure: cleanList(item.systemPressure, 8, 40),
      groupContext: group ? {
        groupId: cleanString(group.groupId, 40),
        role: cleanString(group.role, 40),
        centerResidentId: cleanString(group.centerResidentId, 12),
        memberResidentIds: cleanList(group.memberResidentIds, 8, 12),
        behaviorRules: cleanList(group.behaviorRules, 6, 220).map((rule) => safeVisibleText(rule, 220)).filter(Boolean)
      } : null
    };
  }

  function cleanGroupProfile(group) {
    if (!group || typeof group !== "object") return null;
    const id = cleanString(group.id, 40);
    const memberResidentIds = cleanList(group.memberResidentIds, 8, 12);
    if (!id || memberResidentIds.length < 2) return null;
    const roles = {};
    memberResidentIds.forEach((residentId) => {
      const role = cleanString(group.roles?.[residentId], 40);
      if (role) roles[residentId] = role;
    });
    return {
      id,
      centerResidentId: cleanString(group.centerResidentId, 12),
      memberResidentIds,
      roles,
      behaviorRules: cleanList(group.behaviorRules, 6, 220).map((rule) => safeVisibleText(rule, 220)).filter(Boolean)
    };
  }

  function cleanInteractionIntent(intent) {
    return {
      residentId: cleanString(intent.residentId, 12),
      targetResidentId: cleanString(intent.targetResidentId, 12),
      mode: cleanString(intent.mode, 24),
      modeLabel: safeVisibleText(intent.modeLabel, 40),
      slot: cleanString(intent.slot, 20),
      evidenceMemoryIds: cleanList(intent.evidenceMemoryIds, 4, 60),
      publicSummary: safeVisibleText(intent.publicSummary, 180)
    };
  }

  function cleanCognitionPayload(cognition) {
    if (!cognition || typeof cognition !== "object") return null;
    const memoryNodes = Array.isArray(cognition.memoryStream?.nodes)
      ? cognition.memoryStream.nodes.map(cleanMemoryNode).filter(Boolean).slice(0, 120)
      : [];
    return {
      version: cleanString(cognition.version, 80),
      mode: cleanString(cognition.mode || "resident-cognition-loop-local-public", 60),
      rule: safeVisibleText(cognition.rule, 260),
      allowedIntentModes: cleanList(cognition.allowedIntentModes, 8, 24),
      memoryStream: {
        version: cleanString(cognition.memoryStream?.version, 80),
        day: Number(cognition.memoryStream?.day || 0),
        mode: cleanString(cognition.memoryStream?.mode, 60),
        nodes: memoryNodes
      },
      residentScratch: Array.isArray(cognition.residentScratch)
        ? cognition.residentScratch.map(cleanResidentScratch).filter(Boolean).slice(0, 30)
        : [],
      perceptionPackets: Array.isArray(cognition.perceptionPackets)
        ? cognition.perceptionPackets.map(cleanPerceptionPacket).filter(Boolean).slice(0, 30)
        : [],
      groupProfiles: Array.isArray(cognition.groupProfiles)
        ? cognition.groupProfiles.map(cleanGroupProfile).filter(Boolean).slice(0, 6)
        : [],
      acceptedInteractionIntents: Array.isArray(cognition.acceptedInteractionIntents)
        ? cognition.acceptedInteractionIntents.slice(0, 12).map(cleanInteractionIntent).filter((intent) => (
          intent.residentId && intent.targetResidentId && intent.mode
        ))
        : [],
      expectedCandidateFields: cognition.expectedCandidateFields && typeof cognition.expectedCandidateFields === "object"
        ? cognition.expectedCandidateFields
        : null
    };
  }

  return {
    cleanCognitionPayload
  };
}

module.exports = {
  createCognitionPayloadCleaner
};
