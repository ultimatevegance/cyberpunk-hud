# cyberpunk-hud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a neon, animated, customizable Claude Code status-line plugin with live 5-hour & weekly usage gauges, themes, per-element visibility, one-command setup, and GitHub + marketplace distribution.

**Architecture:** Zero-dependency Node ESM package, no build step. A dual-mode entry (`bin/cyberpunk-hud.mjs`) renders one frame when stdin is piped (status-line invocation) and acts as a config CLI when given argv. Logic is split into focused `lib/` modules. Animation effects are pure functions of `Date.now()` (Claude Code re-invokes the command ~3fps). A bundled slash command drives the CLI; a generated resolver wrapper wires `settings.json` and survives plugin updates.

**Tech Stack:** Node.js ≥18 (ESM, `node:test`, `node:fs`, `node:os`, `node:path`), ANSI truecolor, Claude Code plugin + marketplace manifests, GitHub Actions CI.

**Working directory:** `~/Career/SideProjects/cyberpunk-hud` (git repo already initialized, branch `main`, contains `docs/superpowers/specs/2026-05-31-cyberpunk-hud-design.md`).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` | Package metadata, `type:module`, `bin`, `test` script |
| `bin/cyberpunk-hud.mjs` | Entry: piped stdin → render; argv → CLI. Never throws. |
| `lib/color.mjs` | ANSI color mode detection, paint, gradient/interp/brightness |
| `lib/anim.mjs` | Pure `f(now)` effects: pulse, shimmer, spinner, glitch, marquee |
| `lib/data.mjs` | Normalize stdin → `Ctx`; git branch from `.git/HEAD`; reset countdown |
| `lib/themes.mjs` | Named palettes + `resolveTheme` |
| `lib/config.mjs` | Defaults, paths, load/merge/validate/save |
| `lib/segments.mjs` | Segment registry; each renders a string or `null` |
| `lib/render.mjs` | Compose enabled segments, separators, width fit, anim mode |
| `lib/state.mjs` | Best-effort per-session activity detection (adaptive motion) |
| `lib/install.mjs` | `setup`/`restore`: write resolver wrapper, edit `settings.json` |
| `lib/cli.mjs` | CLI subcommand dispatch |
| `commands/cyberpunk-hud.md` | `/cyberpunk-hud` slash command → drives the CLI |
| `.claude-plugin/plugin.json` | Plugin manifest |
| `.claude-plugin/marketplace.json` | Marketplace entry (`source: "./"`) |
| `.github/workflows/test.yml` | CI: `node --test` |
| `README.md` / `LICENSE` / `CHANGELOG.md` | Docs + license |
| `test/*.test.mjs` | Unit tests per module |

**Data contract — `Ctx`** (produced by `parseInput`, consumed by segments):
```
{ now:number, model:string, dir:string, cwd:string, branch:string|null,
  contextPct:number|null, contextSize:number,
  fiveHour:{pct:number,resetsAt:number|null}|null,
  weekly:{pct:number,resetsAt:number|null}|null,
  cost:number|null, linesAdded:number, linesRemoved:number,
  durationMs:number|null, version:string|null, sessionId:string|null }
```

---

## Task 1: Scaffold project

**Files:**
- Create: `package.json`, `.gitignore`, `LICENSE`, `bin/`, `lib/`, `test/`, `commands/`, `.claude-plugin/`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "cyberpunk-hud",
  "version": "0.1.0",
  "description": "Neon, animated, customizable status line for Claude Code with live 5-hour & weekly usage gauges.",
  "type": "module",
  "bin": { "cyberpunk-hud": "bin/cyberpunk-hud.mjs" },
  "scripts": { "test": "node --test" },
  "license": "MIT",
  "engines": { "node": ">=18" },
  "keywords": ["claude-code", "statusline", "hud", "cyberpunk", "neon", "theme"],
  "repository": { "type": "git", "url": "https://github.com/ultimatevegance/cyberpunk-hud.git" },
  "files": ["bin", "lib", "commands", ".claude-plugin", "README.md", "LICENSE"]
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
*.log
.DS_Store
```

- [ ] **Step 3: Create `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 ultimatevegance

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Create directories**

Run: `mkdir -p bin lib test commands .claude-plugin .github/workflows`
Expected: directories created.

- [ ] **Step 5: Verify Node and test runner work**

Run: `node --version && node --test 2>&1 | tail -3`
Expected: Node ≥ v18 prints; `node --test` reports `tests 0` (no tests yet) and exits 0.

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore LICENSE
git commit -m "chore: scaffold cyberpunk-hud package"
```

---

## Task 2: `lib/color.mjs` — ANSI color

**Files:**
- Create: `lib/color.mjs`
- Test: `test/color.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/color.test.mjs`
Expected: FAIL — `Cannot find module '../lib/color.mjs'`.

- [ ] **Step 3: Write `lib/color.mjs`**

```javascript
// lib/color.mjs
const ESC = "\x1b[";

export function detectMode(env = process.env) {
  if (env.NO_COLOR != null && env.NO_COLOR !== "") return "none";
  if (env.CYBERPUNK_HUD_COLOR) return env.CYBERPUNK_HUD_COLOR; // truecolor|256|none
  if (env.TERM === "dumb") return "none";
  const ct = (env.COLORTERM || "").toLowerCase();
  if (ct.includes("truecolor") || ct.includes("24bit")) return "truecolor";
  if ((env.TERM || "").includes("256")) return "256";
  return "truecolor";
}

export function rgbTo256([r, g, b]) {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  const f = (v) => Math.round((v / 255) * 5);
  return 16 + 36 * f(r) + 6 * f(g) + f(b);
}

export function fg(rgb, mode = "truecolor") {
  if (mode === "none") return "";
  if (mode === "256") return `${ESC}38;5;${rgbTo256(rgb)}m`;
  return `${ESC}38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
}

export function paint(rgb, s, mode = "truecolor", boldOn = false) {
  if (mode === "none") return s;
  const b = boldOn ? `${ESC}1m` : "";
  return `${fg(rgb, mode)}${b}${s}${ESC}0m`;
}

export function interp(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export function gradient(stops, t) {
  t = Math.max(0, Math.min(1, t));
  if (stops.length === 1) return stops[0];
  const seg = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  return interp(stops[i], stops[i + 1], seg - i);
}

export function brightness(rgb, factor) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return [clamp(rgb[0]), clamp(rgb[1]), clamp(rgb[2])];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/color.test.mjs`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add lib/color.mjs test/color.test.mjs
git commit -m "feat: ANSI color module with mode detection and gradients"
```

---

## Task 3: `lib/anim.mjs` — time-driven effects

**Files:**
- Create: `lib/anim.mjs`
- Test: `test/anim.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/anim.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/anim.mjs`**

```javascript
// lib/anim.mjs
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function pulse(now, periodMs = 2600, min = 0.6, max = 1) {
  const phase = (now % periodMs) / periodMs;
  const wave = (Math.sin(phase * Math.PI * 2) + 1) / 2; // 0..1
  return min + (max - min) * wave;
}

export function shimmerIndex(now, width, periodMs = 1200) {
  if (width <= 0) return -1;
  const phase = (now % periodMs) / periodMs;
  return Math.floor(phase * width) % width;
}

export function spinner(now, frameMs = 120, frames = SPINNER) {
  return frames[Math.floor(now / frameMs) % frames.length];
}

export function glitchOn(now, seed = 0, periodMs = 1800, windowMs = 140) {
  return ((now + seed * 137) % periodMs) < windowMs;
}

export function glitchChar(now, seed = 0, chars = "▒░▓#%&") {
  const arr = [...chars];
  const i = (Math.floor(now / 60) + seed * 7) % arr.length;
  return arr[(i + arr.length) % arr.length];
}

export function marquee(text, width, now, stepMs = 220) {
  const chars = [...text];
  if (chars.length <= width) return text + " ".repeat(width - chars.length);
  const padded = [...chars, " ", " ", " "];
  const off = Math.floor(now / stepMs) % padded.length;
  const doubled = [...padded, ...padded];
  return doubled.slice(off, off + width).join("");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/anim.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/anim.mjs test/anim.test.mjs
git commit -m "feat: pure time-driven animation effects"
```

---

## Task 4: `lib/data.mjs` — normalize stdin

**Files:**
- Create: `lib/data.mjs`
- Test: `test/data.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/data.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/data.mjs`**

```javascript
// lib/data.mjs
import { readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";

export function parseInput(input, opts = {}) {
  const now = opts.now ?? Date.now();
  const cwd = input?.workspace?.current_dir || input?.cwd || opts.cwd || "";
  const cw = input?.context_window || {};

  let contextPct = typeof cw.used_percentage === "number" ? cw.used_percentage : null;
  if (contextPct == null && cw.current_usage) {
    const u = cw.current_usage;
    const used = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
    const size = cw.context_window_size || 200000;
    if (used > 0) contextPct = Math.round((used / size) * 100);
  }

  const rl = input?.rate_limits || {};
  const win = (w) =>
    w && typeof w.used_percentage === "number"
      ? { pct: w.used_percentage, resetsAt: typeof w.resets_at === "number" ? w.resets_at : null }
      : null;

  const cost = input?.cost || {};
  const branch = opts.branch !== undefined ? opts.branch : gitBranchFromHead(cwd);

  return {
    now,
    model: input?.model?.display_name || "Claude",
    dir: cwd ? basename(cwd) : "",
    cwd,
    branch,
    contextPct,
    contextSize: cw.context_window_size || 200000,
    fiveHour: win(rl.five_hour),
    weekly: win(rl.seven_day),
    cost: typeof cost.total_cost_usd === "number" ? cost.total_cost_usd : null,
    linesAdded: cost.total_lines_added || 0,
    linesRemoved: cost.total_lines_removed || 0,
    durationMs: typeof cost.total_duration_ms === "number" ? cost.total_duration_ms : null,
    version: input?.version || null,
    sessionId: input?.session_id || null,
  };
}

export function gitBranchFromHead(startDir) {
  let dir = startDir;
  for (let depth = 0; depth < 30 && dir; depth++) {
    const gitPath = join(dir, ".git");
    if (existsSync(gitPath)) {
      try {
        let gitDir = gitPath;
        if (statSync(gitPath).isFile()) {
          const m = readFileSync(gitPath, "utf8").match(/gitdir:\s*(.+)/);
          if (m) gitDir = join(dir, m[1].trim());
        }
        const head = readFileSync(join(gitDir, "HEAD"), "utf8").trim();
        const ref = head.match(/ref:\s*refs\/heads\/(.+)/);
        return ref ? ref[1] : head.slice(0, 7);
      } catch {
        return null;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function countdown(resetsAtEpochSec, now = Date.now()) {
  if (!resetsAtEpochSec) return "";
  const ms = resetsAtEpochSec * 1000 - now;
  if (ms <= 0) return "now";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d${h > 0 ? h + "h" : ""}`;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/data.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/data.mjs test/data.test.mjs
git commit -m "feat: normalize status-line stdin into Ctx + reset countdown"
```

---

## Task 5: `lib/themes.mjs` — palettes

**Files:**
- Create: `lib/themes.mjs`
- Test: `test/themes.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/themes.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/themes.mjs`**

```javascript
// lib/themes.mjs
export const THEMES = {
  netrun: {
    accent: [255, 46, 160], accent2: [0, 229, 255],
    ok: [57, 255, 130], warn: [255, 196, 64], crit: [255, 64, 96],
    dim: [110, 96, 150], ink: [150, 140, 180],
  },
  synthwave: {
    accent: [255, 84, 201], accent2: [123, 97, 255],
    ok: [88, 255, 221], warn: [255, 179, 71], crit: [255, 71, 109],
    dim: [120, 90, 160], ink: [200, 170, 220],
  },
  matrix: {
    accent: [57, 255, 20], accent2: [0, 200, 80],
    ok: [57, 255, 20], warn: [200, 255, 80], crit: [255, 120, 60],
    dim: [40, 120, 40], ink: [120, 200, 120],
  },
  vapor: {
    accent: [255, 113, 206], accent2: [1, 205, 254],
    ok: [5, 255, 161], warn: [255, 231, 107], crit: [255, 113, 113],
    dim: [120, 110, 160], ink: [185, 103, 255],
  },
  ice: {
    accent: [120, 220, 255], accent2: [0, 150, 255],
    ok: [120, 255, 220], warn: [255, 225, 140], crit: [255, 110, 140],
    dim: [90, 120, 150], ink: [170, 200, 230],
  },
};

export function resolveTheme(name, overrides = {}) {
  const base = THEMES[name] || THEMES.netrun;
  return { ...base, ...overrides };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/themes.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/themes.mjs test/themes.test.mjs
git commit -m "feat: theme palettes (netrun, synthwave, matrix, vapor, ice)"
```

---

## Task 6: `lib/config.mjs` — config load/merge/validate

**Files:**
- Create: `lib/config.mjs`
- Test: `test/config.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// test/config.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULTS, ALL_SEGMENTS, mergeConfig, loadConfig, saveConfig, configPath } from "../lib/config.mjs";

test("mergeConfig with no user returns defaults clone", () => {
  const c = mergeConfig(null);
  assert.equal(c.theme, "netrun");
  assert.deepEqual(c.segments, DEFAULTS.segments);
});
test("mergeConfig filters unknown segments and dedupes", () => {
  const c = mergeConfig({ segments: ["model", "bogus", "model", "context"] });
  assert.deepEqual(c.segments, ["model", "context"]);
});
test("mergeConfig empty segments falls back to defaults", () => {
  const c = mergeConfig({ segments: ["bogus"] });
  assert.deepEqual(c.segments, DEFAULTS.segments);
});
test("mergeConfig deep-merges animation", () => {
  const c = mergeConfig({ animation: { glitch: false } });
  assert.equal(c.animation.glitch, false);
  assert.equal(c.animation.enabled, true); // default preserved
});
test("ALL_SEGMENTS includes the limit gauges", () => {
  assert.ok(ALL_SEGMENTS.includes("fiveHour"));
  assert.ok(ALL_SEGMENTS.includes("weekly"));
});
test("loadConfig + saveConfig round-trip via CLAUDE_CONFIG_DIR", () => {
  const dir = mkdtempSync(join(tmpdir(), "cph-"));
  const env = { CLAUDE_CONFIG_DIR: dir };
  const cfg = mergeConfig({ theme: "matrix" });
  const p = saveConfig(cfg, env);
  assert.equal(p, configPath(env));
  const loaded = loadConfig(env);
  assert.equal(loaded.theme, "matrix");
});
test("loadConfig returns defaults when file missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "cph-"));
  const loaded = loadConfig({ CLAUDE_CONFIG_DIR: dir });
  assert.equal(loaded.theme, "netrun");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/config.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/config.mjs`**

```javascript
// lib/config.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const ALL_SEGMENTS = [
  "callsign", "model", "dir", "git", "context",
  "fiveHour", "weekly", "cost", "lines", "duration", "clock", "version",
];

export const DEFAULTS = {
  theme: "netrun",
  callsign: "NETRUN",
  segments: ["callsign", "model", "dir", "git", "context", "fiveHour", "weekly", "cost", "lines", "clock"],
  segmentOptions: { git: { showDirty: false, showAheadBehind: false }, clock: { format24h: true } },
  animation: { enabled: true, mode: "adaptive", pulse: true, shimmer: true, glitch: true, marquee: true },
  palette: {},
  separator: "  ░  ",
  colorMode: "auto",
  previousStatusLine: null,
};

export function configDir(env = process.env) {
  return env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
}
export function pluginDir(env = process.env) {
  return join(configDir(env), "cyberpunk-hud");
}
export function configPath(env = process.env) {
  return join(pluginDir(env), "config.json");
}

export function mergeConfig(user) {
  const c = structuredClone(DEFAULTS);
  if (user && typeof user === "object") {
    for (const k of Object.keys(DEFAULTS)) {
      if (user[k] === undefined) continue;
      if (k === "segmentOptions" || k === "animation" || k === "palette") {
        c[k] = { ...c[k], ...(user[k] || {}) };
      } else {
        c[k] = user[k];
      }
    }
  }
  c.segments = [...new Set((c.segments || []).filter((s) => ALL_SEGMENTS.includes(s)))];
  if (c.segments.length === 0) c.segments = [...DEFAULTS.segments];
  return c;
}

export function loadConfig(env = process.env) {
  let user = null;
  try { user = JSON.parse(readFileSync(configPath(env), "utf8")); } catch { /* defaults */ }
  return mergeConfig(user);
}

