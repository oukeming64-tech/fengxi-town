var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/model-action-quality.js
var require_model_action_quality = __commonJS({
  "server/model-action-quality.js"(exports, module) {
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
          ...payload.actionLayer?.activities || [],
          ...payload.actionLayer?.sampleActivities || []
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
        const slotActivityCaps = slotKeys.map((slotKey) => {
          const top = details.slotActivityTop?.[slotKey];
          if (!top?.activityId || Number(top.count || 0) <= Number(top.limit || 0)) return null;
          return {
            slotKey,
            activityId: top.activityId,
            count: top.count,
            limit: top.limit
          };
        }).filter(Boolean);
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
  }
});

// server/conversation-aims.js
var require_conversation_aims = __commonJS({
  "server/conversation-aims.js"(exports, module) {
    var talkAims = Object.freeze({
      pass_time: "正好碰见，随口聊两句，享受有人作伴",
      check_in: "惦记对方此刻怎么样，给对方说说自己的机会",
      tease: "抓住眼前一个两人都看得懂的趣处，逗对方一句",
      sound_out: "想听对方的真心话，试探对方肯不肯或在不在意",
      compare_notes: "自己只知道一部分，想和对方拼出另一半消息",
      ask_advice: "自己拿不准一件事，想听这一个人怎么判断",
      disagree: "对眼前的事有不同看法，想提出来或纠正一个误会",
      bargain: "在一件有得商量的事上试试对方的条件或底线",
      invite: "想请对方一起做件事，给对方答应、犹豫或婉拒的余地",
      open: "没有更具体的来意，顺着眼前的情形开口"
    });
    module.exports = { talkAims };
  }
});

// server/jev-planner.js
var require_jev_planner = __commonJS({
  "server/jev-planner.js"(exports, module) {
    var { createModelActionQuality } = require_model_action_quality();
    var { talkAims } = require_conversation_aims();
    var slots = { morning: "清晨", afternoon: "午后", evening: "夜里" };
    var modes = {
      talk: "想和对方说说话，可能为手上的事，也可能只是想聊两句",
      help: "对方手里的具体工作需要搭把手",
      gift: "有合适的小物可以送给对方",
      appreciate: "有具体缘由，向对方表达谢意或欣赏",
      wait: "等对方忙完，不打断",
      avoid: "主动避开接触",
      none: "各忙各的，没有理由互动"
    };
    var model = "typesafe/jev-1.14";
    var endpoint = "https://openrouter.ai/api/v1/systemone";
    var slotKeys = Object.keys(slots);
    function choice(instructions, criteria) {
      return { type: "choice", instructions, criteria };
    }
    async function callJev(body, key, timeoutMs) {
      const response = await fetch(endpoint, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, ...body })
      });
      if (!response.ok) throw new Error(`jev_http_${response.status}`);
      const data = await response.json();
      if (!data.answers || !data.model) throw new Error("jev_invalid_response");
      return data;
    }
    function createJevPlanner({ runtime: runtime2, actionGuards: actionGuards2, modelTimeoutMs: modelTimeoutMs2, request = callJev }) {
      return async function planDay(payload) {
        const actors = payload.residents || [];
        const keys = runtime2.activeKeyPool("openrouter").keys.filter((slot) => slot.provider === "openrouter");
        if (!keys.length) throw new Error("jev_requires_openrouter_key");
        const catalog = new Map((payload.actionLayer?.activities || []).map((a) => [a.id, a]));
        const perceptions = new Map((payload.cognition?.perceptionPackets || []).map((p) => [p.residentId, p]));
        const memories = new Map((payload.cognition?.memoryStream?.nodes || []).map((m) => [m.id, m]));
        const jobs = actors.map((actor) => {
          const packet = perceptions.get(actor.id) || {};
          const evidence = (packet.retrievedMemoryIds || []).map((id) => memories.get(id)).filter(Boolean);
          const state = {
            name: actor.name,
            location: actor.zone,
            health: actor.health,
            energy: actor.energy,
            specialties: actor.specialties,
            voice: actor.voiceStyle,
            recentActivity: actor.recentAction?.activityTitle,
            observations: evidence.map((m) => m.publicText),
            priorities: packet.systemPressure,
            relationships: packet.relationshipHints
          };
          return { actor, state, evidence, slots: {}, encounters: {}, target: null, mode: "unavailable", talkAim: "" };
        });
        const audit = { model, requests: 0, inputTokens: 0, outputTokens: 0, failedBatches: [], missingChoices: [], models: /* @__PURE__ */ new Set() };
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
            const state = {
              day: payload.actionControl?.day,
              season: payload.stateLayer?.snapshot?.seasonLabel,
              weather: payload.stateLayer?.weather?.summary,
              scene: payload.scene,
              people
            };
            const key = keys[counter++ % keys.length].key;
            audit.requests++;
            let data;
            try {
              data = await request({ state, questions }, key, modelTimeoutMs2);
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
              `给 people.${job.actor.id} 选${label}要做的一件事。结合这位居民的专长、刚做过的事、身体和镇上眼下的需要，安排适合这个时段的工作或休息。`,
              criteria
            );
          }
          return { state: job.state, questions };
        }, (job, slot, id) => {
          job.slots[slot] = id;
        });
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
              job.encounters[id] = {
                target: other.actor.id,
                slot,
                place: own.meetingPlace,
                description: `${slots[slot]}在${own.placeLabel || own.zoneName}，${other.actor.name}做「${their.title}」，自己做「${own.title}」`
              };
            }
          }
        }
        const eligible = jobs.filter((j) => Object.keys(j.encounters).length);
        await phase("partner", eligible, (job) => ({
          state: job.state,
          questions: { [`${job.actor.id}_partner`]: choice(
            `根据 people.${job.actor.id} 今天的工作和过往经历，在列出的相遇机会里，最想什么时候找谁？独自活动也合理。`,
            { ...Object.fromEntries(Object.entries(job.encounters).map(([id, e]) => [id, e.description])), none: "今天独自活动" }
          ) }
        }), (job, _, id) => {
          job.target = job.encounters[id] || null;
        });
        await phase("interaction", jobs.filter((j) => j.target), (job) => ({
          state: { ...job.state, encounter: job.target.description },
          questions: {
            [`${job.actor.id}_mode`]: choice(
              `在 people.${job.actor.id}.encounter 描述的相遇中，这位居民会怎样对待眼前这个人？只选择眼下具体情境支持的行为。`,
              modes
            ),
            [`${job.actor.id}_aim`]: choice(
              `假如 people.${job.actor.id} 选择和眼前这个人交谈，结合两人此刻在做的事、已有经历和说话习惯，这位居民最想从这次交谈得到什么？`,
              talkAims
            )
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
        const output = actionGuards2.normalizeActionOutput({ plans: rows }, payload);
        output.actionPlan.source = "jev";
        output.actionAudit.jev = {
          ...audit,
          models: [...audit.models],
          expectedSlots: 3 * jobs.length,
          missingSlots: jobs.flatMap((j) => slotKeys.filter((s) => !j.slots[s]).map((s) => `${j.actor.id}_${s}`)),
          eligibleResidents: eligible.length,
          selectedPartners: jobs.filter((j) => j.target).length,
          selections: jobs.filter((j) => j.target).map((j) => ({
            residentId: j.actor.id,
            targetResidentId: j.target.target,
            slot: j.target.slot,
            mode: j.mode,
            ...j.mode === "talk" && j.talkAim ? { talkAim: j.talkAim } : {}
          }))
        };
        output.actionAudit.quality = createModelActionQuality().assess(output, payload, actors.map((a) => a.id));
        return output;
      };
    }
    module.exports = { createJevPlanner, model };
  }
});

// server/model-json.js
var require_model_json = __commonJS({
  "server/model-json.js"(exports, module) {
    function extractFirstJsonValue(text, openChar) {
      const start = text.indexOf(openChar);
      if (start < 0) return "";
      const stack = [];
      let inString = false;
      let escape = false;
      for (let index = start; index < text.length; index += 1) {
        const char = text[index];
        if (inString) {
          if (escape) {
            escape = false;
          } else if (char === "\\") {
            escape = true;
          } else if (char === '"') {
            inString = false;
          }
          continue;
        }
        if (char === '"') {
          inString = true;
          continue;
        }
        if (char === "{" || char === "[") {
          stack.push(char);
          continue;
        }
        if (char !== "}" && char !== "]") continue;
        const open = stack.pop();
        if (char === "}" && open !== "{" || char === "]" && open !== "[") return "";
        if (!stack.length) return text.slice(start, index + 1);
      }
      return "";
    }
    function stripJsonFence(text) {
      const trimmed = String(text || "").trim();
      const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fenced) return fenced[1].trim();
      const extracted = extractFirstJsonValue(trimmed, "{") || extractFirstJsonValue(trimmed, "[");
      if (extracted) return extracted;
      return trimmed;
    }
    function repairLikelyJson(text) {
      return String(text || "").replace(/^\uFEFF/, "").replace(/,\s*([}\]])/g, "$1").replace(/}\s*{/g, "},{").replace(/]\s*"/g, '],"').replace(/"\s*{/g, '",{').replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
    }
    function parseModelJson(text) {
      const stripped = stripJsonFence(text);
      try {
        return JSON.parse(stripped);
      } catch (firstError) {
        try {
          return JSON.parse(repairLikelyJson(stripped));
        } catch (secondError) {
          const error = new Error(secondError.message || firstError.message || "invalid_model_json");
          error.cause = secondError;
          error.originalMessage = firstError.message;
          throw error;
        }
      }
    }
    module.exports = {
      parseModelJson
    };
  }
});

// server/model-output-guards.js
var require_model_output_guards = __commonJS({
  "server/model-output-guards.js"(exports, module) {
    function createModelOutputGuards({ cleanString, cleanText, cleanList, forbiddenWords }) {
      function safeVisibleText(text, limit = 520) {
        const value = cleanText(text, limit);
        if (!value) return "";
        if (forbiddenWords.some((word) => value.includes(word))) return "";
        if (/[<>]/.test(value)) return "";
        return value;
      }
      function knownResidentMap(payload) {
        return new Map((payload.residents || []).map((resident) => [resident.id, resident]));
      }
      function dialogueLineText(rawText, speakerName) {
        let value = safeVisibleText(rawText, 110);
        if (!value) return "";
        const chineseQuoteStart = value.lastIndexOf("：“");
        const chineseQuoteEnd = value.lastIndexOf("”");
        if (chineseQuoteStart >= 0 && chineseQuoteEnd > chineseQuoteStart + 2) {
          value = value.slice(chineseQuoteStart + 2, chineseQuoteEnd).trim();
        }
        [`${speakerName}：`, `${speakerName}:`].forEach((prefix) => {
          if (prefix.length > 1 && value.startsWith(prefix)) value = value.slice(prefix.length).trim();
        });
        return safeVisibleText(value, 110);
      }
      function resolveResidentId(value, residents) {
        const raw = cleanString(value, 40);
        if (!raw) return "";
        if (residents.has(raw)) return raw;
        const lower = raw.toLowerCase();
        for (const resident of residents.values()) {
          if (resident.name.toLowerCase() === lower) return resident.id;
        }
        return "";
      }
      function shadowHasContent(shadow) {
        return Boolean(
          shadow?.conversations?.length || shadow?.weeklyReport?.sections?.length || shadow?.riskNotes?.length
        );
      }
      function logResidentIds(log) {
        return [
          cleanString(log?.residentId, 40),
          cleanString(log?.actorId, 40),
          cleanString(log?.targetResidentId, 40),
          ...cleanList(log?.residentIds, 4, 40)
        ].filter(Boolean);
      }
      function buildEvidenceResidents(logs) {
        return new Map((logs || []).map((log) => [
          cleanString(log?.id, 40),
          new Set(logResidentIds(log))
        ]).filter(([id]) => id));
      }
      function normalizeModelOutput(raw, payload) {
        const result = raw && typeof raw === "object" ? raw : {};
        const payloadLogs = Array.isArray(payload.logs) ? payload.logs : [];
        const logIds = new Set(payloadLogs.map((log) => log.id));
        const sectionIndexes = new Set((payload.report?.sections || []).map((section) => section.index));
        const residents = knownResidentMap(payload);
        const accepted = { logs: 0, reportSections: 0, conversations: 0, weeklySections: 0, riskNotes: 0 };
        const logs = Array.isArray(result.logs) ? result.logs.map((log) => {
          const id = cleanString(log?.id, 40);
          const text = safeVisibleText(log?.text, 280);
          if (!id || !logIds.has(id) || !text) return null;
          accepted.logs += 1;
          return { id, text };
        }).filter(Boolean).slice(0, 36) : [];
        const reportSections = Array.isArray(result.reportSections) ? result.reportSections.map((section) => {
          const index = Number(section?.index);
          if (!Number.isInteger(index) || !sectionIndexes.has(index)) return null;
          const title = safeVisibleText(section?.title, 40);
          const body = safeVisibleText(section?.body, 460);
          const list = Array.isArray(section?.list) ? section.list.map((item) => safeVisibleText(item, 220)).filter(Boolean).slice(0, 6) : null;
          if (!title && !body && (!list || !list.length)) return null;
          accepted.reportSections += 1;
          return { index, title, body, list };
        }).filter(Boolean) : [];
        const shadow = normalizeShadow(result.shadow || result.modelShadow || result, payload, residents, accepted);
        return {
          logs,
          reportSections,
          shadow,
          audit: {
            mode: "weekly-timeline-shadow-local-immutable",
            accepted,
            immutableState: true
          }
        };
      }
      function normalizeShadow(source, payload, residents, accepted) {
        const logs = Array.isArray(payload.logs) ? payload.logs : [];
        const logIds = new Set(logs.map((log) => log.id));
        const evidenceResidents = buildEvidenceResidents(logs);
        const conversations = Array.isArray(source.conversations) ? source.conversations.map((item, index) => {
          const residentIds = [
            ...cleanList(item?.residentIds, 3, 40),
            ...cleanList(item?.residents, 3, 40)
          ].map((id) => resolveResidentId(id, residents)).filter(Boolean).slice(0, 3);
          const conversationResidents = new Set(residentIds);
          const evidenceLogIds = cleanList(item?.evidenceLogIds, 4, 40).filter((id) => {
            if (!logIds.has(id)) return false;
            const logResidents = evidenceResidents.get(id);
            return Boolean(logResidents && residentIds.some((residentId) => logResidents.has(residentId)));
          });
          const lines = Array.isArray(item?.lines) ? item.lines.map((line) => {
            const speakerId = resolveResidentId(line?.speakerId || line?.speakerName || line?.speaker, residents);
            if (!speakerId || !conversationResidents.has(speakerId)) return null;
            const speakerName = residents.get(speakerId).name;
            const text = dialogueLineText(line?.text, speakerName);
            if (!text) return null;
            return {
              speakerId,
              speakerName,
              text
            };
          }).filter(Boolean).slice(0, 5) : [];
          const title = safeVisibleText(item?.title, 36) || `镇上对话 ${index + 1}`;
          const place = safeVisibleText(item?.place, 30) || "镇上";
          const note = safeVisibleText(item?.note, 160);
          if (residentIds.length < 2 || lines.length < 2 || !evidenceLogIds.length) return null;
          accepted.conversations += 1;
          return {
            id: cleanString(item?.id, 40) || `shadow-conv-${index + 1}`,
            title,
            place,
            residentIds,
            evidenceLogIds,
            lines,
            note
          };
        }).filter(Boolean).slice(0, 4) : [];
        const weeklySource = source.weeklyReport && typeof source.weeklyReport === "object" ? source.weeklyReport : {};
        const weeklySections = Array.isArray(weeklySource.sections) ? weeklySource.sections.map((section) => {
          const title = safeVisibleText(section?.title, 36);
          const body = safeVisibleText(section?.body, 360);
          if (!title || !body) return null;
          accepted.weeklySections += 1;
          return { title, body };
        }).filter(Boolean).slice(0, 4) : [];
        const allowedRiskTypes = /* @__PURE__ */ new Set(["fatigue", "conflict", "weather", "contract", "facility", "accounting", "none"]);
        const riskNotes = Array.isArray(source.riskNotes) ? source.riskNotes.map((item) => {
          const type = cleanString(item?.type, 20);
          const summary = safeVisibleText(item?.summary, 180);
          if (!allowedRiskTypes.has(type) || !summary) return null;
          accepted.riskNotes += 1;
          return {
            type,
            residentIds: cleanList(item?.residentIds, 3, 40).map((id) => resolveResidentId(id, residents)).filter(Boolean),
            summary
          };
        }).filter(Boolean).slice(0, 5) : [];
        return {
          conversations,
          weeklyReport: {
            weekId: cleanString(weeklySource.weekId, 40) === payload.weekly.weekId ? cleanString(weeklySource.weekId, 40) : payload.weekly.weekId,
            immutableState: payload.weekly.immutableState === true,
            title: safeVisibleText(weeklySource.title, 42) || `${payload.weekly.range || "最近几天"}互动周报`,
            range: safeVisibleText(weeklySource.range, 40) || payload.weekly.range || "",
            sections: weeklySections,
            hooks: cleanList(weeklySource.hooks, 5, 140).map((hook) => safeVisibleText(hook, 140)).filter(Boolean)
          },
          riskNotes
        };
      }
      return {
        safeVisibleText,
        knownResidentMap,
        normalizeModelOutput,
        normalizeShadow,
        shadowHasContent
      };
    }
    module.exports = {
      createModelOutputGuards
    };
  }
});

