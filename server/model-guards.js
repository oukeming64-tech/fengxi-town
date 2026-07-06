const { parseModelJson } = require("./model-json");
const { createModelOutputGuards } = require("./model-output-guards");
const { DEFAULT_WORLD_SUMMARY, createModelPayloadCleaner } = require("./model-payload-cleaners");

const forbiddenWords = [
  "\u73ed\u7ea7",
  "\u804c\u4f4d",
  "\u4f9b\u5e94\u94fe",
  "\u751f\u6001",
  "\u8d21\u732e",
  "\u66dd\u5149",
  "\u73ed\u4e3b\u4efb",
  "\u516c\u5171\u4ed3\u5e93",
  "\u4f01\u4e1a",
  "\u91d1\u878d",
  "\u9879\u76ee",
  "\u540c\u5b66",
  "\u5bfc\u5e08",
  "\u8bfe\u7a0b",
  "\u0045\u004d\u0042\u0041"
];

function cleanString(value, limit = 160) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function cleanText(value, limit = 520) {
  return String(value || "").trim().slice(0, limit);
}

function cleanList(value, limit, itemLimit = 180) {
  return Array.isArray(value)
    ? value.slice(0, limit).map((item) => cleanString(item, itemLimit)).filter(Boolean)
    : [];
}

function createModelGuards({ worldSummary = DEFAULT_WORLD_SUMMARY } = {}) {
  const outputGuards = createModelOutputGuards({ cleanString, cleanText, cleanList, forbiddenWords });
  const payloadCleaner = createModelPayloadCleaner({
    cleanString,
    cleanText,
    cleanList,
    safeVisibleText: outputGuards.safeVisibleText,
    worldSummary
  });

  return {
    forbiddenWords,
    cleanString,
    cleanText,
    cleanList,
    cleanPayload: payloadCleaner.cleanPayload,
    cleanSnapshot: payloadCleaner.cleanSnapshot,
    cleanCognitionPayload: payloadCleaner.cleanCognitionPayload,
    parseModelJson,
    ...outputGuards
  };
}

module.exports = {
  createModelGuards
};