export function saveConfig(cfg, env = process.env) {
  const p = configPath(env);
  mkdirSync(pluginDir(env), { recursive: true });
  writeFileSync(p, JSON.stringify(cfg, null, 2));
  return p;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/config.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/config.mjs test/config.test.mjs
git commit -m "feat: config defaults, merge/validate, load/save"
```

---

## Task 7: `lib/segments.mjs` — segment renderers

**Files:**
- Create: `lib/segments.mjs`
- Test: `test/segments.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/segments.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/segments.mjs`**

```javascript
// lib/segments.mjs
import { gradient, brightness, paint } from "./color.mjs";
import * as A from "./anim.mjs";
import { countdown } from "./data.mjs";

function gaugeBar(pct, width, stops, dimColor, mode, animMode, now, shimmerEnabled) {
  const p = Math.max(0, Math.min(100, pct));
  const filled = Math.max(0, Math.min(width, Math.round((p / 100) * width)));
  const color = gradient(stops, Math.min(1, p / 100));
  const shimmerIdx = shimmerEnabled && animMode === "active" ? A.shimmerIndex(now, width) : -1;
  let out = "";
  for (let i = 0; i < width; i++) {
    if (i < filled) {
      const rgb = i === shimmerIdx ? brightness(color, 1.7) : color;
      out += paint(rgb, "█", mode);
    } else {
      out += paint(dimColor, "░", mode);
    }
  }
  return out;
}

function glitchText(text, now, enabled) {
  if (!enabled || !A.glitchOn(now)) return text;
  const chars = [...text];
  if (chars.length === 0) return text;
  const i = Math.floor(now / 90) % chars.length;
  chars[i] = A.glitchChar(now, i);
  return chars.join("");
}

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}m`;
}

function limitSeg(label, win, ctx, cfg, k) {
  if (!win) return null;
  const stops = [k.theme.ok, k.theme.warn, k.theme.crit];
  const bar = gaugeBar(win.pct, 6, stops, k.theme.dim, k.mode, k.animMode, ctx.now, cfg.animation.shimmer);
  const col = gradient(stops, Math.min(1, win.pct / 100));
  const cd = win.resetsAt
    ? " " + k.P(k.theme.dim, "↻" + countdown(win.resetsAt, ctx.now), false)
    : "";
  return k.P(k.theme.ink, label, false) + " " + bar + " " + k.P(col, `${win.pct}%`, true) + cd;
}

export const SEGMENTS = {
  callsign: (ctx, cfg, k) => {
    const label = glitchText(cfg.callsign || "NETRUN", ctx.now, k.animMode === "alert" && cfg.animation.glitch);
    const glow =
      k.animMode === "idle" && cfg.animation.enabled && cfg.animation.pulse
        ? brightness(k.theme.accent, A.pulse(ctx.now))
        : k.theme.accent;
    return k.P(k.theme.accent, "▟▙", false) + k.P(glow, ` ${label} `, true) + k.P(k.theme.accent, "▟▙", false);
  },
  model: (ctx, cfg, k) =>
    k.P(k.theme.accent2, "⟨", false) + k.P(k.theme.accent2, ctx.model.toUpperCase(), true) + k.P(k.theme.accent2, "⟩", false),
  dir: (ctx, cfg, k) =>
    ctx.dir ? k.P(k.theme.accent2, "▸ ", false) + k.P(k.theme.ok, ctx.dir, true) : null,
  git: (ctx, cfg, k) =>
    ctx.branch ? k.P(k.theme.ink, "⎇ ", false) + k.P(k.theme.ink, ctx.branch, false) : null,
  context: (ctx, cfg, k) => {
    if (ctx.contextPct == null) return null;
    const stops = [k.theme.ok, k.theme.warn, k.theme.crit];
    const bar = gaugeBar(ctx.contextPct, 8, stops, k.theme.dim, k.mode, k.animMode, ctx.now, cfg.animation.shimmer);
    const col = gradient(stops, Math.min(1, ctx.contextPct / 100));
    return k.P(k.theme.ink, "CTX", false) + " " + bar + " " + k.P(col, `${ctx.contextPct}%`, true);
  },
  fiveHour: (ctx, cfg, k) => limitSeg("5H", ctx.fiveHour, ctx, cfg, k),
  weekly: (ctx, cfg, k) => limitSeg("WK", ctx.weekly, ctx, cfg, k),
  cost: (ctx, cfg, k) => (ctx.cost == null ? null : k.P(k.theme.warn, `$${ctx.cost.toFixed(3)}`, true)),
  lines: (ctx, cfg, k) =>
    ctx.linesAdded || ctx.linesRemoved
      ? k.P(k.theme.ok, `+${ctx.linesAdded}`, false) + k.P(k.theme.dim, "/", false) + k.P(k.theme.crit, `-${ctx.linesRemoved}`, false)
      : null,
  duration: (ctx, cfg, k) => (ctx.durationMs == null ? null : k.P(k.theme.ink, fmtDuration(ctx.durationMs), false)),
  clock: (ctx, cfg, k) => {
    const d = new Date(ctx.now);
    const t =
      cfg.segmentOptions?.clock?.format24h !== false
        ? d.toTimeString().slice(0, 5)
        : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return k.P(k.theme.accent2, "⌁ ", false) + k.P(k.theme.dim, t, false);
  },
  version: (ctx, cfg, k) => (ctx.version ? k.P(k.theme.dim, `v${ctx.version}`, false) : null),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/segments.test.mjs`
