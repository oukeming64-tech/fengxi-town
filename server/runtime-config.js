function splitKeyList(value) {
  return String(value || "")
    .split(/[\s,;]+/)
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function uniqueList(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function createRuntimeConfig({ host, port, mockModel, cleanString }) {
  const providerCatalog = {
    openrouter: {
      id: "openrouter",
      label: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-pro",
      keyEnv: ["OPENROUTER_API_KEYS", "OPENROUTER_API_KEY", "OPENROUTER_KEY"],
      headers() {
        return {
          "HTTP-Referer": `http://${host}:${port}`,
          "X-Title": "Morning Town Text Simulator"
        };
      }
    },
    openai: {
      id: "openai",
      label: "OpenAI",
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: process.env.OPENAI_MODEL || "",
      keyEnv: ["OPENAI_API_KEYS", "OPENAI_API_KEY"],
      headers() {
        return {};
      }
    },
    compatible: {
      id: "compatible",
      label: "OpenAI-compatible",
      endpoint: process.env.COMPATIBLE_MODEL_URL || process.env.LLM_API_URL || "",
      model: process.env.COMPATIBLE_MODEL || process.env.LLM_MODEL || "",
      keyEnv: ["COMPATIBLE_MODEL_API_KEYS", "COMPATIBLE_MODEL_API_KEY", "LLM_API_KEYS", "LLM_API_KEY", "MODEL_API_KEYS", "MODEL_API_KEY"],
      headers() {
        return {};
      }
    }
  };

  function firstEnv(names) {
    return names.find((name) => splitKeyList(process.env[name]).length) || "";
  }

  function envKeys(providerId) {
    const provider = providerCatalog[providerId] || providerCatalog.openrouter;
    return uniqueList(provider.keyEnv.flatMap((name) => splitKeyList(process.env[name])));
  }

  function envKey(providerId) {
    return envKeys(providerId)[0] || "";
  }

  function initialProvider() {
    const requested = String(process.env.MORNING_TOWN_PROVIDER || "").trim();
    if (providerCatalog[requested]) return requested;
    if (envKey("openrouter")) return "openrouter";
    if (envKey("openai")) return "openai";
    if (envKey("compatible")) return "compatible";
    return "openrouter";
  }

  const runtimeConfig = {
    provider: initialProvider(),
    endpoint: "",
    model: "",
    sessionKeys: [],
    keyCursor: {}
  };

  function providerDefaults(providerId) {
    return providerCatalog[providerId] || providerCatalog.openrouter;
  }

  function inputKeys(input) {
    const arrayKeys = Array.isArray(input.apiKeys)
      ? input.apiKeys.flatMap((item) => splitKeyList(item))
      : [];
    const legacyKeys = typeof input.apiKey === "string" ? splitKeyList(input.apiKey) : [];
    return uniqueList([...arrayKeys, ...legacyKeys]);
  }

  function activeKeyPool(providerId) {
    const provider = providerDefaults(providerId || runtimeConfig.provider);
    const sessionKeys = uniqueList(runtimeConfig.sessionKeys || []);
    if (sessionKeys.length) {
      return { keys: sessionKeys, source: "session", envName: "" };
    }
    const keys = envKeys(provider.id);
    return {
      keys,
      source: keys.length ? "environment" : "none",
      envName: firstEnv(provider.keyEnv)
    };
  }

  function activeConfig() {
    const provider = providerDefaults(runtimeConfig.provider);
    const keyPool = activeKeyPool(provider.id);
    return {
      provider: provider.id,
      providerLabel: provider.label,
      endpoint: runtimeConfig.endpoint || provider.endpoint,
      model: runtimeConfig.model || provider.model,
      hasKey: Boolean(keyPool.keys.length),
      keyCount: keyPool.keys.length,
      keySource: keyPool.source
    };
  }

  function publicConfig() {
    const config = activeConfig();
    return {
      ...config,
      mockModel,
      providers: Object.values(providerCatalog).map((provider) => ({
        id: provider.id,
        label: provider.label,
        endpoint: provider.endpoint,
        model: provider.model,
        hasEnvironmentKey: Boolean(envKeys(provider.id).length),
        environmentKeyCount: envKeys(provider.id).length
      }))
    };
  }

  function updateRuntimeConfig(input) {
    const provider = cleanString(input.provider, 24);
    if (provider && providerCatalog[provider]) {
      runtimeConfig.provider = provider;
    }
    const defaults = providerDefaults(runtimeConfig.provider);
    const endpoint = cleanString(input.endpoint, 200);
    const model = cleanString(input.model, 100);
    runtimeConfig.endpoint = endpoint || "";
    runtimeConfig.model = model || defaults.model || "";
    if (input.clearSessionKey) {
      runtimeConfig.sessionKeys = [];
      runtimeConfig.keyCursor[runtimeConfig.provider] = 0;
    }
    const keys = inputKeys(input);
    if (keys.length) {
      runtimeConfig.sessionKeys = keys;
      runtimeConfig.keyCursor[runtimeConfig.provider] = 0;
    }
    return publicConfig();
  }

  return {
    providerCatalog,
    runtimeConfig,
    providerDefaults,
    activeKeyPool,
    activeConfig,
    publicConfig,
    updateRuntimeConfig
  };
}

module.exports = {
  createRuntimeConfig,
  splitKeyList,
  uniqueList
};
