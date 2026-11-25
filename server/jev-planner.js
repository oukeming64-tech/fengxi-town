const { createModelActionQuality } = require("./model-action-quality");
const { talkAims } = require("./conversation-aims");

const slots = { morning: "清晨", afternoon: "午后", evening: "夜里" };
const modes = {
  talk: "想和对方说说话，可能为手上的事，也可能只是想聊两句", help: "对方手里的具体工作需要搭把手",
  gift: "有合适的小物可以送给对方", appreciate: "有具体缘由，向对方表达谢意或欣赏",
  wait: "等对方忙完，不打断", avoid: "主动避开接触", none: "各忙各的，没有理由互动"
};
const model = "typesafe/jev-1.14";
const endpoint = "https://openrouter.ai/api/v1/systemone";
const slotKeys = Object.keys(slots);

function choice(instructions, criteria) {
  return { type: "choice", instructions, criteria };
}

async function callJev(body, key, timeoutMs) {
  const response = await fetch(endpoint, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(timeoutMs),
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, ...body })
  });
  if (!response.ok) throw new Error(`jev_http_${response.status}`);
  const data = await response.json();
  if (!data.answers || !data.model) throw new Error("jev_invalid_response");
  return data;
}

function createJevPlanner({ runtime, actionGuards, modelTimeoutMs, request = callJev }) {
  return async function planDay(payload) {
    const actors = payload.residents || [];
    const keys = runtime.activeKeyPool("openrouter").keys.filter((slot) => slot.provider === "openrouter");
    if (!keys.length) throw new Error("jev_requires_openrouter_key");
    const catalog = new Map((payload.actionLayer?.activities || []).map((a) => [a.id, a]));
    const perceptions = new Map((payload.cognition?.perceptionPackets || []).map((p) => [p.residentId, p]));
    const memories = new Map((payload.cognition?.memoryStream?.nodes || []).map((m) => [m.id, m]));
    const jobs = actors.map((actor) => {
      const packet = perceptions.get(actor.id) || {};
      const evidence = (packet.retrievedMemoryIds || []).map((id) => memories.get(id)).filter(Boolean);
      const state = {
        name: actor.name, location: actor.zone, health: actor.health, energy: actor.energy,
        specialties: actor.specialties, voice: actor.voiceStyle, recentActivity: actor.recentAction?.activityTitle,
        observations: evidence.map((m) => m.publicText), priorities: packet.systemPressure,
        relationships: packet.relationshipHints
      };
      return { actor, state, evidence, slots: {}, encounters: {}, target: null, mode: "unavailable", talkAim: "" };
    });
    const audit = { model, requests: 0, inputTokens: 0, outputTokens: 0, failedBatches: [], missingChoices: [], models: new Set() };
    let counter = 0;

    async function phase(name, entries, build, accept) {
      const batches = [];
      for (let i = 0; i < entries.length; i += 5) batches.push(entries.slice(i, i + 5));
      async function run(batch) {
        const questions = {};
        const people = {};
        for (const job of batch) {
          const spec = build(job);
          people[job.actor.id] = spec.state;
          Object.assign(questions, spec.questions);
        }
        if (!Object.keys(questions).length) return;
        const state = { day: payload.actionControl?.day, season: payload.stateLayer?.snapshot?.seasonLabel,
          weather: payload.stateLayer?.weather?.summary, scene: payload.scene, people };
        const key = keys[counter++ % keys.length].key;
        audit.requests++;
        let data;
        try {
          data = await request({ state, questions }, key, modelTimeoutMs);
        } catch (err) {
          audit.failedBatches.push({ phase: name, residents: batch.map((j) => j.actor.id), error: err.message });
          return;
        }
        audit.models.add(data.model);
        audit.inputTokens += Number(data.usage?.input_tokens || 0);
        audit.outputTokens += Number(data.usage?.output_tokens || 0);
        for (const [id, q] of Object.entries(questions)) {
          const answer = data.answers?.[id];
          if (answer?.type !== "choice" || !Object.hasOwn(q.criteria, answer.choice)) {
            audit.missingChoices.push(id);
            continue;
          }
          const actorId = id.split("_")[0];
          accept(batch.find((j) => j.actor.id === actorId), id.slice(actorId.length + 1), answer.choice);
        }
      }
      for (let i = 0; i < batches.length; i += 4) await Promise.all(batches.slice(i, i + 4).map(run));
    }

    await phase("schedule", jobs, (job) => {
      const questions = {};
      for (const [slot, label] of Object.entries(slots)) {
        const ids = job.actor.activityOptions?.[slot] || Array.from(catalog.keys());
        const criteria = Object.fromEntries(ids.filter((id) => catalog.has(id)).map((id) => {
          const a = catalog.get(id);
          return [id, `${a.title}（${a.zoneName || a.zoneId}）`];
        }));
        if (Object.keys(criteria).length) questions[`${job.actor.id}_${slot}`] = choice(
          `给 people.${job.actor.id} 选${label}要做的一件事。结合这位居民的专长、刚做过的事、身体和镇上眼下的需要，安排适合这个时段的工作或休息。`, criteria);
      }
      return { state: job.state, questions };
    }, (job, slot, id) => { job.slots[slot] = id; });

    // Only propose meetings at public places that both individual schedules actually include.
    for (const job of jobs) {
      if (!job.evidence.length) continue;
      for (const slot of slotKeys) {
        const own = catalog.get(job.slots[slot]);
        if (!own?.meetingPlace) continue;
        for (const other of jobs) {
          if (other === job) continue;
          const their = catalog.get(other.slots[slot]);
          if (their?.meetingPlace !== own.meetingPlace) continue;
          const id = `${slot}_${other.actor.id}`;
          job.encounters[id] = { target: other.actor.id, slot, place: own.meetingPlace,
            description: `${slots[slot]}在${own.placeLabel || own.zoneName}，${other.actor.name}做「${their.title}」，自己做「${own.title}」` };
        }
      }
    }
    const eligible = jobs.filter((j) => Object.keys(j.encounters).length);
    await phase("partner", eligible, (job) => ({
      state: job.state, questions: { [`${job.actor.id}_partner`]: choice(
        `根据 people.${job.actor.id} 今天的工作和过往经历，在列出的相遇机会里，最想什么时候找谁？独自活动也合理。`,
        { ...Object.fromEntries(Object.entries(job.encounters).map(([id, e]) => [id, e.description])), none: "今天独自活动" }) }
    }), (job, _, id) => { job.target = job.encounters[id] || null; });

    await phase("interaction", jobs.filter((j) => j.target), (job) => ({
      state: { ...job.state, encounter: job.target.description },
      questions: {
        [`${job.actor.id}_mode`]: choice(
          `在 people.${job.actor.id}.encounter 描述的相遇中，这位居民会怎样对待眼前这个人？只选择眼下具体情境支持的行为。`, modes),
        [`${job.actor.id}_aim`]: choice(
          `假如 people.${job.actor.id} 选择和眼前这个人交谈，结合两人此刻在做的事、已有经历和说话习惯，这位居民最想从这次交谈得到什么？`, talkAims)
      }
    }), (job, field, value) => {
      if (field === "mode") job.mode = value;
      else job.talkAim = value;
    });

    const rows = jobs.map((job) => {
      let interactionIntent = null;
      if (job.target && !["none", "unavailable"].includes(job.mode)) {
        const { target, slot } = job.target;
        const evidence = job.evidence.find((m) => m.residentIds.includes(target)) || job.evidence[0];
        interactionIntent = { targetResidentId: target, slot, mode: job.mode, evidenceMemoryIds: [evidence.id] };
        if (job.mode === "talk" && job.talkAim) interactionIntent.talkAim = job.talkAim;
      }
      return { residentId: job.actor.id, slots: job.slots, interactionIntent };
    });
    if (jobs.length && !rows.some((r) => Object.keys(r.slots).length)) {
      throw new Error(audit.failedBatches[0]?.error || "jev_no_valid_activities");
    }
    const output = actionGuards.normalizeActionOutput({ plans: rows }, payload);
    output.actionPlan.source = "jev";
    output.actionAudit.jev = { ...audit, models: [...audit.models], expectedSlots: 3 * jobs.length,
      missingSlots: jobs.flatMap((j) => slotKeys.filter((s) => !j.slots[s]).map((s) => `${j.actor.id}_${s}`)),
      eligibleResidents: eligible.length, selectedPartners: jobs.filter((j) => j.target).length,
      selections: jobs.filter((j) => j.target).map((j) => ({ residentId: j.actor.id, targetResidentId: j.target.target,
        slot: j.target.slot, mode: j.mode, ...(j.mode === "talk" && j.talkAim ? { talkAim: j.talkAim } : {}) })) };
    output.actionAudit.quality = createModelActionQuality().assess(output, payload, actors.map((a) => a.id));
    return output;
  };
}

module.exports = { createJevPlanner, model };