Expected: PASS. (Note: the `clock` test depends on local timezone but only asserts `HH:MM` shape.)

- [ ] **Step 5: Commit**

```bash
git add lib/segments.mjs test/segments.test.mjs
git commit -m "feat: segment renderers incl. 5h/weekly limit gauges"
```

---

## Task 8: `lib/render.mjs` — compose + width fit

**Files:**
- Create: `lib/render.mjs`
- Test: `test/render.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/render.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/render.mjs`**

```javascript
// lib/render.mjs
import { paint, detectMode } from "./color.mjs";
import { resolveTheme } from "./themes.mjs";
import { SEGMENTS } from "./segments.mjs";

// Lower index = dropped first when the line is too wide.
const DROP_ORDER = ["version", "duration", "clock", "lines", "cost", "weekly", "fiveHour", "git", "dir", "context", "model", "callsign"];

export function visibleWidth(s) {
  return [...s.replace(/\x1b\[[0-9;]*m/g, "")].length;
}

export function computeAnimMode(ctx, activity) {
  const alert =
    (ctx.contextPct != null && ctx.contextPct >= 85) ||
    (ctx.fiveHour && ctx.fiveHour.pct >= 90) ||
    (ctx.weekly && ctx.weekly.pct >= 90);
  if (alert) return "alert";
  return activity === "active" ? "active" : "idle";
}

export function render(ctx, cfg, opts = {}) {
  const env = opts.env || process.env;
  const mode = opts.mode || (cfg.colorMode && cfg.colorMode !== "auto" ? cfg.colorMode : detectMode(env));
  const theme = resolveTheme(cfg.theme, cfg.palette);
  const animMode = cfg.animation.enabled ? opts.animMode || "idle" : "idle";
  const k = { mode, theme, now: ctx.now, animMode, P: (rgb, s, b) => paint(rgb, s, mode, b) };

  const rendered = [];
  for (const id of cfg.segments) {
    const fn = SEGMENTS[id];
    if (!fn) continue;
    let out = null;
    try { out = fn(ctx, cfg, k); } catch { out = null; }
    if (out) rendered.push({ id, str: out });
  }

  const sep = paint(theme.dim, cfg.separator || "  ░  ", mode);
  const sepW = visibleWidth(sep);
  const cols = opts.columns || Number(env.COLUMNS) || 0;

  let active = rendered;
  if (cols > 0) {
    active = rendered.slice();
    const total = () => active.reduce((w, r, i) => w + visibleWidth(r.str) + (i > 0 ? sepW : 0), 0);
    for (const dropId of DROP_ORDER) {
      if (total() <= cols) break;
      const idx = active.findIndex((r) => r.id === dropId);
      if (idx >= 0) active.splice(idx, 1);
    }
  }
  return active.map((r) => r.str).join(sep);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/render.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/render.mjs test/render.test.mjs
git commit -m "feat: compose segments with width-aware fit + anim mode"
```