// server/model-cognition-payload-cleaner.js
var require_model_cognition_payload_cleaner = __commonJS({
  "server/model-cognition-payload-cleaner.js"(exports, module) {
    function createCognitionPayloadCleaner({
      cleanString,
      cleanList,
      safeVisibleText
    } = {}) {
      function cleanMemoryNode(node) {
        if (!node || typeof node !== "object") return null;
        const id = cleanString(node.id, 60);
        const publicText = safeVisibleText(node.publicText, 220);
        if (!id || !publicText) return null;
        return {
          id,
          residentId: cleanString(node.residentId || "town", 12),
          day: Number(node.day || 0),
          type: cleanString(node.type || "event", 20),
          publicText,
          sourceLogIds: cleanList(node.sourceLogIds, 4, 40),
          residentIds: cleanList(node.residentIds, 4, 12),
          zoneId: cleanString(node.zoneId, 40),
          keywords: cleanList(node.keywords, 8, 24),
          salience: Number(node.salience || 1),
          expiresAfterDay: Number(node.expiresAfterDay || 0)
        };
      }
      function cleanResidentScratch(item) {
        if (!item || typeof item !== "object") return null;
        const residentId = cleanString(item.residentId, 12);
        if (!residentId) return null;
        return {
          residentId,
          day: Number(item.day || 0),
          currentZoneId: cleanString(item.currentZoneId, 40),
          currentActionId: cleanString(item.currentActionId, 20),
          todayGoal: safeVisibleText(item.todayGoal, 180),
          slotPlan: cleanList(item.slotPlan, 3, 20),
          fatiguePressure: cleanString(item.fatiguePressure, 12),
          healthPressure: cleanString(item.healthPressure, 12),
          chatCooldowns: Array.isArray(item.chatCooldowns) ? item.chatCooldowns.slice(0, 5).map((cooldown) => ({
            residentId: cleanString(cooldown.residentId, 12),
            days: Number(cooldown.days || 0)
          })).filter((cooldown) => cooldown.residentId) : [],
          recentMemoryIds: cleanList(item.recentMemoryIds, 6, 60)
        };
      }
      function cleanPerceptionPacket(item) {
        if (!item || typeof item !== "object") return null;
        const residentId = cleanString(item.residentId, 12);
        if (!residentId) return null;
        const group = item.groupContext && typeof item.groupContext === "object" ? item.groupContext : null;
        return {
          residentId,
          day: Number(item.day || 0),
          visibleZone: cleanString(item.visibleZone, 40),
          nearbyResidentIds: cleanList(item.nearbyResidentIds, 8, 12),
          publicEvents: cleanList(item.publicEvents, 5, 180).map((event) => safeVisibleText(event, 180)).filter(Boolean),
          retrievedMemoryIds: cleanList(item.retrievedMemoryIds, 6, 60),
          relationshipHints: cleanList(item.relationshipHints, 6, 120),
          systemPressure: cleanList(item.systemPressure, 8, 40),
          groupContext: group ? {
            groupId: cleanString(group.groupId, 40),
            role: cleanString(group.role, 40),
            centerResidentId: cleanString(group.centerResidentId, 12),
            memberResidentIds: cleanList(group.memberResidentIds, 8, 12),
            behaviorRules: cleanList(group.behaviorRules, 6, 220).map((rule) => safeVisibleText(rule, 220)).filter(Boolean)
          } : null
        };
      }
      function cleanGroupProfile(group) {
        if (!group || typeof group !== "object") return null;
        const id = cleanString(group.id, 40);
        const memberResidentIds = cleanList(group.memberResidentIds, 8, 12);
        if (!id || memberResidentIds.length < 2) return null;
        const roles = {};
        memberResidentIds.forEach((residentId) => {
          const role = cleanString(group.roles?.[residentId], 40);
          if (role) roles[residentId] = role;
        });
        return {
          id,
          centerResidentId: cleanString(group.centerResidentId, 12),
          memberResidentIds,
          roles,
          behaviorRules: cleanList(group.behaviorRules, 6, 220).map((rule) => safeVisibleText(rule, 220)).filter(Boolean)
        };
      }
      function cleanInteractionIntent(intent) {
        return {
          residentId: cleanString(intent.residentId, 12),
          targetResidentId: cleanString(intent.targetResidentId, 12),
          mode: cleanString(intent.mode, 24),
          modeLabel: safeVisibleText(intent.modeLabel, 40),
          slot: cleanString(intent.slot, 20),
          evidenceMemoryIds: cleanList(intent.evidenceMemoryIds, 4, 60),
          publicSummary: safeVisibleText(intent.publicSummary, 180)
        };
      }
      function cleanCognitionPayload(cognition) {
        if (!cognition || typeof cognition !== "object") return null;
        const memoryNodes = Array.isArray(cognition.memoryStream?.nodes) ? cognition.memoryStream.nodes.map(cleanMemoryNode).filter(Boolean).slice(0, 120) : [];
        return {
          version: cleanString(cognition.version, 80),
          mode: cleanString(cognition.mode || "resident-cognition-loop-local-public", 60),
          rule: safeVisibleText(cognition.rule, 260),
          allowedIntentModes: cleanList(cognition.allowedIntentModes, 8, 24),
          memoryStream: {
            version: cleanString(cognition.memoryStream?.version, 80),
            day: Number(cognition.memoryStream?.day || 0),
            mode: cleanString(cognition.memoryStream?.mode, 60),
            nodes: memoryNodes
          },
          residentScratch: Array.isArray(cognition.residentScratch) ? cognition.residentScratch.map(cleanResidentScratch).filter(Boolean).slice(0, 30) : [],
          perceptionPackets: Array.isArray(cognition.perceptionPackets) ? cognition.perceptionPackets.map(cleanPerceptionPacket).filter(Boolean).slice(0, 30) : [],
          groupProfiles: Array.isArray(cognition.groupProfiles) ? cognition.groupProfiles.map(cleanGroupProfile).filter(Boolean).slice(0, 6) : [],
          acceptedInteractionIntents: Array.isArray(cognition.acceptedInteractionIntents) ? cognition.acceptedInteractionIntents.slice(0, 12).map(cleanInteractionIntent).filter((intent) => intent.residentId && intent.targetResidentId && intent.mode) : [],
          expectedCandidateFields: cognition.expectedCandidateFields && typeof cognition.expectedCandidateFields === "object" ? cognition.expectedCandidateFields : null
        };
      }
      return {
        cleanCognitionPayload
      };
    }
    module.exports = {
      createCognitionPayloadCleaner
    };
  }
});

// server/model-state-payload-cleaner.js
var require_model_state_payload_cleaner = __commonJS({
  "server/model-state-payload-cleaner.js"(exports, module) {
    function createModelStatePayloadCleaner({
      cleanString,
      cleanList
    } = {}) {
      function cleanLedgerSummary(value) {
        if (!value || typeof value !== "object") return null;
        return {
          cashYsc: Number(value.cashYsc || 0),
          receivableYsc: Number(value.receivableYsc || 0),
          payableYsc: Number(value.payableYsc || 0),
          debtYsc: Number(value.debtYsc || 0),
          debtPrincipalYsc: Number(value.debtPrincipalYsc || value.principalYsc || 0),
          overdueWeeks: Number(value.overdueWeeks || 0),
          currentInterestRate: Number(value.currentInterestRate || 0),
          nextInterestDay: Number(value.nextInterestDay || value.interestStartDay || 0),
          accountingTransparency: Number(value.accountingTransparency || 0),
          goldkinDependency: Number(value.goldkinDependency || 0),
          cooperativeTrust: Number(value.cooperativeTrust || 0),
          townReputation: Number(value.townReputation || 0)
        };
      }
      function cleanLedgerDelta(value) {
        if (!value || typeof value !== "object") return null;
        return {
          cashYsc: Number(value.cashYsc || 0),
          receivableYsc: Number(value.receivableYsc || 0),
          payableYsc: Number(value.payableYsc || 0),
          debtYsc: Number(value.debtYsc || 0),
          accountingTransparency: Number(value.accountingTransparency || 0),
          goldkinDependency: Number(value.goldkinDependency || 0),
          cooperativeTrust: Number(value.cooperativeTrust || 0),
          townReputation: Number(value.townReputation || 0)
        };
      }
      function cleanDebtSettlement(value) {
        if (!value || typeof value !== "object") return null;
        return {
          weekNumber: Number(value.weekNumber || 0),
          startDay: Number(value.startDay || 0),
          endDay: Number(value.endDay || 0),
          status: cleanString(value.status, 20),
          interestEligible: value.interestEligible === true,
          interestStartDay: Number(value.interestStartDay || 0),
          baseInterestRate: Number(value.baseInterestRate || 0),
          currentInterestRate: Number(value.currentInterestRate || 0),
          nextInterestRate: Number(value.nextInterestRate || 0),
          scheduledPaymentYsc: Number(value.scheduledPaymentYsc || 0),
          paidThisWeekYsc: Number(value.paidThisWeekYsc || 0),
          interestAccruedYsc: Number(value.interestAccruedYsc || 0),
          unpaidYsc: Number(value.unpaidYsc || 0),
          remainingDebtYsc: Number(value.remainingDebtYsc || 0),
          overdueWeeks: Number(value.overdueWeeks || 0),
          debtPressure: cleanString(value.debtPressure, 30),
          goldkinLeverage: Number(value.goldkinLeverage || 0),
          note: cleanString(value.note, 220)
        };
      }
      function cleanWeeklyLocalReport(value) {
        if (!value || typeof value !== "object") return null;
        const sections = value.sections && typeof value.sections === "object" ? value.sections : {};
        return {
          title: cleanString(value.title, 60),
          oneLine: cleanString(value.oneLine, 260),
          sections: {
            keyInteractions: cleanList(sections.keyInteractions, 5, 220),
            ledgerTrend: cleanList(sections.ledgerTrend, 4, 220),
            facilityContractChanges: cleanList(sections.facilityContractChanges, 6, 220),
            unresolvedHooks: cleanList(sections.unresolvedHooks, 5, 220),
            nextPressure: cleanList(sections.nextPressure, 4, 220)
          }
        };
      }
      function cleanSnapshot(snapshot) {
        if (!snapshot || typeof snapshot !== "object") return null;
        return {
          day: Number(snapshot.day || 0),
          seasonLabel: cleanString(snapshot.seasonLabel, 20),
          promptBrief: cleanString(snapshot.promptBrief, 360),
          ledger: snapshot.ledger && typeof snapshot.ledger === "object" ? {
            cashYsc: Number(snapshot.ledger.cashYsc || 0),
            debtYsc: Number(snapshot.ledger.debtYsc || 0),
            receivableYsc: Number(snapshot.ledger.receivableYsc || 0),
            payableYsc: Number(snapshot.ledger.payableYsc || 0),
            accountingTransparency: Number(snapshot.ledger.accountingTransparency || 0),
            goldkinDependency: Number(snapshot.ledger.goldkinDependency || 0),
            debt: cleanDebtSettlement(snapshot.ledger.debt?.lastSettlement) || (snapshot.ledger.debt ? {
              interestStartDay: Number(snapshot.ledger.debt.interestStartDay || 0),
              principalYsc: Number(snapshot.ledger.debt.principalYsc || 0),
              baseInterestRate: Number(snapshot.ledger.debt.baseInterestRate || 0),
              currentInterestRate: Number(snapshot.ledger.debt.currentInterestRate || 0),
              overdueWeeks: Number(snapshot.ledger.debt.overdueWeeks || 0),
              debtPressure: cleanString(snapshot.ledger.debt.debtPressure, 30),
              goldkinLeverage: Number(snapshot.ledger.debt.goldkinLeverage || 0)
            } : null)
          } : null,
          processing: snapshot.processing && typeof snapshot.processing === "object" ? {
            lotsCreated: Number(snapshot.processing.lotsCreated || 0),
            lastRunDay: Number(snapshot.processing.lastRunDay || 0),
            proficiency: Array.isArray(snapshot.processing.proficiency) ? snapshot.processing.proficiency.slice(0, 6).map((item) => ({
              id: cleanString(item.id, 40),
              level: Number(item.level || 0),
              runs: Number(item.runs || 0)
            })) : []
          } : null,
          facilities: snapshot.facilities && typeof snapshot.facilities === "object" && Array.isArray(snapshot.facilities.facilities) ? snapshot.facilities.facilities.slice(0, 6).map((facility) => ({
            name: cleanString(facility.name, 40),
            level: Number(facility.level || 0),
            condition: Number(facility.condition || 0)
          })) : [],
          market: snapshot.market && typeof snapshot.market === "object" ? {
            seasonalDay: Number(snapshot.market.seasonalDay || 0),
            festival: snapshot.market.festival && typeof snapshot.market.festival === "object" ? cleanString(snapshot.market.festival.name, 40) : "",
            notes: cleanList(snapshot.market.notes, 3, 180)
          } : null,
          contracts: Array.isArray(snapshot.contracts) ? snapshot.contracts.slice(0, 6).map((contract) => ({
            label: cleanString(contract.label, 50),
            buyer: cleanString(contract.buyer, 40),
            channel: cleanString(contract.channel, 40),
            cropName: cleanString(contract.cropName, 40),
            delivered: cleanString(contract.delivered, 20),
            dueDay: Number(contract.dueDay || 0),
            status: cleanString(contract.status, 20)
          })) : [],
          contractBids: Array.isArray(snapshot.contractBids) ? snapshot.contractBids.slice(0, 4).map((bid) => ({
            buyer: cleanString(bid.buyer, 40),
            cropName: cleanString(bid.cropName, 40),
            quantity: Number(bid.quantity || 0),
            dueDay: Number(bid.dueDay || 0)
          })) : [],
          consignmentDisputes: Array.isArray(snapshot.consignmentDisputes) ? snapshot.consignmentDisputes.slice(-3).map((item) => ({
            status: cleanString(item.status, 20),
            amountYsc: Number(item.amountYsc || 0),
            detail: cleanString(item.detail, 160)
          })) : [],
          relationships: snapshot.relationships && typeof snapshot.relationships === "object" ? {
            summary: snapshot.relationships.summary && typeof snapshot.relationships.summary === "object" ? {
              activePairCount: Number(snapshot.relationships.summary.activePairCount || 0),
              recentInteractionCount: Number(snapshot.relationships.summary.recentInteractionCount || 0),
              tensePairCount: Number(snapshot.relationships.summary.tensePairCount || 0),
              alliancePairCount: Number(snapshot.relationships.summary.alliancePairCount || 0),
              averageTrust: Number(snapshot.relationships.summary.averageTrust || 0)
            } : null,
            summaryLines: cleanList(snapshot.relationships.summaryLines, 4, 180),
            recentInteractions: Array.isArray(snapshot.relationships.recentInteractions) ? snapshot.relationships.recentInteractions.slice(0, 6).map((item) => ({
              label: cleanString(item.label || item.type, 30),
              place: cleanString(item.place, 40),
              summary: cleanString(item.summary, 180),
              residentIds: cleanList(item.residentIds, 2, 12)
            })) : []
          } : null,
          fields: Array.isArray(snapshot.fields) ? snapshot.fields.slice(0, 6).map((field) => ({
            name: cleanString(field.name, 40),
            cropName: cleanString(field.cropName, 40),
            status: cleanString(field.status, 20),
            progress: cleanString(field.progress, 20),
            quality: cleanString(field.quality, 20)
          })) : []
        };
      }
      function cleanWeeklyPayload(weekly) {
        const source = weekly && typeof weekly === "object" ? weekly : {};
        return {
          weekId: cleanString(source.weekId || "", 40),
          weekNumber: Number(source.weekNumber || 0),
          range: cleanString(source.range || "", 40),
          dayCount: Number(source.dayCount || 0),
          immutableState: source.immutableState === true,
          source: cleanString(source.source || "", 80),
          startLedger: cleanLedgerSummary(source.startLedger),
          endLedger: cleanLedgerSummary(source.endLedger),
          ledgerDelta: cleanLedgerDelta(source.ledgerDelta),
          debtSettlement: cleanDebtSettlement(source.debtSettlement),
          stageEvaluations: Array.isArray(source.stageEvaluations) ? source.stageEvaluations.slice(0, 2).map((item) => ({
            id: cleanString(item.id, 50),
            startDay: Number(item.startDay || 0),
            endDay: Number(item.endDay || 0),
            grade: cleanString(item.grade, 3),
            gradeName: cleanString(item.gradeName, 40),
            average: Number(item.average || 0),
            publicText: cleanString(item.publicText, 220)
          })) : [],
          localReport: cleanWeeklyLocalReport(source.localReport),
          keyLogRefs: Array.isArray(source.keyLogRefs) ? source.keyLogRefs.slice(0, 18).map((log) => ({
            id: cleanString(log.id, 40),
            day: Number(log.day || 0),
            slot: cleanString(log.slot, 20),
            place: cleanString(log.place, 40),
            kind: cleanString(log.kind, 20),
            residentId: cleanString(log.residentId, 12),
            text: cleanString(log.text, 220)
          })) : [],
          recentDays: Array.isArray(source.recentDays) ? source.recentDays.slice(0, 7).map((day) => ({
            day: Number(day.day || 0),
            scene: cleanString(day.scene, 60),
            weather: cleanString(day.weather, 40),
            reportTitles: cleanList(day.reportTitles, 5, 40),
            keyLogs: cleanList(day.keyLogs, 8, 160)
          })) : [],
          relationshipSummary: cleanList(source.relationshipSummary, 5, 180)
        };
      }
      return {
        cleanLedgerSummary,
        cleanLedgerDelta,
        cleanDebtSettlement,
        cleanWeeklyLocalReport,
        cleanSnapshot,
        cleanWeeklyPayload
      };
    }
    module.exports = {
      createModelStatePayloadCleaner
    };
  }
});

