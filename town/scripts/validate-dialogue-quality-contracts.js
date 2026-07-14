#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createModelOutputGuards } = require("../../server/model-output-guards");
const { createModelInteractionLaneRunner } = require("../../server/model-interaction-lane-runner");
const { createPromptPayloadBuilders } = require("../../server/prompt-payload-builders");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

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

const guards = createModelOutputGuards({
  cleanString,
  cleanText,
  cleanList,
  forbiddenWords: []
});
const payload = {
  residents: [
    { id: "v01", name: "Anna Morgan" },
    { id: "v02", name: "Bennett Fisher" }
  ],
  logs: [
    { id: "log-1", residentId: "v01", text: "两人在谷仓门边核对货筐。" }
  ],
  weekly: { weekId: "week-01", range: "第 1 天", immutableState: true }
};
const accepted = { logs: 0, reportSections: 0, conversations: 0, weeklySections: 0, riskNotes: 0 };
const normalized = guards.normalizeShadow({
  conversations: [{
    id: "dialogue-test",
    title: "谷仓门边",
    place: "黄石农场",
    residentIds: ["v01", "v02"],
    evidenceLogIds: ["log-1"],
    lines: [
      { speakerId: "v01", text: "Anna把货筐推过去，说：“这两筐我来搬。”" },
      { speakerId: "v02", text: "Bennett Fisher：那我去把门口清出来。" }
    ]
  }]
}, payload, guards.knownResidentMap(payload), accepted);

assert.equal(normalized.conversations.length, 1);
assert.deepEqual(normalized.conversations[0].lines.map((line) => line.text), [
  "这两筐我来搬。",
  "那我去把门口清出来。"
]);

const activityCopy = read("town/src/world/activity-copy.js");
assert(!activityCopy.includes("被油渍压住的小纸条"));
["root", "legume", "leaf", "grain", "processed", "gourd", "fruiting", "mushroom"].forEach((id) => {
  assert(activityCopy.includes(`${id}:`), `missing public demand-family label for ${id}`);
});
assert(activityCopy.includes(".map(publicDemandFamilyLabel)"));
assert(activityCopy.includes("activity-copy-v0.2.0-personalized-language"));
assert(activityCopy.includes("accountingPressureText"));
assert(!activityCopy.includes("现金写着"));
assert(!activityCopy.includes("左边是现金"));

const prompts = read("server/prompt-builders.js");
assert(prompts.includes("lines[].text 只能写角色真正说出口的话"));
assert(prompts.includes("不要把某个物件或句式当成固定口头禅"));
assert(prompts.includes("不能只说‘这边的’‘另一套说法’"));
assert(prompts.includes("每位居民的 voiceStyle"));

const laneRunner = read("server/model-interaction-lane-runner.js");
assert(laneRunner.includes("dailyMotifSpecs"));
assert(laneRunner.includes("overusedDailyMotif"));
assert(laneRunner.includes("dailyMotifExposure"));

const selectionRunner = createModelInteractionLaneRunner({
  runtime: {},
  providerClient: {},
  guards: { normalizeShadow() {}, knownResidentMap() {} }
});
const repeatedPayload = {
  logs: [{
    id: "restaurant-log",
    residentId: "v01",
    kind: "talk",
    text: "两人在餐馆对着油渍纸条核对今天的菜价。"
  }]
};
const repeatedCandidate = {
  laneIndex: 3,
  conversation: {
    residentIds: ["v01", "v02"],
    evidenceLogIds: ["restaurant-log"],
    lines: [
      { speakerId: "v01", text: "纸条上的价格没变。" },
      { speakerId: "v02", text: "那就照昨天的来。" }
    ]
  }
};
for (let index = 0; index < 3; index += 1) {
  assert.equal(selectionRunner.selectConversations([repeatedCandidate], repeatedPayload, 1).selected.length, 1);
}
assert.equal(selectionRunner.selectConversations([repeatedCandidate], repeatedPayload, 1).selected.length, 0);

