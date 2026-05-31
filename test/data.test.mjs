// test/data.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInput, countdown } from "../lib/data.mjs";

const base = {
  model: { display_name: "Opus" },
  workspace: { current_dir: "/home/u/projects/myapp" },
  version: "2.1.158",
  cost: { total_cost_usd: 0.0412, total_lines_added: 64, total_lines_removed: 9, total_duration_ms: 600000 },
  context_window: { used_percentage: 24, context_window_size: 200000 },
  rate_limits: {
    five_hour: { used_percentage: 15, resets_at: 1738425600 },
    seven_day: { used_percentage: 44, resets_at: 1738857600 },
  },
};

test("parseInput maps core fields", () => {
  const c = parseInput(base, { now: 1000, branch: "main" });
  assert.equal(c.model, "Opus");
  assert.equal(c.dir, "myapp");
  assert.equal(c.contextPct, 24);
  assert.equal(c.contextSize, 200000);
  assert.equal(c.cost, 0.0412);
  assert.equal(c.linesAdded, 64);
  assert.equal(c.linesRemoved, 9);
  assert.equal(c.branch, "main");
});

test("parseInput maps rate limits to fiveHour/weekly", () => {
  const c = parseInput(base, { now: 1000, branch: null });
  assert.deepEqual(c.fiveHour, { pct: 15, resetsAt: 1738425600 });
  assert.deepEqual(c.weekly, { pct: 44, resetsAt: 1738857600 });
});

test("parseInput rounds fractional percentages", () => {
  const input = {
    ...base,
    context_window: { used_percentage: 53.5, context_window_size: 200000 },
    rate_limits: {
      five_hour: { used_percentage: 54.00000001, resets_at: 1738425600 },
      seven_day: { used_percentage: 56.99999999999999, resets_at: 1738857600 },
    },
  };
  const c = parseInput(input, { now: 1000, branch: null });
  assert.equal(c.contextPct, 54);
  assert.equal(c.fiveHour.pct, 54);
  assert.equal(c.weekly.pct, 57);
});

test("parseInput returns null limits when absent", () => {
  const c = parseInput({ ...base, rate_limits: {} }, { now: 1, branch: null });
  assert.equal(c.fiveHour, null);
  assert.equal(c.weekly, null);
});

test("parseInput falls back to current_usage when used_percentage null", () => {
  const input = {
    ...base,
    context_window: {
      used_percentage: null,
      context_window_size: 200000,
      current_usage: { input_tokens: 10000, cache_creation_input_tokens: 5000, cache_read_input_tokens: 5000, output_tokens: 999 },
    },
  };
  const c = parseInput(input, { now: 1, branch: null });
  assert.equal(c.contextPct, 10); // (10000+5000+5000)/200000 = 10%
});

test("parseInput tolerates empty object", () => {
  const c = parseInput({}, { now: 1, branch: null });
  assert.equal(c.model, "Claude");
  assert.equal(c.contextPct, null);
  assert.equal(c.cost, null);
});

test("countdown formats hours and minutes", () => {
  const now = 1738420000 * 1000;
  assert.equal(countdown(1738420000 + 5400, now), "1h30m"); // 90 min
});
test("countdown formats days", () => {
  const now = 1738420000 * 1000;
  assert.equal(countdown(1738420000 + 2 * 86400 + 3600, now), "2d1h");
});
test("countdown past returns now", () => {
  assert.equal(countdown(1000, 2000 * 1000), "now");
});
test("countdown under a minute shows <1m", () => {
  const now = 1738420000 * 1000;
  assert.equal(countdown(1738420000 + 30, now), "<1m");
});