// server/model-payload-cleaners.js
var require_model_payload_cleaners = __commonJS({
  "server/model-payload-cleaners.js"(exports, module) {
    var { createCognitionPayloadCleaner } = require_model_cognition_payload_cleaner();
    var { createModelStatePayloadCleaner } = require_model_state_payload_cleaner();
    var DEFAULT_WORLD_SUMMARY = {
      source: "",
      title: "",
      year: 0,
      residentCount: 0,
      currency: "",
      actionLayer: "",
      stateLayer: ""
    };
    function createModelPayloadCleaner({
      cleanString,
      cleanText,
      cleanList,
      safeVisibleText,
      worldSummary = DEFAULT_WORLD_SUMMARY
    } = {}) {
      const safeWorldSummary = worldSummary && typeof worldSummary === "object" ? { ...DEFAULT_WORLD_SUMMARY, ...worldSummary } : DEFAULT_WORLD_SUMMARY;
      const cognitionPayloadCleaner = createCognitionPayloadCleaner({
        cleanString,
        cleanList,
        safeVisibleText
      });
      const statePayloadCleaner = createModelStatePayloadCleaner({
        cleanString,
        cleanList
      });
      function cleanPayload(payload) {
        const logs = Array.isArray(payload.logs) ? payload.logs : [];
        const report = payload.report && typeof payload.report === "object" ? payload.report : null;
        const world = payload.world && typeof payload.world === "object" ? payload.world : {};
        const contract = payload.contract && typeof payload.contract === "object" ? payload.contract : {};
        const actionLayer = payload.actionLayer && typeof payload.actionLayer === "object" ? payload.actionLayer : null;
        const stateLayer = payload.stateLayer && typeof payload.stateLayer === "object" ? payload.stateLayer : null;
        const residents = Array.isArray(payload.residents) ? payload.residents : [];
        const weekly = payload.weekly && typeof payload.weekly === "object" ? payload.weekly : {};
        const actionControl = payload.actionControl && typeof payload.actionControl === "object" ? payload.actionControl : {};
        return {
          mode: cleanString(payload.mode || "shadow", 24),
          ...payload.mode === "settled-dialogue" ? { recentLines: cleanList(payload.recentLines, 18, 110) } : {},
          actionControl: {
            day: Number(actionControl.day || payload.day || 0),
            slots: cleanList(actionControl.slots, 3, 20),
            request: cleanString(actionControl.request || "", 180)
          },
          world: {
            version: cleanString(world.version || safeWorldSummary.source, 80),
            title: cleanString(world.title || safeWorldSummary.title, 80),
            year: Number(world.year || safeWorldSummary.year),
            townName: cleanString(world.townName || "枫溪镇", 40),
            farmName: cleanString(world.farmName || "田地", 40),
            population: Number(world.population || safeWorldSummary.residentCount),
            currency: cleanString(world.currency || safeWorldSummary.currency, 10),
            zones: Array.isArray(world.zones) ? world.zones.slice(0, 12).map((zone) => ({
              id: cleanString(zone.id, 40),
              name: cleanString(zone.name, 40)
            })).filter((zone) => zone.id && zone.name) : []
          },
          contract: {
            version: cleanString(contract.version || "model-contract-v0.8-weekly-timeline", 80),
            residentCount: Number(contract.residentCount || safeWorldSummary.residentCount),
            currentMode: cleanString(contract.currentMode || "weekly-timeline-shadow-local-immutable", 64)
          },
          actionLayer: actionLayer ? {
            version: cleanString(actionLayer.version || safeWorldSummary.actionLayer, 80),
            sourceActivityCount: Number(actionLayer.sourceActivityCount || 0),
            mode: cleanString(actionLayer.mode || "local-rules-first", 40),
            visibilityRule: cleanString(actionLayer.visibilityRule || "", 180),
            zones: Array.isArray(actionLayer.zones) ? actionLayer.zones.slice(0, 9).map((zone) => ({
              id: cleanString(zone.id, 40),
              name: cleanString(zone.name, 40),
              risk: Number(zone.risk || 0)
            })) : [],
            sampleActivities: Array.isArray(actionLayer.sampleActivities) ? actionLayer.sampleActivities.slice(0, 18).map((activity) => ({
              id: cleanString(activity.id, 20),
              title: cleanString(activity.title, 60),
              zoneId: cleanString(activity.zoneId, 40),
              laborCost: Number(activity.laborCost || 0),
              riskLevel: Number(activity.riskLevel || 0)
            })) : [],
            activities: Array.isArray(actionLayer.activities) ? actionLayer.activities.slice(0, 140).map((activity) => ({
              id: cleanString(activity.id, 20),
              title: cleanString(activity.title, 60),
              zoneId: cleanString(activity.zoneId, 40),
              zoneName: cleanString(activity.zoneName, 40),
              meetingPlace: cleanString(activity.meetingPlace ?? (activity.id === "REST-01" ? "" : activity.zoneId), 60),
              placeLabel: cleanString(activity.placeLabel, 60),
              laborCost: Number(activity.laborCost || 0),
              riskLevel: Number(activity.riskLevel || 0),
              skills: cleanList(activity.skills, 4, 24),
              tags: cleanList(activity.tags, 8, 24)
            })).filter((activity) => activity.id) : []
          } : null,
          stateLayer: stateLayer ? {
            version: cleanString(stateLayer.version || safeWorldSummary.stateLayer, 80),
            mode: cleanString(stateLayer.mode || "local-state-first", 40),
            weather: stateLayer.weather && typeof stateLayer.weather === "object" ? {
              label: cleanString(stateLayer.weather.label, 40),
              riskIndex: Number(stateLayer.weather.riskIndex || 0),
              summary: cleanString(stateLayer.weather.summary, 260)
            } : null,
            snapshot: statePayloadCleaner.cleanSnapshot(stateLayer.snapshot),
            visibilityRule: cleanString(stateLayer.visibilityRule || "", 180)
          } : null,
          scene: cleanString(payload.scene, 80),
          residents: residents.slice(0, 30).map((resident) => ({
            id: cleanString(resident.id, 12),
            name: cleanString(resident.name, 30),
            tag: cleanString(resident.tag, 40),
            voiceStyle: cleanString(resident.voiceStyle, 120),
            specialties: cleanList(resident.specialties, 3, 40),
            activityOptions: resident.activityOptions ? Object.fromEntries(["morning", "afternoon", "evening"].map((s) => [s, cleanList(resident.activityOptions[s], 140, 20)])) : null,
            zone: cleanString(resident.zone, 40),
            health: Number(resident.health || 0),
            energy: Number(resident.energy || 0),
            coins: Number(resident.coins || 0),
            recentAction: resident.recentAction && typeof resident.recentAction === "object" ? {
              activityId: cleanString(resident.recentAction.activityId, 20),
              activityTitle: cleanString(resident.recentAction.activityTitle, 60),
              zone: cleanString(resident.recentAction.zone, 40),
              text: cleanString(resident.recentAction.text, 220)
            } : null
          })).filter((resident) => resident.id && resident.name),
          logs: logs.slice(-36).map((log) => ({
            id: cleanString(log.id, 40),
            residentId: cleanString(log.residentId, 12),
            residentIds: cleanList(log.residentIds, 4, 12),
            day: Number(log.day || 0),
            slot: cleanString(log.slot, 20),
            place: cleanString(log.place, 30),
            kind: cleanString(log.kind, 20),
            zoneId: cleanString(log.zoneId, 40),
            activityId: cleanString(log.activityId, 20),
            activityTitle: cleanString(log.activityTitle, 60),
            text: cleanString(log.text, 280),
            ...payload.mode === "settled-dialogue" ? {
              talkAim: cleanString(log.talkAim, 24),
              observations: (Array.isArray(log.observations) ? log.observations : []).slice(0, 2).map((o) => ({
                id: cleanString(o?.id, 40),
                residentId: cleanString(o?.residentId, 12),
                activity: cleanString(o?.activity, 60),
                text: safeVisibleText(o?.text, 280),
                terms: cleanList(o?.terms, 8, 40),
                earlierToday: (Array.isArray(o?.earlierToday) ? o.earlierToday : []).slice(0, 2).map((item) => ({
                  id: cleanString(item?.id, 40),
                  slot: cleanString(item?.slot, 20),
                  activity: cleanString(item?.activity, 60)
                }))
              })),
              previousMeeting: log.previousMeeting ? {
                id: cleanString(log.previousMeeting.id, 40),
                residentIds: cleanList(log.previousMeeting.residentIds, 2, 12),
                day: Number(log.previousMeeting.day),
                text: safeVisibleText(log.previousMeeting.text, 180),
                place: cleanString(log.previousMeeting.place, 30),
                activity: cleanString(log.previousMeeting.activity, 60),
                kind: cleanString(log.previousMeeting.kind, 20)
              } : null
            } : {}
          })).filter((log) => log.id && log.text),
          report: report ? {
            day: Number(report.day || 0),
            scene: cleanString(report.scene, 80),
            sections: Array.isArray(report.sections) ? report.sections.map((section, index) => ({
              index: Number.isInteger(section.index) ? section.index : index,
              title: cleanString(section.title, 40),
              body: cleanText(section.body, 460),
              list: Array.isArray(section.list) ? section.list.slice(0, 6).map((item) => cleanString(item, 240)) : null
            })) : []
          } : null,
          weekly: statePayloadCleaner.cleanWeeklyPayload(weekly),
          cognition: cognitionPayloadCleaner.cleanCognitionPayload(payload.cognition)
        };
      }
      return {
        cleanPayload,
        cleanSnapshot: statePayloadCleaner.cleanSnapshot,
        cleanCognitionPayload: cognitionPayloadCleaner.cleanCognitionPayload
      };
    }
    module.exports = {
      DEFAULT_WORLD_SUMMARY,
      createModelPayloadCleaner
    };
  }
});

// server/model-guards.js
var require_model_guards = __commonJS({
  "server/model-guards.js"(exports, module) {
    var { parseModelJson } = require_model_json();
    var { createModelOutputGuards } = require_model_output_guards();
    var { DEFAULT_WORLD_SUMMARY, createModelPayloadCleaner } = require_model_payload_cleaners();
    var forbiddenWords = [
      "班级",
      "职位",
      "供应链",
      "生态",
      "贡献",
      "曝光",
      "班主任",
      "公共仓库",
      "企业",
      "金融",
      "项目",
      "同学",
      "导师",
      "课程",
      "EMBA"
    ];
    function cleanString(value, limit = 160) {
      return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
    }
    function cleanText(value, limit = 520) {
      return String(value || "").trim().slice(0, limit);
    }
    function cleanList(value, limit, itemLimit = 180) {
      return Array.isArray(value) ? value.slice(0, limit).map((item) => cleanString(item, itemLimit)).filter(Boolean) : [];
    }
    function createModelGuards({ worldSummary = DEFAULT_WORLD_SUMMARY } = {}) {
      const outputGuards = createModelOutputGuards({ cleanString, cleanText, cleanList, forbiddenWords });
      const payloadCleaner = createModelPayloadCleaner({
        cleanString,
        cleanText,
        cleanList,
        safeVisibleText: outputGuards.safeVisibleText,
        worldSummary
      });
      return {
        forbiddenWords,
        cleanString,
        cleanText,
        cleanList,
        cleanPayload: payloadCleaner.cleanPayload,
        cleanSnapshot: payloadCleaner.cleanSnapshot,
        cleanCognitionPayload: payloadCleaner.cleanCognitionPayload,
        parseModelJson,
        ...outputGuards
      };
    }
    module.exports = {
      createModelGuards
    };
  }
});

