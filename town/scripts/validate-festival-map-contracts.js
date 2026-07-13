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
run("src/world/town-ledger-economy-data.js");
window.MorningTown.townLedgerData = {
  festivalCalendar: window.MorningTown.townLedgerEconomyData.festivalCalendar
};
run("src/town-stage-data.js");
run("src/town-stage-routes.js");
run("src/town-stage-festival-theme.js");
run("src/town-stage-festival-map-packages.js");

const T = window.MorningTown;
const theme = T.townStageFestivalTheme;
const defaultMap = theme.defaultMapPackage;

assert.equal(T.version.code, "v0.1.9-c");
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
const mapPath = path.join(townRoot, "assets/runtime/festivals/seed_swap/map.png");
const mapBuffer = fs.readFileSync(mapPath);
const gutterMapPath = path.join(townRoot, "assets/runtime/festivals/rain_gutter_day/map.png");
const gutterMapBuffer = fs.readFileSync(gutterMapPath);
assert.equal(mapBuffer.toString("ascii", 1, 4), "PNG");
assert.equal(mapBuffer.readUInt32BE(16), 1536);
assert.equal(mapBuffer.readUInt32BE(20), 1024);
assert.equal(gutterMapBuffer.toString("ascii", 1, 4), "PNG");
assert.equal(gutterMapBuffer.readUInt32BE(16), 1536);
assert.equal(gutterMapBuffer.readUInt32BE(20), 1024);
assert(indexSource.indexOf("town-stage-festival-theme.js") < indexSource.indexOf("town-stage-festival-map-packages.js"));
assert(indexSource.indexOf("town-stage-festival-map-packages.js") < indexSource.indexOf("src/ui/resident-map-panel.js"));
assert(indexSource.includes("v0.1.9-c · 清沟义工日地图包"));
assert(packageSource.includes("theme.registerMapPackage"));
assert(packageSource.includes("festivalId: \"rain_gutter_day\""));
assert(mapPanelSource.includes("day: engine.state.townState?.day || engine.state.day || playback?.day"));
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
  registeredPackages: [activeDayThree.mapPackage.id, gutterActive.mapPackage.id],
  phaseChecks: {
    seedSwap: [preparing.phase, activeDayThree.phase, activeDayFour.phase, cleanup.phase],
    rainGutterDay: [gutterPreparingDayEight.phase, gutterPreparingDayNine.phase, gutterActive.phase, gutterCleanup.phase]
  },
  mapSizes: {
    seedSwap: `${mapBuffer.readUInt32BE(16)}x${mapBuffer.readUInt32BE(20)}`,
    rainGutterDay: `${gutterMapBuffer.readUInt32BE(16)}x${gutterMapBuffer.readUInt32BE(20)}`
  }
}, null, 2));