const browserContext = vm.createContext({ window: {}, console, Math });
[
  "town/src/shared.js",
  "town/src/world/town-relationship-rules.js",
  "town/src/world/resident-language-profile.js",
  "town/src/world/town-relationship-interactions.js"
].forEach((file) => vm.runInContext(read(file), browserContext, { filename: file }));
const T = browserContext.window.MorningTown;
const orderly = { id: "v01", name: "Anna Morgan", storage: { seeds: 3 }, traits: { work: 1, talk: 0.7, trade: 0.8, risk: 0.5, quiet: 0.8, order: 1.6 } };
const quiet = { id: "v02", name: "Bennett Fisher", storage: {}, traits: { work: 0.8, talk: 0.5, trade: 0.7, risk: 0.6, quiet: 1.7, order: 0.9 } };
assert.equal(T.residentLanguageProfile.profileIdFor(orderly), "orderly");
assert.equal(T.residentLanguageProfile.profileIdFor(quiet), "observant");
assert.notEqual(T.residentLanguageProfile.profileFor(orderly).promptStyle, T.residentLanguageProfile.profileFor(quiet).promptStyle);

function localLog(id, resident, activityId, activityTitle, place = "镇中心") {
  return {
    id,
    residentId: resident.id,
    resident,
    displayName: resident.name,
    slot: "午后",
    zoneId: "townCenter",
    place,
    activityId,
    activityTitle,
    kind: "talk"
  };
}

const giftLedger = { pairs: {}, recentInteractions: [] };
const gift = T.townRelationshipInteractions.makeInteraction({
  state: { day: 1 },
  ledger: giftLedger,
  context: { day: 1 },
  log: localLog("gift-a", orderly, "YF-09", "留种整理", "黄石农场"),
  otherLog: localLog("gift-b", quiet, "YF-01", "巡田", "黄石农场")
});
assert.equal(gift.type, "gift");
assert(gift.summary.includes("一小包种子"));
assert(!/农场小物|顺手.*点心/.test(gift.summary));

const conflictLedger = { pairs: {}, recentInteractions: [] };
const firstConflict = T.townRelationshipInteractions.makeInteraction({
  state: { day: 1 },
  ledger: conflictLedger,
  context: { day: 1 },
  log: localLog("conflict-a", orderly, "TC-08", "餐馆排队安排"),
  otherLog: localLog("conflict-b", quiet, "TC-03", "碰头确认")
});
assert.equal(firstConflict.type, "exclusion");
const followUp = T.townRelationshipInteractions.makeInteraction({
  state: { day: 3 },
  ledger: conflictLedger,
  context: { day: 3 },
  log: localLog("follow-a", orderly, "TC-03", "碰头确认"),
  otherLog: localLog("follow-b", quiet, "TC-12", "私下谈话")
});
assert.equal(followUp.type, "mediation");
assert.equal(followUp.followUpOf, firstConflict.id);
assert(followUp.summary.includes("第 1 天没说定的餐馆排队安排"));
assert(!followUp.summary.includes("安排安排"));

const payloadBuilders = createPromptPayloadBuilders();
const personalizedPayload = payloadBuilders.interactionPayload({
  residents: [
    { id: "v01", name: "Anna Morgan", voiceStyle: "短句，先说下一步。" },
    { id: "v02", name: "Bennett Fisher", voiceStyle: "多提眼前变化。" }
  ],
  logs: [
    { id: "voice-log-a", residentId: "v01", text: "两人在谷仓门边碰头。" },
    { id: "voice-log-b", residentId: "v02", text: "两人在谷仓门边碰头。" }
  ],
  weekly: {}
});
assert.deepEqual(personalizedPayload.residents.map((resident) => resident.voiceStyle), [
  "短句，先说下一步。",
  "多提眼前变化。"
]);

const indexSource = read("town/index.html");
assert(indexSource.includes("v0.2.0 · 个性化居民语言"));
assert(indexSource.indexOf("resident-language-profile.js") < indexSource.indexOf("town-relationship-interactions.js"));
const homeSource = read("index.html");
assert.equal((homeSource.match(/\.\/town\/index\.html\?v=0\.2\.0/g) || []).length, 3);
assert(!/\.\/town\/index\.html\?v=0\.1\./.test(homeSource));
assert(homeSource.includes("<dd>v0.2.0</dd>"));
const llmPayloads = read("town/src/llm-payloads.js");
assert(llmPayloads.includes("voiceStyle: languageProfile?.promptStyle"));

console.log("Dialogue quality contracts passed: personalized voices, sourced gifts, conflict callbacks, human accounting, spoken-line cleanup, public labels, and motif caps.");