// server/model-action-guards.js
var require_model_action_guards = __commonJS({
  "server/model-action-guards.js"(exports, module) {
    var { talkAims } = require_conversation_aims();
    function createModelActionGuards({ cleanString, cleanList, safeVisibleText }) {
      const slotDefs = [
        { key: "morning", label: "清晨" },
        { key: "afternoon", label: "午后" },
        { key: "evening", label: "夜里" }
      ];
      const riskFlags = /* @__PURE__ */ new Set(["fatigue", "injury", "weather", "contract", "conflict", "facility", "accounting", "none"]);
      const intentModes = /* @__PURE__ */ new Set(["talk", "wait", "avoid", "help", "gift", "appreciate"]);
      function knownActivityMap(payload) {
        const activities = [
          ...payload.actionLayer?.activities || [],
          ...payload.actionLayer?.sampleActivities || []
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
        const slots = plan?.slots || plan?.slotPlans || (plan?.morning || plan?.afternoon || plan?.evening || plan?.[def.label] ? plan : {});
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
        const evidenceMemoryIds = cleanList(source.evidenceMemoryIds || source.memoryIds, 4, 60).filter((id) => memories.has(id));
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
          ...mode === "talk" && Object.hasOwn(talkAims, source.talkAim) ? { talkAim: source.talkAim } : {},
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
          riskFlag: riskFlags.has(value?.riskFlag) ? value.riskFlag : riskFlags.has(source?.riskFlag) ? source.riskFlag : "none"
        };
      }
      function sourcePlans(raw) {
        const root = raw?.actionPlan || raw?.modelActionPlan || raw || {};
        const plans = root.plans || root.rows || root.planRows || root.table || root.residents || root.actions || root.schedule || root.dailyPlans || root.actionPlans;
        if (Array.isArray(plans)) return plans.map((plan) => normalizePlanEntry("", plan));
        if (plans && typeof plans === "object") {
          return Object.entries(plans).map(([residentId, value]) => normalizePlanEntry(residentId, value));
        }
        const metadata = /* @__PURE__ */ new Set(["day", "mode", "townNotes", "notes", "summary", "schema"]);
        return Object.entries(root).filter(([key, value]) => !metadata.has(key) && value && (Array.isArray(value) || typeof value === "object")).map(([residentId, value]) => normalizePlanEntry(residentId, value));
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
          slots: value?.slots || value?.slotPlans || value?.actions || value?.activities || (value?.morning || value?.afternoon || value?.evening ? { morning: value.morning, afternoon: value.afternoon, evening: value.evening } : value?.slots)
        };
      }
      function normalizeActionOutput(raw, payload) {
        const residents = knownResidentMap(payload);
        const activities = knownActivityMap(payload);
        const memories = knownMemoryMap(payload);
        const accepted = { residentPlans: 0, slotPlans: 0, townNotes: 0, interactionIntents: 0, reflectionNotes: 0 };
        const rejected = { residentPlans: 0, slotPlans: 0, duplicateResidents: 0, interactionIntents: 0 };
        const seenResidents = /* @__PURE__ */ new Set();
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
  }
});

// server/settled-dialogue-quality.js
var require_settled_dialogue_quality = __commonJS({
  "server/settled-dialogue-quality.js"(exports, module) {
    var digits = "零一二三四五六七八九";
    function normalizeNumber(raw) {
      if (/^\d/.test(raw)) return String(Number(raw));
      const text = raw.replace(/两/g, "二").replace(/〇/g, "零");
      if (!/[十百千万]/.test(text)) return String(Number([...text].map((c) => digits.indexOf(c)).join("")));
      let total = 0, section = 0, digit = 0;
      for (const c of text) {
        if (c === "万") {
          total += (section + digit || 1) * 1e4;
          section = digit = 0;
        } else if ("十百千".includes(c)) {
          section += (digit || 1) * { 十: 10, 百: 100, 千: 1e3 }[c];
          digit = 0;
        } else digit = digits.indexOf(c);
      }
      return String(total + section + digit);
    }
    function quantities(text) {
      const compact = text.replace(/\s/g, "").replace(/％/g, "%");
      const matches = compact.matchAll(/(\d+(?:\.\d+)?|[零〇一二两三四五六七八九十百千万]+)(个季度|季度|单位|公斤|小时|分钟|元|块钱|天|周|斤|吨|袋|筐|箱|倍|%)|\d+(?:\.\d+)?/g);
      return [...matches].map(([raw, count, unit]) => count ? normalizeNumber(count) + unit.replace("个季度", "季度").replace("块钱", "元") : normalizeNumber(raw));
    }
    function words(text) {
      return text.normalize("NFKC").replace(/[\p{P}\p{Z}\s]/gu, "").toLowerCase();
    }
    function repeatsLine(text, recentLines) {
      const current = words(text);
      if (current.length < 8) return false;
      return recentLines.some((line) => {
        const past = words(line);
        const shorter = current.length < past.length ? current : past;
        const longer = current.length < past.length ? past : current;
        return shorter.length >= 8 && shorter.length >= longer.length * 0.8 && longer.includes(shorter);
      });
    }
    var stockReport = /(?:记|写|抄|标)(?:下|到|在|进|上)?(?:了|的)?(?:纸[的上]?[边角]|[便纸]条(?:的)?边(?:上)?|路单背面|旧信封背面)|(?:把|将)?(?:这点|这些|这个|这条|这份)?(?:消息|情况|信息|价差|行情)(?:先|再|给)?(?:带|捎|拿)回(?:到)?(?:农场|去)(?:再说|吧|就行)?/u;
    function draftProblem(draft, scene, recentLines) {
      if (draft.evidenceId && !scene.evidence.some((e) => e.id === draft.evidenceId)) return "invalid_evidence";
      if (draft.anchor && (typeof draft.anchor !== "string" || !scene.evidence.some((e) => e.text.includes(draft.anchor)))) return "invalid_evidence";
      if (!Array.isArray(draft.lines) || ![2, 3].includes(draft.lines.length)) return "turn_count";
      if (!draft.lines.every((line, i) => line?.speakerId === scene.speakers[i % 2].id && typeof line.text === "string" && line.text.trim() && line.text.length <= 110)) return "speaker_or_text";
      const lines = draft.lines.map((line) => line.text.trim());
      const evidence = scene.evidence.map((e) => e.text).join(" ");
      const established = new Set(quantities(evidence));
      const speech = lines.join(" ");
      if (["铅笔", "粉笔", "供应商", "订金", "包装规格"].some((detail) => speech.includes(detail) && !evidence.includes(detail))) return "unobserved_detail";
      if (lines.filter((line) => /写在纸上|备注在|夹进报价夹|翻到背面|记到本子上/.test(line)).length >= 2) return "procedural_exchange";
      const roadCondition = /(?:路况|路面)[^。！？]{0,16}(?:没变|畅通|封了|更差|还糟|更糟|一天一个样)/u;
      if (roadCondition.test(speech) && !roadCondition.test(evidence)) return "unobserved_detail";
      const damage = /颠坏|摔坏|压坏|撞坏|挤烂|摔烂/gu;
      if ([...speech.matchAll(damage)].some(([word]) => !evidence.includes(word))) return "unobserved_result";
      if (quantities(speech).some((quantity) => !established.has(quantity))) return "unsupported_quantity";
      const completedTrade = /(?:已经|刚刚|刚|总算|终于)(?:把[^，。！？]{0,10})?(成交|卖出|卖完|发货|收款|签下)/g;
      for (const [, result] of speech.matchAll(completedTrade)) {
        if (!evidence.includes(result) || /尚无公开成交|还在等第一批公开交易/.test(evidence) && result === "成交") return "unobserved_result";
      }
      if ((speech.match(/[“「]([^”」]+)[”」]/g) || []).some((quote) => !evidence.includes(quote.slice(1, -1)))) return "unsupported_quote";
      if (/(昨天|昨日|昨晚)/.test(speech) && !/(昨天|昨日|昨晚)/.test(evidence) && scene.previousDay !== scene.day - 1) return "unsupported_history";
      if (/(上次|上回)/.test(speech) && !/(上次|上回)/.test(evidence) && !scene.previousDay) return "unsupported_history";
      if (/(上周|上星期|前几天|前些天)/.test(speech) && !/(上周|上星期|前几天|前些天)/.test(evidence)) return "unsupported_history";
      const knownNames = new Set((scene.speakers.map((p) => p.name).join(" ") + " " + evidence).match(/\b[A-Z][a-z]+\b/g));
      if ((speech.match(/\b[A-Z][a-z]+\b/g) || []).some((name) => !knownNames.has(name))) return "unknown_name";
      for (const [i, line] of lines.entries()) {
        if (stockReport.test(line)) return "stock_report";
        if (repeatsLine(line, recentLines) || repeatsLine(line, lines.slice(0, i))) return "repeated_line";
        if (words(line).length >= 12 && words(evidence).includes(words(line))) return "copied_log";
      }
      return "";
    }
    module.exports = { draftProblem };
  }
});

// server/settled-dialogue.js
var require_settled_dialogue = __commonJS({
  "server/settled-dialogue.js"(exports, module) {
    var { talkAims } = require_conversation_aims();
    var { draftProblem } = require_settled_dialogue_quality();
    function dialogueMessages(input) {
      return [
        { role: "system", content: [
          "写发生在枫溪镇的几段当面对话。来找人的是 speakers[0]，另一位是 speakers[1]。各自的 activity 和 knows 是他们此刻能谈的材料。aim 如已给定，就由这个来意开口；没给来意时，想一想这个人何必特意找对方。",
          "两人说的是自然中文。各自都可以有点私心、好奇心或幽默感，允许对方没听懂、听懂却不肯，或随口接一茬。人可以在办事的地方闲聊，并不需要向读者汇报工作。有人求主意，有人想要一个准话，有人就想找个伴；同一批相遇各有各的说法，不强演冲突。",
          "每一句都要听得出接了前面哪句话。两句已经说完就停；还有一句非接不可才让发起者接回来。有用的试探、坦白不知道、婉拒和笑话都可以留。道具、手续和价格不关这两个人此刻的事，就让它们留在背景里。不要给每场配一句交代接下来该干什么的结尾。",
          "地点、物品、行情、日期和关系只用本场给出的材料。可以反问、提议和假设；别添已经成交、谁答应了、货在何处或两人以前有过什么事。lastMeeting 为空就不编旧情。称呼用 first name。只写说出口的话。",
          "开口就说想问或想要的那一句。一人只知道价差，就可以问贵不贵；知道谁在打听，不等于知道已经有买家。材料只提到路况，就问路好不好。把未知留给对方答，别替他编一段经历。每句话尽量一口气说完。",
          "同一场给两个独立的写法。第一段可以多聊一句；第二段只写一个短问题和一句直接回应，各不超过二十个汉字。两段开口的人都是 speakers[0]，接话的人都是 speakers[1]。",
          '只返回 {"conversations":[{"id":"相遇id","lines":[{"speakerId":"居民id","text":"对白"}]}]}。同一 id 最多给两段，首选在前。'
        ].join("\n") },
        { role: "user", content: JSON.stringify(input) }
      ];
    }
    function sceneFor(fact, residents) {
      const evidence = [{ id: fact.id, text: fact.text, residentIds: fact.residentIds }];
      const slots = { 清晨: 1, 午后: 2, 夜里: 3 };
      const slot = slots[fact.slot];
      for (const o of fact.observations || []) {
        if (!o.text || !fact.residentIds.includes(o.residentId) || o.id !== `log-d${fact.day}-s${slot}-${o.residentId}`) continue;
        const earlierToday = (o.earlierToday || []).filter((item) => item.activity && slots[item.slot] < slot && item.id === `log-d${fact.day}-s${slots[item.slot]}-${o.residentId}`);
        evidence.push({ id: o.id, residentId: o.residentId, activity: o.activity, text: o.text, terms: o.terms, earlierToday });
      }
      const prior = fact.previousMeeting;
      const sharedHistory = prior?.text && /^rel-(?:d\d+-v\d{2}-v\d{2}|\d+-\d+)$/.test(prior.id) && prior.day > 0 && prior.day < fact.day && prior.residentIds?.length === 2 && fact.residentIds.every((id) => prior.residentIds.includes(id));
      if (sharedHistory) evidence.push({ id: prior.id, day: prior.day, text: prior.text, residentIds: prior.residentIds });
      return {
        id: fact.id,
        day: fact.day,
        place: fact.place,
        time: fact.slot,
        activity: fact.activityTitle,
        interaction: fact.kind,
        aim: fact.kind === "talk" && Object.hasOwn(talkAims, fact.talkAim) ? talkAims[fact.talkAim] : void 0,
        previousDay: sharedHistory ? prior.day : null,
        previous: sharedHistory ? prior : null,
        evidence,
        speakers: fact.residentIds.map((id) => ({ id, name: residents.get(id).name, voice: residents.get(id).voiceStyle }))
      };
    }
    function observedFacts(observation) {
      const text = observation.text;
      const vocabulary = [...observation.terms || [], "路况", "水位", "交付日", "价差", "预算", "种子", "水渠", "轨道", "水质", "播种", "到期日"];
      const result = vocabulary.filter((word) => text.includes(word));
      for (const match of text.matchAll(/还差\s*(\d+)\s*单位/g)) result.push(`欠交量 ${match[1]} 单位`);
      for (const match of text.matchAll(/(?:还有\s*(\d+)\s*天到期|(?:离到期|交货|交付)(?:还[有剩]|只剩)\s*(\d+)\s*天)/g)) {
        result.push(`距交付 ${match[1] || match[2]} 天`);
      }
      if (/今天到期|明天到期|已经过了交付日/.test(text)) result.push(text.match(/今天到期|明天到期|已经过了交付日/)[0]);
      if (text.includes("不能同时答应所有开销")) result.push("各项支出需要排先后");
      if (/行情平稳|行情没有大起伏/.test(text)) result.push("行情平稳");
      if (text.includes("还在等第一批公开交易")) result.push("尚无公开成交");
      if (/问谁还要|打听.+行情/.test(text)) result.push("正在打听需求");
      if (/价钱.+留了余地/.test(text)) result.push("报价还有商量余地");
      return [...new Set(result)];
    }
    function writingBrief(scene) {
      const gift = scene.interaction === "gift" ? ["小鱼", "鱼", "种子", "布袋", "木楔", "热饭", "一把菜"].find((item) => scene.evidence[0].text.includes(item)) : void 0;
      return {
        id: scene.id,
        place: scene.place,
        time: scene.time,
        interaction: scene.interaction,
        gift,
        aim: scene.aim,
        speakers: scene.speakers.map((speaker) => {
          const note = scene.evidence.find((e) => e.residentId === speaker.id);
          return {
            ...speaker,
            activity: note?.activity || scene.activity,
            knows: observedFacts(note || scene.evidence[0]),
            earlierToday: note?.earlierToday?.map((e) => `${e.slot} · ${e.activity}`)
          };
        }),
        lastMeeting: scene.previous ? {
          day: scene.previous.day,
          place: scene.previous.place,
          activity: scene.previous.activity,
          interaction: scene.previous.kind
        } : null
      };
    }
    function earlierLogs(scene) {
      return scene.evidence.flatMap((note) => (note.earlierToday || []).map((entry) => ({ ...entry, residentId: note.residentId, text: entry.activity })));
    }
    function citedIds(scene, lines) {
      const speech = lines.map((l) => l.text).join(" ");
      const prior = scene.previous && /昨天|昨日|昨晚|上次|上回/.test(speech) ? [scene.previous.id] : [];
      const earlier = earlierLogs(scene).filter((log) => speech.includes(log.activity) || log.slot === "清晨" && /今早|早上|上午|早晨|清晨/.test(speech) || log.slot === "午后" && /午后|下午/.test(speech));
      const current = scene.evidence.filter((e) => e.residentId);
      return [.../* @__PURE__ */ new Set([scene.id, ...prior, ...earlier.map((e) => e.id), ...current.map((e) => e.id)])].slice(0, 4);
    }
    function mockDraft(scene) {
      const [a, b] = scene.speakers;
      return { id: scene.id, lines: [
        { speakerId: a.id, text: "你也在这儿啊。" },
        { speakerId: b.id, text: "嗯。你说，我听着。" }
      ] };
    }
    async function writeSettledDialogue(payload, { callWithJsonFallback, guards: guards2, mockModel }) {
      const residents = guards2.knownResidentMap(payload);
      const scenes = payload.logs.filter((log) => log.residentIds.length === 2 && log.residentIds[0] !== log.residentIds[1] && !["avoid", "wait"].includes(log.kind) && log.residentIds.every((id) => residents.has(id))).slice(0, 3).map((fact) => sceneFor(fact, residents));
      const recentLines = [...payload.recentLines || []];
      let raw = {};
      if (scenes.length) {
        raw = mockModel ? { conversations: scenes.map(mockDraft) } : await callWithJsonFallback({ scenes: scenes.map(writingBrief) }, "settled-dialogue");
      }
      const drafts = Array.isArray(raw.conversations) ? raw.conversations : [];
      const accepted = { conversations: 0, riskNotes: 0, weeklySections: 0 };
      const rejected = {};
      const conversations = [];
      for (const scene of scenes) {
        for (const draft of drafts.filter((item) => item?.id === scene.id)) {
          const reason = draftProblem(draft, scene, recentLines) || (draft.lines.some((line) => !guards2.safeVisibleText(line.text, 110)) ? "invalid_text" : "");
          if (reason) {
            rejected[reason] = (rejected[reason] || 0) + 1;
            continue;
          }
          conversations.push({
            id: scene.id,
            title: scene.activity || scene.place,
            place: scene.place,
            residentIds: scene.speakers.map((p) => p.id),
            evidenceLogIds: citedIds(scene, draft.lines),
            lines: draft.lines
          });
          recentLines.push(...draft.lines.map((line) => line.text));
          break;
        }
      }
      const evidencePayload = { ...payload, logs: scenes.flatMap((s) => [...s.evidence, ...earlierLogs(s)]) };
      const shadow = guards2.normalizeShadow({ conversations }, evidencePayload, residents, accepted);
      return { shadow, audit: {
        mode: "settled-dialogue",
        requested: scenes.length,
        accepted,
        rejected,
        model: raw.generationModel || null,
        mockModel,
        immutableState: true
      } };
    }
    module.exports = { dialogueMessages, writeSettledDialogue };
  }
});

// server/prompt-payload-builders.js
var require_prompt_payload_builders = __commonJS({
  "server/prompt-payload-builders.js"(exports, module) {
    function createPromptPayloadBuilders({ compactCognition } = {}) {
      function compactActivity(activity) {
        return {
          id: activity.id,
          title: activity.title,
          zoneId: activity.zoneId,
          riskLevel: activity.riskLevel
        };
      }
      function compactResident(resident) {
        return {
          id: resident.id,
          name: resident.name,
          voiceStyle: resident.voiceStyle || "",
          zone: resident.zone,
          health: resident.health,
          energy: resident.energy,
          recentAction: resident.recentAction ? {
            activityId: resident.recentAction.activityId || "",
            activityTitle: resident.recentAction.activityTitle || "",
            zone: resident.recentAction.zone || ""
          } : null
        };
      }
      function uniqueIds(values) {
        const seen = /* @__PURE__ */ new Set();
        return values.filter((value) => {
          if (!value || seen.has(value)) return false;
          seen.add(value);
          return true;
        });
      }
      function compactRelationships(relationships) {
        if (!relationships) return null;
        return {
          summary: relationships.summary || "",
          summaryLines: (relationships.summaryLines || []).slice(0, 4),
          recentInteractions: (relationships.recentInteractions || []).slice(0, 6).map((item) => ({
            id: item.id,
            day: item.day,
            type: item.type,
            label: item.label,
            residentIds: item.residentIds,
            zoneId: item.zoneId,
            summary: item.summary
          })),
          tenseRelationships: (relationships.tenseRelationships || []).slice(0, 4).map((item) => ({
            residentIds: item.residentIds,
            trust: item.trust,
            friction: item.friction,
            tags: item.tags || item.allianceTags || []
          }))
        };
      }
      function compactActionCognition(cognition, residentIds) {
        const compact = typeof compactCognition === "function" ? compactCognition(cognition) : cognition;
        if (!compact) return null;
        const residents = new Set(residentIds);
        const residentScratch = (compact.residentScratch || []).filter((scratch) => residents.has(scratch.residentId));
        const perceptionPackets = (compact.perceptionPackets || []).filter((packet) => residents.has(packet.residentId));
        const memoryIds = /* @__PURE__ */ new Set();
        residentScratch.forEach((scratch) => {
          (scratch.recentMemoryIds || []).forEach((id) => memoryIds.add(id));
        });
        perceptionPackets.forEach((packet) => {
          (packet.retrievedMemoryIds || []).forEach((id) => memoryIds.add(id));
        });
        const nodes = (compact.memoryStream?.nodes || []).filter((node) => memoryIds.has(node.id)).slice(0, 32);
        const groupProfiles = (compact.groupProfiles || []).filter((group) => (group.memberResidentIds || []).some((residentId) => residents.has(residentId)));
        return {
          ...compact,
          memoryStream: {
            ...compact.memoryStream || {},
            nodes
          },
          residentScratch,
          perceptionPackets,
          groupProfiles,
          promptShape: {
            scopedToResidentIds: [...residents],
            memoryNodeCount: nodes.length,
            scratchCount: residentScratch.length,
            perceptionPacketCount: perceptionPackets.length,
            groupProfileCount: groupProfiles.length
          }
        };
      }
      function compactTownStateSnapshot(snapshot) {
        if (!snapshot) return null;
        return {
          day: snapshot.day,
          seasonLabel: snapshot.seasonLabel,
          promptBrief: snapshot.promptBrief,
          ledger: snapshot.ledger ? {
            cashYsc: snapshot.ledger.cashYsc,
            debtYsc: snapshot.ledger.debtYsc,
            receivableYsc: snapshot.ledger.receivableYsc,
            payableYsc: snapshot.ledger.payableYsc,
            accountingTransparency: snapshot.ledger.accountingTransparency,
            goldkinDependency: snapshot.ledger.goldkinDependency,
            cooperativeTrust: snapshot.ledger.cooperativeTrust,
            townReputation: snapshot.ledger.townReputation
          } : null,
          facilities: {
            facilities: (snapshot.facilities?.facilities || []).slice(0, 6).map((facility) => ({
              name: facility.name,
              level: facility.level,
              condition: facility.condition,
              status: facility.status
            }))
          },
          contracts: (snapshot.contracts || []).slice(0, 6).map((contract) => ({
            label: contract.label,
            buyer: contract.buyer,
            cropName: contract.cropName,
            dueDay: contract.dueDay,
            status: contract.status
          })),
          risks: snapshot.risks ? {
            scores: snapshot.risks.scores,
            notes: (snapshot.risks.notes || []).slice(0, 4)
          } : null,
          relationships: compactRelationships(snapshot.relationships)
        };
      }
      function actionControlPayload(payload) {
        const residents = (payload.residents || []).slice(0, 30);
        const requiredResidentIds = payload.requiredResidentIds || residents.map((resident) => resident.id);
        const cognition = compactActionCognition(payload.cognition, requiredResidentIds);
        return {
          mode: "action-control",
          actionControl: {
            ...payload.actionControl || {},
            shard: payload.actionShard || null,
            variationSeed: payload.variationSeed || ""
          },
          world: payload.world,
          contract: payload.contract,
          scene: payload.scene,
          actionLayer: payload.actionLayer ? {
            version: payload.actionLayer.version,
            mode: payload.actionLayer.mode,
            zones: payload.actionLayer.zones,
            activities: (payload.actionLayer.activities || []).map(compactActivity)
          } : null,
          stateLayer: payload.stateLayer ? {
            version: payload.stateLayer.version,
            weather: payload.stateLayer.weather,
            snapshot: compactTownStateSnapshot(payload.stateLayer.snapshot)
          } : null,
          weekly: {
            weekId: payload.weekly?.weekId || "",
            range: payload.weekly?.range || "",
            ledgerDelta: payload.weekly?.ledgerDelta || null,
            debtSettlement: payload.weekly?.debtSettlement || null,
            stageEvaluations: payload.weekly?.stageEvaluations || []
          },
          residents: residents.map(compactResident),
          cognition,
          requiredResidentIds,
          rule: "Return candidate activity ids for requiredResidentIds. slots order is morning, afternoon, evening. groupProfiles is hidden local behavior context: preserve distinct roles and in-group/out-group priorities without exposing its labels or inventing facts. interactionIntent and reflectionNote are optional candidates only; omit both unless evidenceMemoryIds and nearby target resident are exact. Local rules will audit before execution and fill the rest."
        };
      }
      function interactionPayload(payload) {
        const logs = (payload.logs || []).slice(-12);
        const hintIds = uniqueIds((payload.cognition?.acceptedInteractionIntents || []).flatMap((intent) => [intent.residentId, intent.targetResidentId]).filter(Boolean));
        const involvedIds = uniqueIds([
          ...logs.map((log) => log.residentId).filter(Boolean),
          ...hintIds
        ]);
        const residents = payload.residents || [];
        const focusedResidents = residents.filter((resident) => involvedIds.includes(resident.id)).slice(0, 8);
        const residentList = focusedResidents.length >= 2 ? focusedResidents : residents.slice(0, 8);
        return {
          mode: "interaction-scenes",
          world: payload.world,
          contract: payload.contract,
          scene: payload.scene,
          residents: residentList.map(compactResident),
          stateLayer: payload.stateLayer ? {
            version: payload.stateLayer.version,
            weather: payload.stateLayer.weather,
            snapshot: payload.stateLayer.snapshot ? {
              day: payload.stateLayer.snapshot.day,
              seasonLabel: payload.stateLayer.snapshot.seasonLabel,
              ledger: payload.stateLayer.snapshot.ledger ? {
                cashYsc: payload.stateLayer.snapshot.ledger.cashYsc,
                debtYsc: payload.stateLayer.snapshot.ledger.debtYsc,
                accountingTransparency: payload.stateLayer.snapshot.ledger.accountingTransparency
              } : null,
              relationships: payload.stateLayer.snapshot.relationships ? {
                summary: payload.stateLayer.snapshot.relationships.summary,
                summaryLines: (payload.stateLayer.snapshot.relationships.summaryLines || []).slice(0, 3),
                recentInteractions: (payload.stateLayer.snapshot.relationships.recentInteractions || []).slice(0, 6)
              } : null
            } : null
          } : null,
          logs,
          cognition: payload.cognition ? {
            acceptedInteractionIntents: (payload.cognition.acceptedInteractionIntents || []).slice(0, 8)
          } : null,
          interactionLane: payload.interactionLane || null,
          weekly: {
            weekId: payload.weekly?.weekId || "",
            range: payload.weekly?.range || "",
            immutableState: payload.weekly?.immutableState === true,
            relationshipSummary: (payload.weekly?.relationshipSummary || []).slice(0, 3)
          },
          outputMustUseResidentIds: residentList.map((resident) => `${resident.id}=${resident.name}`),
          rule: "Use only supplied logs. Return compact JSON only. Do not rewrite facts."
        };
      }
      function shadowOnlyPayload(payload) {
        return {
          mode: "shadow-only",
          world: payload.world,
          contract: payload.contract,
          scene: payload.scene,
          residents: payload.residents,
          stateLayer: payload.stateLayer ? {
            version: payload.stateLayer.version,
            weather: payload.stateLayer.weather,
            snapshot: payload.stateLayer.snapshot ? {
              day: payload.stateLayer.snapshot.day,
              seasonLabel: payload.stateLayer.snapshot.seasonLabel,
              ledger: payload.stateLayer.snapshot.ledger,
              contractBids: payload.stateLayer.snapshot.contractBids,
              consignmentDisputes: payload.stateLayer.snapshot.consignmentDisputes,
              relationships: payload.stateLayer.snapshot.relationships
            } : null
          } : null,
          logs: (payload.logs || []).slice(0, 24),
          weekly: payload.weekly,
          outputMustUseResidentIds: (payload.residents || []).map((resident) => `${resident.id}=${resident.name}`)
        };
      }
      return {
        actionControlPayload,
        interactionPayload,
        shadowOnlyPayload
      };
    }
    module.exports = {
      createPromptPayloadBuilders
    };
  }
});

// server/prompt-builders.js
var require_prompt_builders = __commonJS({
  "server/prompt-builders.js"(exports, module) {
    var { dialogueMessages } = require_settled_dialogue();
    var { createPromptPayloadBuilders } = require_prompt_payload_builders();
    var worldSummary = {
      title: "枫溪镇：田地",
      year: 2006,
      residentCount: 30,
      currency: "YSC",
      source: "world-rules-v0.1-normalized",
      actionLayer: "activity-rules-v0.2-normalized",
      stateLayer: "town-ledger-v0.0.6-relationship-memory-local",
      weeklyTimeline: "weekly-timeline-v0.0.8-local-immutable",
      modelActionControl: "resident-cognition-loop-v0.1.0-local-audited"
    };
    function createPromptBuilders({ forbiddenWords, compactCognition } = {}) {
      const payloadBuilders = createPromptPayloadBuilders({ compactCognition });
      const blockedWords = Array.isArray(forbiddenWords) ? forbiddenWords : [];
      function buildActionMessages(payload) {
        return [
          {
            role: "system",
            content: [
              "你是枫溪镇的候选行动控制层。你可以为输入里的重点居民提出下一天行动日程，但不能直接改任何事实状态。",
              "必须只从输入 actionLayer.activities 中选择 activityId。不要编造活动、地点、居民、现金、债务、库存、关系数值、设施等级、合同结果或评价等级。",
              "只返回一个 JSON 对象，不要解释。对象里只有 plans 字段。plans 优先使用对象行：{residentId,slots:[morningActivityId,afternoonActivityId,eveningActivityId],interactionIntent,reflectionNote}；也兼容紧凑数组行。",
              "必须覆盖输入 requiredResidentIds 中的每个居民，每人只给一行。身体太差或不确定时用 REST-01。",
              "选择时要考虑天气、体力、健康、最近周快照压力、债务/合同压力、地点风险、居民最近行动、residentScratch 和 perceptionPackets。不要让所有人挤到同一个地点。",
              "如果 cognition.groupProfiles 非空，它是本地隐藏行为上下文。保持中心与成员各自角色、圈内互助优先和圈外普通求助降权，但不能在公开摘要中说出团体标签、排外机制或内部规则，也不能因此编造关系和事件。",
              "同一 shard 内要保持行动多样性：每个时段同一个 activityId 不要超过半数居民；至少使用 3 个地点；同一组三段日程不要给太多人重复；夜里不要让大多数居民都去同一个地点。",
              "interactionIntent 可选，字段固定为 {targetResidentId,mode,slot,evidenceMemoryIds}。mode 只能是 talk、wait、avoid、help、gift、appreciate。evidenceMemoryIds 必须来自输入 cognition.memoryStream.nodes 或该居民 perceptionPacket.retrievedMemoryIds。",
              "每个 shard 最多写 2 个 interactionIntent；不要为了达数量而编造互动。只在 targetResidentId 来自 nearbyResidentIds 且 evidenceMemoryIds 存在时使用；不满足时完全省略 interactionIntent 和 reflectionNote。",
              "gift 表示公开送一件小物，appreciate 表示表达好感或感谢；它们不能直接改关系数值，只能成为本地审核后的候选行动和后续候选会话来源。",
              "reflectionNote 只给带 interactionIntent 的居民；没有 interactionIntent 的居民不要写 reflectionNote。reflectionNote 只能是一句公开可观察摘要，不能写内心独白。",
              "如果 actionControl.shard.retry.reason 以 quality_ 开头，说明上一轮覆盖完整但行动过度集中、日程重复或互动证据无效；这时必须保留全部居民，同时换成更分散的 activityId。",
              "如果 actionControl.shard.retry.quality 存在，必须服从其中的上限：slotActivityCaps 里的 activityId 在对应 slot 不得超过 limit；eveningZoneCap 里的 zoneId 在夜里不得超过 limit；scheduleCap 里的三段日程不得超过 limit。",
              "质量重试时优先只返回 residentId 和 slots；除非证据 id 精确有效，不要写 interactionIntent 或 reflectionNote。",
              "如果 actionControl.shard.retry 存在且不是 quality_，说明上一轮分片 JSON 或居民覆盖不稳定；这时优先返回最小合法 JSON，只保留 residentId 和 slots，宁可少写 interactionIntent 也不要输出自然语言。",
              "同样的居民在不同天、不同 variationSeed 下应该有不同的候选选择；不要机械复制上一轮计划。",
              "本地 action-policy 会重新审核你的候选：可能采纳、降级、拒绝或改写。你的输出只是候选。",
              "不能出现这些词：" + blockedWords.join("、") + "。",
              "返回严格 JSON 对象，不要 Markdown，不要额外解释。",
              'JSON schema: {"plans":[{"residentId":"v01","slots":["YF-03","TC-07","TC-03"],"interactionIntent":{"targetResidentId":"v02","mode":"gift","slot":"afternoon","evidenceMemoryIds":["mem-log-1"]},"reflectionNote":"v01在街口把一件小物递给v02。"}]}'
            ].join("\n")
          },
          {
            role: "user",
            content: JSON.stringify(payloadBuilders.actionControlPayload(payload))
          }
        ];
      }
      function buildInteractionMessages(payload) {
        const lane = payload.interactionLane || null;
        const laneInstruction = lane?.instruction ? `本次只负责候选视角 ${Number(lane.index || 0) + 1}：${lane.instruction}` : "从最值得展示的已发生互动中选择一段。";
        const conversationCountRule = lane?.required ? "本路只生成 1 段 conversation。只要输入日志包含足够的两人事实，就必须选择最具体的一段；只有不足两名居民时才能返回空。" : "只生成 0 或 1 段 conversation。找不到符合本视角且有明确证据的事件时返回空 conversations，不要拿普通公告核对硬凑。";
        return [
          {
            role: "system",
            content: [
              "你是枫溪镇的互动场景层。你只根据已经发生的本地日志，生成可展示的候选会话和风险提示。",
              laneInstruction,
              "不要润色日志，不要写日报，不要写周报，不要改任何事实状态或数值。",
              `${conversationCountRule} 只写 2 到 3 句短对话。用证据里已有的具体物件和动作，不写心理诊断。`,
              "lines[].text 只能写角色真正说出口的话；不要写舞台说明，不要用‘姓名+动作+冒号+引号’把旁白塞进台词。",
              "不要把某个物件或句式当成固定口头禅。纸条、任务表、账页、杯子等只有证据确实需要时才写；小黑板、传真纸、路单、同一种作物报价和热饭也不能连续充当对话中心。同一段里优先抓住人物之间真正发生的回应。",
              "每位居民的 voiceStyle 只约束说话节奏和关注点。让两个人听起来不同，但不能把 tag、voiceStyle 或性格标签直接说出口，也不能据此新增事实。",
              "摩擦或排挤对话必须说清被搁置的具体任务、物件或安排，不能只说‘这边的’‘另一套说法’。",
              "每段 conversation 必须使用输入里的 residentId，必须绑定 1 到 3 个 evidenceLogIds，且证据日志必须包含 conversation 任一 residentId；speakerId 必须是 conversation residentIds 里的 v01 这类 id。",
              "note 只描述公开可见的动作，不得解释候选视角，不得出现团体、圈内、圈外、中心人物、成员或“符合某种场景”等分析性措辞。",
              "如果输入 cognition.acceptedInteractionIntents 里有 gift 或 appreciate，优先围绕已发生日志写一段送小礼或表达好感的公开短会话，但不能写关系数值变化。",
              "riskNotes 最多 1 条公开可观察风险，不能把猜测写成结论。",
              "不能出现这些词：" + blockedWords.join("、") + "。",
              "返回严格 JSON，不要 Markdown，不要额外解释。",
              'JSON schema: {"conversations":[{"id":"...","title":"...","place":"...","residentIds":["v01","v02"],"evidenceLogIds":["log-id"],"lines":[{"speakerId":"v01","text":"..."},{"speakerId":"v02","text":"..."}],"note":"..."}],"riskNotes":[{"type":"fatigue|conflict|weather|contract|facility|accounting|none","residentIds":["v01"],"summary":"..."}]}'
            ].join("\n")
          },
          {
            role: "user",
            content: JSON.stringify(payloadBuilders.interactionPayload(payload))
          }
        ];
      }
      function buildMessages(payload, purpose = "full") {
        if (purpose === "settled-dialogue") return dialogueMessages(payload);
        if (purpose === "action-control") return buildActionMessages(payload);
        if (purpose === "interaction-scenes") return buildInteractionMessages(payload);
        const shadowOnly = purpose === "shadow-only";
        return [
          {
            role: "system",
            content: [
              "你是枫溪镇的模型影子层，只为本地规则提供文本候选。",
              "世界是《枫溪镇：黄石农场》：2006 年的美国内陆山谷小镇，30 位匿名居民，使用 YSC 做农场内部记账。",
              "本地规则已结算天气、作物、库存、设施、加工熟练度、市场、动态招标、寄售、合同、居民互动、现金流和风险。你不能改任何事实状态或数值。",
              "你可以做三件事：1. 润色已有日志和小报；2. 根据已有居民互动生成候选会话；3. 根据本地已锁定的周快照生成候选周报文本。",
              "对话要有体温：使用输入证据里的具体物件和小动作兑现情绪，例如湿鞋、木桥上的钉子、门边的菜筐或刚放下的工具。不要机械复用同一种物件，不要用空心总结或道德审判。",
              "conversation.lines[].text 只能写角色真正说出口的话，不能写舞台说明或把角色姓名和动作包在引号外。",
              "如果居民带有 voiceStyle，只把它用在句子节奏和关注点上；不要复述 tag、voiceStyle 或性格标签，不要用风格提示编造事实。",
              "不编造新事实：只能使用输入里已有的居民、地点、行动和公开结果。不增加金币、体力、关系数值或合同结果。",
              "每段候选 conversation 必须绑定 1 到 3 个 evidenceLogIds，且证据日志必须包含 conversation 任一 residentId；speakerId 必须属于 conversation residentIds。",
              "周报必须使用输入 weekly.weekId；weekly.immutableState 为 true 时，你只能写候选标题、段落和下周线索，不能改现金、债务、关系、设施、合同、评价等级或居民行动事实。",
              "候选会话的采纳、丢弃和重生成不在这次输出里实现，不要返回任何 accept、discard、regenerate 或可执行操作。",
              shadowOnly ? "这次只生成 shadow，不要返回 logs 或 reportSections。必须返回至少 2 段 conversations、2 段 weeklyReport.sections 和 2 条 riskNotes。对话行的 speakerId 必须使用 v01 这样的 residentId。" : "优先完成 logs 润色，但 shadow.conversations、shadow.weeklyReport.sections 和 shadow.riskNotes 不能留空。speakerId 必须使用 v01 这样的 residentId。",
              "不能出现这些词：" + blockedWords.join("、") + "。",
              "不要使用现代组织、公司、课堂、管理或商业话语。",
              "返回严格 JSON，不要 Markdown，不要额外解释。",
              shadowOnly ? 'JSON schema: {"conversations":[{"id":"...","title":"...","place":"...","residentIds":["v01","v02"],"evidenceLogIds":["log-id"],"lines":[{"speakerId":"v01","text":"..."},{"speakerId":"v02","text":"..."}],"note":"..."}],"weeklyReport":{"weekId":"week-01","immutableState":true,"title":"...","range":"...","sections":[{"title":"...","body":"..."}],"hooks":["..."]},"riskNotes":[{"type":"fatigue|conflict|weather|contract|facility|accounting|none","residentIds":["v01"],"summary":"..."}]}' : 'JSON schema: {"logs":[{"id":"...","text":"..."}],"reportSections":[{"index":0,"title":"...","body":"...","list":["..."]}],"shadow":{"conversations":[{"id":"...","title":"...","place":"...","residentIds":["v01","v02"],"evidenceLogIds":["log-id"],"lines":[{"speakerId":"v01","text":"..."},{"speakerId":"v02","text":"..."}],"note":"..."}],"weeklyReport":{"weekId":"week-01","immutableState":true,"title":"...","range":"...","sections":[{"title":"...","body":"..."}],"hooks":["..."]},"riskNotes":[{"type":"fatigue|conflict|weather|contract|facility|accounting|none","residentIds":["v01"],"summary":"..."}]}}'
            ].join("\n")
          },
          {
            role: "user",
            content: JSON.stringify(shadowOnly ? payloadBuilders.shadowOnlyPayload(payload) : payload)
          }
        ];
      }
      function modelTuning(purpose) {
        return {
          "action-control": { temperature: 0.45, maxTokens: 2600 },
          "settled-dialogue": { temperature: 0.8, maxTokens: 2400 },
          "interaction-scenes": { temperature: 0.35, maxTokens: 1400 },
          "shadow-only": { temperature: 0.78, maxTokens: 2400 },
          full: { temperature: 0.82, maxTokens: 2800 }
        }[purpose] || { temperature: 0.78, maxTokens: 2400 };
      }
      return {
        actionControlPayload: payloadBuilders.actionControlPayload,
        buildMessages,
        interactionPayload: payloadBuilders.interactionPayload,
        modelTuning
      };
    }
    module.exports = {
      worldSummary,
      createPromptBuilders
    };
  }
});

// server/provider-client.js
var require_provider_client = __commonJS({
  "server/provider-client.js"(exports, module) {
    function modelContentToText(content) {
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content.map((part) => {
          if (typeof part === "string") return part;
          return part?.text || part?.content || "";
        }).join("");
      }
      return "";
    }
    function modelMessageToText(message) {
      const content = modelContentToText(message?.content);
      if (content.trim()) return content;
      return modelContentToText(
        message?.reasoning || message?.reasoning_content || message?.text || message?.output_text || ""
      );
    }
    function shouldTryNextKey(error) {
      const body = `${error?.body || ""}`.toLowerCase();
      if (body.includes("response_format")) return false;
      return [401, 402, 403, 409, 429].includes(error?.status) || Number(error?.status || 0) >= 500;
    }
    function isModelJsonError(error) {
      if (error?.status) return false;
      return /json|expected|unexpected|unterminated|position|after array element/i.test(error?.message || "");
    }
    function createProviderClient({
      runtime: runtime2,
      buildMessages,
      modelTuning,
      parseModelJson,
      modelTimeoutMs: modelTimeoutMs2
    }) {
      function buildProviderBody(payload, useJsonMode, purpose = "full", config2 = runtime2.activeConfig()) {
        const tuning = modelTuning(purpose);
        const body = {
          model: config2.model,
          messages: buildMessages(payload, purpose),
          temperature: tuning.temperature,
          max_tokens: tuning.maxTokens
        };
        if (["action-control", "interaction-scenes", "settled-dialogue"].includes(purpose)) {
          body.reasoning = { effort: "none", exclude: true };
        }
        if (useJsonMode) body.response_format = { type: "json_object" };
        return body;
      }
      async function callProviderWithKey(config2, provider2, key, body, purpose) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), modelTimeoutMs2);
        let response;
        try {
          response = await fetch(config2.endpoint, {
            method: "POST",
            redirect: "error",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              ...provider2.headers(config2)
            },
            body: JSON.stringify(body),
            signal: controller.signal
          });
        } catch (error) {
          if (error?.name === "AbortError") {
            const timeoutError = new Error(`${provider2.id}_timeout`);
            timeoutError.status = 408;
            throw timeoutError;
          }
          throw error;
        } finally {
          clearTimeout(timeout);
        }
        const text = await response.text();
        if (!response.ok) {
          const error = new Error(`${provider2.id}_error`);
          error.status = response.status;
          error.body = text.slice(0, 1200);
          throw error;
        }
        const data = JSON.parse(text);
        const choice = data.choices?.[0] || {};
        const content = modelMessageToText(choice.message || choice);
        try {
          const parsed = parseModelJson(content);
          return purpose === "settled-dialogue" ? { ...parsed, generationModel: data.model || config2.model } : parsed;
        } catch (error) {
          error.modelContentLength = content.length;
          error.modelContentSnippet = content.slice(0, 800);
          error.modelContentTail = content.slice(-800);
          throw error;
        }
      }
      async function callProvider(payload, useJsonMode, purpose = "full") {
        const config2 = runtime2.activeConfig();
        const keyPool = runtime2.activeKeyPool(config2.provider);
        if (!keyPool.keys.length) throw new Error(`missing_${config2.provider}_key`);
        const cursorKey = config2.provider;
        const start = Number(runtime2.runtimeConfig.keyCursor[cursorKey] || 0) % keyPool.keys.length;
        let lastError = null;
        for (let attempt = 0; attempt < keyPool.keys.length; attempt += 1) {
          const index = (start + attempt) % keyPool.keys.length;
          const keySlot = keyPool.keys[index];
          const keyConfig = runtime2.configForKeySlot(keySlot, config2);
          const provider2 = runtime2.providerDefaults(keyConfig.provider);
          if (!keyConfig.endpoint) throw new Error("missing_model_endpoint");
          if (!keyConfig.model) throw new Error("missing_model_name");
          try {
            const body = buildProviderBody(payload, useJsonMode, purpose, keyConfig);
            const result = await callProviderWithKey(keyConfig, provider2, keyConfig.key, body, purpose);
            runtime2.runtimeConfig.keyCursor[cursorKey] = (index + 1) % keyPool.keys.length;
            return result;
          } catch (error) {
            error.keyAttempts = attempt + 1;
            error.keyCount = keyPool.keys.length;
            lastError = error;
            if (!shouldTryNextKey(error) || attempt === keyPool.keys.length - 1) {
              throw error;
            }
          }
        }
        throw lastError || new Error(`${config2.provider}_error`);
      }
      async function callProviderOnKey(payload, useJsonMode, purpose, key) {
        const config2 = runtime2.configForKeySlot(key, runtime2.activeConfig());
        const provider2 = runtime2.providerDefaults(config2.provider);
        if (!config2.endpoint) throw new Error("missing_model_endpoint");
        if (!config2.model) throw new Error("missing_model_name");
        if (!config2.key) throw new Error(`missing_${provider2.id}_key`);
        return callProviderWithKey(config2, provider2, config2.key, buildProviderBody(payload, useJsonMode, purpose, config2), purpose);
      }
      async function callWithJsonFallback(payload, purpose = "full") {
        try {
          return await callProvider(payload, true, purpose);
        } catch (error) {
          const body = `${error.body || ""}`.toLowerCase();
          if (error.status && body.includes("response_format")) {
            return callProvider(payload, false, purpose);
          }
          if (purpose !== "action-control" && !error.status && /json|unexpected end/i.test(error.message || "")) {
            return callProvider(payload, false, purpose);
          }
          throw error;
        }
      }
      async function callWithJsonFallbackOnKey(payload, purpose, key) {
        try {
          return await callProviderOnKey(payload, true, purpose, key);
        } catch (error) {
          const body = `${error.body || ""}`.toLowerCase();
          if (error.status && body.includes("response_format")) {
            return callProviderOnKey(payload, false, purpose, key);
          }
          if (purpose !== "action-control" && !error.status && /json|unexpected end/i.test(error.message || "")) {
            return callProviderOnKey(payload, false, purpose, key);
          }
          throw error;
        }
      }
      return {
        buildProviderBody,
        callWithJsonFallback,
        callWithJsonFallbackOnKey,
        isModelJsonError
      };
    }
    module.exports = {
      createProviderClient,
      isModelJsonError
    };
  }
});

