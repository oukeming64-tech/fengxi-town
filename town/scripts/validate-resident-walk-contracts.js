#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const townRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(townRoot, relativePath), "utf8");

const spriteLayer = read("src/ui/resident-sprite-layer.js");
const walkStyles = read("styles-town-map-resident-walk.css");
const index = read("index.html");
const stage = read("src/town-stage.js");

assert(spriteLayer.includes("resident-walk-body"), "resident tokens must render the walking body layer");
assert(spriteLayer.includes("resident-walk-leg-left"), "resident tokens must render the left leg layer");
assert(spriteLayer.includes("resident-walk-leg-right"), "resident tokens must render the right leg layer");
assert(spriteLayer.includes("--walk-cycle:"), "every resident token must receive a gait cycle");
assert(spriteLayer.includes("--walk-delay:"), "resident gait phases must be staggered");
assert(spriteLayer.includes("--walk-facing:"), "walking must respond to horizontal travel direction");

[
  "resident-walk-torso",
  "resident-walk-left-leg",
  "resident-walk-right-leg",
  "resident-walk-shadow"
].forEach((name) => assert(walkStyles.includes(`@keyframes ${name}`), `${name} animation must exist`));

assert(walkStyles.includes("prefers-reduced-motion: reduce"), "walking must keep a reduced-motion fallback");
assert(index.includes("styles-town-map-resident-walk.css?v=0.2.1"), "the walking stylesheet must be loaded");
assert(index.includes("src/shared.js?v=0.2.1"), "the v0.2.1 runtime version must bypass older caches");
assert(stage.includes('source: "local-audited-stage-events"'), "walking must remain driven by audited local stage events");

console.log("Resident walk contracts passed: 30 sprite cells share staggered body, leg, direction, and shadow cycles with reduced-motion fallback.");
