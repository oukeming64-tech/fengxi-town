"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createJevPlanner } = require("../../server/jev-planner");
const { createModelGuards } = require("../../server/model-guards");
const { createModelActionGuards } = require("../../server/model-action-guards");
const { writeSettledDialogue } = require("../../server/settled-dialogue");

async function run() {
  const guards = createModelGuards({});
  const runtime = { activeKeyPool: () => ({ keys: [{ provider: "openrouter", key: "fixture" }] }) };
  const residents = ["v01", "v02", "v03"].map((id) => ({ id, name: id, zone: "market" }));
  const options = [{ id: "TC-01", title: "采购", meetingPlace: "market" }, { id: "REST-01", title: "休息", meetingPlace: "" }];
  const p = guards.cleanPayload({ actionControl: { day: 1 }, residents, actionLayer: { activities: options }, cognition: {
    memoryStream: { nodes: [{ id: "m", publicText: "今天是集市日。" }] },
    perceptionPackets: residents.map((r) => ({ residentId: r.id, retrievedMemoryIds: ["m"], groupContext: { groupId: "do-not-send" } }))
  } });
  const make = (request) => createJevPlanner({ runtime, actionGuards: createModelActionGuards(guards), request });
  const response = await make(async ({ state, questions }) => {
    assert(!JSON.stringify(state).includes("do-not-send"));
    const answers = {};
    for (const [name, q] of Object.entries(questions)) {
      let pick = "TC-01";
      if (name.endsWith("_mode")) pick = name === "v01_mode" ? "talk" : "help";
      if (name.endsWith("_aim")) pick = "sound_out";
      if (name.endsWith("_partner")) pick = { v01_partner: "morning_v02", v02_partner: "morning_v03" }[name] || "none";
      if (name === "v03_evening") pick = "OUTSIDE-01";
      if (pick !== "OUTSIDE-01") assert(Object.hasOwn(q.criteria, pick));
      answers[name] = { type: "choice", choice: pick };
    }
    return { answers, model: "fixture" };
  })(p);
  const { plans } = response.actionPlan;
  assert.equal(plans[0].interactionIntent.targetResidentId, "v02");
  assert.equal(plans[0].interactionIntent.mode, "talk");
  assert.equal(plans[0].interactionIntent.talkAim, "sound_out");
  assert.equal(plans[1].interactionIntent.mode, "help");
  assert.equal(plans[1].interactionIntent.talkAim, undefined);
  assert.equal(plans[2].interactionIntent, null);
  assert.deepEqual(response.actionAudit.jev.missingSlots, ["v03_evening"]);
  assert.equal(response.actionAudit.accepted.slotPlans, 8);
  await assert.rejects(make(async () => { throw Error("fixture_offline"); })(p), /fixture_offline/);
  const payload = guards.cleanPayload({ mode: "settled-dialogue", residents,
    logs: [{ id: "e", text: "这批货待搬。", residentIds: ["v01", "v02"], kind: "help" }] });
  const scene = { id: "e", evidenceId: "e", anchor: "这批货", lines: [{ speakerId: "v01", text: "你扶得住吗？" }, { speakerId: "v02", text: "松手试试。慢点。" }] };
  const write = (draft, input = payload) => writeSettledDialogue(input, { guards,
    callWithJsonFallback: async () => ({ conversations: [].concat(draft), generationModel: "writer" }) });
  assert.equal((await write(scene)).shadow.conversations.length, 1);
  const thirdTurn = { ...scene, lines: [...scene.lines, { speakerId: "v01", text: "我还没松呢。" }] };
  assert.equal((await write(thirdTurn)).shadow.conversations[0].lines.length, 3);
  assert.equal((await write({ ...scene, id: "yesterday" })).shadow.conversations.length, 0);
  assert.equal((await write({ ...scene, lines: [...scene.lines, { speakerId: "v03", text: "来啦。" }] })).shadow.conversations.length, 0);
  assert.equal((await write({ ...scene, lines: [scene.lines[0], scene.lines[0]] })).shadow.conversations.length, 0);
  assert.equal((await write({ ...scene, lines: [...scene.lines].reverse() })).shadow.conversations.length, 0);
  assert.equal((await write({ ...scene, anchor: "供应商" })).shadow.conversations.length, 0);
  assert.equal((await write({ ...scene, evidenceId: "different-meeting" })).shadow.conversations.length, 0);
  assert.equal((await write({ ...scene, lines: [scene.lines[0], { speakerId: "v02", text: "第三季度还差 35 元。" }] })).shadow.conversations.length, 0);
  for (const text of ["价差我记在纸边了。", "把消息带回农场吧。", "昨天你也来抬过。"]) {
    const first = { ...scene, lines: [scene.lines[0], { speakerId: "v02", text }] };
    const chosen = await write([first, thirdTurn]);
    assert.deepEqual(chosen.shadow.conversations[0].lines.map((l) => l.text), thirdTurn.lines.map((l) => l.text));
  }
  const longer = { ...scene, lines: [scene.lines[0], { speakerId: "v02", text: "松手以前你先说一声，别把我吓着了。" }] };
  assert.equal((await write(longer, { ...payload, recentLines: [longer.lines[1].text] })).audit.rejected.repeated_line, 1);
  const evidencePayload = guards.cleanPayload({ mode: "settled-dialogue", residents, logs: [{
    id: "rel-d2-v01-v02", residentIds: ["v01","v02"], day: 2, slot: "清晨", text: "两人在谈交货。", kind: "talk", talkAim: "bargain",
    observations: [{ id: "log-d2-s1-v02", residentId: "v02", activity: "合同谈判", text: "交货还剩 4 天。" }],
    previousMeeting: { id: "rel-d1-v03-v02", residentIds: ["v03","v02"], day: 1, text: "另两人先前见过。" }
  }] });
  const dated = { id: "rel-d2-v01-v02", evidenceId: "log-d2-s1-v02", anchor: "交货", lines: [
    { speakerId: "v01", text: "只剩四天了，你还敢等？" }, { speakerId: "v02", text: "敢。你要是急，可以先开个价。" }] };
  const datedResult = await write(dated, evidencePayload);
  assert.deepEqual(datedResult.shadow.conversations[0].evidenceLogIds, [dated.id, dated.evidenceId]);
  const board = guards.cleanPayload({ mode: "settled-dialogue", residents, recentLines: ["那就把消息带回农场吧。"], logs: [{
    id: "rel-d1-v01-v02", residentIds: ["v01","v02"], day: 1, slot: "清晨", place: "镇中心", kind: "talk", talkAim: "tease",
    activityTitle: "查看公告栏", text: "两人在镇中心说话。",
    observations: [{ id: "log-d1-s1-v01", residentId: "v01", activity: "查看公告栏", terms: ["溪谷豌豆", "虚构供应商"],
      text: "溪谷豌豆的价差被记在纸边。", earlierToday: [{ id: "log-d1-s3-v01", slot: "夜里", activity: "夜巡" }] }]
  }] });
  const boardResult = await writeSettledDialogue(board, { guards, callWithJsonFallback: async ({ scenes, ...rest }) => {
    assert.equal(rest.recentLines, undefined);
    const brief = JSON.stringify(scenes[0]);
    assert(brief.includes("逗对方") && brief.includes("溪谷豌豆") && brief.includes("价差"));
    assert(!/纸边|带回农场|虚构供应商|夜巡/.test(brief));
    return { conversations: [{ id: scenes[0].id, lines: [
      { speakerId: "v01", text: "你也想接这个活？" }, { speakerId: "v02", text: "我光问个价，你就急着拉我入伙了？" }
    ] }] };
  } });
  assert.equal(boardResult.shadow.conversations.length, 1);
  for (const line of ["清晨路况比上周还糟。", "路上已经颠坏了萝卜。", "上周我也来过。"]) {
    const result = await write({ ...dated, lines: [{ speakerId: "v01", text: line }, dated.lines[1]] }, evidencePayload);
    assert.equal(result.shadow.conversations.length, 0);
  }
  assert.equal((await write({ ...dated, lines: [{speakerId:"v01", text:"只剩十四天了？"}, dated.lines[1]] }, evidencePayload)).audit.rejected.unsupported_quantity, 1);
  assert.equal((await write({ ...dated, evidenceId: "rel-d1-v03-v02", anchor: "先前" }, evidencePayload)).audit.rejected.invalid_evidence, 1);
  const context = { window: { MorningTown: { activityRules: { getActivity: (id) => ({ id }) },
    townStage: { hotspotForActivity: (a) => ({ id: a.id }) } } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/world/jev-day.js"), "utf8"), context);
  const log = { slot: "清晨", residentId: "v01", activityId: "TC-01", modelControl: { decision: "accepted",
    interactionIntent: { accepted: true, slot: "清晨", targetResidentId: "v02", mode: "help" } } };
  const target = { slot: "清晨", residentId: "v02", activityId: "TC-01" };
  const pair = context.window.MorningTown.jevDay.settledPairs;
  assert.equal(pair([log, target]).length, 1);
  assert.equal(pair([log, { ...target, activityId: "TC-02" }]).length, 0);
  assert.equal(pair([log, { ...target, slot: "夜里" }]).length, 0);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/world/stage-recap-data.js"), "utf8"), context);
  const archive = context.window.MorningTown.stageRecapData.archiveModelConversations;
  const conversation = (await write(scene)).shadow.conversations[0], state = {};
  assert.equal(archive(state, [{ ...conversation, evidenceLogIds: ["rel-d1-v01-v02"] }], 1).length, 1);
  assert.equal(archive(state, [{ ...conversation, evidenceLogIds: ["rel-d1-v01-v02"] }], 1).length, 0);
  assert.equal(archive({}, [{ ...conversation, evidenceLogIds: ["rel-unrelated"] }], 1).length, 0);
  const eventId = "rel-d1-v01-v02";
  const rewriteState = { lastReport: { day: 1 }, lastSettlement: { settlement: { relationshipChanges: [{ day: 1, id: eventId }] } } };
  const record = { ...conversation, id: eventId, evidenceLogIds: [eventId] };
  archive(rewriteState, [record], 1);
  archive(rewriteState, [{ ...record, lines: thirdTurn.lines }], 1, [eventId]);
  assert.equal(rewriteState.modelConversationArchive.length, 1);
  assert.equal(rewriteState.modelConversationArchive[0].lines.length, 3);
  archive(rewriteState, [], 1, [eventId]);
  assert.equal(rewriteState.modelConversationArchive.length, 1);
  rewriteState.stageConversationRecaps = [{ startDay: 1, endDay: 60 }];
  archive(rewriteState, [], 1, [eventId]);
  assert.equal(rewriteState.modelConversationArchive.length, 1);
  console.log("PASS Jev choices, outages, actual meetings, dialogue grounding and archiving");
}
run().catch((e) => { console.error(e); process.exitCode = 1; });
