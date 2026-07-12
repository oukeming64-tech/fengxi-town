const { runWithConcurrency } = require("./model-action-shard-utils");

const laneSpecs = [
  {
    instruction: "面向全部居民，优先找已经发生的帮忙、送礼、资源回报或接力合作；没有明确证据就返回空。"
  },
  {
    instruction: "面向全部居民，优先找已经发生的忽略、排挤、争议、延后回应或拒绝合作；没有明确证据就返回空。"
  },
  {
    instruction: "面向全部居民，优先找有人强调自己早有安排、替别人定调、争取功劳或得到他人呼应的已发生场景；不能虚构身份、关系或渠道。"
  },
  {
    instruction: "面向全部居民，找具有具体物件、动作和地点的镇上日常；避开重复的公告板缺货核对。只要日志里有足够的两人事实，本路必须给出一段。",
    required: true
  }
];

function createModelInteractionLaneRunner({ runtime, providerClient, guards }) {
  const { callWithJsonFallbackOnKey, isModelJsonError } = providerClient;
  const { normalizeShadow, knownResidentMap } = guards;
  const exposureCounts = new Map();

  function evidenceText(conversation, payload) {
    const ids = new Set(conversation.evidenceLogIds || []);
    return (payload.logs || [])
      .filter((log) => ids.has(log.id))
      .map((log) => `${log.kind || ""} ${log.text || ""}`)
      .join(" ");
  }

  function scoreCandidate(candidate, payload) {
    const ids = candidate.conversation.residentIds || [];
    const text = `${evidenceText(candidate.conversation, payload)} ${(candidate.conversation.lines || []).map((line) => line.text).join(" ")}`;
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
    return (candidate.conversation.lines || []).some((line) => (
      line.speakerName
      && line.text?.includes(line.speakerName)
      && /让我|叫我|托我|交给我/.test(line.text)
    ));
  }

  function selectConversations(candidates, payload, limit = 3) {
    const ranked = candidates
      .filter((candidate) => laneMatches(candidate, payload))
      .filter((candidate) => !hasUnsupportedClaims(candidate, payload))
      .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, payload) }))
      .sort((a, b) => b.score - a.score);
    const pairs = new Set();
    const usedResidents = new Set();
    const selected = [];
    ranked.forEach((candidate) => {
      if (selected.length >= limit) return;
      const residentIds = candidate.conversation.residentIds || [];
      const pair = [...residentIds].sort().join(":");
      if (!pair || pairs.has(pair) || residentIds.some((id) => usedResidents.has(id))) return;
      pairs.add(pair);
      residentIds.forEach((id) => usedResidents.add(id));
      selected.push({
        ...candidate,
        conversation: { ...candidate.conversation, note: "" }
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
    const config = runtime.activeConfig();
    const provider = runtime.providerDefaults(config.provider);
    const keyPool = runtime.activeKeyPool(provider.id);
    if (!keyPool.keys.length) throw new Error(`missing_${provider.id}_key`);
    const lanes = laneSpecs.slice(0, Math.min(laneSpecs.length, keyPool.keys.length));
    const start = Number(runtime.runtimeConfig.keyCursor[provider.id] || 0) % keyPool.keys.length;
    runtime.runtimeConfig.keyCursor[provider.id] = (start + lanes.length) % keyPool.keys.length;
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
    const riskNotes = outputs.flatMap((output) => output.shadow.riskNotes || [])
      .filter((note, index, list) => list.findIndex((item) => item.type === note.type && item.summary === note.summary) === index)
      .slice(0, 3);
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
          highestExposure: Math.max(0, ...exposureCounts.values())
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
