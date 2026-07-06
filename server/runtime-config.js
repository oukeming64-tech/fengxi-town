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
    sessionKeyConfigs: [],
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

  function providerId(value, fallback = runtimeConfig.provider) {
    const requested = cleanString(value, 24);
    return providerCatalog[requested] ? requested : fallback;
  }

  function makeKeyConfig({ provider, endpoint, model, key }) {
    const targetProvider = providerDefaults(providerId(provider));
    return {
      provider: targetProvider.id,
      endpoint: cleanString(endpoint, 200) || runtimeConfig.endpoint || targetProvider.endpoint,
      model: cleanString(model, 100) || runtimeConfig.model || targetProvider.model,
      key
    };
  }

  function uniqueKeyConfigs(items) {
    const seen = new Set();
    return items.filter((item) => {
      const id = [item.provider, item.endpoint, item.model, item.key].join("\n");
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function inputKeyConfigs(input) {
    const fromSlots = Array.isArray(input.keyConfigs)
      ? input.keyConfigs.flatMap((item) => {
        const keys = splitKeyList(item?.apiKey || item?.key || "");
        return keys.map((key) => makeKeyConfig({
          provider: item?.provider,
          endpoint: item?.endpoint,
          model: item?.model,
          key
        }));
      })
      : [];
    const fromLegacyKeys = inputKeys(input).map((key) => makeKeyConfig({
      provider: input.provider,
      endpoint: input.endpoint,
      model: input.model,
      key
    }));
    return uniqueKeyConfigs([...fromSlots, ...fromLegacyKeys]);
  }

  function publicKeySlots(keyPool, base) {
    return keyPool.keys.slice(0, 4).map((slot) => {
      const config = configForKeySlot(slot, base);
      return {
        provider: config.provider,
        providerLabel: config.providerLabel,
        endpoint: config.endpoint,
        model: config.model,
        hasKey: Boolean(config.key)
      };
    });
  }

  function activeKeyPool(providerId) {
    const provider = providerDefaults(providerId || runtimeConfig.provider);
    const sessionConfigs = uniqueKeyConfigs(runtimeConfig.sessionKeyConfigs || []);
    if (sessionConfigs.length) {
      return { keys: sessionConfigs, source: "session", envName: "" };
    }
    const sessionKeys = uniqueList(runtimeConfig.sessionKeys || []).map((key) => makeKeyConfig({
      provider: provider.id,
      endpoint: runtimeConfig.endpoint || provider.endpoint,
      model: runtimeConfig.model || provider.model,
      key
    }));
    if (sessionKeys.length) {
      return { keys: sessionKeys, source: "session", envName: "" };
    }
    const keys = envKeys(provider.id).map((key) => makeKeyConfig({
      provider: provider.id,
      endpoint: runtimeConfig.endpoint || provider.endpoint,
      model: runtimeConfig.model || provider.model,
      key
    }));
    return {
      keys,
      source: keys.length ? "environment" : "none",
      envName: firstEnv(provider.keyEnv)
    };
  }

  function configForKeySlot(slot, fallback = null) {
    const base = fallback || activeConfig();
    const key = typeof slot === "string" ? slot : slot?.key || "";
    const targetProvider = providerDefaults(providerId(typeof slot === "object" ? slot?.provider : base.provider, base.provider));
    return {
      provider: targetProvider.id,
      providerLabel: targetProvider.label,
      endpoint: (typeof slot === "object" && slot?.endpoint) || base.endpoint || targetProvider.endpoint,
      model: (typeof slot === "object" && slot?.model) || base.model || targetProvider.model,
      key
    };
  }

  function activeConfig() {
    const provider = providerDefaults(runtimeConfig.provider);
    const keyPool = activeKeyPool(provider.id);
    const firstSlot = keyPool.keys[0] || {};
    const config = {
      provider: provider.id,
      providerLabel: provider.label,
      endpoint: runtimeConfig.endpoint || firstSlot.endpoint || provider.endpoint,
      model: runtimeConfig.model || firstSlot.model || provider.model,
      hasKey: Boolean(keyPool.keys.length),
      keyCount: keyPool.keys.length,
      keySource: keyPool.source
    };
    config.keySlots = publicKeySlots(keyPool, config);
    return config;
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
      runtimeConfig.sessionKeyConfigs = [];
      runtimeConfig.keyCursor[runtimeConfig.provider] = 0;
    }
    const keyConfigs = inputKeyConfigs(input);
    if (keyConfigs.length) {
      runtimeConfig.sessionKeys = [];
      runtimeConfig.sessionKeyConfigs = keyConfigs;
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
    configForKeySlot,
    publicConfig,
    updateRuntimeConfig
  };
}

module.exports = {
  createRuntimeConfig,
  splitKeyList,
  uniqueList
};
