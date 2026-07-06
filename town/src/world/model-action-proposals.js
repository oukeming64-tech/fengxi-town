(function () {
  const T = window.MorningTown;

  const slotLabels = ["清晨", "午后", "夜里"];
  const slotKeys = ["morning", "afternoon", "evening"];
  const riskFlags = new Set(["fatigue", "injury", "weather", "contract", "conflict", "facility", "accounting", "none"]);

  function currentSceneKey() {
    return document.getElementById("sceneSelect")?.value || "daily";
  }

  function currentSeasonKey() {
    return document.getElementById("seasonSelect")?.value || "spring";
  }

  function normalizePlans(actionPlan) {
    const source = actionPlan?.plans || actionPlan?.residents || actionPlan?.actionPlan?.plans || [];
    return Array.isArray(source) ? source : [];
  }

  function slotSource(plan, index) {
    const slots = plan?.slots || plan?.slotPlans || {};
    if (Array.isArray(slots)) {
      return slots.find((slot) => slot?.slot === slotLabels[index] || slot?.slotKey === slotKeys[index]) || slots[index] || null;
    }
    return slots[slotKeys[index]] || slots[slotLabels[index]] || null;
  }

  function activityIdFromSlot(value) {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return "";
    return value.activityId || value.mainActivityId || value.id || "";
  }

  function cleanRiskFlag(value) {
    return riskFlags.has(value) ? value : "none";
  }

  function makeContext(engine, slot, slotIndex) {
    return {
      scene: engine.state.scene,
      sceneKey: currentSceneKey(),
      season: engine.state.season,
      seasonKey: currentSeasonKey(),
      slot,
      slotIndex,
      activityCounts: new Map(),
      activityZoneCounts: new Map(),
      weather: engine.state.currentWeather,
      townState: engine.state.townState,
      state: engine.state
    };
  }

  function localPlan(engine, villager, slot, slotIndex) {
    const plan = T.actionPolicy.chooseActivity(villager, makeContext(engine, slot, slotIndex));
    return {
      decision: "missing",
      reason: "model_plan_missing",
      requestedActivityId: "",
      plan
    };
  }

  function auditSlot(engine, villager, rawPlan, slot, slotIndex, interactionAudit = null) {
    const rawSlot = slotSource(rawPlan, slotIndex);
    const originalActivityId = activityIdFromSlot(rawSlot);
    const usesInteractionIntent = interactionAudit?.accepted && interactionAudit.slotKey === slotKeys[slotIndex];
    const requestedActivityId = usesInteractionIntent ? interactionAudit.replacementActivityId : originalActivityId;
    const audit = requestedActivityId && T.actionPolicy.auditPreferredActivity
      ? T.actionPolicy.auditPreferredActivity(villager, requestedActivityId, makeContext(engine, slot, slotIndex))
      : localPlan(engine, villager, slot, slotIndex);
    const activity = audit.plan.activity || T.activityRules.getActivity(audit.plan.activityId) || T.activityRules.fallbackActivity;
    const publicGoal = rawPlan?.publicGoal || rawPlan?.goal || rawPlan?.intention || "";
    const dialogueHint = rawPlan?.dialogueHint || rawSlot?.dialogueHint || rawSlot?.visibleLine || "";
    return {
      slot,
      activityId: audit.plan.activityId,
      title: activity.title,
      shortTitle: activity.shortTitle || activity.title,
      zoneId: activity.zoneId,
      zoneName: activity.zoneName || engine.zoneName(activity.zoneId),
      intention: publicGoal || activity.outputs?.[0] || "把今天的事稳住",
      risk: activity.risks?.[0] || "临时变化",
      source: "model-action-control",
      model: {
        requestedActivityId: audit.requestedActivityId || requestedActivityId,
        originalActivityId,
        finalActivityId: audit.plan.activityId,
        decision: audit.decision,
        reason: audit.reason,
        publicGoal,
        dialogueHint,
        riskFlag: cleanRiskFlag(rawPlan?.riskFlag || rawSlot?.riskFlag || "none"),
        interactionIntent: usesInteractionIntent ? interactionAudit : null
      }
    };
  }

  function auditInteractionIntent(engine, villager, rawPlan) {
    if (!rawPlan?.interactionIntent || !T.residentCognition?.auditInteractionIntent) return null;
    const audit = T.residentCognition.auditInteractionIntent(engine, villager, rawPlan.interactionIntent, rawPlan);
    if (!audit.accepted) {
      const cognition = T.residentCognition.ensureState(engine);
      cognition.rejectedIntents.push(audit);
      if (cognition.rejectedIntents.length > 48) cognition.rejectedIntents.shift();
    }
    return audit;
  }

  function rejectInteractionAfterActionAudit(engine, villager, audit, slots) {
    if (!audit?.accepted) return audit;
    const matchedSlot = slots.find((slot) => slot.model?.interactionIntent === audit) || null;
    const acceptedByActionPolicy = matchedSlot?.model?.decision === "accepted"
      && matchedSlot?.activityId === audit.replacementActivityId;
    if (acceptedByActionPolicy) return audit;

    const cognition = T.residentCognition?.ensureState?.(engine);
    if (cognition) {
      cognition.acceptedIntents = (cognition.acceptedIntents || []).filter((item) => item !== audit);
      const cooldownKey = [villager.id, audit.targetResidentId].sort().join(":");
      if (Number(cognition.chatCooldowns?.[cooldownKey] || 0) === Number(engine.state.day || 1)) {
        delete cognition.chatCooldowns[cooldownKey];
      }
    }

    Object.assign(audit, {
      accepted: false,
      reason: `action_policy_${matchedSlot?.model?.decision || "not_applied"}`,
      replacementActivityId: ""
    });
    if (cognition) {
      cognition.rejectedIntents.push(audit);
      if (cognition.rejectedIntents.length > 48) cognition.rejectedIntents.shift();
    }
    return audit;
  }

  function applyToEngine(engine, actionPlan, serverAudit = null) {
    const residents = new Map(engine.state.villagers.map((villager) => [villager.id, villager]));
    const rawByResident = new Map();
    normalizePlans(actionPlan).forEach((plan) => {
      const id = plan?.residentId || plan?.id;
      if (residents.has(id) && !rawByResident.has(id)) rawByResident.set(id, plan);
    });

    const control = {
      day: engine.state.day,
      mode: "resident-cognition-loop-local-audited",
      serverAudit,
      cognition: engine.state.residentCognition?.lastBuild ? {
        version: engine.state.residentCognition.lastBuild.version,
        memoryNodes: engine.state.residentCognition.lastBuild.memoryStream?.nodes?.length || 0,
        scratchResidents: engine.state.residentCognition.lastBuild.residentScratch?.length || 0,
        perceptionPackets: engine.state.residentCognition.lastBuild.perceptionPackets?.length || 0
      } : null,
      townNotes: Array.isArray(actionPlan?.townNotes) ? actionPlan.townNotes : [],
      interactionIntents: [],
      reflectionCandidates: [],
      plans: []
    };

    engine.state.villagers.forEach((villager) => {
      const rawPlan = rawByResident.get(villager.id) || null;
      const interactionAudit = auditInteractionIntent(engine, villager, rawPlan);
      const slots = slotLabels.map((slot, index) => auditSlot(engine, villager, rawPlan, slot, index, interactionAudit));
      const finalInteractionAudit = rejectInteractionAfterActionAudit(engine, villager, interactionAudit, slots);
      if (finalInteractionAudit) control.interactionIntents.push(finalInteractionAudit);
      if (rawPlan?.reflectionNote) {
        control.reflectionCandidates.push({
          residentId: villager.id,
          accepted: Boolean(finalInteractionAudit?.accepted),
          evidenceMemoryIds: finalInteractionAudit?.evidenceMemoryIds || [],
          text: rawPlan.reflectionNote
        });
      }
      villager.todayPlan = {
        day: engine.state.day,
        source: "model-action-control",
        scene: engine.state.scene.label,
        weather: engine.state.currentWeather?.label || "阴天",
        modelGoal: rawPlan?.publicGoal || rawPlan?.goal || "",
        slots,
        summary: slots.map((plan) => `${plan.slot}去${plan.zoneName}，${plan.intention}。`).join(" ")
      };
      control.plans.push({
        residentId: villager.id,
        residentName: villager.name,
        publicGoal: villager.todayPlan.modelGoal,
        slots
      });
    });

    control.audit = {
      mode: "resident-cognition-loop-local-audited",
      day: engine.state.day,
      requestedResidentPlans: rawByResident.size,
      cognition: T.residentCognition?.summarizeIntents?.(control.interactionIntents) || null,
      ...T.modelActionAudit.summarize(control)
    };
    engine.state.modelActionControl = control;
    return control;
  }

  function clear(engine) {
    if (engine?.state) engine.state.modelActionControl = null;
  }

  T.modelActionProposals = {
    version: "model-action-proposals-v0.1.0-cognition-local",
    slotLabels,
    applyToEngine,
    clear
  };
}());
