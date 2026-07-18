#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const townRoot = path.resolve(__dirname, "..");
const dialoguePath = path.join(townRoot, "src/town-stage-dialogue.js");
const read = (relativePath) => fs.readFileSync(path.join(townRoot, relativePath), "utf8");

assert(
  fs.existsSync(dialoguePath),
  "src/town-stage-dialogue.js must exist before local dialogue contracts can run"
);

const dialogueSource = read("src/town-stage-dialogue.js");
const stageSource = read("src/town-stage.js");
const indexSource = read("index.html");
const mapLayerSource = read("src/ui/town-map-dialogue-layer.js");
const conversationPanelSource = read("src/ui/conversation-panel.js");
const context = vm.createContext({ window: { MorningTown: {} }, console });
vm.runInContext(dialogueSource, context, { filename: "src/town-stage-dialogue.js" });

const dialogue = context.window.MorningTown.townStageDialogue;
assert(dialogue, "town-stage-dialogue.js must expose window.MorningTown.townStageDialogue");
assert.equal(typeof dialogue.makeEncounters, "function", "townStageDialogue.makeEncounters must be callable");
assert.equal(typeof dialogue.firstName, "function", "townStageDialogue.firstName must be callable");

const forbiddenLegacyLines = [
  "这张纸先放桌上",
  "这块地先看稳",
  "工具还要再递一下",
  "这个数先记清楚",
  "你也在这边",
  "我把这件事处理完"
];
forbiddenLegacyLines.forEach((line) => {
  assert(!dialogueSource.includes(line), `legacy fixed line must be removed from the local dialogue source: ${line}`);
  assert(!stageSource.includes(line), `legacy fixed line must be removed from town-stage.js: ${line}`);
});

assert(
  indexSource.indexOf("src/town-stage-dialogue.js") < indexSource.indexOf("src/town-stage.js"),
  "town-stage-dialogue.js must load before town-stage.js"
);
assert(stageSource.includes("stageDialogue.makeEncounters(events"), "town-stage.js must delegate encounter writing to townStageDialogue");
assert(!stageSource.includes("function evidenceLine("), "town-stage.js must not retain the six-line evidenceLine generator");
assert(!stageSource.includes("stage-fact-d"), "planned stage previews must not fabricate evidence ids for yesterday callbacks");
assert(mapLayerSource.includes('data-dialogue-type="${encounter.dialogueType}"'), "map dialogue markup must expose the dialogue layer");
assert(mapLayerSource.includes("stage-dialogue--${encounter.dialogueType}"), "map dialogue styling must distinguish all three layers");
assert(conversationPanelSource.includes('encounter.dialogueType === "important" && encounter.archiveEligible'),
  "the complete conversation area must accept only archive-eligible important local dialogue");

assert.equal(dialogue.firstName("Alice Miller"), "Alice");
assert.equal(dialogue.firstName("  Bennett   Fisher  "), "Bennett");

function event({
  residentId,
  residentName,
  evidenceLogId = "",
  activityId = "TC-03",
  activityTitle = "碰头确认",
  kind = "talk",
  hotspotId = "town-center",
  hotspotLabel = "主街",
  x = 48,
  y = 52,
  text = ""
}) {
  return {
    residentId,
    residentName,
    slot: "清晨",
    activityId,
    activityTitle,
    kind,
    hotspotId,
    hotspotLabel,
    x,
    y,
    text,
    evidenceLogId
  };
}

function pairEvents(options = {}) {
  return [
    event({
      residentId: "v01",
      residentName: "Alice Miller",
      evidenceLogId: options.withEvidence === false ? "" : "today-v01",
      activityId: options.activityId || "YF-01",
      activityTitle: options.activityTitle || "巡田",
      kind: options.kind || "work",
      hotspotId: options.hotspotId || "farm-field",
      hotspotLabel: options.hotspotLabel || "黄石农场",
      x: 44,
      y: 48,
      text: options.firstText || "Alice Miller在田边查看今天的灌溉沟。"
    }),
    event({
      residentId: "v02",
      residentName: "Bennett Fisher",
      evidenceLogId: options.withEvidence === false ? "" : "today-v02",
      activityId: options.secondActivityId || options.activityId || "YF-07",
      activityTitle: options.secondActivityTitle || options.activityTitle || "灌溉维护",
      kind: options.secondKind || options.kind || "work",
      hotspotId: options.hotspotId || "farm-field",
      hotspotLabel: options.hotspotLabel || "黄石农场",
      x: 52,
      y: 48,
      text: options.secondText || "Bennett Fisher在田边清理今天的引水口。"
    })
  ];
}

