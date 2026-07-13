#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const townRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(townRoot, "src");
const maxLines = 300;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function lineCount(file) {
  const source = fs.readFileSync(file, "utf8").replace(/\r?\n$/, "");
  return source ? source.split(/\r?\n/).length : 0;
}

const sourceFiles = walk(sourceRoot).filter((file) => file.endsWith(".js"));
const styleFiles = fs.readdirSync(townRoot)
  .filter((name) => /^styles.*\.css$/.test(name))
  .map((name) => path.join(townRoot, name));
const results = [...sourceFiles, ...styleFiles]
  .map((file) => ({
    file: path.relative(townRoot, file),
    lines: lineCount(file)
  }))
  .sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file));
const oversized = results.filter((item) => item.lines > maxLines);

if (oversized.length) {
  oversized.forEach((item) => console.error(`${item.file}: ${item.lines} lines (limit ${maxLines})`));
  process.exit(1);
}

console.log(`Module boundary validation passed: ${results.length} files, each at most ${maxLines} lines.`);
console.log(`Largest active module: ${results[0].file} (${results[0].lines} lines).`);
