function extractFirstJsonValue(text, openChar) {
  const start = text.indexOf(openChar);
  if (start < 0) return "";
  const stack = [];
  let inString = false;
  let escape = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }
    if (char !== "}" && char !== "]") continue;
    const open = stack.pop();
    if ((char === "}" && open !== "{") || (char === "]" && open !== "[")) return "";
    if (!stack.length) return text.slice(start, index + 1);
  }
  return "";
}

function stripJsonFence(text) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();
  const extracted = extractFirstJsonValue(trimmed, "{") || extractFirstJsonValue(trimmed, "[");
  if (extracted) return extracted;
  return trimmed;
}

function repairLikelyJson(text) {
  return String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/}\s*{/g, "},{")
    .replace(/]\s*"/g, "],\"")
    .replace(/"\s*{/g, "\",{")
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, "$1\"$2\":");
}

function parseModelJson(text) {
  const stripped = stripJsonFence(text);
  try {
    return JSON.parse(stripped);
  } catch (firstError) {
    try {
      return JSON.parse(repairLikelyJson(stripped));
    } catch (secondError) {
      const error = new Error(secondError.message || firstError.message || "invalid_model_json");
      error.cause = secondError;
      error.originalMessage = firstError.message;
      throw error;
    }
  }
}

module.exports = {
  parseModelJson
};