function allLines(encounters) {
  return encounters.flatMap((encounter) => encounter.lines || []);
}

function allTexts(encounters) {
  return allLines(encounters).map((line) => String(line.text || ""));
}

function knownEvidenceIds(events, options = {}) {
  return new Set([
    ...events.map((item) => item.evidenceLogId),
    ...(options.priorLogs || []).map((item) => item.id),
    ...(options.relationshipEvents || []).flatMap((item) => [item.id, ...(item.sourceLogIds || [])])
  ].filter(Boolean));
}

function assertEncounterShape(encounters, events, options = {}) {
  assert(Array.isArray(encounters), "makeEncounters must return an array");
  const ids = new Set(events.map((item) => item.residentId));
  const evidenceIds = knownEvidenceIds(events, options);
  const sentenceKeys = new Set();

  encounters.forEach((encounter) => {
    assert(
      ["ambient", "exchange", "important"].includes(encounter.dialogueType),
      `unsupported dialogueType: ${encounter.dialogueType}`
    );
    assert.equal(typeof encounter.motif, "string", "every encounter must expose its anti-repeat motif");
    assert(encounter.motif.trim(), "every encounter motif must be non-empty");
    assert.equal(typeof encounter.archiveEligible, "boolean", "archiveEligible must be explicit");
    assert(Array.isArray(encounter.residentIds) && encounter.residentIds.length >= 1, "residentIds must identify speakers");
    assert(encounter.residentIds.every((id) => ids.has(id)), "dialogue speakers must come from the input events");
    assert(Array.isArray(encounter.evidenceLogIds), "evidenceLogIds must always be an array");
    assert(Array.isArray(encounter.lines) && encounter.lines.length >= 1, "every visible encounter needs at least one line");
    assert.equal(typeof encounter.x, "number", "encounter x must stay anchored to the map");
    assert.equal(typeof encounter.y, "number", "encounter y must stay anchored to the map");
    assert.equal(typeof encounter.hotspotId, "string", "encounter hotspotId must be explicit");
    assert.equal(typeof encounter.hotspotLabel, "string", "encounter hotspotLabel must be explicit");

    if (encounter.dialogueType === "important") {
      assert.equal(encounter.archiveEligible, true, "important dialogue is the only archive-eligible local layer");
      assert(encounter.evidenceLogIds.length > 0, "important dialogue must cite explicit relationship or fact evidence");
      assert(
        encounter.evidenceLogIds.every((id) => evidenceIds.has(id)),
        "important dialogue must not invent evidence ids"
      );
    } else {
      assert.equal(encounter.archiveEligible, false, `${encounter.dialogueType} dialogue must stay out of the formal archive`);
    }

    encounter.lines.forEach((line) => {
      const text = String(line.text || "").trim();
      assert(ids.has(line.speakerId), "every line speaker must be one of the encounter residents");
      assert(/[\u3400-\u9fff]/u.test(text), `local dialogue must be written in Chinese: ${text}`);
      assert(!text.includes("Alice Miller"), "dialogue must not address Alice by her English full name");
      assert(!text.includes("Bennett Fisher"), "dialogue must not address Bennett by his English full name");
      forbiddenLegacyLines.forEach((legacy) => {
        assert(!text.includes(legacy), `legacy fixed line must never be emitted: ${legacy}`);
      });
      const sentenceKey = `${[...encounter.residentIds].sort().join("|")}|${text}`;
      assert(!sentenceKeys.has(sentenceKey), `a resident pair must not repeat the exact sentence in one day: ${text}`);
      sentenceKeys.add(sentenceKey);
    });
  });
}

function build(events, options) {
  const eventsBefore = JSON.stringify(events);
  const optionsBefore = JSON.stringify(options);
  const encounters = dialogue.makeEncounters(events, options);
  assert.equal(JSON.stringify(events), eventsBefore, "makeEncounters must not mutate input event facts");
  assert.equal(JSON.stringify(options), optionsBefore, "makeEncounters must not mutate prior facts or history options");
  assertEncounterShape(encounters, events, options);
  return encounters;
}

