const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const townRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(townRoot, relativePath), "utf8");
const window = {};
const context = vm.createContext({ window, console });

function run(relativePath) {
  vm.runInContext(read(relativePath), context, { filename: relativePath });
}

run("src/shared.js");
run("src/world/town-ledger-festival-data.js");
window.MorningTown.townLedgerData = {
  festivalCalendar: window.MorningTown.townLedgerFestivalData.festivalCalendar
};
run("src/town-stage-festival-theme.js");
run("src/world/festival-resident-behavior.js");
run("src/world/festival-result-ledger.js");

const T = window.MorningTown;
const ledger = T.festivalResultLedger;

function log(id, activityId, residentId, place, slot = "午后") {
  return {
    id,
    day: 5,
    slot,
    residentId,
    zoneId: place,
    place: `${place} · ${activityId}`,
    activityId,
    activityTitle: activityId
  };
}

assert.equal(T.version.code, "v0.2.1");
assert.equal(ledger.version, "festival-result-ledger-v0.1.9-f");
assert.equal(ledger.source, "executed-local-actions-and-festival-calendar");

const phaseChecks = [
  ["spring", 1, "seed_swap", "preparing"],
  ["spring", 3, "seed_swap", "active"],
  ["spring", 5, "seed_swap", "cleanup"],
  ["spring", 8, "rain_gutter_day", "preparing"],
  ["spring", 10, "rain_gutter_day", "active"],
  ["spring", 11, "rain_gutter_day", "cleanup"],
  ["fall", 3, "harvest_festival", "preparing"],
  ["fall", 5, "harvest_festival", "active"],
  ["fall", 8, "harvest_festival", "cleanup"],
  ["winter", 2, "snowfall_festival", "preparing"],
  ["winter", 4, "snowfall_festival", "active"],
  ["winter", 6, "snowfall_festival", "cleanup"]
];

phaseChecks.forEach(([seasonKey, day, festivalId, phase], index) => {
  const result = ledger.createDailyResult({
    day,
    seasonKey,
    activityLogs: [log(`phase-${index}`, "CH-04", `v${index + 1}`, "town")]
  });
  assert(result, `${festivalId} ${phase} should produce a result`);
  assert.equal(result.festivalId, festivalId);
  assert.equal(result.phase, phase);
  assert.equal(result.source, ledger.source);
  assert.equal(result.immutableState, true);
  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.evidenceRefs));
});

assert.equal(ledger.createDailyResult({ day: 6, seasonKey: "spring", activityLogs: [] }), null);
assert.equal(ledger.createDailyResult({ day: 6, seasonKey: "summer", activityLogs: [] }), null);

const activityLogs = [
  log("a1", "CH-08", "v01", "market"),
  log("a2", "CH-10", "v02", "hall", "夜里"),
  log("a3", "TC-07", "v01", "hall"),
  log("a4", "OM-02", "v03", "mine"),
  log("a1", "CH-08", "v01", "market")
];
const activityLogsBefore = JSON.stringify(activityLogs);
const townState = { day: 5, seasonKey: "fall", cashYsc: 120, relationships: { version: 1 } };
const townStateBefore = JSON.stringify(townState);
const harvest = ledger.createDailyResult({ day: 5, seasonKey: "fall", townState, activityLogs });

assert.equal(JSON.stringify(activityLogs), activityLogsBefore);
assert.equal(JSON.stringify(townState), townStateBefore);
assert.equal(harvest.participantCount, 2);
assert.equal(harvest.actionCount, 3);
assert.equal(harvest.evidenceRefs.length, 3);
assert(harvest.resultTypeCounts.some((item) => item.type === "trade" && item.count === 1));
assert(harvest.resultTypeCounts.some((item) => item.type === "gift" && item.count === 1));
assert(harvest.resultTypeCounts.some((item) => item.type === "dinner" && item.count === 1));
assert(harvest.summaryLines[0].includes("2 位居民"));
assert(harvest.summaryLines[0].includes("3 次已执行行动"));
assert.equal(ledger.reportSection(harvest).title, "节日结果");

const observationState = { festivalResults: [] };
const recordOptions = { day: 5, seasonKey: "fall", townState, activityLogs };
ledger.recordDailyResult(observationState, recordOptions);
ledger.recordDailyResult(observationState, recordOptions);
assert.equal(observationState.festivalResults.length, 1);
assert.equal(JSON.stringify(townState), townStateBefore);

const emptyCleanup = ledger.createDailyResult({ day: 8, seasonKey: "fall", activityLogs: [] });
assert.equal(emptyCleanup.actionCount, 0);
assert(emptyCleanup.summaryLines[0].includes("普通生活照常推进"));

const weeklyLines = ledger.weeklyLines([
  { festivalResult: harvest },
  { festivalResult: ledger.createDailyResult({
    day: 6,
    seasonKey: "fall",
    activityLogs: [log("b1", "CH-06", "v03", "hall")]
  }) }
]);
assert.equal(weeklyLines.length, 2);
assert(weeklyLines[0].includes("3 位居民"));
assert(weeklyLines[0].includes("4 次已执行行动"));

const indexSource = read("index.html");
assert(indexSource.indexOf("festival-resident-behavior.js") < indexSource.indexOf("festival-result-ledger.js"));
assert(indexSource.indexOf("festival-result-ledger.js") < indexSource.indexOf("engine-day-cycle.js"));
assert(indexSource.includes("v0.2.1 · 居民步行动画"));

console.log(JSON.stringify({
  ok: true,
  version: T.version.code,
  resultLedger: ledger.version,
  phaseChecks: phaseChecks.length,
  harvest: {
    participantCount: harvest.participantCount,
    actionCount: harvest.actionCount,
    evidenceCount: harvest.evidenceRefs.length
  },
  weeklyLines
}, null, 2));