---

## Task 9: `lib/state.mjs` — adaptive activity detection

**Files:**
- Create: `lib/state.mjs`
- Test: `test/state.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/state.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/state.mjs`**

```javascript
// lib/state.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { configDir, pluginDir } from "./config.mjs";

function statePath(sessionId, env) {
  const id = String(sessionId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(pluginDir(env), `state-${id}.json`);
}

// "active" if tokens/cost changed within windowMs of the last observed change, else "idle".
export function activityMode(ctx, env = process.env, windowMs = 3500) {
  try {
    const p = statePath(ctx.sessionId, env);
    const now = ctx.now;
    const snap = { pct: ctx.contextPct, cost: ctx.cost, ts: now, lastChange: now };
    let prev = null;
    if (existsSync(p)) { try { prev = JSON.parse(readFileSync(p, "utf8")); } catch { /* ignore */ } }

    let active = true;
    if (prev) {
      const changed = prev.pct !== snap.pct || prev.cost !== snap.cost;
      if (changed) {
        active = true;
        snap.lastChange = now;
      } else {
        snap.lastChange = prev.lastChange || 0;
        active = now - snap.lastChange < windowMs;
      }
    }

    mkdirSync(pluginDir(env), { recursive: true });
    writeFileSync(p, JSON.stringify(snap));
    return active ? "active" : "idle";
  } catch {
    return "idle";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/state.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/state.mjs test/state.test.mjs
git commit -m "feat: best-effort per-session activity detection"
```