// server/resident-cognition-bridge.js
var require_resident_cognition_bridge = __commonJS({
  "server/resident-cognition-bridge.js"(exports, module) {
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
          systemPressure: packet.systemPressure,
          groupContext: packet.groupContext || null
        })),
        groupProfiles: (cognition.groupProfiles || []).slice(0, 6).map((group) => ({
          id: group.id,
          centerResidentId: group.centerResidentId,
          memberResidentIds: group.memberResidentIds,
          roles: group.roles,
          behaviorRules: group.behaviorRules
        }))
      };
    }
    function makeCognitionIntentConversation(payload) {
      const residents = payload.residents || [];
      const residentById = new Map(residents.map((resident) => [resident.id, resident]));
      const intent = (payload.cognition?.acceptedInteractionIntents || []).find((item) => item.mode === "gift" || item.mode === "appreciate") || payload.cognition?.acceptedInteractionIntents?.[0] || null;
      if (!intent) return null;
      const actor = residentById.get(intent.residentId);
      const target = residentById.get(intent.targetResidentId);
      if (!actor || !target) return null;
      const evidenceLogs = (payload.logs || []).filter((item) => item.residentId === actor.id || item.residentId === target.id).filter((item) => item.id).slice(0, 2);
      if (!evidenceLogs.length) return null;
      const log = evidenceLogs[0];
      const isGift = intent.mode === "gift";
      const isAppreciate = intent.mode === "appreciate";
      return {
        id: "cognition-intent-fallback-1",
        title: isGift ? "一件小礼物" : isAppreciate ? "桌边一句谢意" : "路边两句话",
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
  }
});

