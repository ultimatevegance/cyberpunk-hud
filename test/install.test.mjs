// test/install.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { setup, restore, wrapperPath, settingsPath } from "../lib/install.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function tmpEnv() {
  const dir = mkdtempSync(join(tmpdir(), "cph-"));
  return { CLAUDE_CONFIG_DIR: dir };
}

test("setup writes wrapper and points statusLine at it", () => {
  const env = tmpEnv();
  setup(env);
  assert.ok(existsSync(wrapperPath(env)));
  const settings = JSON.parse(readFileSync(settingsPath(env), "utf8"));
  assert.equal(settings.statusLine.type, "command");
  assert.ok(settings.statusLine.command.includes("cyberpunk-hud/statusline.mjs"));
});

test("setup backs up a foreign previous statusLine; restore reverts to it", () => {
  const env = tmpEnv();
  mkdirSync(env.CLAUDE_CONFIG_DIR, { recursive: true });
  writeFileSync(settingsPath(env), JSON.stringify({ statusLine: { type: "command", command: "node /old/omc-hud.mjs" }, model: "opus" }, null, 2));
  setup(env);
  let settings = JSON.parse(readFileSync(settingsPath(env), "utf8"));
  assert.ok(settings.statusLine.command.includes("cyberpunk-hud"));
  assert.equal(settings.model, "opus"); // other keys preserved
  restore(env);
  settings = JSON.parse(readFileSync(settingsPath(env), "utf8"));
  assert.equal(settings.statusLine.command, "node /old/omc-hud.mjs");
});

test("wrapper is valid JS that exits 0 with empty stdin", async () => {
  const env = tmpEnv();
  setup(env);
  const { execFileSync } = await import("node:child_process");
  // Wrapper resolves the renderer from CYBERPUNK_HUD_ROOT (this repo).
  // Use fileURLToPath (not import.meta.dirname, which requires Node 20.11+) to honor engines >=18.
  const root = join(__dirname, "..");
  const out = execFileSync("node", [wrapperPath(env)], {
    input: "{}", encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", CYBERPUNK_HUD_ROOT: root, CLAUDE_CONFIG_DIR: env.CLAUDE_CONFIG_DIR },
  });
  assert.ok(typeof out === "string");
});
