const http = require("http");
const { loadLocalEnvFiles } = require("./server/env");
const { createHttpUtils } = require("./server/http-utils");
const { createRuntimeConfig } = require("./server/runtime-config");
const { createProviderClient } = require("./server/provider-client");
const { createPromptBuilders, worldSummary } = require("./server/prompt-builders");
const { createMockModel } = require("./server/mock-model");
const { createTownModelService } = require("./server/town-model-service");
const { createModelGuards } = require("./server/model-guards");
const { createModelActionGuards } = require("./server/model-action-guards");
const { compactCognition, makeCognitionIntentConversation } = require("./server/resident-cognition-bridge");

loadLocalEnvFiles({ appDir: __dirname });

const host = process.env.MORNING_TOWN_HOST || "127.0.0.1";
const port = Number(process.env.MORNING_TOWN_PORT || 8787);
const mockModel = process.env.MORNING_TOWN_MOCK_MODEL === "1";
const maxBodyBytes = 260000;
const modelTimeoutMs = Number(process.env.MORNING_TOWN_MODEL_TIMEOUT_MS || 75000);
const actionParallelism = Math.max(1, Math.min(8, Number(process.env.MORNING_TOWN_ACTION_PARALLELISM || 4) || 4));
const maxActionShardResidents = Math.max(3, Math.min(15, Number(process.env.MORNING_TOWN_ACTION_SHARD_SIZE || 8) || 8));
const maxActionShardRetries = Math.max(0, Math.min(3, Number(process.env.MORNING_TOWN_ACTION_SHARD_RETRIES || 3) || 0));

const guards = createModelGuards({ worldSummary });
const actionGuards = createModelActionGuards(guards);
const runtime = createRuntimeConfig({
  host,
  port,
  mockModel,
  cleanString: guards.cleanString
});
const prompts = createPromptBuilders({
  forbiddenWords: guards.forbiddenWords,
  compactCognition
});
const providerClient = createProviderClient({
  runtime,
  buildMessages: prompts.buildMessages,
  modelTuning: prompts.modelTuning,
  parseModelJson: guards.parseModelJson,
  modelTimeoutMs
});
const mock = createMockModel({ makeCognitionIntentConversation });
const townModel = createTownModelService({
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
});
const { sendJson, readBody } = createHttpUtils({ maxBodyBytes });

function modelError(error, fallback) {
  return {
    ok: false,
    error: error.message || fallback,
    status: error.status || null,
    config: runtime.activeConfig()
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${host}:${port}`);
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true, ...runtime.activeConfig(), mockModel });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    sendJson(res, 200, { ok: true, config: runtime.publicConfig() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/config") {
    try {
      const config = runtime.updateRuntimeConfig(await readBody(req));
      sendJson(res, 200, { ok: true, config });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message || "config_failed" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/town-actions") {
    try {
      const input = guards.cleanPayload(await readBody(req));
      const output = await townModel.generateTownActions(input);
      sendJson(res, 200, { ok: true, config: runtime.activeConfig(), ...output });
    } catch (error) {
      sendJson(res, 502, modelError(error, "model_action_control_failed"));
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/town-interactions") {
    try {
      const input = guards.cleanPayload(await readBody(req));
      const output = await townModel.generateTownInteractions(input);
      sendJson(res, 200, { ok: true, config: runtime.activeConfig(), ...output });
    } catch (error) {
      sendJson(res, 502, modelError(error, "model_interaction_failed"));
    }
    return;
  }

  if (req.method !== "POST" || (url.pathname !== "/api/town-text" && url.pathname !== "/api/town-shadow")) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }

  try {
    const input = guards.cleanPayload(await readBody(req));
    const output = await townModel.generateTownText(input);
    sendJson(res, 200, { ok: true, config: runtime.activeConfig(), ...output });
  } catch (error) {
    sendJson(res, 502, modelError(error, "model_text_failed"));
  }
});

server.listen(port, host, () => {
  const config = runtime.activeConfig();
  console.log(`Maple Creek model service listening at http://${host}:${port}`);
  console.log(`Using provider: ${config.providerLabel}`);
  console.log(`Using model: ${config.model || "(not configured)"}`);
});
