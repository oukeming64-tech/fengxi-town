function createModelActionGuards({ cleanString, cleanList, safeVisibleText }) {
  const slotDefs = [
    { key: "morning", label: "清晨" },
    { key: "afternoon", label: "午后" },
    { key: "evening", label: "夜里" }
  ];
  const riskFlags = new Set(["fatigue", "injury", "weather", "contract", "conflict", "facility", "accounting", "none"]);
  const intentModes = new Set(["talk", "wait", "avoid", "help", "gift", "appreciate"]);

  function knownActivityMap(payload) {
    const activities = [
      ...(payload.actionLayer?.activities || []),
      ...(payload.actionLayer?.sampleActivities || [])
    ];
    return new Map(activities.map((activity) => [activity.id, activity]));
  }

  function knownResidentMap(payload) {
    return new Map((payload.residents || []).map((resident) => [resident.id, resident]));
  }

  function knownMemoryMap(payload) {
    return new Map((payload.cognition?.memoryStream?.nodes || []).map((node) => [node.id, node]));
  }

  function normalizeResidentId(value, residents) {
    const raw = cleanString(value, 30);
    if (!raw) return "";
    if (residents.has(raw)) return raw;

    const numeric = raw.match(/^v?0?(\d{1,2})$/i);
    if (numeric) {
      const candidate = `v${String(Number(numeric[1])).padStart(2, "0")}`;
      if (residents.has(candidate)) return candidate;
    }

    const lower = raw.toLowerCase();
    for (const resident of residents.values()) {
      if (resident.name && resident.name.toLowerCase() === lower) return resident.id;
    }
    return raw;
  }

  function slotSource(plan, def, index) {
    const slots = plan?.slots || plan?.slotPlans || (
      plan?.morning || plan?.afternoon || plan?.evening || plan?.[def.label] ? plan : {}
    );
    if (Array.isArray(slots)) {
      return slots.find((slot) => slot?.slot === def.label || slot?.slotKey === def.key) || slots[index] || null;
    }
    return slots[def.key] || slots[def.label] || null;
  }

  function activityIdFromSlot(value) {
    if (typeof value === "string") {
      const direct = cleanString(value, 80);
      const match = direct.match(/\b(?:[A-Z]{2,5}-\d{2}|REST-01)\b/i);
      return cleanString(match ? match[0].toUpperCase() : direct, 20);
    }
    if (!value || typeof value !== "object") return "";
    return activityIdFromSlot(value.activityId || value.mainActivityId || value.id || value.value || value.activity || "");
  }

  function normalizeIntentSlot(value) {
    const raw = cleanString(value, 24).toLowerCase();
    if (raw === "清晨" || raw === "morning") return "morning";
    if (raw === "午后" || raw === "下午" || raw === "afternoon") return "afternoon";
    if (raw === "夜里" || raw === "晚上" || raw === "evening" || raw === "night") return "evening";
    return "";
  }

  function normalizeInteractionIntent(plan, residentId, residents, memories, accepted, rejected) {
    const source = plan?.interactionIntent || plan?.intent || plan?.reactionIntent || null;
    if (!source || typeof source !== "object") return null;
    const targetResidentId = normalizeResidentId(source.targetResidentId || source.targetId || source.residentId, residents);
    const mode = cleanString(source.mode, 24);
    const slotKey = normalizeIntentSlot(source.slot || source.slotKey);
    const evidenceMemoryIds = cleanList(source.evidenceMemoryIds || source.memoryIds, 4, 60)
      .filter((id) => memories.has(id));

    if (!targetResidentId || !residents.has(targetResidentId) || targetResidentId === residentId) {
      rejected.interactionIntents += 1;
      return null;
    }
    if (!intentModes.has(mode) || !slotKey || !evidenceMemoryIds.length) {
      rejected.interactionIntents += 1;
      return null;
    }

    accepted.interactionIntents += 1;
    return {
      targetResidentId,
      mode,
      slot: slotKey,
      evidenceMemoryIds,
      publicNote: safeVisibleText(source.publicNote || source.note || "", 160)
    };
  }

  function normalizeSlot(value, def, index, activities, rejected) {
    const source = slotSource(value, def, index);
    const activityId = activityIdFromSlot(source);
    if (!activityId || !activities.has(activityId)) {
      rejected.slotPlans += 1;
      return null;
    }
    return {
      slot: def.label,
      slotKey: def.key,
      activityId,
      visibleLine: typeof source === "object" ? safeVisibleText(source.visibleLine || source.publicResult || "", 160) : "",
      publicReason: typeof source === "object" ? safeVisibleText(source.publicReason || source.reason || "", 160) : "",
      riskFlag: riskFlags.has(value?.riskFlag) ? value.riskFlag : (riskFlags.has(source?.riskFlag) ? source.riskFlag : "none")
    };
  }

  function sourcePlans(raw) {
    const root = raw?.actionPlan || raw?.modelActionPlan || raw || {};
    const plans = root.plans || root.rows || root.planRows || root.table || root.residents || root.actions || root.schedule || root.dailyPlans || root.actionPlans;
    if (Array.isArray(plans)) return plans.map((plan) => normalizePlanEntry("", plan));
    if (plans && typeof plans === "object") {
      return Object.entries(plans).map(([residentId, value]) => normalizePlanEntry(residentId, value));
    }

    const metadata = new Set(["day", "mode", "townNotes", "notes", "summary", "schema"]);
    return Object.entries(root)
      .filter(([key, value]) => !metadata.has(key) && value && (Array.isArray(value) || typeof value === "object"))
      .map(([residentId, value]) => normalizePlanEntry(residentId, value));
  }

  function normalizePlanEntry(residentId, value) {
    if (Array.isArray(value)) {
      const first = cleanString(value[0], 30);
      const startsWithResident = /^v?0?\d{1,2}$/i.test(first);
      return {
        residentId: startsWithResident ? first : residentId,
        slots: startsWithResident ? value.slice(1, 4) : value.slice(0, 3)
      };
    }
    if (typeof value === "string") return { residentId, slots: [value] };
    return {
      ...value,
      residentId: value?.residentId || value?.id || residentId,
      slots: value?.slots || value?.slotPlans || value?.actions || value?.activities || (
        value?.morning || value?.afternoon || value?.evening
          ? { morning: value.morning, afternoon: value.afternoon, evening: value.evening }
          : value?.slots
      )
    };
  }

  function normalizeActionOutput(raw, payload) {
    const residents = knownResidentMap(payload);
    const activities = knownActivityMap(payload);
    const memories = knownMemoryMap(payload);
    const accepted = { residentPlans: 0, slotPlans: 0, townNotes: 0, interactionIntents: 0, reflectionNotes: 0 };
    const rejected = { residentPlans: 0, slotPlans: 0, duplicateResidents: 0, interactionIntents: 0 };
    const seenResidents = new Set();

    const plans = sourcePlans(raw).map((plan) => {
      const residentId = normalizeResidentId(plan?.residentId || plan?.id, residents);
      if (!residentId || !residents.has(residentId)) {
        rejected.residentPlans += 1;
        return null;
      }
      if (seenResidents.has(residentId)) {
        rejected.duplicateResidents += 1;
        return null;
      }
      seenResidents.add(residentId);

      const slots = slotDefs.map((def, index) => normalizeSlot(plan, def, index, activities, rejected)).filter(Boolean);
      if (!slots.length) {
        rejected.residentPlans += 1;
        return null;
      }

      accepted.residentPlans += 1;
      accepted.slotPlans += slots.length;
      const interactionIntent = normalizeInteractionIntent(plan, residentId, residents, memories, accepted, rejected);
      const reflectionNote = safeVisibleText(plan?.reflectionNote || plan?.publicReflection || "", 180);
      if (reflectionNote) accepted.reflectionNotes += 1;
      return {
        residentId,
        publicGoal: safeVisibleText(plan?.publicGoal || plan?.goal || plan?.intention || "", 180),
        slots: {
          morning: slots.find((slot) => slot.slotKey === "morning")?.activityId || "",
          afternoon: slots.find((slot) => slot.slotKey === "afternoon")?.activityId || "",
          evening: slots.find((slot) => slot.slotKey === "evening")?.activityId || ""
        },
        slotPlans: slots,
        interactionIntent,
        reflectionNote,
        dialogueHint: safeVisibleText(plan?.dialogueHint || "", 160),
        riskFlag: riskFlags.has(plan?.riskFlag) ? plan.riskFlag : "none"
      };
    }).filter(Boolean).slice(0, 30);

    const root = raw?.actionPlan || raw?.modelActionPlan || raw || {};
    const townNotes = cleanList(root.townNotes, 5, 180).map((note) => safeVisibleText(note, 180)).filter(Boolean);
    accepted.townNotes = townNotes.length;

    return {
      actionPlan: {
        day: Number(root.day || payload.actionControl?.day || 0),
        mode: "candidate-action-control",
        plans,
        townNotes
      },
      actionAudit: {
        mode: "model-action-control-server-normalized",
        accepted,
        rejected,
        immutableState: true
      }
    };
  }

  function actionPlanHasContent(output) {
    return Boolean(output?.actionPlan?.plans?.length);
  }

  return {
    normalizeActionOutput,
    actionPlanHasContent
  };
}

module.exports = {
  createModelActionGuards
};