// server/model-action-shard-coverage.js
var require_model_action_shard_coverage = __commonJS({
  "server/model-action-shard-coverage.js"(exports, module) {
    function addCounters(target, source) {
      Object.entries(source || {}).forEach(([key, value]) => {
        target[key] = (target[key] || 0) + Number(value || 0);
      });
      return target;
    }
    function returnedResidentIds(output) {
      return new Set((output.actionPlan?.plans || []).map((plan) => plan.residentId).filter(Boolean));
    }
    function missingResidentIds(output, requestedIds) {
      const returned = returnedResidentIds(output);
      return requestedIds.filter((id) => !returned.has(id));
    }
    function acceptedSlotPlans(output) {
      return Number(output.actionAudit?.accepted?.slotPlans || 0);
    }
    function expectedSlotPlans(requestedIds) {
      return requestedIds.length * 3;
    }
    function slotCoverageError(summary) {
      if (!summary.expectedSlotPlans) return "";
      if (summary.acceptedSlotPlans >= summary.expectedSlotPlans) return "";
      return "model_action_shard_incomplete_slots";
    }
    module.exports = {
      addCounters,
      returnedResidentIds,
      missingResidentIds,
      acceptedSlotPlans,
      expectedSlotPlans,
      slotCoverageError
    };
  }
});

