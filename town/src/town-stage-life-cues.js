(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const motionByAnimation = Object.freeze({
    idle: "idle",
    water: "work",
    field: "work",
    repair: "work",
    carry: "carry",
    trade: "work",
    sell: "work",
    notice: "work",
    audit: "work",
    chat: "chat",
    rest: "rest"
  });

  const durationByMotion = Object.freeze({
    idle: 1800,
    work: 1100,
    carry: 900,
    chat: 1400,
    rest: 1900,
    fatigue: 2100
  });

  const activityProps = Object.freeze({
    "watering-can": new Set(["YF-02"]),
    harvest: new Set(["YF-06"]),
    repair: new Set(["YF-07", "YF-10", "YF-12", "YF-14", "RW-03", "RW-08", "OM-02", "OM-03", "OM-08", "OM-09", "OM-11", "SR-04", "SR-11", "CH-12"]),
    crate: new Set(["YF-09", "OM-05", "OM-12", "SR-01", "SR-06", "SR-09", "GG-11"]),
    trade: new Set(["TC-02", "TC-05", "TC-10", "GG-01", "GG-02", "GG-03", "GG-04", "GG-08", "GG-10", "GG-12"]),
    sell: new Set(["CH-08", "GG-05", "GG-06", "SR-05", "MF-11"]),
    notice: new Set(["YF-11", "YF-16", "TC-01", "TC-06", "TC-09", "TC-11", "CH-01", "CH-02", "CH-03", "CH-05", "CH-11", "SR-07", "SR-10"]),
    audit: new Set(["YF-08", "YF-13", "CH-09", "GG-07", "GG-09", "OM-06", "OM-10", "RW-02", "RW-12", ...Array.from({ length: 12 }, (_, index) => `AC-${String(index + 1).padStart(2, "0")}`)]),
    chat: new Set(["YF-15", "TC-03", "TC-07", "TC-08", "TC-12", "CH-06", "CH-07", "CH-10", "OM-07", "SR-02", "SR-08", "SR-12", "RW-10", "MF-10"]),
    rest: new Set(["TC-04", "MF-06", "REST-01"])
  });

  const fallbackPropByAnimation = Object.freeze({
    water: "field",
    field: "field",
    repair: "repair",
    carry: "field",
    trade: "trade",
    sell: "sell",
    notice: "notice",
    audit: "audit",
    chat: "chat",
    rest: "rest"
  });

  const labelByProp = Object.freeze({
    "watering-can": "浇水",
    harvest: "收割",
    field: "野外",
    repair: "维修",
    crate: "搬运",
    trade: "采购",
    sell: "卖货",
    notice: "公告",
    audit: "记账",
    chat: "交谈",
    rest: "休息"
  });

  function semanticMotion(event, fallback) {
    const text = `${event?.activityId || ""} ${event?.activityTitle || ""} ${event?.text || ""}`;
    if (/\u75b2|\u4f11\u517b|\u6253\u76f9|\u56f0\u5026|\u4f4e\u843d/.test(text)) return "fatigue";
    if (/\u4f11\u606f|\u5f52\u5bb6|\u7761|\u72ec\u5904/.test(text)) return "rest";
    if (/\u95f2\u804a|\u4ea4\u8c08|\u8c08\u8bdd|\u78b0\u5934|\u62dc\u8bbf|\u8c03\u89e3/.test(text)) return "chat";
    if (/\u642c|\u8fd0|\u88c5\u8d27|\u5378\u8d27|\u4ea4\u4ed8|\u6536\u7eb3/.test(text)) return "carry";
    return fallback;
  }

  function propForEvent(event, animationKey) {
    const activityId = String(event?.activityId || "").toUpperCase();
    const explicitProp = Object.entries(activityProps).find(([, activityIds]) => activityIds.has(activityId))?.[0];
    if (explicitProp) return explicitProp;
    const text = `${event?.activityId || ""} ${event?.activityTitle || ""} ${event?.text || ""}`;
    if (animationKey === "water" && /YF-02|\u6d47\u6c34|\u704c\u6e89/.test(text)) return "watering-can";
    if (animationKey === "carry" && /\u642c|\u8fd0|\u88c5\u8d27|\u5378\u8d27|\u4ea4\u4ed8|\u6536\u7eb3|\u5165\u5e93|\u51fa\u5e93|\u7269\u8d44|\u8d27/.test(text)) return "crate";
    return fallbackPropByAnimation[animationKey] || null;
  }

  function sourceEventId(event) {
    const id = String(event?.evidenceLogId || event?.sourceEventId || "").trim();
    return /^log-[a-z0-9-]+$/i.test(id) ? id : null;
  }

  function forEvent(event, options = {}) {
    const evidenceId = sourceEventId(event);
    if (!event?.residentId || !evidenceId) return null;
    const requestedKey = String(event.animationKey || "idle");
    const animationKey = Object.prototype.hasOwnProperty.call(motionByAnimation, requestedKey)
      ? requestedKey
      : "idle";
    const motionKey = semanticMotion(event, motionByAnimation[animationKey]);
    return Object.freeze({
      cueType: "life",
      residentId: event.residentId,
      animationKey,
      motionKey,
      propKey: propForEvent(event, animationKey),
      socialCue: null,
      targetResidentId: null,
      sourceEventId: evidenceId,
      startsAt: String(options.startsAt || event.slot || "stage"),
      durationMs: durationByMotion[motionKey] || durationByMotion.idle,
      source: "local-audited-action-event",
      immutableState: true
    });
  }

  function audit() {
    return Object.freeze({
      animationKeys: Object.freeze(Object.keys(motionByAnimation)),
      motionKeys: Object.freeze([...new Set(Object.values(motionByAnimation)), "fatigue"]),
      gaps: Object.freeze([
        "animationKey is currently hotspot-first rather than activity-specific",
        "fatigue has no dedicated animationKey and uses a read-only motion override",
        "preview events without an audited log id cannot produce a life cue",
        "idle uses body motion only and intentionally has no held prop"
      ])
    });
  }

  function labelFor(cue) {
    return labelByProp[cue?.propKey] || "";
  }

  T.townStageLifeCues = {
    version: "town-stage-life-cues-v0.1.8-a-readonly",
    forEvent,
    labelFor,
    audit
  };
}());
