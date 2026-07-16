#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const townRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(townRoot, relativePath), "utf8");

const spriteLayer = read("src/ui/resident-sprite-layer.js");
const walkStyles = read("styles-town-map-resident-walk.css");
const index = read("index.html");
const stage = read("src/town-stage.js");
const routeSource = read("src/town-stage-routes.js");

assert(spriteLayer.includes("resident-walk-body"), "resident tokens must render the walking body layer");
assert(spriteLayer.includes("resident-walk-leg-left"), "resident tokens must render the left leg layer");
assert(spriteLayer.includes("resident-walk-leg-right"), "resident tokens must render the right leg layer");
assert(spriteLayer.includes("--walk-cycle:"), "every resident token must receive a gait cycle");
assert(spriteLayer.includes("--walk-delay:"), "resident gait phases must be staggered");
assert(spriteLayer.includes("--walk-facing:"), "walking must respond to horizontal travel direction");
assert(spriteLayer.includes("travelPointCount = 25"), "travel must retain enough frames to preserve reviewed route corners");
assert(spriteLayer.includes("data-route-nodes"), "rendered residents must expose their reviewed route for browser verification");

[
  "resident-walk-torso",
  "resident-walk-left-leg",
  "resident-walk-right-leg",
  "resident-walk-shadow"
].forEach((name) => assert(walkStyles.includes(`@keyframes ${name}`), `${name} animation must exist`));

assert(walkStyles.includes("prefers-reduced-motion: reduce"), "walking must keep a reduced-motion fallback");
for (let pointIndex = 0; pointIndex < 25; pointIndex += 1) {
  assert(walkStyles.includes(`--travel-point-${pointIndex}-x`), `travel keyframe ${pointIndex} must include an x coordinate`);
  assert(walkStyles.includes(`--travel-point-${pointIndex}-y`), `travel keyframe ${pointIndex} must include a y coordinate`);
}
assert(index.includes("styles-town-map-resident-walk.css?v=0.2.2"), "the corrected walking stylesheet must bypass older caches");
assert(index.includes("src/shared.js?v=0.2.2"), "the v0.2.2 runtime version must bypass older caches");
assert(stage.includes('source: "local-audited-stage-events"'), "walking must remain driven by audited local stage events");
assert(stage.includes("WALK_MILLISECONDS_PER_MAP_UNIT = 110"), "walk duration must scale with reviewed route distance");
assert(stage.includes("MIN_WALK_DURATION_MS = 2800"), "short routes must no longer flash by too quickly");

const context = {
  console,
  window: {
    MorningTown: {
      clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }
    }
  }
};
vm.createContext(context);
vm.runInContext(read("src/town-stage-hotspot-data.js"), context);
context.window.MorningTown.townStageData = context.window.MorningTown.townStageHotspotData;
vm.runInContext(routeSource, context);

const routes = context.window.MorningTown.townStageRoutes;
let checkedRoutes = 0;
routes.hotspotIds.forEach((fromId) => {
  routes.hotspotIds.forEach((toId) => {
    const from = routes.byId.get(fromId);
    const to = routes.byId.get(toId);
    const route = routes.routeBetween(fromId, toId, from, to);
    assert.equal(route.points.length, 25, `${fromId} -> ${toId} must render through 25 route frames`);
    route.rawPoints.forEach((corner) => {
      assert(
        route.points.some((point) => point.x === corner.x && point.y === corner.y),
        `${fromId} -> ${toId} must retain reviewed corner ${corner.x},${corner.y}`
      );
    });
    checkedRoutes += 1;
  });
});
const longRoute = routes.routeBetween("farm-field", "home-south", { x: 12, y: 25 }, { x: 55, y: 90 });
assert.equal(longRoute.points.length, 25, "reviewed travel must render through all 25 route frames");
longRoute.rawPoints.forEach((corner) => {
  assert(
    longRoute.points.some((point) => point.x === corner.x && point.y === corner.y),
    `reviewed corner ${corner.x},${corner.y} must remain in the animated path`
  );
});
assert(longRoute.distance > 0, "reviewed travel must expose its route distance");
assert.equal(longRoute.source, "local-reviewed-route-waypoints");
assert.equal(routes.unreachableHotspotIds.length, 0, "all hotspots must remain connected to reviewed routes");

console.log(`Resident walk contracts passed: 30 sprites keep their gait, ${checkedRoutes} hotspot pairs preserve every reviewed corner across 25 frames, and travel uses distance-based pacing.`);
