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
run("src/world/world-config.js");
run("src/world/town-ledger-contract-data.js");
run("src/world/town-ledger-market-data.js");
run("src/world/town-ledger-festival-data.js");
run("src/world/town-ledger-processing-data.js");
run("src/world/town-ledger-economy-data.js");
window.MorningTown.townLedgerData = {
  festivalCalendar: window.MorningTown.townLedgerEconomyData.festivalCalendar
};
run("src/town-stage-hotspot-data.js");
run("src/town-stage-action-data.js");
run("src/town-stage-data.js");
run("src/town-stage-routes.js");
run("src/town-stage-festival-theme.js");
run("src/town-stage-festival-map-packages.js");
run("src/world/festival-resident-behavior.js");

const T = window.MorningTown;
const theme = T.townStageFestivalTheme;
const defaultMap = theme.defaultMapPackage;

assert.equal(T.version.code, "v0.2.1");
assert.equal(theme.version, "town-stage-festival-theme-v0.1.9-a");
assert.equal(theme.source, "local-festival-calendar");
assert.equal(defaultMap.mapAsset, T.assets.townMap);
assert.equal(defaultMap.aspectRatio, "3:2");
assert.equal(defaultMap.hotspotIds.length, 18);
assert.equal(defaultMap.routeVersion, T.townStageRoutes.version);
assert(Object.isFrozen(defaultMap));
assert(Object.isFrozen(defaultMap.hotspotIds));

const preparing = theme.resolveForState({ day: 1, seasonKey: "spring" });
assert.equal(preparing.festivalId, "seed_swap");
assert.equal(preparing.phase, "preparing");
assert.equal(preparing.mapPackage.id, "default");
assert.equal(preparing.fallbackReason, "festival-phase-uses-default-map");

const activeDayThree = theme.resolveForState({ day: 3, seasonKey: "spring" });
assert.equal(activeDayThree.phase, "active");
assert.equal(activeDayThree.isFestivalMap, true);

const activeDayFour = theme.resolveForState({ day: 4, seasonKey: "spring" });
assert.equal(activeDayFour.phase, "active");
assert.equal(activeDayFour.isFestivalMap, true);

const cleanup = theme.resolveForState({ day: 5, seasonKey: "spring" });
assert.equal(cleanup.phase, "cleanup");
assert.equal(cleanup.mapPackage.id, "default");

const ordinaryDay = theme.resolveForState({ day: 6, seasonKey: "spring" });
assert.equal(ordinaryDay.phase, "none");
assert.equal(ordinaryDay.festivalId, null);
assert.equal(ordinaryDay.mapAsset, T.assets.townMap);
assert.equal(ordinaryDay.fallbackReason, "not-a-festival-window");

const seedSwapMap = theme.registeredMapPackage("seed_swap");
assert(Object.isFrozen(seedSwapMap));
assert(Object.isFrozen(seedSwapMap.activeZoneIds));
assert.equal(seedSwapMap.mapAsset, "./assets/runtime/festivals/seed_swap/map.png");
assert.deepEqual([...seedSwapMap.phases], ["active"]);
assert.equal(activeDayThree.mapPackage.id, "seed-swap-map-v1");
assert.equal(activeDayThree.mapAsset, seedSwapMap.mapAsset);
assert.equal(activeDayThree.fallbackMapAsset, T.assets.townMap);
assert.equal(activeDayThree.activeZoneIds.length, 3);

const preparingWithMapInstalled = theme.resolveForState({ day: 2, seasonKey: "spring" });
assert.equal(preparingWithMapInstalled.isFestivalMap, false);
assert.equal(preparingWithMapInstalled.fallbackReason, "festival-phase-uses-default-map");

const rainGutterMap = theme.registeredMapPackage("rain_gutter_day");
assert(Object.isFrozen(rainGutterMap));
assert(Object.isFrozen(rainGutterMap.activeZoneIds));
assert.equal(rainGutterMap.mapAsset, "./assets/runtime/festivals/rain_gutter_day/map.png");
assert.deepEqual([...rainGutterMap.phases], ["active"]);

const gutterPreparingDayEight = theme.resolveForState({ day: 8, seasonKey: "spring" });
assert.equal(gutterPreparingDayEight.phase, "preparing");
assert.equal(gutterPreparingDayEight.mapPackage.id, "default");

const gutterPreparingDayNine = theme.resolveForState({ day: 9, seasonKey: "spring" });
assert.equal(gutterPreparingDayNine.phase, "preparing");
assert.equal(gutterPreparingDayNine.mapPackage.id, "default");

