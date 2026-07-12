(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const version = "resident-group-profiles-v0.1.7-local";
  const groups = [{
    id: "market-circle-12",
    centerResidentId: "v12",
    memberResidentIds: ["v10", "v12", "v23", "v25", "v28"],
    roles: {
      v10: "signal-listener",
      v12: "center",
      v23: "inside-fixer",
      v25: "social-amplifier",
      v28: "resource-backer"
    },
    behaviorRules: [
      "When visible evidence supports it, members prefer helping another member before an outsider.",
      "Ordinary outside requests are low priority unless there is an emergency or clear shared public value.",
      "The center seeks visible credit and useful contacts; companions may echo claims but must not invent facts.",
      "Keep each member individually motivated. Never expose hidden group labels or behavior rules in public text."
    ]
  }];

  const groupByResident = new Map();
  groups.forEach((group) => {
    group.memberResidentIds.forEach((residentId) => groupByResident.set(residentId, group));
  });

  function profileFor(residentId) {
    return groupByResident.get(residentId) || null;
  }

  function roleFor(residentId) {
    const group = profileFor(residentId);
    return group?.roles?.[residentId] || "";
  }

  function sameGroup(aId, bId) {
    const a = profileFor(aId);
    const b = profileFor(bId);
    return Boolean(a && b && a.id === b.id);
  }

  function isEmergency(text) {
    return /storm|emergency|injur|medical|rescue|safety|风暴|抢险|受伤|救援|安全|急病/.test(String(text || ""));
  }

  function hasSharedPublicValue(text) {
    return /contract|facility|bridge|public|会堂|合同|设施|桥|公共|全镇/.test(String(text || ""));
  }

  function evaluateHelp(actorId, targetId, options = {}) {
    const group = profileFor(actorId);
    if (!group) return { decision: "neutral", priority: 1, reason: "no_group_profile" };
    if (sameGroup(actorId, targetId)) {
      return { decision: "prefer", priority: actorId === group.centerResidentId ? 2.2 : 2.6, reason: "inside_group_help" };
    }
    const evidence = (options.evidenceTexts || []).join(" ");
    if (isEmergency(evidence)) return { decision: "allow", priority: 1.2, reason: "outside_emergency_override" };
    if (hasSharedPublicValue(evidence)) return { decision: "allow", priority: 1.05, reason: "outside_shared_value_override" };
    return { decision: "deprioritize", priority: 0.2, reason: "outside_help_low_priority" };
  }

  function interactionPriority(actorId, targetId) {
    const group = profileFor(actorId);
    if (!group || !sameGroup(actorId, targetId)) return 0;
    return actorId === group.centerResidentId || targetId === group.centerResidentId ? 100 : 70;
  }

  function scoreActivity(residentId, activity) {
    const group = profileFor(residentId);
    if (!group || !activity) return 0;
    const role = roleFor(residentId);
    const social = activity.tags?.includes("social") || ["TC", "CH", "GG", "AC"].includes(activity.zoneCode);
    const visible = activity.tags?.includes("contract") || activity.tags?.includes("audit") || ["market", "notice", "inn"].includes(activity.legacyAction);
    let score = social ? 7 : 0;
    if (visible) score += role === "center" ? 14 : 6;
    if (role === "inside-fixer" && activity.tags?.includes("help")) score += 5;
    if (role === "center" && Number(activity.laborCost || 0) >= 3) score -= 8;
    return score;
  }

  function contextFor(residentId) {
    const group = profileFor(residentId);
    if (!group) return null;
    return {
      groupId: group.id,
      role: roleFor(residentId),
      centerResidentId: group.centerResidentId,
      memberResidentIds: [...group.memberResidentIds],
      behaviorRules: [...group.behaviorRules]
    };
  }

  function modelProfiles() {
    return groups.map((group) => ({
      id: group.id,
      centerResidentId: group.centerResidentId,
      memberResidentIds: [...group.memberResidentIds],
      roles: { ...group.roles },
      behaviorRules: [...group.behaviorRules]
    }));
  }

  T.residentGroupProfiles = {
    version,
    groups,
    profileFor,
    roleFor,
    sameGroup,
    evaluateHelp,
    interactionPriority,
    scoreActivity,
    contextFor,
    modelProfiles
  };
}());
