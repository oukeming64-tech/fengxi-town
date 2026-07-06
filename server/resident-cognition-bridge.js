function compactCognition(cognition) {
  if (!cognition) return null;
  const nodes = (cognition.memoryStream?.nodes || []).slice(0, 100).map((node) => ({
    id: node.id,
    residentId: node.residentId,
    day: node.day,
    type: node.type,
    publicText: node.publicText,
    sourceLogIds: node.sourceLogIds,
    residentIds: node.residentIds,
    zoneId: node.zoneId,
    keywords: node.keywords,
    salience: node.salience
  }));
  return {
    version: cognition.version,
    mode: cognition.mode,
    allowedIntentModes: cognition.allowedIntentModes || ["talk", "wait", "avoid", "help", "gift", "appreciate"],
    memoryStream: {
      version: cognition.memoryStream?.version || "",
      day: cognition.memoryStream?.day || 0,
      nodes
    },
    residentScratch: (cognition.residentScratch || []).slice(0, 30).map((scratch) => ({
      residentId: scratch.residentId,
      day: scratch.day,
      currentZoneId: scratch.currentZoneId,
      currentActionId: scratch.currentActionId,
      todayGoal: scratch.todayGoal,
      slotPlan: scratch.slotPlan,
      fatiguePressure: scratch.fatiguePressure,
      healthPressure: scratch.healthPressure,
      chatCooldowns: scratch.chatCooldowns,
      recentMemoryIds: scratch.recentMemoryIds
    })),
    perceptionPackets: (cognition.perceptionPackets || []).slice(0, 30).map((packet) => ({
      residentId: packet.residentId,
      day: packet.day,
      visibleZone: packet.visibleZone,
      nearbyResidentIds: packet.nearbyResidentIds,
      publicEvents: packet.publicEvents,
      retrievedMemoryIds: packet.retrievedMemoryIds,
      relationshipHints: packet.relationshipHints,
      systemPressure: packet.systemPressure
    }))
  };
}

function makeCognitionIntentConversation(payload) {
  const residents = payload.residents || [];
  const residentById = new Map(residents.map((resident) => [resident.id, resident]));
  const intent = (payload.cognition?.acceptedInteractionIntents || []).find((item) => item.mode === "gift" || item.mode === "appreciate")
    || payload.cognition?.acceptedInteractionIntents?.[0]
    || null;
  if (!intent) return null;
  const actor = residentById.get(intent.residentId);
  const target = residentById.get(intent.targetResidentId);
  if (!actor || !target) return null;
  const evidenceLogs = (payload.logs || [])
    .filter((item) => item.residentId === actor.id || item.residentId === target.id)
    .filter((item) => item.id)
    .slice(0, 2);
  if (!evidenceLogs.length) return null;

  const log = evidenceLogs[0];
  const isGift = intent.mode === "gift";
  const isAppreciate = intent.mode === "appreciate";
  return {
    id: "cognition-intent-fallback-1",
    title: isGift ? "一件小礼物" : (isAppreciate ? "桌边一句谢意" : "路边两句话"),
    place: log.place || "镇上",
    residentIds: [actor.id, target.id],
    evidenceLogIds: evidenceLogs.map((item) => item.id),
    lines: isGift ? [
      { speakerId: actor.id, speakerName: actor.name, text: "这个顺手带来的，放你那儿更用得上。" },
      { speakerId: target.id, speakerName: target.name, text: "那我收下。纸角还没被雨压软。" },
      { speakerId: actor.id, speakerName: actor.name, text: "明天记得还我那把小刀就行。" }
    ] : [
      { speakerId: actor.id, speakerName: actor.name, text: "刚才那一下，我看见了。谢谢你替我留了位置。" },
      { speakerId: target.id, speakerName: target.name, text: "只是把椅子往里挪了半步。" },
      { speakerId: actor.id, speakerName: actor.name, text: "半步也算，地上的灰都被你拍干净了。" }
    ],
    note: intent.publicSummary || "模型互动为空时，由本地已审核互动意图生成的候选会话。"
  };
}

module.exports = {
  compactCognition,
  makeCognitionIntentConversation
};