const gutterActive = theme.resolveForState({ day: 10, seasonKey: "spring" });
assert.equal(gutterActive.phase, "active");
assert.equal(gutterActive.mapPackage.id, "rain-gutter-day-map-v1");
assert.equal(gutterActive.mapAsset, rainGutterMap.mapAsset);
assert.equal(gutterActive.activeZoneIds.length, 5);

const gutterCleanup = theme.resolveForState({ day: 11, seasonKey: "spring" });
assert.equal(gutterCleanup.phase, "cleanup");
assert.equal(gutterCleanup.mapPackage.id, "default");

const harvestPreparing = theme.resolveForState({ day: 3, seasonKey: "fall" });
assert.equal(harvestPreparing.festivalId, "harvest_festival");
assert.equal(harvestPreparing.festivalName, "丰收节");
assert.equal(harvestPreparing.phase, "preparing");
assert.equal(harvestPreparing.mapPackage.id, "default");

const harvestActive = theme.resolveForState({ day: 5, seasonKey: "fall" });
const harvestMap = theme.registeredMapPackage("harvest_festival");
assert(Object.isFrozen(harvestMap));
assert.equal(harvestActive.phase, "active");
assert.equal(harvestActive.mapPackage.id, "harvest-festival-map-v1");
assert.equal(harvestActive.mapAsset, "./assets/runtime/festivals/harvest_festival/map.png");
assert.equal(harvestActive.activeZoneIds.length, 4);

const harvestLastDay = theme.resolveForState({ day: 7, seasonKey: "fall" });
assert.equal(harvestLastDay.mapPackage.id, "harvest-festival-map-v1");
const harvestCleanup = theme.resolveForState({ day: 8, seasonKey: "fall" });
assert.equal(harvestCleanup.phase, "cleanup");
assert.equal(harvestCleanup.mapPackage.id, "default");

const snowfallPreparing = theme.resolveForState({ day: 2, seasonKey: "winter" });
assert.equal(snowfallPreparing.festivalId, "snowfall_festival");
assert.equal(snowfallPreparing.festivalName, "落雪节");
assert.equal(snowfallPreparing.phase, "preparing");
assert.equal(snowfallPreparing.mapPackage.id, "default");

const snowfallActive = theme.resolveForState({ day: 4, seasonKey: "winter" });
const snowfallMap = theme.registeredMapPackage("snowfall_festival");
assert(Object.isFrozen(snowfallMap));
assert.equal(snowfallActive.phase, "active");
assert.equal(snowfallActive.mapPackage.id, "snowfall-festival-map-v1");
assert.equal(snowfallActive.mapAsset, "./assets/runtime/festivals/snowfall_festival/map.png");
assert.equal(snowfallActive.activeZoneIds.length, 4);

const snowfallLastDay = theme.resolveForState({ day: 5, seasonKey: "winter" });
assert.equal(snowfallLastDay.mapPackage.id, "snowfall-festival-map-v1");
const snowfallCleanup = theme.resolveForState({ day: 6, seasonKey: "winter" });
assert.equal(snowfallCleanup.phase, "cleanup");
assert.equal(snowfallCleanup.mapPackage.id, "default");

const behavior = T.festivalResidentBehavior;
const residents = Array.from({ length: 30 }, (_, index) => ({ id: `v${String(index + 1).padStart(2, "0")}` }));
const harvestBehaviorContexts = residents.map((resident) => behavior.contextFor(resident, {
  townState: { day: 5, seasonKey: "fall" },
  slot: "午后"
}));
const harvestLead = residents.find((resident, index) => harvestBehaviorContexts[index]?.participation === "lead");
const harvestOrdinary = residents.find((resident, index) => harvestBehaviorContexts[index]?.participation === "ordinary");
assert(harvestLead);
assert(harvestOrdinary);
assert(behavior.scoreActivity(harvestLead, { id: "CH-08" }, { townState: { day: 5, seasonKey: "fall" }, slot: "午后" }) > 0);
assert.equal(behavior.scoreActivity(harvestOrdinary, { id: "CH-08" }, { townState: { day: 5, seasonKey: "fall" }, slot: "午后" }), 0);
assert.equal(behavior.scoreActivity(harvestLead, { id: "OM-02" }, { townState: { day: 5, seasonKey: "fall" }, slot: "午后" }), 0);
assert(
  behavior.scoreActivity(harvestLead, { id: "CH-10" }, { townState: { day: 5, seasonKey: "fall" }, slot: "夜里" })
  > behavior.scoreActivity(harvestLead, { id: "CH-10" }, { townState: { day: 5, seasonKey: "fall" }, slot: "清晨" })
);
const behaviorAudit = behavior.auditFor({ townState: { day: 4, seasonKey: "winter" } });
assert.equal(behaviorAudit.festivalId, "snowfall_festival");
assert.equal(behaviorAudit.forcedResidentCount, 0);
assert.equal(behaviorAudit.groupIdentityInput, false);
assert.equal(behaviorAudit.usesExistingActivitiesOnly, true);

