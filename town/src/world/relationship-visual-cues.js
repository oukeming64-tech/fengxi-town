(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const cueByType = Object.freeze({
    help: Object.freeze({ socialCue: "help", motionKey: "carry", propKey: "tool", durationMs: 1800 }),
    gift: Object.freeze({ socialCue: "gift", motionKey: "chat", propKey: "gift", durationMs: 1900 }),
    alliance: Object.freeze({ socialCue: "closeness", motionKey: "chat", propKey: "paper", durationMs: 1700 }),
    exclusion: Object.freeze({ socialCue: "friction", motionKey: "avoid", propKey: null, durationMs: 1600 }),
    mediation: Object.freeze({ socialCue: "mediation", motionKey: "chat", propKey: null, durationMs: 1800 })
  });

  function validResidents(ids) {
    return (ids || []).filter((id) => /^v\d{2}$/.test(String(id)));
  }

  function freezeCue({ type, id, residentIds, actorId, targetId, startsAt, source }) {
    const mapping = cueByType[type];
    const residents = validResidents(residentIds);
    if (!mapping || !/^rel-[a-z0-9-]+$/i.test(id) || residents.length < 2) return null;
    const residentId = residents.includes(actorId) ? actorId : residents[0];
    const targetResidentId = residents.includes(targetId) && targetId !== residentId
      ? targetId
      : residents.find((value) => value !== residentId);
    return Object.freeze({
      cueType: "social",
      residentId,
      animationKey: mapping.motionKey === "carry" ? "carry" : "chat",
      motionKey: mapping.motionKey,
      propKey: mapping.propKey,
      socialCue: mapping.socialCue,
      targetResidentId,
      sourceEventId: id,
      startsAt: String(startsAt || "stage"),
      durationMs: mapping.durationMs,
      source,
      immutableState: true
    });
  }

  function fromRelationshipEvent(event, options = {}) {
    return freezeCue({
      type: event?.type,
      id: String(event?.id || ""),
      residentIds: event?.residentIds,
      actorId: event?.actorId,
      targetId: event?.targetId,
      startsAt: options.startsAt || event?.slot,
      source: "local-relationship-event"
    });
  }

  function typeFromMemory(node) {
    const keywords = new Set(node?.keywords || []);
    return Object.keys(cueByType).find((type) => keywords.has(type)) || "";
  }

  function fromPublicMemory(node, options = {}) {
    const memoryId = String(node?.id || "");
    if (!memoryId.startsWith("mem-rel-")) return null;
    return freezeCue({
      type: typeFromMemory(node),
      id: memoryId.slice(4),
      residentIds: node?.residentIds,
      actorId: node?.residentId,
      targetId: validResidents(node?.residentIds).find((id) => id !== node?.residentId),
      startsAt: options.startsAt || `day-${Number(node?.day || 0)}`,
      source: "public-relationship-memory"
    });
  }

  function fromSources({ events = [], memoryNodes = [] } = {}) {
    const bySource = new Map();
    memoryNodes.forEach((node) => {
      const cue = fromPublicMemory(node);
      if (cue) bySource.set(cue.sourceEventId, cue);
    });
    events.forEach((event) => {
      const cue = fromRelationshipEvent(event);
      if (cue) bySource.set(cue.sourceEventId, cue);
    });
    return Object.freeze([...bySource.values()]);
  }

  function audit() {
    return Object.freeze({
      relationshipTypes: Object.freeze(Object.keys(cueByType)),
      missingFactTypes: Object.freeze(["gratitude", "affection", "avoidance"]),
      publicMemoryRule: "only mem-rel-* nodes with an exact relationship type keyword may create a cue",
      genericTextInference: false
    });
  }

  T.relationshipVisualCues = {
    version: "relationship-visual-cues-v0.1.8-a-readonly",
    fromRelationshipEvent,
    fromPublicMemory,
    fromSources,
    audit
  };
}());