---

## Task 10: `bin/cyberpunk-hud.mjs` — entry + render integration

**Files:**
- Create: `bin/cyberpunk-hud.mjs`
- Test: `test/render-integration.test.mjs`

- [ ] **Step 1: Write the failing test** (drives the renderer end-to-end by piping JSON)

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/render-integration.test.mjs`
Expected: FAIL — `bin/cyberpunk-hud.mjs` not found / cannot execute.

- [ ] **Step 3: Write `bin/cyberpunk-hud.mjs`**

```javascript
#!/usr/bin/env node
// cyberpunk-hud — dual-mode entry.
// Piped stdin (no argv) => render one status-line frame.
// argv present => run the config CLI.
import { parseInput } from "../lib/data.mjs";
import { loadConfig } from "../lib/config.mjs";
import { render, computeAnimMode } from "../lib/render.mjs";
import { activityMode } from "../lib/state.mjs";

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length > 0) {
    const { runCli } = await import("../lib/cli.mjs");
    process.exit(await runCli(argv));
  }

  let line = "";
  try {
    const raw = await readStdin();
    const input = raw.trim() ? JSON.parse(raw) : {};
    const cfg = loadConfig();
    const ctx = parseInput(input, { now: Date.now() });
    const activity =
      cfg.animation.enabled && cfg.animation.mode === "adaptive" ? activityMode(ctx) : "idle";
    const animMode = cfg.animation.enabled ? computeAnimMode(ctx, activity) : "idle";
    line = render(ctx, cfg, { animMode });
  } catch {
    line = "\x1b[2mcyberpunk-hud ⚠\x1b[0m";
  }
  process.stdout.write(line);
}

main();
```

> Note: `runCli` is imported lazily so the render path never loads CLI code. `lib/cli.mjs` is created in Task 12; until then the CLI branch is unused by these tests (they pipe stdin with no argv). The "garbage stdin" test exercises the `catch` fallback.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/render-integration.test.mjs`
Expected: PASS. (Renders from stdin; garbage input prints the dim fallback and exits 0.)

- [ ] **Step 5: Commit**

```bash
git add bin/cyberpunk-hud.mjs test/render-integration.test.mjs
git commit -m "feat: dual-mode entry; safe render from piped stdin"
```

---

## Task 11: `lib/install.mjs` — setup / restore

**Files:**
- Create: `lib/install.mjs`
- Test: `test/install.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// test/install.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setup, restore, wrapperPath, settingsPath } from "../lib/install.mjs";

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
  const root = join(import.meta.dirname, "..");
  const out = execFileSync("node", [wrapperPath(env)], {
    input: "{}", encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", CYBERPUNK_HUD_ROOT: root, CLAUDE_CONFIG_DIR: env.CLAUDE_CONFIG_DIR },
  });
  assert.ok(typeof out === "string");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/install.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/install.mjs`**

