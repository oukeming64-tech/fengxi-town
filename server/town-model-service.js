const { createModelActionShardRunner } = require("./model-action-shard-runner");

function createTownModelService({
  mockModel,
  actionParallelism,
  maxActionShardResidents,
  maxActionShardRetries,
  runtime,
  providerClient,
  guards,
  actionGuards,
  mock,
  makeCognitionIntentConversation
}) {
  const {
    normalizeModelOutput,
    normalizeShadow,
    knownResidentMap,
    shadowHasContent
  } = guards;
  const {
    normalizeActionOutput,
    actionPlanHasContent
  } = actionGuards;
  const {
    callWithJsonFallback,
    isModelJsonError
  } = providerClient;
  const actionShardRunner = createModelActionShardRunner({
    actionParallelism,
    maxActionShardResidents,
    maxActionShardRetries,
    runtime,
    providerClient,
    actionGuards
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

    return actionShardRunner.generateTownActions(payload, residents);
  }

  async function generateTownInteractions(payload) {
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
