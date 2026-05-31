// test/state.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { activityMode } from "../lib/state.mjs";

test("first observation is active", () => {
  const env = { CLAUDE_CONFIG_DIR: mkdtempSync(join(tmpdir(), "cph-")) };
  const ctx = { sessionId: "s1", now: 1000, contextPct: 10, cost: 0.01 };
  assert.equal(activityMode(ctx, env), "active");
});
test("changed values are active; unchanged past window are idle", () => {
  const env = { CLAUDE_CONFIG_DIR: mkdtempSync(join(tmpdir(), "cph-")) };
  activityMode({ sessionId: "s2", now: 1000, contextPct: 10, cost: 0.01 }, env);
  // change -> active
  assert.equal(activityMode({ sessionId: "s2", now: 1500, contextPct: 12, cost: 0.02 }, env), "active");
  // unchanged but within window -> active
  assert.equal(activityMode({ sessionId: "s2", now: 2000, contextPct: 12, cost: 0.02 }, env, 3500), "active");
  // unchanged and far past last change -> idle
  assert.equal(activityMode({ sessionId: "s2", now: 999999, contextPct: 12, cost: 0.02 }, env, 3500), "idle");
});
test("never throws on bad config dir", () => {
  assert.equal(activityMode({ sessionId: "s3", now: 1, contextPct: 1, cost: 0 }, { CLAUDE_CONFIG_DIR: "/proc/nonexistent/\0bad" }), "idle");
});