```javascript
// lib/install.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { configDir, pluginDir, loadConfig, saveConfig } from "./config.mjs";

// statusLine command uses the portable env-var form so it works across machines.
const WRAPPER_CMD = "node ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/cyberpunk-hud/statusline.mjs";

export function wrapperPath(env = process.env) {
  return join(pluginDir(env), "statusline.mjs");
}
export function settingsPath(env = process.env) {
  return join(configDir(env), "settings.json");
}

const WRAPPER_SOURCE = `#!/usr/bin/env node
// Auto-generated by 'cyberpunk-hud setup'. Resolves the plugin renderer so that
// settings.json keeps working across plugin version bumps. Do not edit by hand.
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function configDir() { return process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"); }
function safeReaddir(p) { try { return readdirSync(p); } catch { return []; } }

function findRenderer() {
  // 1. dev / non-plugin override
  const dev = process.env.CYBERPUNK_HUD_ROOT;
  if (dev) {
    const f = join(dev, "bin", "cyberpunk-hud.mjs");
    if (existsSync(f)) return f;
  }
  // 2. newest version in the plugin cache: plugins/cache/<marketplace>/cyberpunk-hud/<version>/
  const base = join(configDir(), "plugins", "cache");
  const found = [];
  for (const mkt of safeReaddir(base)) {
    const pdir = join(base, mkt, "cyberpunk-hud");
    for (const ver of safeReaddir(pdir)) {
      const f = join(pdir, ver, "bin", "cyberpunk-hud.mjs");
      if (existsSync(f)) found.push({ ver, f });
    }
  }
  found.sort((a, b) => b.ver.localeCompare(a.ver, undefined, { numeric: true }));
  return found[0]?.f || null;
}

const renderer = findRenderer();
if (renderer) {
  await import(pathToFileURL(renderer).href);
} else {
  process.stdout.write("\\x1b[2mcyberpunk-hud: not found (run /cyberpunk-hud setup)\\x1b[0m");
}
`;

export function writeWrapper(env = process.env) {
  const p = wrapperPath(env);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, WRAPPER_SOURCE);
  return p;
}

export function setup(env = process.env) {
  const cfg = loadConfig(env);
  const sp = settingsPath(env);
  let settings = {};
  try { settings = JSON.parse(readFileSync(sp, "utf8")); } catch { /* new file */ }

  const prev = settings.statusLine?.command;
  if (settings.statusLine && (!prev || !prev.includes("cyberpunk-hud"))) {
    cfg.previousStatusLine = settings.statusLine;
  }

  writeWrapper(env);
  if (existsSync(sp)) copyFileSync(sp, sp + ".cyberpunk-hud.bak");
  mkdirSync(configDir(env), { recursive: true });
  settings.statusLine = { type: "command", command: WRAPPER_CMD };
  writeFileSync(sp, JSON.stringify(settings, null, 2));
  saveConfig(cfg, env);
  return { wrapper: wrapperPath(env), settings: sp };
}

export function restore(env = process.env) {
  const cfg = loadConfig(env);
  const sp = settingsPath(env);
  let settings = {};
  try { settings = JSON.parse(readFileSync(sp, "utf8")); } catch { /* nothing */ }
  if (cfg.previousStatusLine) settings.statusLine = cfg.previousStatusLine;
  else delete settings.statusLine;
  writeFileSync(sp, JSON.stringify(settings, null, 2));
  cfg.previousStatusLine = null;
  saveConfig(cfg, env);
  return sp;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/install.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/install.mjs test/install.test.mjs
git commit -m "feat: setup/restore wiring with update-proof resolver wrapper"
```

---

## Task 12: `lib/cli.mjs` — config subcommands

**Files:**
- Create: `lib/cli.mjs`
- Test: `test/cli.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/cli.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/cli.mjs`**

```javascript
// lib/cli.mjs
import { loadConfig, saveConfig, ALL_SEGMENTS, configPath } from "./config.mjs";
import { setup, restore, wrapperPath, settingsPath } from "./install.mjs";
import { THEMES } from "./themes.mjs";
import { parseInput } from "./data.mjs";
import { render, computeAnimMode } from "./render.mjs";
import { existsSync, readFileSync } from "node:fs";

function coerce(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  if (v !== "" && !Number.isNaN(Number(v))) return Number(v);
  return v;
}

function previewPayload() {
  return {
    model: { display_name: "Opus" },
    workspace: { current_dir: process.cwd() },
    version: "2.1.158",
    cost: { total_cost_usd: 0.0412, total_lines_added: 64, total_lines_removed: 9, total_duration_ms: 600000 },
    context_window: { used_percentage: 24, context_window_size: 200000 },
    rate_limits: {
      five_hour: { used_percentage: 15, resets_at: Math.floor(Date.now() / 1000) + 4 * 3600 },
      seven_day: { used_percentage: 44, resets_at: Math.floor(Date.now() / 1000) + 3 * 86400 },
    },
  };
}

const HELP = `cyberpunk-hud — usage:
  setup                       wire the status line into settings.json
  restore                     revert to the previous status line
  theme <name> | themes       set / list themes
  enable|disable|toggle <seg> show/hide a segment
  order <seg...>              set segment order
  set <key> <value>           set a config value (e.g. callsign GHOST)
  animation on|off | <effect> on|off
  preview                     print a sample rendered line
  doctor                      show status + diagnostics
  segments: ${ALL_SEGMENTS.join(", ")}`;

export async function runCli(argv) {
  const [cmd, ...rest] = argv;
  const cfg = loadConfig();

  switch (cmd) {
    case "setup": {
      const r = setup();
      console.log(`✓ status line wired → ${r.settings}\n  wrapper: ${r.wrapper}\n  Restart Claude Code to apply.`);
      return 0;
    }
    case "restore": {
      const p = restore();
      console.log(`✓ restored previous status line in ${p}. Restart Claude Code.`);
      return 0;
    }
    case "themes":
      console.log(Object.keys(THEMES).join("\n"));
      return 0;
    case "theme": {
      if (!THEMES[rest[0]]) { console.error(`unknown theme: ${rest[0] ?? ""}. Try: ${Object.keys(THEMES).join(", ")}`); return 1; }
      cfg.theme = rest[0]; saveConfig(cfg); console.log(`✓ theme = ${rest[0]}`); return 0;
    }
    case "enable":
    case "disable":
    case "toggle": {
      const seg = rest[0];
      if (!ALL_SEGMENTS.includes(seg)) { console.error(`unknown segment: ${seg ?? ""}. Known: ${ALL_SEGMENTS.join(", ")}`); return 1; }
      const has = cfg.segments.includes(seg);
      if (cmd === "enable" && !has) cfg.segments.push(seg);
      else if (cmd === "disable") cfg.segments = cfg.segments.filter((s) => s !== seg);
      else if (cmd === "toggle") cfg.segments = has ? cfg.segments.filter((s) => s !== seg) : [...cfg.segments, seg];
      saveConfig(cfg); console.log(`✓ segments: ${cfg.segments.join(", ")}`); return 0;
    }
    case "order": {
      const valid = rest.filter((s) => ALL_SEGMENTS.includes(s));
      if (valid.length === 0) { console.error(`no valid segments. Known: ${ALL_SEGMENTS.join(", ")}`); return 1; }
      cfg.segments = [...new Set(valid)]; saveConfig(cfg); console.log(`✓ order: ${cfg.segments.join(", ")}`); return 0;
    }
    case "set": {
      const [key, value] = rest;
      if (!key || value === undefined) { console.error("usage: set <key> <value>"); return 1; }
      cfg[key] = coerce(value); saveConfig(cfg); console.log(`✓ ${key} = ${JSON.stringify(cfg[key])}`); return 0;
    }
    case "animation": {
      const [a, b] = rest;
      if (a === "on" || a === "off") { cfg.animation.enabled = a === "on"; }
      else if (a in cfg.animation && (b === "on" || b === "off")) { cfg.animation[a] = b === "on"; }
      else { console.error("usage: animation on|off  OR  animation <pulse|shimmer|glitch|marquee> on|off"); return 1; }
      saveConfig(cfg); console.log(`✓ animation: ${JSON.stringify(cfg.animation)}`); return 0;
    }
    case "preview": {
      const ctx = parseInput(previewPayload(), { now: Date.now() });
      console.log(render(ctx, cfg, { animMode: computeAnimMode(ctx, "active") }));
      return 0;
    }
    case "doctor": {
      const sp = settingsPath();
      let wired = false;
      try { wired = JSON.parse(readFileSync(sp, "utf8")).statusLine?.command?.includes("cyberpunk-hud") || false; } catch { /* none */ }
      console.log([
        `cyberpunk-hud doctor`,
        `  node:        ${process.version}`,
        `  config:      ${configPath()}`,
        `  theme:       ${cfg.theme}`,
        `  segments:    ${cfg.segments.join(", ")}`,
        `  animation:   ${cfg.animation.enabled ? cfg.animation.mode : "off"}`,
        `  wrapper:     ${existsSync(wrapperPath()) ? "present" : "missing"}`,
        `  statusLine:  ${wired ? "wired ✓" : "not wired (run: setup)"}`,
      ].join("\n"));
      return 0;
    }
    default:
      console.error(cmd ? `unknown command: ${cmd}\n\n${HELP}` : HELP);
      return cmd ? 1 : 0;
  }
}
```

> Note: the `default` case returns `1` for an unknown command and `0` when no command is given (prints help). The test calls `runCli(["wat"])` → expects `1`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/cli.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the FULL suite**

Run: `node --test`
Expected: PASS — every test file green.

- [ ] **Step 6: Commit**

```bash
git add lib/cli.mjs test/cli.test.mjs
git commit -m "feat: config CLI (setup, theme, toggle, order, set, animation, preview, doctor)"
```

---

## Task 13: Plugin + marketplace manifests + slash command

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `commands/cyberpunk-hud.md`

- [ ] **Step 1: Create `.claude-plugin/plugin.json`**

```json
{
  "name": "cyberpunk-hud",
  "version": "0.1.0",
  "description": "Neon, animated, customizable status line for Claude Code with live 5-hour & weekly usage gauges, themes, and per-element visibility.",
  "author": { "name": "ultimatevegance" },
  "homepage": "https://github.com/ultimatevegance/cyberpunk-hud",
  "repository": "https://github.com/ultimatevegance/cyberpunk-hud",
  "license": "MIT",
  "keywords": ["claude-code", "statusline", "hud", "cyberpunk", "neon", "theme", "usage-limits"]
}
```

> The `commands/` directory is auto-discovered by Claude Code; no explicit `commands` key is required.

- [ ] **Step 2: Create `.claude-plugin/marketplace.json`**

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "cyberpunk-hud",
  "description": "Cyberpunk neon status line for Claude Code.",
  "owner": { "name": "ultimatevegance" },
  "plugins": [
    {
      "name": "cyberpunk-hud",
      "description": "Neon, animated, customizable status line with live 5-hour & weekly usage gauges, themes, and per-element visibility.",
      "version": "0.1.0",
      "source": "./",
      "category": "productivity",
      "homepage": "https://github.com/ultimatevegance/cyberpunk-hud",
      "tags": ["statusline", "hud", "cyberpunk", "theme", "usage"]
    }
  ],
  "version": "0.1.0"
}
```

- [ ] **Step 3: Create `commands/cyberpunk-hud.md`**

```markdown
---
description: Configure the cyberpunk-hud status line (setup, themes, toggle elements, preview)
argument-hint: "[setup|restore|theme <name>|themes|enable <seg>|disable <seg>|toggle <seg>|order <seg...>|set <key> <val>|animation ...|preview|doctor]"
---

