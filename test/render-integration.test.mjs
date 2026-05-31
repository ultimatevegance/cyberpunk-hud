// test/render-integration.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, "..", "bin", "cyberpunk-hud.mjs");

function run(payload) {
  return execFileSync("node", [BIN], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", CLAUDE_CONFIG_DIR: __dirname + "/.tmpcfg" },
  });
}

test("renders a line from a full payload (NO_COLOR)", () => {
  const out = run({
    model: { display_name: "Opus" },
    workspace: { current_dir: "/home/u/myapp" },
    version: "2.1.158",
    cost: { total_cost_usd: 0.0412, total_lines_added: 64, total_lines_removed: 9 },
    context_window: { used_percentage: 24, context_window_size: 200000 },
    rate_limits: { five_hour: { used_percentage: 15, resets_at: 1738425600 }, seven_day: { used_percentage: 44, resets_at: 1738857600 } },
  });
  assert.ok(out.includes("OPUS"));
  assert.ok(out.includes("24%"));
  assert.ok(out.includes("15%"));
  assert.ok(out.includes("44%"));
});

test("never crashes on empty/garbage stdin", () => {
  const out = execFileSync("node", [BIN], { input: "not json", encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  assert.ok(typeof out === "string"); // prints fallback, exit 0
});
