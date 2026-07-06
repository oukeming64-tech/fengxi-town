const {
  missingResidentIds,
  acceptedSlotPlans,
  expectedSlotPlans,
  slotCoverageError
} = require("./model-action-shard-coverage");

function attachShardAudit(output, summary, attempts) {
  output.actionAudit.shard = {
    index: summary.index,
    count: summary.count,
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
  quality
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
    summary.parseError
    || summary.providerError
    || summary.missingResidentIds.length
    || summary.incompleteSlotPlans
    || !summary.returnedResidentPlans
    || summary.quality?.reasons?.length
  );
}

function summaryScore(summary) {
  const coverageComplete = Boolean(summary.returnedResidentPlans)
    && !summary.missingResidentIds.length
    && !summary.incompleteSlotPlans
    && !summary.parseError
    && !summary.providerError;
  const coverageScore = (summary.returnedResidentPlans * 3) + summary.acceptedSlotPlans;
  const coverageBonus = coverageComplete ? 20000 : 0;
  const qualityBonus = coverageComplete && summary.quality?.ok !== false ? 10000 : 0;
  const qualityPenalty = (summary.quality?.reasons || []).length * 20;
  const concentrationPenalty = Object.values(summary.quality?.details?.slotActivityTop || {})
    .reduce((sum, slot) => sum + Math.max(0, Number(slot.count || 0) - Number(slot.limit || 0)), 0);
  const interactionPenalty = Number(summary.quality?.details?.interaction?.rejectedIntents || 0)
    + Number(summary.quality?.details?.interaction?.unboundReflections || 0);
  return coverageBonus + qualityBonus + coverageScore - qualityPenalty - concentrationPenalty - interactionPenalty;
}

function retryFromSummary(summary, fallbackReason) {
  const reason = fallbackReason || (summary.missingResidentIds.length
    ? "missing_residents"
    : (summary.incompleteSlotPlans ? "incomplete_slots" : (summary.quality?.reasons?.[0] || "empty_action_plan")));
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