Run the cyberpunk-hud CLI with the user's arguments and report the result.

Execute this command:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/cyberpunk-hud.mjs" $ARGUMENTS
```

Then:
- If no arguments were given, run `doctor` to show current status, then list the available subcommands.
- After `setup` or `restore`, remind the user to **restart Claude Code** for the change to take effect.
- After `preview`, show the rendered line so the user can see the result.

Report the command output verbatim, followed by a one-line summary of what changed.
```

- [ ] **Step 4: Validate JSON manifests**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')); JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8')); console.log('manifests valid')"`
Expected: `manifests valid`.

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json commands/cyberpunk-hud.md
git commit -m "feat: plugin + marketplace manifests and /cyberpunk-hud command"
```

---

## Task 14: README, CHANGELOG, CI

**Files:**
- Create: `README.md`, `CHANGELOG.md`, `.github/workflows/test.yml`

- [ ] **Step 1: Create `.github/workflows/test.yml`**

```yaml
name: test
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: node --test
```

- [ ] **Step 2: Create `README.md`**

```markdown
# cyberpunk-hud

A neon, animated, fully-customizable **status line for Claude Code** — with live
**5-hour** and **weekly** usage-limit gauges, a context gauge, cost, git branch,
and adaptive cyberpunk motion. Zero dependencies.

```
▟▙ NETRUN ▟▙ ░ ⟨OPUS⟩ ░ ▸myapp ░ ⎇main ░ CTX ███░░░░░ 24% ░ 5H ██░░░░ 15% ↻4h02m ░ WK ████░░ 44% ↻3d ░ $0.041 +64/-9 ░ ⌁10:14
```

## Install

```
/plugin marketplace add ultimatevegance/cyberpunk-hud
/plugin install cyberpunk-hud@cyberpunk-hud
/cyberpunk-hud setup
```

Then **restart Claude Code**.

## Configure

| Command | Action |
|---------|--------|
| `/cyberpunk-hud theme synthwave` | switch theme (`netrun`, `synthwave`, `matrix`, `vapor`, `ice`) |
| `/cyberpunk-hud disable clock` | hide a segment |
| `/cyberpunk-hud enable weekly` | show a segment |
| `/cyberpunk-hud order model dir context fiveHour weekly` | reorder segments |
| `/cyberpunk-hud set callsign GHOST` | rename the callsign |
| `/cyberpunk-hud animation off` | disable motion |
| `/cyberpunk-hud preview` | preview the current look |
| `/cyberpunk-hud doctor` | show status |
| `/cyberpunk-hud restore` | revert to your previous status line |

