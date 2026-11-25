// Public Pages has no model server. Share the same planning, writing and validation
// code with Node, with a fixed OpenRouter destination and a tab-scoped credential.
import planner from "./jev-planner.js";
import modelGuards from "./model-guards.js";
import actionGuards from "./model-action-guards.js";
import prompts from "./prompt-builders.js";
import providers from "./provider-client.js";
import bridge from "./resident-cognition-bridge.js";
import services from "./town-model-service.js";

const provider = {
  id: "openrouter", label: "OpenRouter",
  endpoint: "https://openrouter.ai/api/v1/chat/completions",
  model: "deepseek/deepseek-v4-pro", headers: () => ({})
};
let sessionKey = "";

function config() {
  return {
    provider: provider.id, providerLabel: provider.label, model: provider.model, endpoint: provider.endpoint,
    decisionModel: planner.model, hasDecisionKey: Boolean(sessionKey), hasKey: Boolean(sessionKey),
    keyCount: sessionKey ? 1 : 0, keySource: sessionKey ? "session" : "none"
  };
}

const runtime = {
  activeConfig: config,
  activeKeyPool: () => ({ keys: sessionKey ? [{ provider: provider.id, key: sessionKey }] : [] }),
  providerDefaults: () => provider,
  configForKeySlot: (slot) => ({ ...config(), key: slot.key }),
  runtimeConfig: { keyCursor: {} }
};
const guards = modelGuards.createModelGuards({ worldSummary: prompts.worldSummary });
const builders = prompts.createPromptBuilders({ forbiddenWords: guards.forbiddenWords, compactCognition: bridge.compactCognition });
const modelTimeoutMs = 75000;
const providerClient = providers.createProviderClient({ runtime, ...builders, parseModelJson: guards.parseModelJson, modelTimeoutMs });
const service = services.createTownModelService({
  mockModel: false, modelTimeoutMs, runtime, providerClient, guards,
  actionGuards: actionGuards.createModelActionGuards(guards),
  makeCognitionIntentConversation: bridge.makeCognitionIntentConversation
});
const operations = { actions: service.generateTownActions, interactions: service.generateTownInteractions, text: service.generateTownText };

export async function requestModel(operation, input) {
  if (operation === "config") {
    if (input?.clearSessionKey) sessionKey = "";
    else if (input?.apiKeys?.[0]) sessionKey = input.apiKeys[0].trim();
    return { ok: true, config: config() };
  }
  if (!sessionKey) throw new Error("请先填写自己的 OpenRouter key");
  if (!Object.hasOwn(operations, operation)) throw new Error("unknown_model_operation");
  return { ok: true, ...await operations[operation](guards.cleanPayload(input)), config: config() };
}
