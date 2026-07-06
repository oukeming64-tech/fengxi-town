(function () {
  const T = window.MorningTown;
  const rules = T.activityRules;
  const townNeeds = T.actionPolicyTownNeeds || {};

  function trait(villager, key, fallback = 1) {
    return Number(villager?.traits?.[key] || fallback);
  }

  function skillScore(villager, skill) {
    const scores = {
      planting: trait(villager, "work") * 6,
      trade: trait(villager, "trade") * 7,
      accounting: trait(villager, "order") * 7 + trait(villager, "trade") * 2,
      operations: trait(villager, "order") * 6 + trait(villager, "work") * 2,
      social: trait(villager, "talk") * 7,
      repair: trait(villager, "work") * 5 + trait(villager, "order") * 2,
      field: trait(villager, "risk") * 5 + trait(villager, "quiet") * 2,
      general: 4,
      none: 0
    };
    return scores[skill] || 3;
  }

  function fatigue(villager) {
    return 100 - T.clamp(Number(villager.energy || 0), 0, 100);
  }

  function laborCapacity(villager) {
    const tired = fatigue(villager);
    if (tired <= 30) return 6;
    if (tired <= 50) return 5;
    if (tired <= 70) return 4;
    if (tired <= 90) return 2;
    return 1;
  }

  function riskTolerance(villager, activity) {
    const skillLift = Math.max(...activity.skills.map((skill) => skillScore(villager, skill))) / 8;
    const tiredPenalty = fatigue(villager) > 70 ? 2 : fatigue(villager) > 50 ? 1 : 0;
    const healthPenalty = (villager.health || 100) < 65 ? 1 : 0;
    return 2 + trait(villager, "risk") * 2 + Math.floor(skillLift) - tiredPenalty - healthPenalty;
  }

  function isAllowed(villager, activity, ctx) {
    if (activity.id === "REST-01") return true;
    const capacity = laborCapacity(villager);
    const crisis = ctx.sceneKey === "storm" || activity.tags.includes("risk");
    if (activity.laborCost > capacity && !crisis) return false;
    if ((villager.health || 100) < 45 && activity.laborCost > 1) return false;
    if (fatigue(villager) > 70 && activity.riskLevel >= 4 && !crisis) return false;
    if (fatigue(villager) > 90 && activity.laborCost > 1) return false;
    if (activity.riskLevel + Math.max(0, activity.laborCost - 2) > riskTolerance(villager, activity) + 2 && !crisis) return false;
    return true;
  }

  function scoreSeason(activity, seasonKey) {
    return rules.seasonalBoosts[seasonKey]?.includes(activity.id) ? 18 : 0;
  }

  function scoreScene(activity, ctx) {
    let score = 0;
    if (ctx.sceneKey && rules.sceneBoosts[ctx.sceneKey]?.includes(activity.id)) score += 22;
    if (ctx.scene?.weights?.[activity.legacyAction]) score += ctx.scene.weights[activity.legacyAction] * 6;
    return score;
  }

  function scoreSlot(activity, slot) {
    const conditions = activity.conditions.join(" ");
    if (slot === "清晨" && /清晨|上午|每日/.test(conditions)) return 8;
    if (slot === "午后" && /中午|下午|午后|傍晚/.test(conditions)) return 6;
    if (slot === "夜里" && /夜|晚|傍晚/.test(conditions)) return 6;
    if (slot === "夜里" && activity.laborCost >= 3 && !/夜|抢险|避难/.test(conditions)) return -10;
    return 0;
  }

  function scoreBodyNeed(villager, activity) {
    const tired = fatigue(villager);
    if (tired > 75) return activity.legacyAction === "home" || activity.laborCost <= 1 ? 22 : -18;
    if (tired > 55 && activity.laborCost >= 3) return -10;
    if ((villager.health || 100) < 70 && activity.category === "recovery") return 18;
    return 0;
  }

  function scoreTraits(villager, activity) {
    let score = activity.skills.reduce((sum, skill) => sum + skillScore(villager, skill), 0);
    if (activity.zoneCode === "AC") score += trait(villager, "order") * 8;
    if (activity.zoneCode === "GG" || activity.zoneCode === "SR") score += trait(villager, "trade") * 7;
    if (activity.zoneCode === "CH" || activity.zoneCode === "TC") score += trait(villager, "talk") * 5;
    if (activity.zoneCode === "YF") score += trait(villager, "work") * 7;
    if (activity.zoneCode === "OM") score += trait(villager, "risk") * 8;
    if (activity.zoneCode === "MF" || activity.zoneCode === "RW") score += trait(villager, "quiet") * 4 + trait(villager, "risk") * 3;
    if (activity.tags.includes("audit")) score += trait(villager, "order") * 6;
    if (activity.tags.includes("social")) score += trait(villager, "talk") * 5;
    if (activity.tags.includes("contract")) score += trait(villager, "trade") * 5 + trait(villager, "order") * 3;
    return score;
  }

  function scoreActivity(villager, activity, ctx) {
    let score = activity.baseWeight;
    const weatherRisk = Number(ctx.weather?.riskIndex || 0);
    if (ctx.preferredAction === activity.legacyAction) score += 30;
    if (ctx.preferredActivityId === activity.id) score += 40;
    score += scoreTraits(villager, activity);
    score += scoreScene(activity, ctx);
    score += scoreSeason(activity, ctx.seasonKey);
    score += scoreSlot(activity, ctx.slot);
    score += scoreBodyNeed(villager, activity);
    if (townNeeds.scoreTownNeeds) score += townNeeds.scoreTownNeeds(activity, ctx);
    if (ctx.activityCounts?.get) {
      score -= (ctx.activityCounts.get(activity.id) || 0) * 14;
      score -= (ctx.activityZoneCounts?.get(activity.zoneId) || 0) * 3;
    }
    if (weatherRisk >= 3 && activity.riskLevel >= 3) score -= weatherRisk * 4;
    if (weatherRisk >= 4 && activity.tags.includes("risk")) score += 10;
    if (ctx.weather?.type === "rainy" && (activity.tags.includes("audit") || activity.zoneCode === "AC" || activity.legacyAction === "inn")) score += 8;
    if (ctx.weather?.type === "snow" && (activity.zoneCode === "CH" || activity.zoneCode === "AC")) score += 7;
    if ((ctx.weather?.type === "heatwave" || ctx.weather?.type === "drought") && (activity.id === "YF-02" || activity.id === "RW-04")) score += 18;
    score -= Math.max(0, activity.laborCost - 1) * (fatigue(villager) > 50 ? 4 : 2);
    score -= Math.max(0, activity.riskLevel + Math.floor(weatherRisk / 2) - riskTolerance(villager, activity)) * 6;
    score += T.randomInt(-3, 3);
    return score;
  }

  function safeAlternative(activity, candidates) {
    const ids = rules.safeAlternatives[activity.id] || [];
    return ids.map((id) => rules.getActivity(id)).find((item) => item && candidates.includes(item)) || null;
  }

  function chooseFrom(scored) {
    const sorted = scored.sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, 3);
    const best = top[0];
    if (!best) return null;
    if (top.length === 1 || best.score - top[top.length - 1].score >= 5) return best;
    return T.chooseWeighted(top.map((item) => ({ value: item, weight: Math.max(1, item.score - top[top.length - 1].score + 4) })));
  }

  function normalizeContext(rawCtx = {}) {
    return {
      ...rawCtx,
      sceneKey: rawCtx.sceneKey || rawCtx.scene?.key || rawCtx.scene?.id || "daily",
      seasonKey: rawCtx.seasonKey || rawCtx.season?.key || "spring"
    };
  }

  function internalReason(villager, activity, ctx) {
    return {
      laborCapacity: laborCapacity(villager),
      fatigue: fatigue(villager),
      riskTolerance: riskTolerance(villager, activity),
      weatherRisk: Number(ctx.weather?.riskIndex || 0),
      matchedSkills: activity.skills
    };
  }

  function makePlan(selected, villager, ctx, extra = {}) {
    return {
      activity: selected.activity,
      activityId: selected.activity.id,
      legacyAction: selected.activity.legacyAction,
      score: Math.round(selected.score),
      replacedActivityId: selected.replaced || extra.replacedActivityId || "",
      internalReason: {
        ...internalReason(villager, selected.activity, ctx),
        ...(extra.internalReason || {})
      }
    };
  }

  function chooseActivity(villager, rawCtx = {}) {
    const ctx = normalizeContext(rawCtx);
    const source = rules.activities.filter((activity) => activity.id !== "REST-01");
    const allowed = source.filter((activity) => isAllowed(villager, activity, ctx));
    const candidates = allowed.length ? allowed : [rules.fallbackActivity];
    const scored = candidates.map((activity) => ({ activity, score: scoreActivity(villager, activity, ctx) }));
    let selected = chooseFrom(scored) || { activity: rules.fallbackActivity, score: 0 };

    if (!isAllowed(villager, selected.activity, ctx)) {
      const alternative = safeAlternative(selected.activity, candidates);
      if (alternative) selected = { activity: alternative, score: scoreActivity(villager, alternative, ctx), replaced: selected.activity.id };
    }

    return makePlan(selected, villager, ctx);
  }

  function auditPreferredActivity(villager, preferredActivityId, rawCtx = {}) {
    const ctx = normalizeContext(rawCtx);
    const requested = rules.getActivity(preferredActivityId);
    if (!requested) {
      return {
        decision: "rejected",
        reason: "unknown_activity",
        requestedActivityId: preferredActivityId || "",
        plan: chooseActivity(villager, { ...ctx, preferredActivityId: "" })
      };
    }

    if (isAllowed(villager, requested, ctx)) {
      return {
        decision: "accepted",
        reason: "local_policy_allowed",
        requestedActivityId: requested.id,
        plan: makePlan({
          activity: requested,
          score: scoreActivity(villager, requested, ctx)
        }, villager, ctx, {
          internalReason: { modelRequestedActivityId: requested.id }
        })
      };
    }

    const allowed = rules.activities.filter((activity) => isAllowed(villager, activity, ctx));
    const alternative = safeAlternative(requested, allowed);
    const plan = alternative
      ? makePlan({
        activity: alternative,
        score: scoreActivity(villager, alternative, ctx),
        replaced: requested.id
      }, villager, ctx, {
        internalReason: { modelRequestedActivityId: requested.id }
      })
      : chooseActivity(villager, { ...ctx, preferredAction: requested.legacyAction, preferredActivityId: "" });
    plan.replacedActivityId = plan.replacedActivityId || requested.id;

    return {
      decision: "downgraded",
      reason: "local_policy_replaced",
      requestedActivityId: requested.id,
      plan
    };
  }

  T.actionPolicy = {
    version: "action-policy-v0.3-model-audited",
    laborCapacity,
    riskTolerance,
    isAllowed,
    scoreActivity,
    chooseActivity,
    auditPreferredActivity
  };
}());
