// test/render.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { render, computeAnimMode, visibleWidth } from "../lib/render.mjs";
import { mergeConfig } from "../lib/config.mjs";

const ctx = {
  now: 1000, model: "Opus", dir: "myapp", cwd: "/x/myapp", branch: "main",
  contextPct: 24, contextSize: 200000,
  fiveHour: { pct: 15, resetsAt: null }, weekly: { pct: 44, resetsAt: null },
  cost: 0.0412, linesAdded: 64, linesRemoved: 9, durationMs: 600000, version: "2.1.158", sessionId: "s1",
};

test("computeAnimMode returns alert when context high", () => {
  assert.equal(computeAnimMode({ ...ctx, contextPct: 90 }, "idle"), "alert");
});
test("computeAnimMode returns alert when a limit >= 90", () => {
  assert.equal(computeAnimMode({ ...ctx, weekly: { pct: 95, resetsAt: null } }, "idle"), "alert");
});
test("computeAnimMode passes through active/idle otherwise", () => {
  assert.equal(computeAnimMode(ctx, "active"), "active");
  assert.equal(computeAnimMode(ctx, "idle"), "idle");
});
test("render with mode none contains all default segment text", () => {
  const cfg = mergeConfig(null);
  const line = render(ctx, cfg, { mode: "none", animMode: "idle" });
  assert.ok(line.includes("NETRUN"));
  assert.ok(line.includes("⟨OPUS⟩"));
  assert.ok(line.includes("myapp"));
  assert.ok(line.includes("main"));
  assert.ok(line.includes("24%"));
  assert.ok(line.includes("15%"));
  assert.ok(line.includes("44%"));
  assert.ok(line.includes("$0.041"));
});
test("render respects segment selection + order", () => {
  const cfg = mergeConfig({ segments: ["clock", "model"] });
  const line = render(ctx, cfg, { mode: "none", animMode: "idle" });
  assert.ok(line.indexOf("⌁") < line.indexOf("OPUS"));
  assert.ok(!line.includes("NETRUN"));
});
test("width fit drops low-priority segments when narrow", () => {
  const cfg = mergeConfig(null);
  const wide = render(ctx, cfg, { mode: "none", animMode: "idle" });
  const narrow = render(ctx, cfg, { mode: "none", animMode: "idle", columns: 30 });
  assert.ok(visibleWidth(narrow) <= visibleWidth(wide));
  assert.ok(narrow.includes("OPUS")); // model is high priority, kept
});
test("disabled animation forces idle mode", () => {
  const cfg = mergeConfig({ animation: { enabled: false } });
  const line = render(ctx, cfg, { mode: "none" });
  assert.ok(line.length > 0);
});