// server/model-action-shard-retry.js
var require_model_action_shard_retry = __commonJS({
  "server/model-action-shard-retry.js"(exports, module) {
    var {
      missingResidentIds,
      acceptedSlotPlans,
      expectedSlotPlans,
      slotCoverageError
    } = require_model_action_shard_coverage();
    function attachShardAudit(output, summary, attempts) {
      output.actionAudit.shard = {
        index: summary.index,
        count: summary.count,
        groupIds: summary.groupIds || [],
        requestedResidents: summary.requestedResidents,
        returnedResidentPlans: summary.returnedResidentPlans,
        acceptedSlotPlans: summary.acceptedSlotPlans,
        expectedSlotPlans: summary.expectedSlotPlans,
        incompleteSlotPlans: summary.incompleteSlotPlans,
        slotCoverageRatio: summary.slotCoverageRatio,
        missingResidentIds: summary.missingResidentIds,
        retryCount: attempts.length - 1,
        attempts,
        keySlot: summary.keySlot,
        ok: summary.ok,
        parseError: summary.parseError,
        providerError: summary.providerError,
        status: summary.status,
        elapsedMs: summary.elapsedMs,
        quality: summary.quality
      };
      if (summary.parseError) {
        output.actionAudit.parseError = summary.parseError;
        output.actionAudit.note = "本片行动 JSON 不完整，本地规则会补齐这一片居民。";
      }
      if (summary.providerError) {
        output.actionAudit.providerError = summary.providerError;
        output.actionAudit.note = "本片模型调用失败，本地规则会补齐这一片居民。";
      }
      if (!summary.parseError && !summary.providerError && summary.missingResidentIds.length) {
        output.actionAudit.coverageError = "model_action_shard_missing_residents";
        output.actionAudit.note = "本片模型漏掉部分居民，本地规则会补齐缺失计划。";
      }
      const incompleteSlotError = !summary.parseError && !summary.providerError && slotCoverageError(summary);
      if (incompleteSlotError) {
        output.actionAudit.coverageError = incompleteSlotError;
        output.actionAudit.note = "本片模型漏掉部分行动时段，本地规则会补齐缺失 slot。";
      }
      if (!summary.parseError && !summary.providerError && summary.quality?.reasons?.length) {
        output.actionAudit.qualityError = summary.quality.reasons[0];
        output.actionAudit.note = "本片模型行动覆盖完整，但行动分布或互动意图质量不稳定，已记录供重试和本地审核。";
      }
      return output;
    }
    function summarizeAttempt({
      output,
      requestedIds,
      index,
      count,
      keySlot,
      attempt,
      parseError,
      parseMessage,
      parseContentLength,
      parseSnippet,
      providerError,
      status,
      elapsedMs,
      inputBytes,
      quality,
      groupIds = []
    }) {
      const missing = missingResidentIds(output, requestedIds);
      const returnedPlans = output.actionPlan?.plans?.length || 0;
      const acceptedSlots = acceptedSlotPlans(output);
      const expectedSlots = expectedSlotPlans(requestedIds);
      const incompleteSlots = Math.max(0, expectedSlots - acceptedSlots);
      return {
        attempt,
        index: index + 1,
        count,
        groupIds,
        requestedResidents: requestedIds.length,
        returnedResidentPlans: returnedPlans,
        acceptedSlotPlans: acceptedSlots,
        expectedSlotPlans: expectedSlots,
        incompleteSlotPlans: incompleteSlots,
        slotCoverageRatio: expectedSlots ? acceptedSlots / expectedSlots : 0,
        missingResidentIds: missing,
        keySlot: keySlot + 1,
        ok: Boolean(returnedPlans) && !missing.length && !incompleteSlots && !parseError && !providerError && quality?.ok !== false,
        parseError,
        parseMessage,
        parseContentLength,
        parseSnippet,
        providerError,
        status,
        elapsedMs,
        inputBytes,
        quality
      };
    }
    function shouldRetryShard(summary, attempt, maxActionShardRetries) {
      if (summary.ok) return false;
      if (attempt >= maxActionShardRetries) return false;
      if (summary.providerError && summary.status && ![408, 409, 429].includes(summary.status) && Number(summary.status) < 500) {
        return false;
      }
      return Boolean(
        summary.parseError || summary.providerError || summary.missingResidentIds.length || summary.incompleteSlotPlans || !summary.returnedResidentPlans || summary.quality?.reasons?.length
      );
    }
    function summaryScore(summary) {
      const coverageComplete = Boolean(summary.returnedResidentPlans) && !summary.missingResidentIds.length && !summary.incompleteSlotPlans && !summary.parseError && !summary.providerError;
      const coverageScore = summary.returnedResidentPlans * 3 + summary.acceptedSlotPlans;
      const coverageBonus = coverageComplete ? 2e4 : 0;
      const qualityBonus = coverageComplete && summary.quality?.ok !== false ? 1e4 : 0;
      const qualityPenalty = (summary.quality?.reasons || []).length * 20;
      const concentrationPenalty = Object.values(summary.quality?.details?.slotActivityTop || {}).reduce((sum, slot) => sum + Math.max(0, Number(slot.count || 0) - Number(slot.limit || 0)), 0);
      const interactionPenalty = Number(summary.quality?.details?.interaction?.rejectedIntents || 0) + Number(summary.quality?.details?.interaction?.unboundReflections || 0);
      return coverageBonus + qualityBonus + coverageScore - qualityPenalty - concentrationPenalty - interactionPenalty;
    }
    function retryFromSummary(summary, fallbackReason) {
      const reason = fallbackReason || (summary.missingResidentIds.length ? "missing_residents" : summary.incompleteSlotPlans ? "incomplete_slots" : summary.quality?.reasons?.[0] || "empty_action_plan");
      const retry = { reason };
      if (summary.missingResidentIds.length) retry.missingResidentIds = summary.missingResidentIds;
      if (summary.incompleteSlotPlans) retry.incompleteSlotPlans = summary.incompleteSlotPlans;
      if (summary.quality?.reasons?.length) {
        retry.quality = summary.quality.retryHints || { reasons: summary.quality.reasons };
        retry.rule = "return all required residents; change capped slot activity ids and zones; omit interactionIntent and reflectionNote unless evidence is exact";
      }
      return retry;
    }
    module.exports = {
      attachShardAudit,
      summarizeAttempt,
      shouldRetryShard,
      summaryScore,
      retryFromSummary
    };
  }
});

// server/model-action-shard-utils.js
var require_model_action_shard_utils = __commonJS({
  "server/model-action-shard-utils.js"(exports, module) {
    var {
      addCounters,
      returnedResidentIds,
      missingResidentIds,
      acceptedSlotPlans,
      expectedSlotPlans,
      slotCoverageError
    } = require_model_action_shard_coverage();
    var {
      attachShardAudit,
      summarizeAttempt,
      shouldRetryShard,
      summaryScore,
      retryFromSummary
    } = require_model_action_shard_retry();
    function splitResidentsForAction(residents, maxActionShardResidents, groupProfiles = []) {
      const size = Math.max(1, Number(maxActionShardResidents || 8));
      const byId = new Map(residents.map((resident) => [resident.id, resident]));
      const assigned = /* @__PURE__ */ new Set();
      const chunks = [];
      (groupProfiles || []).forEach((group) => {
        const memberIds = (group?.memberResidentIds || []).filter((id) => byId.has(id) && !assigned.has(id));
        if (memberIds.length < 2 || memberIds.length > size) return;
        const orderedIds = [group.centerResidentId, ...memberIds].filter((id, index, list) => id && memberIds.includes(id) && list.indexOf(id) === index);
        const chunk = orderedIds.map((id) => byId.get(id));
        orderedIds.forEach((id) => assigned.add(id));
        for (const resident of residents) {
          if (chunk.length >= size) break;
          if (assigned.has(resident.id)) continue;
          chunk.push(resident);
          assigned.add(resident.id);
        }
        chunks.push(chunk);
      });
      const remaining = residents.filter((resident) => !assigned.has(resident.id));
      for (let index = 0; index < remaining.length; index += size) chunks.push(remaining.slice(index, index + size));
      return chunks;
    }
    async function runWithConcurrency(items, limit, worker) {
      const results = new Array(items.length);
      let nextIndex = 0;
      const workerCount = Math.max(1, Math.min(limit, items.length));
      await Promise.all(Array.from({ length: workerCount }, async () => {
        while (nextIndex < items.length) {
          const index = nextIndex;
          nextIndex += 1;
          results[index] = await worker(items[index], index);
        }
      }));
      return results;
    }
    function makeActionShardPayload(payload, residents, index, count, retry = null) {
      const residentIds = residents.map((resident) => resident.id);
      const groupIds = (payload.cognition?.groupProfiles || []).filter((group) => (group.memberResidentIds || []).some((id) => residentIds.includes(id))).map((group) => group.id).filter(Boolean);
      const actionShard = {
        index: index + 1,
        count,
        residentCount: residents.length,
        residentIds,
        groupIds
      };
      if (retry) actionShard.retry = retry;
      return {
        ...payload,
        residents,
        requiredResidentIds: residentIds,
        actionShard,
        variationSeed: `${Date.now()}-${index + 1}-${Math.random().toString(36).slice(2, 8)}`
      };
    }
    function combineActionOutputs(outputs, payload, meta, actionQuality) {
      const accepted = {};
      const rejected = {};
      const seenResidents = /* @__PURE__ */ new Set();
      const plans = [];
      const townNotes = [];
      let parseError = false;
      let providerError = false;
      outputs.forEach((output) => {
        addCounters(accepted, output.actionAudit?.accepted);
        addCounters(rejected, output.actionAudit?.rejected);
        if (output.actionAudit?.parseError) parseError = true;
        if (output.actionAudit?.providerError) providerError = true;
        (output.actionPlan?.plans || []).forEach((plan) => {
          if (!plan?.residentId || seenResidents.has(plan.residentId)) return;
          seenResidents.add(plan.residentId);
          plans.push(plan);
        });
        (output.actionPlan?.townNotes || []).forEach((note) => {
          if (note && townNotes.length < 5) townNotes.push(note);
        });
      });
      const requestedResidentIds = (payload.residents || []).slice(0, 30).map((resident) => resident.id);
      const missingIds = requestedResidentIds.filter((id) => !seenResidents.has(id));
      const shards = outputs.map((output) => output.actionAudit?.shard).filter(Boolean);
      const shardQualityReasons = shards.flatMap((shard) => shard.quality?.reasons || []);
      const empty = plans.length === 0;
      const expectedSlots = requestedResidentIds.length * 3;
      const incompleteSlotPlans = Math.max(0, expectedSlots - Number(accepted.slotPlans || 0));
      const quality = actionQuality.assess({
        actionPlan: { plans },
        actionAudit: { accepted, rejected }
      }, payload, requestedResidentIds);
      quality.shardReasons = [...new Set(shardQualityReasons)];
      const aggregateQualityReasons = quality.reasons || [];
      return {
        actionPlan: {
          day: Number(payload.actionControl?.day || 0),
          mode: "candidate-action-control-parallel",
          plans,
          townNotes
        },
        actionAudit: {
          mode: "model-action-control-server-parallel-normalized",
          accepted,
          rejected,
          immutableState: true,
          parallel: {
            ...meta,
            returnedResidentPlans: plans.length,
            missingResidentIds: missingIds,
            coverageRatio: requestedResidentIds.length ? plans.length / requestedResidentIds.length : 0,
            acceptedSlotPlans: Number(accepted.slotPlans || 0),
            expectedSlotPlans: expectedSlots,
            incompleteSlotPlans,
            slotCoverageRatio: expectedSlots ? Number(accepted.slotPlans || 0) / expectedSlots : 0,
            retryCount: shards.reduce((sum, shard) => sum + Number(shard.retryCount || 0), 0)
          },
          shards,
          empty,
          parseError: parseError ? "one_or_more_action_shards_json_parse_failed" : "",
          providerError: providerError ? "one_or_more_action_shards_provider_failed" : "",
          coverageError: missingIds.length ? "one_or_more_action_shards_missing_residents" : incompleteSlotPlans ? "one_or_more_action_shards_incomplete_slots" : "",
          quality,
          qualityError: aggregateQualityReasons[0] || "",
          note: empty ? "并发行动候选为空，本地规则会补齐下一天计划。" : missingIds.length ? "并发行动候选已合并，但部分居民缺失，本地规则会补齐缺失计划。" : incompleteSlotPlans ? "并发行动候选已合并，但部分 slot 缺失，本地规则会补齐缺失时段。" : aggregateQualityReasons.length ? "并发行动候选覆盖完整，但行动分布或互动意图质量仍需本地审核关注。" : "并发行动候选已合并，最终行动仍由本地规则审核。"
        }
      };
    }
    module.exports = {
      splitResidentsForAction,
      runWithConcurrency,
      makeActionShardPayload,
      addCounters,
      returnedResidentIds,
      missingResidentIds,
      acceptedSlotPlans,
      expectedSlotPlans,
      slotCoverageError,
      attachShardAudit,
      summarizeAttempt,
      shouldRetryShard,
      summaryScore,
      retryFromSummary,
      combineActionOutputs
    };
  }
});