const ambientEvents = pairEvents({
  withEvidence: false,
  activityId: "TC-11",
  activityTitle: "主街偶遇",
  kind: "quiet",
  hotspotId: "town-center",
  hotspotLabel: "主街"
});
const ambient = build(ambientEvents, {
  slot: "清晨",
  day: 8,
  relationshipEvents: [],
  priorLogs: [],
  previousEncounters: [],
  maxEncounters: 4
});
assert(ambient.length > 0, "a plain same-place encounter should be able to produce an ambient line");
assert(ambient.every((item) => item.dialogueType === "ambient"), "unsubstantiated greetings must remain ambient");
assert(
  allTexts(ambient).some((text) => /Alice|Bennett/.test(text)),
  "an addressed greeting must use the resident's first name"
);

const exchangeEvents = pairEvents();
const exchangeOptions = {
  slot: "清晨",
  day: 8,
  relationshipEvents: [],
  priorLogs: [],
  previousEncounters: [],
  maxEncounters: 4
};
const exchange = build(exchangeEvents, exchangeOptions);
assert(exchange.length > 0, "current audited work should be able to produce a short exchange");
assert(exchange.some((item) => item.dialogueType === "exchange"), "audited current work should remain a short exchange");
assert(exchange.every((item) => item.dialogueType !== "important"), "ordinary work must not be promoted to important dialogue");
const partialEvidence = build(exchangeEvents.map((item, index) => index ? { ...item, evidenceLogId: "" } : item), exchangeOptions);
assert(partialEvidence.every((item) => item.dialogueType === "ambient"),
  "a partially audited pair must not quote the other resident's plan as completed work");

const sameStage = build([
  ...exchangeEvents,
  event({ residentId: "v03", residentName: "Clara Reed", evidenceLogId: "today-v03", activityId: "AC-01", activityTitle: "预算会", kind: "work", hotspotId: "farm-field", hotspotLabel: "黄石农场", x: 56, y: 50 }),
  event({ residentId: "v04", residentName: "Dylan Brooks", evidenceLogId: "today-v04", activityId: "AC-01", activityTitle: "预算会", kind: "work", hotspotId: "farm-field", hotspotLabel: "黄石农场", x: 60, y: 50 })
], exchangeOptions);
assert.equal(sameStage.length, 2, "four colocated residents should produce two readable exchange groups");
assert.equal(new Set(sameStage.map((item) => item.motif)).size, sameStage.length,
  "visible pairs in the same stage should not reuse the same dialogue motif");
assert.equal(new Set(allTexts(sameStage)).size, allTexts(sameStage).length,
  "visible pairs in the same stage should not repeat a canned sentence");

const noEvidenceImportantAttempt = build(pairEvents({
  withEvidence: false,
  activityId: "CH-03",
  activityTitle: "重要会议与公开承诺",
  kind: "talk",
  hotspotId: "community-hall",
  hotspotLabel: "社区会堂"
}), {
  slot: "午后",
  day: 8,
  relationshipEvents: [],
  priorLogs: [],
  previousEncounters: [],
  maxEncounters: 4
});
assert(
  noEvidenceImportantAttempt.every((item) => item.dialogueType !== "important"),
  "important-sounding activity copy without an evidence id must not create important dialogue"
);

const relationshipEvents = [{
  id: "rel-8-1",
  day: 8,
  slot: "清晨",
  type: "exclusion",
  label: "被排除",
  residentIds: ["v01", "v02"],
  actorId: "v01",
  targetId: "v02",
  place: "黄石农场",
  activityId: "YF-01",
  activityTitle: "灌溉维护安排",
  summary: "Alice Miller把Bennett Fisher提出的灌溉维护安排搁到后面。",
  sourceLogIds: ["today-v01", "today-v02"]
}];
const importantOptions = {
  slot: "清晨",
  day: 8,
  relationshipEvents,
  priorLogs: [],
  previousEncounters: [],
  maxEncounters: 4
};
const important = build(exchangeEvents, importantOptions);
assert(important.some((item) => item.dialogueType === "important"), "an explicit pair relationship event should create important dialogue");
assert(
  important.filter((item) => item.dialogueType === "important").every((item) => item.archiveEligible),
  "important relationship dialogue must be eligible for the formal conversation area"
);

