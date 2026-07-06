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
    message?.reasoning
    || message?.reasoning_content
    || message?.text
    || message?.output_text
    || ""
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
  runtime,
  buildMessages,
  modelTuning,
  parseModelJson,
  modelTimeoutMs
}) {
  function buildProviderBody(payload, useJsonMode, purpose = "full", config = runtime.activeConfig()) {
    const tuning = modelTuning(purpose);
    const body = {
      model: config.model,
      messages: buildMessages(payload, purpose),
      temperature: tuning.temperature,
      max_tokens: tuning.maxTokens
    };
    if (purpose === "action-control" || purpose === "interaction-scenes") {
      body.reasoning = { effort: "none", exclude: true };
    }
    if (useJsonMode) body.response_format = { type: "json_object" };
    return body;
  }

  async function callProviderWithKey(config, provider, key, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), modelTimeoutMs);
    let response;
    try {
      response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          ...provider.headers(config)
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error(`${provider.id}_timeout`);
        timeoutError.status = 408;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`${provider.id}_error`);
      error.status = response.status;
      error.body = text.slice(0, 1200);
      throw error;
    }

    const data = JSON.parse(text);
    const choice = data.choices?.[0] || {};
    const content = modelMessageToText(choice.message || choice);
    try {
      return parseModelJson(content);
    } catch (error) {
      error.modelContentLength = content.length;
      error.modelContentSnippet = content.slice(0, 800);
      error.modelContentTail = content.slice(-800);
      throw error;
    }
  }

  async function callProvider(payload, useJsonMode, purpose = "full") {
    const config = runtime.activeConfig();
    const keyPool = runtime.activeKeyPool(config.provider);
    if (!keyPool.keys.length) throw new Error(`missing_${config.provider}_key`);

    const cursorKey = config.provider;
    const start = Number(runtime.runtimeConfig.keyCursor[cursorKey] || 0) % keyPool.keys.length;
    let lastError = null;
    for (let attempt = 0; attempt < keyPool.keys.length; attempt += 1) {
      const index = (start + attempt) % keyPool.keys.length;
      const keySlot = keyPool.keys[index];
      const keyConfig = runtime.configForKeySlot(keySlot, config);
      const provider = runtime.providerDefaults(keyConfig.provider);
      if (!keyConfig.endpoint) throw new Error("missing_model_endpoint");
      if (!keyConfig.model) throw new Error("missing_model_name");
      try {
        const body = buildProviderBody(payload, useJsonMode, purpose, keyConfig);
        const result = await callProviderWithKey(keyConfig, provider, keyConfig.key, body);
        runtime.runtimeConfig.keyCursor[cursorKey] = (index + 1) % keyPool.keys.length;
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
    throw lastError || new Error(`${config.provider}_error`);
  }

  async function callProviderOnKey(payload, useJsonMode, purpose, key) {
    const config = runtime.configForKeySlot(key, runtime.activeConfig());
    const provider = runtime.providerDefaults(config.provider);
    if (!config.endpoint) throw new Error("missing_model_endpoint");
    if (!config.model) throw new Error("missing_model_name");
    if (!config.key) throw new Error(`missing_${provider.id}_key`);
    return callProviderWithKey(config, provider, config.key, buildProviderBody(payload, useJsonMode, purpose, config));
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
