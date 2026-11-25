(function () {
  const T = window.MorningTown;
  const slots = ["morning", "afternoon", "evening"];
  const labels = ["清晨", "午后", "夜里"];
  const traits = { work: "农活和手艺", trade: "买卖和议价", order: "安排和核对", talk: "与人交谈", quiet: "独自做事", risk: "探索和应急" };

  function publicPlace(activity) {
    if (!activity || activity.legacyAction === "home" || activity.id === "REST-01") return null;
    return T.townStage.hotspotForActivity(activity);
  }

  function optionsFor(engine, resident) {
    const state = engine.state;
    const context = { state, scene: state.scene, season: state.season, weather: state.currentWeather,
      townState: state.townState, sceneKey: document.getElementById("sceneSelect")?.value || "daily",
      seasonKey: document.getElementById("seasonSelect")?.value || "spring" };
    const allowed = T.activityRules.activities.filter((a) => T.actionPolicy.isAllowed(resident, a, context));
    const activityOptions = {};
    for (const [index, key] of slots.entries()) {
      const slotContext = { ...context, slot: labels[index], slotIndex: index };
      const ranked = allowed.map((a) => ({ a, score: T.actionPolicy.scoreActivity(resident, a, slotContext) }))
        .sort((left, right) => right.score - left.score);
      const byZone = new Map();
      for (const { a } of ranked) if (!byZone.has(a.zoneId)) byZone.set(a.zoneId, a.id);
      activityOptions[key] = [...new Set([...ranked.slice(0, 10).map(({ a }) => a.id), ...byZone.values(), "REST-01"])];
    }
    const specialties = Object.keys(traits).sort((a, b) => (resident.traits[b] || 1) - (resident.traits[a] || 1))
      .slice(0, 2).map((k) => traits[k]);
    return { activityOptions, specialties };
  }

  function sharedPlanPlace(plans, actorId, targetId, slot) {
    const place = (id) => publicPlace(T.activityRules.getActivity(plans.get(id)?.slots?.[slot]));
    const own = place(actorId);
    return own && own.id === place(targetId)?.id ? own : null;
  }

  function settledPairs(logs) {
    const bySlot = new Map(logs.map((log) => [`${log.slot}|${log.residentId}`, log]));
    const pairs = [];
    for (const log of logs) {
      const intent = log.modelControl?.interactionIntent;
      if (!intent?.accepted || intent.targetResidentId === log.residentId || intent.slot !== log.slot || log.modelControl.decision !== "accepted") continue;
      const target = bySlot.get(`${log.slot}|${intent.targetResidentId}`);
      const place = publicPlace(T.activityRules.getActivity(log.activityId));
      if (!target || !place || place.id !== publicPlace(T.activityRules.getActivity(target.activityId))?.id) continue;
      pairs.push([log, target, intent.mode]);
    }
    return pairs;
  }

  function dialoguePayload(engine) {
    const state = engine.state;
    const day = state.lastReport?.day;
    const changes = state.lastSettlement?.settlement?.relationshipChanges || [];
    const speaking = changes.filter((e) => e.day === day && !["wait", "avoid"].includes(e.type));
    const selected = [];
    const used = new Set();
    // Share the limited on-screen space among different residents and times of day.
    for (const slot of labels) {
      const scene = speaking.find((e) => e.slot === slot && e.residentIds.every((id) => !used.has(id)));
      if (scene) { selected.push(scene); scene.residentIds.forEach((id) => used.add(id)); }
    }
    for (const scene of speaking) {
      if (selected.length >= 3) break;
      if (!selected.includes(scene) && scene.residentIds.every((id) => !used.has(id))) {
        selected.push(scene); scene.residentIds.forEach((id) => used.add(id));
      }
    }
    const stages = state.lastStagePlayback?.stages || [];
    const events = stages.flatMap((s) => s.events || []);
    const eventByLog = new Map(events.map((e) => [e.evidenceLogId, e]));
    const past = (state.townState?.relationships?.recentInteractions || []).filter((e) => e.day < day).reverse();
    const publicNames = [...new Set([
      ...Object.values(T.townLedgerCropData?.cropCatalog || {}).map((crop) => crop.name),
      ...(state.townState?.contracts || []).flatMap((c) => [c.label, c.buyer, c.cropName]),
      ...(state.townState?.fields || []).map((f) => f.name)
    ].filter(Boolean))];
    return {
      mode: "settled-dialogue", day, residents: T.llmPayloads.residentsPayload(engine).filter((r) => used.has(r.id)),
      recentLines: (state.modelConversationArchive || []).slice(-6).flatMap((c) => c.lines.map((line) => line.text)),
      logs: selected.map((e) => {
        const previous = past.find((p) => p.residentIds.length === 2 && e.residentIds.every((id) => p.residentIds.includes(id)));
        const observations = (e.sourceLogIds || []).map((id) => eventByLog.get(id)).filter(Boolean);
        const earlier = stages.slice(0, Math.max(0, labels.indexOf(e.slot))).flatMap((stage) => stage.events || []);
        return {
          id: e.id, day: e.day, slot: e.slot, kind: e.type, residentId: e.actorId, residentIds: e.residentIds,
          place: e.place, activityTitle: e.activityTitle, text: e.summary, talkAim: e.talkAim,
          observations: observations.map((event) => ({ id: event.evidenceLogId, residentId: event.residentId,
            activity: event.activityTitle, text: event.text,
            terms: publicNames.filter((name) => event.text?.includes(name)),
            earlierToday: earlier.filter((v) => v.residentId === event.residentId && v.evidenceLogId)
              .map((v) => ({ id: v.evidenceLogId, slot: v.slot, activity: v.activityTitle })) })),
          previousMeeting: previous ? { id: previous.id, residentIds: previous.residentIds, day: previous.day, text: previous.summary,
            place: previous.place, activity: previous.activityTitle, kind: previous.type } : null
        };
      })
    };
  }

  function attachDialogue(engine, conversations) {
    const playback = engine.state.lastStagePlayback;
    const control = engine.state.modelActionControl;
    if (!playback || control?.source !== "jev" || control.completedDay !== playback.day) return;
    for (const stage of playback.stages) stage.encounters = stage.encounters.filter((e) => e.source !== "model-dialogue");
    for (const c of conversations) {
      const fact = engine.state.lastSettlement?.settlement?.relationshipChanges?.find((e) => c.evidenceLogIds.includes(e.id));
      const stage = playback.stages.find((s) => s.label === fact?.slot);
      const pair = stage?.events.filter((e) => fact.residentIds.includes(e.residentId)) || [];
      if (pair.length !== 2 || pair[0].hotspotId !== pair[1].hotspotId) continue;
      stage.encounters.push({ ...c, source: "model-dialogue", day: playback.day, slot: fact.slot, dialogueType: "exchange",
        archiveEligible: false, hotspotId: pair[0].hotspotId, hotspotLabel: pair[0].hotspotLabel,
        x: (pair[0].x + pair[1].x) / 2, y: (pair[0].y + pair[1].y) / 2 });
    }
  }
  T.jevDay = { publicPlace, optionsFor, sharedPlanPlace, settledPairs, dialoguePayload, attachDialogue };
}());