const yesterdayLog = {
  id: "prior-d7-v01",
  day: 7,
  slot: "午后",
  residentId: "v01",
  residentName: "Alice Miller",
  activityId: "YF-07",
  activityTitle: "清理引水口",
  place: "黄石农场",
  text: "Alice Miller在黄石农场清理了堵住的引水口。"
};
const yesterdayOptions = {
  slot: "清晨",
  day: 8,
  relationshipEvents: [],
  priorLogs: [yesterdayLog],
  previousEncounters: [],
  maxEncounters: 4
};
const yesterday = build(exchangeEvents, yesterdayOptions);
const yesterdayEncounters = yesterday.filter((item) => allTexts([item]).some((text) => /昨天|昨日/.test(text)));
assert(yesterdayEncounters.length > 0, "a day-1 audited log should be available for a grounded yesterday callback");
yesterdayEncounters.forEach((item) => {
  assert(
    item.evidenceLogIds.includes(yesterdayLog.id),
    "every yesterday callback must cite the exact day-1 prior log"
  );
});

[
  { label: "no prior logs", priorLogs: [] },
  { label: "day-2 prior log", priorLogs: [{ ...yesterdayLog, id: "prior-d6-v01", day: 6 }] },
  { label: "unidentifiable day-1 fact", priorLogs: [{ ...yesterdayLog, id: "", day: 7 }] }
].forEach(({ label, priorLogs }) => {
  const result = build(exchangeEvents, {
    slot: "清晨",
    day: 8,
    relationshipEvents: [],
    priorLogs,
    previousEncounters: [],
    maxEncounters: 4
  });
  assert(
    allTexts(result).every((text) => !/昨天|昨日/.test(text)),
    `${label} must never produce an ungrounded yesterday callback`
  );
});

const sameDayAgain = build(exchangeEvents, {
  ...exchangeOptions,
  previousEncounters: exchange
});
const firstSentences = new Set(allTexts(exchange));
assert(
  allTexts(sameDayAgain).every((text) => !firstSentences.has(text)),
  "the same resident pair must not repeat an exact sentence on the same day"
);

const adjacentDay = build(exchangeEvents, {
  ...exchangeOptions,
  day: 9,
  previousEncounters: exchange.map((item) => ({ ...item, day: 8 }))
});
const priorMotifs = new Set(exchange.map((item) => item.motif));
assert(
  adjacentDay.every((item) => !priorMotifs.has(item.motif)),
  "the same resident pair must avoid the same motif on adjacent days"
);

const panelContext = vm.createContext({
  window: {
    MorningTown: {
      townStage: {
        currentPlayback() {
          return {
            stages: [{
              label: "清晨",
              encounters: [
                { ...ambient[0], id: "panel-ambient" },
                { ...exchange[0], id: "panel-exchange" },
                { ...important.find((item) => item.dialogueType === "important"), id: "panel-important" },
                {
                  ...important.find((item) => item.dialogueType === "important"),
                  id: "panel-important-not-archived",
                  archiveEligible: false
                }
              ]
            }]
          };
        }
      }
    }
  },
  console
});
vm.runInContext(conversationPanelSource, panelContext, { filename: "src/ui/conversation-panel.js" });
const panelItems = panelContext.window.MorningTown.conversationPanel.localImportantConversations({});
assert.equal(panelItems.length, 1, "the complete conversation area must exclude ambient, exchange, and non-archivable local items");
assert.equal(panelItems[0].id, "panel-important");
assert.equal(panelItems[0].source, "local-important-dialogue");

console.log(JSON.stringify({
  ok: true,
  module: dialogue.version || "town-stage-dialogue",
  checked: {
    ambient: ambient.length,
    exchange: exchange.length,
    partialEvidenceFallbacks: partialEvidence.length,
    sameStageMotifs: sameStage.length,
    important: important.filter((item) => item.dialogueType === "important").length,
    yesterdayCallbacks: yesterdayEncounters.length,
    sameDayAlternatives: sameDayAgain.length,
    adjacentDayAlternatives: adjacentDay.length,
    forbiddenLegacyLines: forbiddenLegacyLines.length,
    archivedLocalConversations: panelItems.length
  }
}, null, 2));