const noticeHotspot = T.townStageData.mapHotspots.find((hotspot) => hotspot.id === "notice-board");
const innHotspot = T.townStageData.mapHotspots.find((hotspot) => hotspot.id === "inn-door");
assert(noticeHotspot.activityIds.includes("CH-04"));
assert(innHotspot.activityIds.includes("CH-06"));

assert.throws(() => theme.registerMapPackage({
  festivalId: "seed_swap",
  mapAsset: "./assets/runtime/festivals/seed_swap/wrong.png",
  aspectRatio: "3:2",
  coordinateContract: "different-space",
  hotspotIds: [...defaultMap.hotspotIds],
  routeVersion: defaultMap.routeVersion
}), /coordinate contract/);

assert.throws(() => theme.registerMapPackage({
  festivalId: "seed_swap",
  mapAsset: "./assets/runtime/festivals/seed_swap/wrong.png",
  aspectRatio: "3:2",
  coordinateContract: theme.coordinateContract,
  hotspotIds: defaultMap.hotspotIds.slice(1),
  routeVersion: defaultMap.routeVersion
}), /hotspot ids/);

const indexSource = read("index.html");
const mapPanelSource = read("src/ui/resident-map-panel.js");
const chromeSource = read("src/ui/town-map-chrome.js");
const packageSource = read("src/town-stage-festival-map-packages.js");
const mapBuffers = Object.fromEntries([
  "seed_swap",
  "rain_gutter_day",
  "harvest_festival",
  "snowfall_festival"
].map((festivalId) => [
  festivalId,
  fs.readFileSync(path.join(townRoot, `assets/runtime/festivals/${festivalId}/map.png`))
]));
Object.values(mapBuffers).forEach((buffer) => {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  assert.equal(buffer.readUInt32BE(16), 1536);
  assert.equal(buffer.readUInt32BE(20), 1024);
});
assert(indexSource.indexOf("town-stage-festival-theme.js") < indexSource.indexOf("town-stage-festival-map-packages.js"));
assert(indexSource.indexOf("town-stage-festival-map-packages.js") < indexSource.indexOf("festival-resident-behavior.js"));
assert(indexSource.indexOf("festival-resident-behavior.js") < indexSource.indexOf("festival-result-ledger.js"));
assert(indexSource.indexOf("festival-resident-behavior.js") < indexSource.indexOf("world/action-policy.js"));
assert(indexSource.includes("v0.2.1 · 居民步行动画"));
assert(packageSource.includes("theme.registerMapPackage"));
assert(packageSource.includes("festivalId: \"rain_gutter_day\""));
assert(packageSource.includes("festivalId: \"harvest_festival\""));
assert(packageSource.includes("festivalId: \"snowfall_festival\""));
assert(mapPanelSource.includes("day: playback?.day || engine.state.townState?.day || engine.state.day"));
assert(mapPanelSource.includes("data-map-package-id"));
assert(mapPanelSource.includes("dataset.mapFallback = \"asset-load-error\""));
assert(chromeSource.includes("festivalTheme.festivalName"));

console.log(JSON.stringify({
  ok: true,
  version: T.version.code,
  festivalTheme: theme.version,
  hotspotCount: defaultMap.hotspotIds.length,
  routeVersion: defaultMap.routeVersion,
  defaultFallback: ordinaryDay.mapPackage.id,
  registeredPackages: [activeDayThree.mapPackage.id, gutterActive.mapPackage.id, harvestActive.mapPackage.id, snowfallActive.mapPackage.id],
  phaseChecks: {
    seedSwap: [preparing.phase, activeDayThree.phase, activeDayFour.phase, cleanup.phase],
    rainGutterDay: [gutterPreparingDayEight.phase, gutterPreparingDayNine.phase, gutterActive.phase, gutterCleanup.phase],
    harvestFestival: [harvestPreparing.phase, harvestActive.phase, harvestLastDay.phase, harvestCleanup.phase],
    snowfallFestival: [snowfallPreparing.phase, snowfallActive.phase, snowfallLastDay.phase, snowfallCleanup.phase]
  },
  mapSizes: Object.fromEntries(Object.entries(mapBuffers).map(([festivalId, buffer]) => [
    festivalId,
    `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`
  ])),
  behavior: behaviorAudit
}, null, 2));
