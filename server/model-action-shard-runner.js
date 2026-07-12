const { createModelActionQuality } = require("./model-action-quality");
const {
  splitResidentsForAction: splitResidentsForActionBySize,
  runWithConcurrency,
  makeActionShardPayload,
  attachShardAudit,
  summarizeAttempt,
  shouldRetryShard,
  summaryScore,
  retryFromSummary,
  combineActionOutputs: combineActionShardOutputs
} = require("./model-action-shard-utils");

function createModelActionShardRunner({
  actionParallelism,
  maxActionShardResidents,
  maxActionShardRetries,
  runtime,
  providerClient,
  actionGuards
}) {
  const {
    normalizeActionOutput,
    actionPlanHasContent
  } = actionGuards;
  const {
    callWithJsonFallbackOnKey,
    isModelJsonError
  } = providerClient;
  const actionQuality = createModelActionQuality();

  function splitResidentsForAction(residents, groupProfiles = []) {
    return splitResidentsForActionBySize(residents, maxActionShardResidents, groupProfiles);
  }

  async function generateActionShard({ payload, chunk, index, count, keys, keyStart }) {
    const requestedIds = chunk.map((resident) => resident.id);
    const attempts = [];
    let retryInfo = null;
    let bestOutput = null;
    let bestSummary = null;

    for (let attempt = 0; attempt <= maxActionShardRetries; attempt += 1) {
      const retry = attempt ? { attempt, ...(retryInfo || { reason: "coverage_or_json_retry" }) } : null;
      const shardPayload = makeActionShardPayload(payload, chunk, index, count, retry);
      const keySlot = (keyStart + attempt) % keys.length;
      const inputBytes = Buffer.byteLength(JSON.stringify(shardPayload), "utf8");
      const startedAt = Date.now();
      let raw = {};
      let parseError = "";
      let parseMessage = "";
      let parseContentLength = 0;
      let parseSnippet = "";
      let providerError = "";
      let status = null;
      try {
        raw = await callWithJsonFallbackOnKey(shardPayload, "action-control", keys[keySlot]);
      } catch (error) {
        if (isModelJsonError(error)) {
          parseError = "model_action_json_parse_failed";
          parseMessage = error.message || "";
          parseContentLength = Number(error.modelContentLength || 0);
          if (process.env.MORNING_TOWN_DEBUG_MODEL_OUTPUT === "1") {
            parseSnippet = error.modelContentSnippet || error.modelContentTail || "";
          }
        } else {
          providerError = error.message || "model_action_shard_failed";
          status = error.status || null;
        }
      }

      const output = normalizeActionOutput(raw, shardPayload);
      if (!actionPlanHasContent(output)) output.actionAudit.empty = true;
      const quality = actionQuality.assess(output, shardPayload, requestedIds);
      const summary = summarizeAttempt({
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
        elapsedMs: Date.now() - startedAt,
        inputBytes,
        quality,
        groupIds: shardPayload.actionShard.groupIds
      });
      attempts.push(summary);

      const currentScore = summaryScore(summary);
      const bestScore = bestSummary ? summaryScore(bestSummary) : -1;
      if (!bestOutput || currentScore > bestScore) {
        bestOutput = output;
        bestSummary = summary;
      }
      if (!shouldRetryShard(summary, attempt, maxActionShardRetries)) {
        const bestIsBetter = bestOutput && bestSummary && summaryScore(bestSummary) > currentScore;
        if (!summary.ok && bestIsBetter) {
          return attachShardAudit(bestOutput, bestSummary, attempts);
        }
        return attachShardAudit(output, summary, attempts);
      }
      retryInfo = retryFromSummary(summary, parseError || providerError);
    }

    return attachShardAudit(bestOutput || normalizeActionOutput({}, payload), bestSummary || attempts[attempts.length - 1], attempts);
  }

  function combineActionOutputs(outputs, payload, meta) {
    return combineActionShardOutputs(outputs, payload, meta, actionQuality);
  }

  async function generateTownActions(payload, residents) {
    const config = runtime.activeConfig();
    const provider = runtime.providerDefaults(config.provider);
    const keyPool = runtime.activeKeyPool(provider.id);
    if (!keyPool.keys.length) throw new Error(`missing_${provider.id}_key`);

    const startedAt = Date.now();
    const groupProfiles = payload.cognition?.groupProfiles || [];
    const chunks = splitResidentsForAction(residents, groupProfiles);
    const activeParallelism = Math.min(actionParallelism, keyPool.keys.length, chunks.length);
    const start = Number(runtime.runtimeConfig.keyCursor[provider.id] || 0) % keyPool.keys.length;
    runtime.runtimeConfig.keyCursor[provider.id] = (start + chunks.length) % keyPool.keys.length;

    const outputs = await runWithConcurrency(chunks, activeParallelism, (chunk, index) => generateActionShard({
      payload,
      chunk,
      index,
      count: chunks.length,
      keys: keyPool.keys,
      keyStart: start + index
    }));

    return combineActionOutputs(outputs, payload, {
      enabled: true,
      requestedParallelism: actionParallelism,
      activeParallelism,
      maxShardResidents: maxActionShardResidents,
      maxShardRetries: maxActionShardRetries,
      requestedResidents: residents.length,
      shardCount: chunks.length,
      keyCount: keyPool.keys.length,
      keySource: keyPool.source,
      groupAware: groupProfiles.length > 0,
      groupProfileCount: groupProfiles.length,
      elapsedMs: Date.now() - startedAt
    });
  }

  return {
    splitResidentsForAction,
    combineActionOutputs,
    generateTownActions
  };
}

module.exports = {
  createModelActionShardRunner
};
