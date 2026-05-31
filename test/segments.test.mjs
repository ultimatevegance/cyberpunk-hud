// test/segments.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { SEGMENTS } from "../lib/segments.mjs";
import { mergeConfig } from "../lib/config.mjs";
import { resolveTheme } from "../lib/themes.mjs";
import { paint } from "../lib/color.mjs";

const cfg = mergeConfig(null);
// kit with color mode "none" so output is plain text for easy assertions
function kit(animMode = "idle") {
  const theme = resolveTheme(cfg.theme);
  return { mode: "none", theme, now: 1000, animMode, P: (rgb, s, b) => paint(rgb, s, "none", b) };
}
const fullCtx = {
  now: 1000, model: "Opus", dir: "myapp", cwd: "/x/myapp", branch: "main",
  contextPct: 24, contextSize: 200000,
  fiveHour: { pct: 15, resetsAt: null }, weekly: { pct: 44, resetsAt: null },
  cost: 0.0412, linesAdded: 64, linesRemoved: 9, durationMs: 600000, version: "2.1.158", sessionId: "s1",
};

test("model renders uppercased name in brackets", () => {
  assert.equal(SEGMENTS.model(fullCtx, cfg, kit()), "⟨OPUS⟩");
});
test("dir renders basename", () => {
  assert.ok(SEGMENTS.dir(fullCtx, cfg, kit()).includes("myapp"));
});
test("git renders branch, null when absent", () => {
  assert.ok(SEGMENTS.git(fullCtx, cfg, kit()).includes("main"));
  assert.equal(SEGMENTS.git({ ...fullCtx, branch: null }, cfg, kit()), null);
});
test("context renders percentage, null when contextPct null", () => {
  assert.ok(SEGMENTS.context(fullCtx, cfg, kit()).includes("24%"));
  assert.equal(SEGMENTS.context({ ...fullCtx, contextPct: null }, cfg, kit()), null);
});
test("fiveHour and weekly render percent, null when absent", () => {
  assert.ok(SEGMENTS.fiveHour(fullCtx, cfg, kit()).includes("15%"));
  assert.ok(SEGMENTS.weekly(fullCtx, cfg, kit()).includes("44%"));
  assert.equal(SEGMENTS.fiveHour({ ...fullCtx, fiveHour: null }, cfg, kit()), null);
});
test("limit segment shows countdown when resetsAt present", () => {
  const ctx = { ...fullCtx, now: 0, fiveHour: { pct: 15, resetsAt: 5400 } }; // 90 min
  assert.ok(SEGMENTS.fiveHour(ctx, cfg, kit()).includes("↻1h30m"));
});
test("cost renders dollars, null when absent", () => {
  assert.equal(SEGMENTS.cost(fullCtx, cfg, kit()), "$0.041");
  assert.equal(SEGMENTS.cost({ ...fullCtx, cost: null }, cfg, kit()), null);
});
test("lines renders +/-", () => {
  assert.equal(SEGMENTS.lines(fullCtx, cfg, kit()), "+64/-9");
});
test("callsign includes label", () => {
  assert.ok(SEGMENTS.callsign(fullCtx, cfg, kit()).includes("NETRUN"));
});
test("clock renders HH:MM", () => {
  assert.match(SEGMENTS.clock(fullCtx, cfg, kit()), /\d{2}:\d{2}/);
});
test("context bar is 8 cells of block chars", () => {
  const out = SEGMENTS.context(fullCtx, cfg, kit());
  const blocks = [...out].filter((ch) => ch === "█" || ch === "░").length;
  assert.equal(blocks, 8);
});
test("git marquees a long branch only when active", () => {
  const long = "feature/a-really-long-branch-name-indeed";
  const idle = SEGMENTS.git({ ...fullCtx, branch: long }, cfg, kit());
  assert.ok(idle.includes(long)); // full text when idle
  const active = SEGMENTS.git({ ...fullCtx, branch: long }, cfg, kit("active"));
  assert.ok(active.length < ("⎇ " + long).length); // windowed when active
});