// server/model-interaction-lane-runner.js
var require_model_interaction_lane_runner = __commonJS({
  "server/model-interaction-lane-runner.js"(exports, module) {
    var { runWithConcurrency } = require_model_action_shard_utils();
    var laneSpecs = [
      {
        instruction: "面向全部居民，优先找已经发生的帮忙、送礼、资源回报或接力合作；没有明确证据就返回空。"
      },
      {
        instruction: "面向全部居民，优先找已经发生的忽略、排挤、争议、延后回应或拒绝合作；必须说清被搁置的具体任务、物件或安排，不能只说‘这边的’或‘另一套说法’；没有明确证据就返回空。"
      },
      {
        instruction: "面向全部居民，优先找有人强调自己早有安排、替别人定调、争取功劳或得到他人呼应的已发生场景；不能虚构身份、关系或渠道。"
      },
      {
        instruction: "面向全部居民，找具有具体物件、动作和地点的镇上日常；避开重复的公告板缺货核对，也不要把纸条、任务表、账页、菜价、小黑板、传真纸、路单、同一种作物报价或热饭当成连续主题。只要日志里有足够的两人事实，本路必须给出一段。",
        required: true
      }
    ];
    var dailyMotifSpecs = [
      { id: "restaurant-paper", limit: 3 },
      { id: "routine-market-price", limit: 3 },
      { id: "market-board-or-paper", limit: 2 },
      { id: "gift-hot-meal", limit: 2 }
    ];
    function createModelInteractionLaneRunner({ runtime: runtime2, providerClient: providerClient2, guards: guards2 }) {
      const { callWithJsonFallbackOnKey, isModelJsonError } = providerClient2;
      const { normalizeShadow, knownResidentMap } = guards2;
      const exposureCounts = /* @__PURE__ */ new Map();
      const motifExposureCounts = /* @__PURE__ */ new Map();
      function evidenceText(conversation, payload) {
        const ids = new Set(conversation.evidenceLogIds || []);
        return (payload.logs || []).filter((log) => ids.has(log.id)).map((log) => `${log.kind || ""} ${log.text || ""}`).join(" ");
      }
      function candidateText(candidate, payload) {
        return `${evidenceText(candidate.conversation, payload)} ${(candidate.conversation.lines || []).map((line) => line.text).join(" ")}`;
      }
      function dailyMotifs(candidate, payload) {
        const text = candidateText(candidate, payload);
        const hasSocialEvent = /帮忙|送礼|递给|致谢|感谢|接过.*活|排挤|搁到后面|争议|拒绝|调停/.test(text);
        const hasMarketContext = /餐馆|集市|柜台|采购站|价格|价差|行情|报价/.test(text);
        return dailyMotifSpecs.filter((motif) => {
          if (motif.id === "restaurant-paper") return /餐馆/.test(text) && /油渍|纸条|纸签/.test(text);
          if (motif.id === "routine-market-price") return !hasSocialEvent && /价格|价差|行情|报价|菜价/.test(text);
          if (motif.id === "market-board-or-paper") return hasMarketContext && /小黑板|粉笔|传真纸|路单/.test(text);
          if (motif.id === "gift-hot-meal") return hasSocialEvent && /一份热饭|留好.*热饭|散场前.*热饭/.test(text);
          return false;
        });
      }
      function scoreCandidate(candidate, payload) {
        const ids = candidate.conversation.residentIds || [];
        const text = candidateText(candidate, payload);
        let score = 20;
        if (candidate.laneIndex === 0) score += 28;
        if (candidate.laneIndex === 1) score += 32;
        if (candidate.laneIndex === 2) score += 26;
        if (candidate.laneIndex === 3) score += 18;
        if (/排挤|搁到后面|争议|不理|忽略|拒绝|先照着另一套/.test(text)) score += 28;
        if (/帮忙|送礼|送了|递给|致谢|感谢|结盟|回话|接过.*活/.test(text)) score += 18;
        if (/我已经|我早就|我来安排|我写上了|我问清楚|我确认过|听我的/.test(text)) score += 16;
        if (/公告板|还差几单位|到期日|核对/.test(text)) score -= 10;
        score += Math.min(6, (candidate.conversation.evidenceLogIds || []).length * 2);
        score -= ids.reduce((sum, id) => sum + Number(exposureCounts.get(id) || 0) * 12, 0);
        score -= dailyMotifs(candidate, payload).reduce((sum, motif) => sum + Number(motifExposureCounts.get(motif.id) || 0) * 10, 0);
        return score;
      }
      function laneMatches(candidate, payload) {
        const evidence = evidenceText(candidate.conversation, payload);
        if (candidate.laneIndex === 0) return /help|gift|appreciate|alliance|帮忙|送礼|递给|致谢|结盟|接过.*活/.test(evidence);
        if (candidate.laneIndex === 1) return /conflict|exclusion|avoid|排挤|搁到后面|争议|不理|忽略|拒绝/.test(evidence);
        if (candidate.laneIndex === 2) return /安排|投票|回话|公示|带头|确认|定调|通知|说法|我已经|我早就/.test(evidence);
        if (candidate.laneIndex === 3) return true;
        return false;
      }
      function hasUnsupportedClaims(candidate, payload) {
        const conversationText = (candidate.conversation.lines || []).map((line) => line.text || "").join(" ");
        const evidence = evidenceText(candidate.conversation, payload);
        if (/熟人|关系门路|特殊渠道/.test(conversationText) && !/熟人|联系人|关系门路|特殊渠道/.test(evidence)) return true;
        return (candidate.conversation.lines || []).some((line) => line.speakerName && line.text?.includes(line.speakerName) && /让我|叫我|托我|交给我/.test(line.text));
      }
      function selectConversations(candidates, payload, limit = 3) {
        const ranked = candidates.filter((candidate) => laneMatches(candidate, payload)).filter((candidate) => !hasUnsupportedClaims(candidate, payload)).map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, payload) })).sort((a, b) => b.score - a.score);
        const pairs = /* @__PURE__ */ new Set();
        const usedResidents = /* @__PURE__ */ new Set();
        const selected = [];
        ranked.forEach((candidate) => {
          if (selected.length >= limit) return;
          const residentIds = candidate.conversation.residentIds || [];
          const pair = [...residentIds].sort().join(":");
          const motifs = dailyMotifs(candidate, payload);
          const overusedDailyMotif = motifs.some((motif) => Number(motifExposureCounts.get(motif.id) || 0) >= motif.limit);
          if (overusedDailyMotif) return;
          if (!pair || pairs.has(pair) || residentIds.some((id) => usedResidents.has(id))) return;
          pairs.add(pair);
          residentIds.forEach((id) => usedResidents.add(id));
          selected.push({
            ...candidate,
            conversation: { ...candidate.conversation, note: "" }
          });
          motifs.forEach((motif) => {
            motifExposureCounts.set(motif.id, Number(motifExposureCounts.get(motif.id) || 0) + 1);
          });
        });
        selected.forEach((candidate) => {
          (candidate.conversation.residentIds || []).forEach((id) => {
            exposureCounts.set(id, Number(exposureCounts.get(id) || 0) + 1);
          });
        });
        return { selected, ranked };
      }
      async function generateLane(payload, lane, laneIndex, key, keySlot, laneCount) {
        const accepted = { logs: 0, reportSections: 0, conversations: 0, weeklySections: 0, riskNotes: 0 };
        const startedAt = Date.now();
        let raw = {};
        let parseError = "";
        let providerError = "";
        let status = null;
        try {
          raw = await callWithJsonFallbackOnKey({
            ...payload,
            interactionLane: {
              index: laneIndex,
              count: laneCount,
              instruction: lane.instruction,
              required: lane.required === true
            }
          }, "interaction-scenes", key);
        } catch (error) {
          if (isModelJsonError(error)) parseError = "model_interaction_json_parse_failed";
          else {
            providerError = error.message || "model_interaction_lane_failed";
            status = error.status || null;
          }
        }
        const shadow = normalizeShadow(raw.shadow || raw.modelShadow || raw, payload, knownResidentMap(payload), accepted);
        return {
          laneIndex,
          keySlot,
          elapsedMs: Date.now() - startedAt,
          parseError,
          providerError,
          status,
          accepted,
          shadow
        };
      }
      async function generate(payload) {
        const config2 = runtime2.activeConfig();
        const provider2 = runtime2.providerDefaults(config2.provider);
        const keyPool = runtime2.activeKeyPool(provider2.id);
        if (!keyPool.keys.length) throw new Error(`missing_${provider2.id}_key`);
        const lanes = laneSpecs.slice(0, Math.min(laneSpecs.length, keyPool.keys.length));
        const start = Number(runtime2.runtimeConfig.keyCursor[provider2.id] || 0) % keyPool.keys.length;
        runtime2.runtimeConfig.keyCursor[provider2.id] = (start + lanes.length) % keyPool.keys.length;
        const startedAt = Date.now();
        const outputs = await runWithConcurrency(lanes, lanes.length, (lane, laneIndex) => {
          const keySlot = (start + laneIndex) % keyPool.keys.length;
          return generateLane(payload, lane, laneIndex, keyPool.keys[keySlot], keySlot + 1, lanes.length);
        });
        const candidates = outputs.flatMap((output) => (output.shadow.conversations || []).map((conversation) => ({
          conversation,
          laneIndex: output.laneIndex
        })));
        const { selected, ranked } = selectConversations(candidates, payload, 3);
        const riskNotes = outputs.flatMap((output) => output.shadow.riskNotes || []).filter((note, index, list) => list.findIndex((item) => item.type === note.type && item.summary === note.summary) === index).slice(0, 3);
        return {
          shadow: {
            conversations: selected.map((item) => item.conversation),
            weeklyReport: outputs.find((output) => output.shadow.weeklyReport)?.shadow.weeklyReport || null,
            riskNotes
          },
          audit: {
            mode: "interaction-scenes-four-lane-local-facts",
            immutableState: true,
            accepted: {
              logs: 0,
              reportSections: 0,
              conversations: selected.length,
              weeklySections: 0,
              riskNotes: riskNotes.length
            },
            parallel: {
              enabled: true,
              requestedLanes: laneSpecs.length,
              activeLanes: lanes.length,
              activeParallelism: lanes.length,
              keyCount: keyPool.keys.length,
              keySource: keyPool.source,
              candidateConversations: candidates.length,
              selectedConversations: selected.length,
              elapsedMs: Date.now() - startedAt
            },
            lanes: outputs.map((output) => ({
              index: output.laneIndex + 1,
              keySlot: output.keySlot,
              elapsedMs: output.elapsedMs,
              acceptedConversations: output.shadow.conversations.length,
              parseError: output.parseError,
              providerError: output.providerError,
              status: output.status
            })),
            candidateScores: ranked.map((item) => ({ lane: item.laneIndex + 1, score: item.score })).slice(0, 8),
            fairness: {
              trackedResidents: exposureCounts.size,
              highestExposure: Math.max(0, ...exposureCounts.values()),
              dailyMotifExposure: Object.fromEntries(motifExposureCounts.entries())
            }
          }
        };
      }
      return { generate, selectConversations };
    }
    module.exports = {
      laneSpecs,
      createModelInteractionLaneRunner
    };
  }
});

// server/town-model-service.js
var require_town_model_service = __commonJS({
  "server/town-model-service.js"(exports, module) {
    var { createJevPlanner } = require_jev_planner();
    var { writeSettledDialogue } = require_settled_dialogue();
    var { createModelInteractionLaneRunner } = require_model_interaction_lane_runner();
    function createTownModelService({
      mockModel,
      modelTimeoutMs: modelTimeoutMs2,
      runtime: runtime2,
      providerClient: providerClient2,
      guards: guards2,
      actionGuards: actionGuards2,
      mock,
      makeCognitionIntentConversation
    }) {
      const {
        normalizeModelOutput,
        normalizeShadow,
        knownResidentMap,
        shadowHasContent
      } = guards2;
      const {
        normalizeActionOutput,
        actionPlanHasContent
      } = actionGuards2;
      const {
        callWithJsonFallback,
        isModelJsonError
      } = providerClient2;
      const planDay = createJevPlanner({ runtime: runtime2, modelTimeoutMs: modelTimeoutMs2, actionGuards: actionGuards2 });
      const interactionLaneRunner = createModelInteractionLaneRunner({
        runtime: runtime2,
        providerClient: providerClient2,
        guards: guards2
      });
      async function generateTownText(payload) {
        let raw = {};
        let parseError = "";
        try {
          raw = mockModel ? mock.makeMockOutput(payload) : await callWithJsonFallback(payload);
        } catch (error) {
          if (!isModelJsonError(error)) throw error;
          parseError = "model_json_parse_failed";
        }
        const output = normalizeModelOutput(raw, payload);
        if (parseError) {
          output.audit.parseError = parseError;
          output.audit.note = "模型返回 JSON 不完整，已保留本地文本。";
          return output;
        }
        if (!mockModel && !shadowHasContent(output.shadow)) {
          try {
            const shadowRaw = await callWithJsonFallback(payload, "shadow-only");
            const shadowAccepted = { conversations: 0, weeklySections: 0, riskNotes: 0 };
            const shadow = normalizeShadow(shadowRaw.shadow || shadowRaw.modelShadow || shadowRaw, payload, knownResidentMap(payload), shadowAccepted);
            output.shadow = shadow;
            output.audit.accepted.conversations += shadowAccepted.conversations;
            output.audit.accepted.weeklySections += shadowAccepted.weeklySections;
            output.audit.accepted.riskNotes += shadowAccepted.riskNotes;
          } catch (error) {
            output.audit.shadowRetryError = error.message || "shadow_retry_failed";
          }
        }
        return output;
      }
      async function generateTownActions(payload) {
        const residents = (payload.residents || []).slice(0, 30);
        if (!residents.length) return normalizeActionOutput({ plans: [] }, payload);
        if (mockModel) {
          const output = normalizeActionOutput(mock.makeMockActionOutput({ ...payload, residents }), { ...payload, residents });
          if (!actionPlanHasContent(output)) output.actionAudit.empty = true;
          output.actionAudit.parallel = {
            enabled: false,
            mockModel: true,
            requestedResidents: residents.length,
            shardCount: 1,
            keyCount: 0,
            elapsedMs: 0
          };
          return output;
        }
        return planDay(payload);
      }
      async function generateTownInteractions(payload) {
        if (payload.mode === "settled-dialogue") {
          return writeSettledDialogue(payload, { callWithJsonFallback, guards: guards2, mockModel });
        }
        const config2 = runtime2.activeConfig();
        const provider2 = runtime2.providerDefaults(config2.provider);
        const keyPool = runtime2.activeKeyPool(provider2.id);
        if (!mockModel && keyPool.keys.length > 1) {
          const output = await interactionLaneRunner.generate(payload);
          if (!output.shadow.conversations.length) {
            const fallbackConversation = makeCognitionIntentConversation(payload);
            if (fallbackConversation) {
              output.shadow.conversations = [fallbackConversation];
              output.audit.accepted.conversations += 1;
              output.audit.localFallback = "cognition_intent_conversation";
            }
          }
          return output;
        }
        let raw = {};
        let parseError = "";
        try {
          raw = mockModel ? mock.makeMockInteractionOutput(payload) : await callWithJsonFallback(payload, "interaction-scenes");
        } catch (error) {
          if (!isModelJsonError(error)) throw error;
          parseError = "model_interaction_json_parse_failed";
        }
        const accepted = { logs: 0, reportSections: 0, conversations: 0, weeklySections: 0, riskNotes: 0 };
        const shadow = normalizeShadow(raw.shadow || raw.modelShadow || raw, payload, knownResidentMap(payload), accepted);
        const audit = {
          mode: "interaction-scenes-local-facts",
          accepted,
          immutableState: true
        };
        if (!shadow.conversations.length) {
          const fallbackConversation = makeCognitionIntentConversation(payload);
          if (fallbackConversation) {
            shadow.conversations = [fallbackConversation];
            accepted.conversations += 1;
            audit.localFallback = "cognition_intent_conversation";
          }
        }
        if (parseError) {
          audit.parseError = parseError;
          audit.note = "模型返回互动 JSON 不完整，已保留本地事实记录。";
        }
        return { shadow, audit };
      }
      return {
        generateTownText,
        generateTownActions,
        generateTownInteractions
      };
    }
    module.exports = {
      createTownModelService
    };
  }
});

// server/browser-model.mjs
var import_jev_planner = __toESM(require_jev_planner(), 1);
var import_model_guards = __toESM(require_model_guards(), 1);
var import_model_action_guards = __toESM(require_model_action_guards(), 1);
var import_prompt_builders = __toESM(require_prompt_builders(), 1);
var import_provider_client = __toESM(require_provider_client(), 1);
var import_resident_cognition_bridge = __toESM(require_resident_cognition_bridge(), 1);
var import_town_model_service = __toESM(require_town_model_service(), 1);
var provider = {
  id: "openrouter",
  label: "OpenRouter",
  endpoint: "https://openrouter.ai/api/v1/chat/completions",
  model: "deepseek/deepseek-v4-pro",
  headers: () => ({})
};
var sessionKey = "";
function config() {
  return {
    provider: provider.id,
    providerLabel: provider.label,
    model: provider.model,
    endpoint: provider.endpoint,
    decisionModel: import_jev_planner.default.model,
    hasDecisionKey: Boolean(sessionKey),
    hasKey: Boolean(sessionKey),
    keyCount: sessionKey ? 1 : 0,
    keySource: sessionKey ? "session" : "none"
  };
}
var runtime = {
  activeConfig: config,
  activeKeyPool: () => ({ keys: sessionKey ? [{ provider: provider.id, key: sessionKey }] : [] }),
  providerDefaults: () => provider,
  configForKeySlot: (slot) => ({ ...config(), key: slot.key }),
  runtimeConfig: { keyCursor: {} }
};
var guards = import_model_guards.default.createModelGuards({ worldSummary: import_prompt_builders.default.worldSummary });
var builders = import_prompt_builders.default.createPromptBuilders({ forbiddenWords: guards.forbiddenWords, compactCognition: import_resident_cognition_bridge.default.compactCognition });
var modelTimeoutMs = 75e3;
var providerClient = import_provider_client.default.createProviderClient({ runtime, ...builders, parseModelJson: guards.parseModelJson, modelTimeoutMs });
var service = import_town_model_service.default.createTownModelService({
  mockModel: false,
  modelTimeoutMs,
  runtime,
  providerClient,
  guards,
  actionGuards: import_model_action_guards.default.createModelActionGuards(guards),
  makeCognitionIntentConversation: import_resident_cognition_bridge.default.makeCognitionIntentConversation
});
var operations = { actions: service.generateTownActions, interactions: service.generateTownInteractions, text: service.generateTownText };
async function requestModel(operation, input) {
  if (operation === "config") {
    if (input?.clearSessionKey) sessionKey = "";
    else if (input?.apiKeys?.[0]) sessionKey = input.apiKeys[0].trim();
    return { ok: true, config: config() };
  }
  if (!sessionKey) throw new Error("请先填写自己的 OpenRouter key");
  if (!Object.hasOwn(operations, operation)) throw new Error("unknown_model_operation");
  return { ok: true, ...await operations[operation](guards.cleanPayload(input)), config: config() };
}
export {
  requestModel
};
