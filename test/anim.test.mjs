// test/anim.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { pulse, shimmerIndex, spinner, glitchOn, glitchChar, marquee } from "../lib/anim.mjs";

test("pulse stays within [min,max] and is deterministic", () => {
  const a = pulse(1000, 2600, 0.6, 1);
  const b = pulse(1000, 2600, 0.6, 1);
  assert.equal(a, b);
  assert.ok(a >= 0.6 && a <= 1);
});
test("shimmerIndex within width", () => {
  for (let now = 0; now < 5000; now += 137) {
    const i = shimmerIndex(now, 8, 1200);
    assert.ok(i >= 0 && i < 8);
  }
});
test("shimmerIndex width 0 returns -1", () => {
  assert.equal(shimmerIndex(123, 0), -1);
});
test("spinner cycles through frames", () => {
  const f0 = spinner(0, 120);
  const f1 = spinner(120, 120);
  assert.notEqual(f0, f1);
});
test("spinner wraps after a full cycle", () => {
  assert.equal(spinner(0, 120), spinner(10 * 120, 120)); // 10 = number of spinner frames
});
test("glitchOn is deterministic for a given now", () => {
  assert.equal(glitchOn(500, 0), glitchOn(500, 0));
});
test("glitchChar returns one char from set", () => {
  const c = glitchChar(333, 1);
  assert.equal([...c].length, 1);
});
test("marquee returns window of exact width when text is long", () => {
  const out = marquee("abcdefghij", 5, 0, 220);
  assert.equal([...out].length, 5);
});
test("marquee pads short text to width", () => {
  assert.equal(marquee("ab", 5, 0), "ab   ");
});
