// test/color.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectMode, rgbTo256, fg, paint, interp, gradient, brightness } from "../lib/color.mjs";

test("detectMode honors NO_COLOR", () => {
  assert.equal(detectMode({ NO_COLOR: "1" }), "none");
});
test("detectMode truecolor via COLORTERM", () => {
  assert.equal(detectMode({ COLORTERM: "truecolor" }), "truecolor");
});
test("detectMode 256 via TERM", () => {
  assert.equal(detectMode({ TERM: "xterm-256color" }), "256");
});
test("detectMode explicit override", () => {
  assert.equal(detectMode({ CYBERPUNK_HUD_COLOR: "none" }), "none");
});
test("paint none returns raw text", () => {
  assert.equal(paint([255, 0, 0], "hi", "none"), "hi");
});
test("paint truecolor wraps with escape + reset", () => {
  assert.equal(paint([1, 2, 3], "x", "truecolor"), "\x1b[38;2;1;2;3mx\x1b[0m");
});
test("fg none is empty", () => {
  assert.equal(fg([1, 2, 3], "none"), "");
});
test("interp midpoint", () => {
  assert.deepEqual(interp([0, 0, 0], [10, 20, 30], 0.5), [5, 10, 15]);
});
test("gradient endpoints", () => {
  const stops = [[0, 0, 0], [100, 100, 100], [200, 200, 200]];
  assert.deepEqual(gradient(stops, 0), [0, 0, 0]);
  assert.deepEqual(gradient(stops, 1), [200, 200, 200]);
});
test("brightness clamps to 255", () => {
  assert.deepEqual(brightness([200, 200, 200], 2), [255, 255, 255]);
});
test("rgbTo256 maps pure red into 16..231 range", () => {
  const v = rgbTo256([255, 0, 0]);
  assert.ok(v >= 16 && v <= 231);
});
