const {
  addCounters,
  returnedResidentIds,
  missingResidentIds,
  acceptedSlotPlans,
  expectedSlotPlans,
  slotCoverageError
} = require("./model-action-shard-coverage");
const {
  attachShardAudit,
  summarizeAttempt,
  shouldRetryShard,
  summaryScore,
  retryFromSummary
} = require("./model-action-shard-retry");

function splitResidentsForAction(residents, maxActionShardResidents, groupProfiles = []) {
  const size = Math.max(1, Number(maxActionShardResidents || 8));
  const byId = new Map(residents.map((resident) => [resident.id, resident]));
  const assigned = new Set();
  const chunks = [];
  (groupProfiles || []).forEach((group) => {
    const memberIds = (group?.memberResidentIds || []).filter((id) => byId.has(id) && !assigned.has(id));
    if (memberIds.length < 2 || memberIds.length > size) return;
    const orderedIds = [group.centerResidentId, ...memberIds]
      .filter((id, index, list) => id && memberIds.includes(id) && list.indexOf(id) === index);
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
  const groupIds = (payload.cognition?.groupProfiles || [])
    .filter((group) => (group.memberResidentIds || []).some((id) => residentIds.includes(id)))
    .map((group) => group.id)
    .filter(Boolean);
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
  const seenResidents = new Set();
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
      coverageError: missingIds.length
        ? "one_or_more_action_shards_missing_residents"
        : (incompleteSlotPlans ? "one_or_more_action_shards_incomplete_slots" : ""),
      quality,
      qualityError: aggregateQualityReasons[0] || "",
      note: empty
        ? "并发行动候选为空，本地规则会补齐下一天计划。"
        : (missingIds.length
          ? "并发行动候选已合并，但部分居民缺失，本地规则会补齐缺失计划。"
          : (incompleteSlotPlans
            ? "并发行动候选已合并，但部分 slot 缺失，本地规则会补齐缺失时段。"
            : (aggregateQualityReasons.length
              ? "并发行动候选覆盖完整，但行动分布或互动意图质量仍需本地审核关注。"
              : "并发行动候选已合并，最终行动仍由本地规则审核。")))
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
