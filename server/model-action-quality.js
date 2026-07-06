function createModelActionQuality() {
  const slotKeys = ["morning", "afternoon", "evening"];

  function topEntry(counts) {
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || ["", 0];
  }

  function increment(counts, key) {
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
  }

  function activityMap(payload) {
    const activities = [
      ...(payload.actionLayer?.activities || []),
      ...(payload.actionLayer?.sampleActivities || [])
    ];
    return new Map(activities.map((activity) => [activity.id, activity]));
  }

  function activityZone(activityId, activities) {
    const activity = activities.get(activityId);
    if (activity?.zoneId) return activity.zoneId;
    const prefix = String(activityId || "").split("-")[0];
    return prefix || "unknown";
  }

  function slotActivityCounts(plans) {
    const counts = Object.fromEntries(slotKeys.map((slotKey) => [slotKey, {}]));
    plans.forEach((plan) => {
      (plan.slotPlans || []).forEach((slot) => {
        if (counts[slot.slotKey]) increment(counts[slot.slotKey], slot.activityId);
      });
    });
    return counts;
  }

  function zoneMetrics(plans, activities) {
    const allZones = {};
    const eveningZones = {};
    plans.forEach((plan) => {
      (plan.slotPlans || []).forEach((slot) => {
        const zone = activityZone(slot.activityId, activities);
        increment(allZones, zone);
        if (slot.slotKey === "evening") increment(eveningZones, zone);
      });
    });
    return { allZones, eveningZones };
  }

  function scheduleSignature(plan) {
    return slotKeys.map((slotKey) => plan.slots?.[slotKey] || "").join("|");
  }

  function makeRetryHints(reasons, details) {
    const slotActivityCaps = slotKeys
      .map((slotKey) => {
        const top = details.slotActivityTop?.[slotKey];
        if (!top?.activityId || Number(top.count || 0) <= Number(top.limit || 0)) return null;
        return {
          slotKey,
          activityId: top.activityId,
          count: top.count,
          limit: top.limit
        };
      })
      .filter(Boolean);
    const retryHints = {
      reasons: [...new Set(reasons)]
    };
    if (slotActivityCaps.length) retryHints.slotActivityCaps = slotActivityCaps;
    const zone = details.zone || {};
    if (zone.topEveningZone && Number(zone.topEveningZoneCount || 0) > Number(zone.eveningZoneLimit || 0)) {
      retryHints.eveningZoneCap = {
        zoneId: zone.topEveningZone,
        count: zone.topEveningZoneCount,
        limit: zone.eveningZoneLimit
      };
    }
    const schedule = details.schedule || {};
    if (schedule.topSignature && Number(schedule.topSignatureCount || 0) > Number(schedule.limit || 0)) {
      retryHints.scheduleCap = {
        signature: schedule.topSignature,
        count: schedule.topSignatureCount,
        limit: schedule.limit
      };
    }
    if (reasons.includes("quality_interaction_intents_mostly_invalid") || reasons.includes("quality_unbound_reflection_notes")) {
      retryHints.interaction = {
        acceptedIntents: details.interaction?.acceptedIntents || 0,
        rejectedIntents: details.interaction?.rejectedIntents || 0,
        unboundReflections: details.interaction?.unboundReflections || 0,
        rule: "omit interactionIntent and reflectionNote unless targetResidentId, slot, mode, and evidenceMemoryIds are all valid"
      };
    }
    return retryHints;
  }

  function assess(output, payload, requestedIds) {
    const plans = output.actionPlan?.plans || [];
    const activities = activityMap(payload);
    const requestedCount = Math.max(1, requestedIds.length || plans.length || 1);
    const accepted = output.actionAudit?.accepted || {};
    const rejected = output.actionAudit?.rejected || {};
    const reasons = [];
    const details = {};

    const perSlot = slotActivityCounts(plans);
    const slotRepeatLimit = Math.max(3, Math.ceil(requestedCount * 0.5));
    details.slotActivityTop = {};
    slotKeys.forEach((slotKey) => {
      const [activityId, count] = topEntry(perSlot[slotKey]);
      const unique = Object.keys(perSlot[slotKey]).length;
      details.slotActivityTop[slotKey] = { activityId, count, unique, limit: slotRepeatLimit };
      if (plans.length >= 4 && count > slotRepeatLimit) {
        reasons.push(`quality_${slotKey}_activity_overconcentrated`);
      }
    });

    const { allZones, eveningZones } = zoneMetrics(plans, activities);
    const [topZone, topZoneCount] = topEntry(allZones);
    const [topEveningZone, topEveningZoneCount] = topEntry(eveningZones);
    const zoneUnique = Object.keys(allZones).length;
    const eveningZoneUnique = Object.keys(eveningZones).length;
    const totalSlots = plans.reduce((sum, plan) => sum + (plan.slotPlans || []).length, 0);
    details.zone = {
      topZone,
      topZoneCount,
      zoneUnique,
      totalSlots,
      topEveningZone,
      topEveningZoneCount,
      eveningZoneUnique
    };
    if (totalSlots >= 12 && zoneUnique < 3) reasons.push("quality_low_zone_variety");
    const eveningZoneLimit = Math.max(3, Math.ceil(requestedCount * 0.7));
    details.zone.eveningZoneLimit = eveningZoneLimit;
    if (plans.length >= 6 && topEveningZoneCount > eveningZoneLimit) {
      reasons.push("quality_evening_zone_overconcentrated");
    }

    const signatures = {};
    plans.forEach((plan) => increment(signatures, scheduleSignature(plan)));
    const [topSignature, topSignatureCount] = topEntry(signatures);
    const signatureLimit = Math.max(2, Math.ceil(requestedCount * 0.35));
    details.schedule = {
      topSignature,
      topSignatureCount,
      unique: Object.keys(signatures).length,
      limit: signatureLimit
    };
    if (plans.length >= 6 && topSignatureCount > signatureLimit) {
      reasons.push("quality_schedule_pattern_overrepeated");
    }

    const acceptedIntents = Number(accepted.interactionIntents || 0);
    const rejectedIntents = Number(rejected.interactionIntents || 0);
    const unboundReflections = plans.filter((plan) => plan.reflectionNote && !plan.interactionIntent).length;
    details.interaction = {
      acceptedIntents,
      rejectedIntents,
      unboundReflections
    };
    if (rejectedIntents > Math.max(2, acceptedIntents * 3)) reasons.push("quality_interaction_intents_mostly_invalid");
    if (unboundReflections > Math.max(2, acceptedIntents + 1)) reasons.push("quality_unbound_reflection_notes");

    return {
      ok: reasons.length === 0,
      reasons: [...new Set(reasons)],
      details,
      retryHints: makeRetryHints(reasons, details)
    };
  }

  return {
    assess
  };
}

module.exports = {
  createModelActionQuality
};
