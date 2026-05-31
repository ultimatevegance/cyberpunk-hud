// test/themes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { THEMES, resolveTheme } from "../lib/themes.mjs";

test("all themes define required tokens", () => {
  const tokens = ["accent", "accent2", "ok", "warn", "crit", "dim", "ink"];
  for (const name of Object.keys(THEMES)) {
    for (const t of tokens) {
      assert.ok(Array.isArray(THEMES[name][t]), `${name}.${t} must be rgb`);
      assert.equal(THEMES[name][t].length, 3);
    }
  }
});
test("resolveTheme unknown name falls back to netrun", () => {
  assert.deepEqual(resolveTheme("does-not-exist"), THEMES.netrun);
});
test("resolveTheme applies overrides", () => {
  const t = resolveTheme("netrun", { accent: [1, 2, 3] });
  assert.deepEqual(t.accent, [1, 2, 3]);
});
