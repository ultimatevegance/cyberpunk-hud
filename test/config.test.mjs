// test/config.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULTS, ALL_SEGMENTS, mergeConfig, loadConfig, saveConfig, configPath } from "../lib/config.mjs";

test("mergeConfig with no user returns defaults clone", () => {
  const c = mergeConfig(null);
  assert.equal(c.theme, "netrun");
  assert.deepEqual(c.segments, DEFAULTS.segments);
});
test("mergeConfig filters unknown segments and dedupes", () => {
  const c = mergeConfig({ segments: ["model", "bogus", "model", "context"] });
  assert.deepEqual(c.segments, ["model", "context"]);
});
test("mergeConfig empty segments falls back to defaults", () => {
  const c = mergeConfig({ segments: ["bogus"] });
  assert.deepEqual(c.segments, DEFAULTS.segments);
});
test("mergeConfig deep-merges animation", () => {
  const c = mergeConfig({ animation: { glitch: false } });
  assert.equal(c.animation.glitch, false);
  assert.equal(c.animation.enabled, true); // default preserved
});
test("ALL_SEGMENTS includes the limit gauges", () => {
  assert.ok(ALL_SEGMENTS.includes("fiveHour"));
  assert.ok(ALL_SEGMENTS.includes("weekly"));
});
test("loadConfig + saveConfig round-trip via CLAUDE_CONFIG_DIR", () => {
  const dir = mkdtempSync(join(tmpdir(), "cph-"));
  const env = { CLAUDE_CONFIG_DIR: dir };
  const cfg = mergeConfig({ theme: "matrix" });
  const p = saveConfig(cfg, env);
  assert.equal(p, configPath(env));
  const loaded = loadConfig(env);
  assert.equal(loaded.theme, "matrix");
});
test("loadConfig returns defaults when file missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "cph-"));
  const loaded = loadConfig({ CLAUDE_CONFIG_DIR: dir });
  assert.equal(loaded.theme, "netrun");
});
