// test/cli.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../lib/cli.mjs";
import { loadConfig } from "../lib/config.mjs";

function withEnv(overrides, fn) {
  const saved = { ...process.env };
  Object.assign(process.env, { CLAUDE_CONFIG_DIR: mkdtempSync(join(tmpdir(), "cph-")), NO_COLOR: "1", ...overrides });
  return Promise.resolve(fn()).finally(() => { process.env = saved; });
}

test("theme sets config, unknown theme errors", async () => {
  await withEnv({}, async () => {
    assert.equal(await runCli(["theme", "matrix"]), 0);
    assert.equal(loadConfig().theme, "matrix");
    assert.equal(await runCli(["theme", "nope"]), 1);
  });
});
test("disable then enable a segment", async () => {
  await withEnv({}, async () => {
    await runCli(["disable", "clock"]);
    assert.ok(!loadConfig().segments.includes("clock"));
    await runCli(["enable", "clock"]);
    assert.ok(loadConfig().segments.includes("clock"));
  });
});
test("set coerces booleans and strings", async () => {
  await withEnv({}, async () => {
    await runCli(["set", "callsign", "GHOST"]);
    assert.equal(loadConfig().callsign, "GHOST");
  });
});
test("themes and preview and doctor return 0", async () => {
  await withEnv({}, async () => {
    assert.equal(await runCli(["themes"]), 0);
    assert.equal(await runCli(["preview"]), 0);
    assert.equal(await runCli(["doctor"]), 0);
  });
});
test("unknown command returns 1", async () => {
  await withEnv({}, async () => {
    assert.equal(await runCli(["wat"]), 1);
  });
});
