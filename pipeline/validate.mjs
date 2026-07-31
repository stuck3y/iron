#!/usr/bin/env node
// Validates a generated month folder against PLAN_CONVENTIONS.md rules.
// Usage: node pipeline/validate.mjs <month-dir>   (e.g. node pipeline/validate.mjs september)

import { readFileSync, existsSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import vm from "node:vm";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node pipeline/validate.mjs <month-dir>");
  process.exit(1);
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const errors = [];
const monthName = basename(resolve(dir)).toLowerCase();

const configPath = join(dir, "config.js");
if (!existsSync(configPath)) { console.error("FAIL: missing " + configPath); process.exit(1); }
if (!existsSync(join(dir, "index.html"))) errors.push("missing index.html");

let P;
try {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(configPath, "utf8"), sandbox, { timeout: 2000 });
  P = sandbox.window.PLAN;
} catch (e) {
  console.error("FAIL: config.js did not execute: " + e.message);
  process.exit(1);
}
if (!P || typeof P !== "object") { console.error("FAIL: window.PLAN not set"); process.exit(1); }

// Schema presence
for (const f of ["title", "title_es", "title_fr", "subtitle", "subtitle_es", "subtitle_fr", "storageKey", "startDate", "totalDays"]) {
  if (!P[f]) errors.push("missing field: " + f);
}
if (!Array.isArray(P.days)) errors.push("days is not an array");
if (!P.verses || typeof P.verses !== "object") errors.push("verses is not an object");
if (!Array.isArray(P.checks) || P.checks.length === 0) errors.push("checks missing/empty");

// Days
const days = P.days || [];
if (days.length < 28 || days.length > 31) errors.push("day count out of range: " + days.length);
if (P.totalDays !== days.length) errors.push("totalDays (" + P.totalDays + ") != days.length (" + days.length + ")");
days.forEach((d, i) => {
  if (d.day !== i + 1) errors.push("day " + (i + 1) + " has day=" + d.day);
  for (const f of ["reading", "topic", "topic_es", "topic_fr", "summary", "summary_es", "summary_fr"]) {
    if (!d[f] || !String(d[f]).trim()) errors.push("day " + d.day + " missing " + f);
  }
});
if (days[0] && days[0].ph !== 1) errors.push("day 1 must have ph:1");

// Verses <-> phases
const phDays = days.filter((d) => d.ph).map((d) => d.day);
for (const key of Object.keys(P.verses || {})) {
  if (!phDays.includes(Number(key))) errors.push("verses key " + key + " is not a ph day");
  const v = P.verses[key];
  for (const f of ["r", "r_es", "r_fr", "t", "t_es", "t_fr"]) {
    if (!v[f] || !String(v[f]).trim()) errors.push("verse " + key + " missing " + f);
  }
}
for (const d of phDays) {
  if (!P.verses[d]) errors.push("ph day " + d + " has no memory verse");
}

// Checks
for (const c of P.checks || []) {
  for (const f of ["k", "l", "l_es", "l_fr"]) {
    if (!c[f] || !String(c[f]).trim()) errors.push("check missing " + f);
  }
}

// storageKey / startDate / folder agreement
if (MONTHS.includes(monthName)) {
  if (P.storageKey !== "isi-" + monthName + "-v1") errors.push("storageKey should be isi-" + monthName + "-v1, got " + P.storageKey);
  const sd = String(P.startDate || "");
  const m = sd.match(/^(\d{4})-(\d{2})-01$/);
  if (!m) errors.push("startDate must be YYYY-MM-01, got " + sd);
  else if (MONTHS[Number(m[2]) - 1] !== monthName) errors.push("startDate month " + m[2] + " does not match folder " + monthName);
} else {
  console.log("note: '" + monthName + "' is not a month name — skipping storageKey/startDate folder checks");
}

// Injection guard: no "<" anywhere in string content
(function scan(node, path) {
  if (typeof node === "string") {
    if (node.includes("<")) errors.push('forbidden "<" in ' + path + ": " + node.slice(0, 60));
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => scan(v, path + "[" + i + "]"));
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) scan(v, path + "." + k);
  }
})(P, "PLAN");

if (errors.length) {
  console.error("FAIL: " + errors.length + " problem(s):\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("OK: " + configPath + " valid (" + days.length + " days, phases at " + phDays.join(",") + ")");