Segments: `callsign · model · dir · git · context · fiveHour · weekly · cost · lines · duration · clock · version`.

Config lives at `~/.claude/cyberpunk-hud/config.json`.

## How it works

Claude Code re-invokes the status-line command on a throttled tick (~3fps) and pipes
session JSON on stdin. cyberpunk-hud reads `context_window.used_percentage`,
`rate_limits.five_hour` / `rate_limits.seven_day`, and `cost` directly from that JSON —
no credentials, cross-platform. Animation effects are pure functions of the clock, so the
HUD "breathes" between refreshes. The 5-hour / weekly gauges appear for Claude.ai Pro/Max
after the first API response of a session.

## Manual setup (without the slash command)

Point `statusLine` in `~/.claude/settings.json` at the renderer:

```json
{ "statusLine": { "type": "command", "command": "node ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/cyberpunk-hud/statusline.mjs" } }
```

## Development

```
git clone https://github.com/ultimatevegance/cyberpunk-hud
cd cyberpunk-hud
node --test
CYBERPUNK_HUD_ROOT=$PWD node bin/cyberpunk-hud.mjs preview
```

`CYBERPUNK_HUD_ROOT` points the resolver wrapper at a local checkout.

## License

MIT
```

- [ ] **Step 3: Create `CHANGELOG.md`**

```markdown
# Changelog

## 0.1.0
- Initial release.
- Single-line neon status line with adaptive (~3fps) animation.
- Live 5-hour and weekly usage-limit gauges with reset countdowns (from stdin).
- Context gauge, cost, line diff, git branch, model, clock, duration, version.
- Per-element visibility + ordering via config and `/cyberpunk-hud` command.
- Themes: netrun, synthwave, matrix, vapor, ice.
- One-command setup with update-proof resolver wrapper; clean restore.
```

- [ ] **Step 4: Verify CI workflow is valid YAML**

Run: `node -e "const s=require('fs').readFileSync('.github/workflows/test.yml','utf8'); if(!s.includes('node --test')) throw new Error('missing test step'); console.log('workflow ok')"`
Expected: `workflow ok`.

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md .github/workflows/test.yml
git commit -m "docs: README, changelog, and CI workflow"
```

---

## Task 15: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite passes**

Run: `node --test 2>&1 | tail -6`
Expected: `pass` count > 0, `fail 0`.

- [ ] **Step 2: Render a real-looking frame (color)**

Run:
```bash
printf '%s' '{"model":{"display_name":"Opus"},"workspace":{"current_dir":"'"$PWD"'"},"version":"2.1.158","cost":{"total_cost_usd":0.0412,"total_lines_added":64,"total_lines_removed":9},"context_window":{"used_percentage":24,"context_window_size":200000},"rate_limits":{"five_hour":{"used_percentage":15,"resets_at":'"$(( $(date +%s) + 14520 ))"'},"seven_day":{"used_percentage":44,"resets_at":'"$(( $(date +%s) + 259200 ))"'}}}' | node bin/cyberpunk-hud.mjs; echo
```
Expected: a neon line containing `OPUS`, `24%`, `5H … 15% ↻4h…`, `WK … 44% ↻3d`, `$0.041`.

- [ ] **Step 3: Preview + doctor via CLI**

Run: `node bin/cyberpunk-hud.mjs preview && echo "---" && node bin/cyberpunk-hud.mjs doctor`
Expected: a rendered line, then a doctor report (statusLine "not wired" in this dev checkout is fine).

- [ ] **Step 4: Narrow-width + NO_COLOR sanity**

Run: `printf '%s' '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":24}}' | NO_COLOR=1 COLUMNS=24 node bin/cyberpunk-hud.mjs; echo`
Expected: a short plain-text line (low-priority segments dropped), no ANSI codes, no crash.

- [ ] **Step 5: Tag release commit**

```bash
git add -A
git commit -m "chore: cyberpunk-hud v0.1.0" --allow-empty
git tag v0.1.0
```

---

## Publishing (after the plan completes — confirm before pushing)

These are **outward actions**; the implementer must confirm with the user before running them.

- [ ] Create the public repo: `gh repo create ultimatevegance/cyberpunk-hud --public --source . --remote origin --description "Neon animated Claude Code status line with live usage gauges" --push`
- [ ] Push tags: `git push origin v0.1.0`
- [ ] Verify install on a clean profile:
  `/plugin marketplace add ultimatevegance/cyberpunk-hud` → `/plugin install cyberpunk-hud@cyberpunk-hud` → `/cyberpunk-hud setup` → restart → confirm the HUD renders.
- [ ] (Optional, later) Add a screen-capture GIF to the README and consider submitting to Anthropic's official marketplace.

---

## Self-Review (filled in by plan author)

**Spec coverage:**
- 5-hour + weekly gauges → Tasks 4 (parse), 7 (render), 8/10 (integration). ✓
- Per-element visibility + order → Tasks 6 (config), 8 (render order), 12 (CLI enable/disable/order). ✓
- Adaptive animation → Tasks 3 (effects), 9 (activity), 8 (computeAnimMode), 7 (applied). ✓
- Themes + color fallbacks → Tasks 2, 5; NO_COLOR/256 covered in Task 2 tests. ✓
- Config file + `/cyberpunk-hud` command → Tasks 6, 12, 13. ✓
- Update-proof setup/revert → Task 11 (resolver wrapper + backup/restore). ✓
- Publishing (plugin + marketplace + GitHub + CI) → Tasks 13, 14, Publishing section. ✓
- Never-crash renderer → Task 10 (catch fallback) + Task 15 Step 4. ✓

**Placeholder scan:** No TBD/TODO; every code/test step contains full content. ✓

**Type consistency:** `Ctx` field names (`contextPct`, `fiveHour`, `weekly`, `linesAdded`, `linesRemoved`, `durationMs`, `sessionId`) are identical across `data.mjs`, `segments.mjs`, `render.mjs`, `state.mjs`. `kit` shape `{mode, theme, now, animMode, P}` is consistent between `render.mjs` (producer) and `segments.mjs` (consumer). Segment ids match `ALL_SEGMENTS`. ✓
