# cyberpunk-hud — Design Spec

- **Date:** 2026-05-31
- **Status:** Approved (design); pending spec review
- **Author:** ultimatevegance (Justus)
- **Repo (planned):** `github.com/ultimatevegance/cyberpunk-hud`

## 1. Overview

A neon, animated, fully-customizable **status line for Claude Code**, distributed as a
Claude Code **plugin** with its own marketplace, published to GitHub.

It evolves an existing standalone script (`~/.claude/hud/cyberpunk-hud.mjs`) into a real
product: live limit gauges, adaptive animation, a theme system, per-element visibility,
and a one-command install.

### Goals
- Beautiful single-line cyberpunk status line with **adaptive** (~3fps) animation.
- Show **5-hour** and **weekly (7-day)** usage-limit status with live reset countdowns.
- Let users **choose which elements display** and in what order.
- Themes + palette customization.
- One-command setup that wires `settings.json`, survives plugin updates, and reverts cleanly.
- Publish as a Claude Code plugin (GitHub repo + marketplace manifest).

### Non-goals (v1 / YAGNI)
- Browser-based config UI.
- Multi-line / banner layout (single-line chosen).
- Credential-based usage scraping (we use stdin; never reuse session keys).
- Auto-submission to Anthropic's official marketplace (later, separate effort).

## 2. Confirmed technical facts (research)

### 2.1 Status line stdin schema (Claude Code ≥ 2.1.132; target user on 2.1.158)
Source: official docs at `https://code.claude.com/docs/en/statusline`.

```jsonc
{
  "model":     { "id": "...", "display_name": "Opus" },
  "workspace": { "current_dir": "...", "project_dir": "..." },
  "cwd": "...", "version": "...", "transcript_path": "...",
  "cost": {
    "total_cost_usd": 0.01234,
    "total_duration_ms": 0, "total_api_duration_ms": 0,
    "total_lines_added": 0, "total_lines_removed": 0
  },
  "context_window": {
    "total_input_tokens": 15500, "total_output_tokens": 1200,
    "context_window_size": 200000,        // 200k, or 1000000 extended
    "used_percentage": 24,                 // pre-calculated (input-only)
    "remaining_percentage": 76,
    "current_usage": {                     // null before 1st API call / right after /compact
      "input_tokens": 8500, "output_tokens": 1200,
      "cache_creation_input_tokens": 5000, "cache_read_input_tokens": 2000
    }
  },
  "exceeds_200k_tokens": false,
  "rate_limits": {                         // Pro/Max only; appears after 1st API response
    "five_hour": { "used_percentage": 15, "resets_at": 1738425600 },  // epoch seconds
    "seven_day": { "used_percentage": 44, "resets_at": 1738857600 }
  }
}
```

Key implications:
- **Context %** comes pre-computed (`context_window.used_percentage`); fall back to
  `current_usage` (input-only sum) or transcript-tail parse when null.
- **5-hour** = `rate_limits.five_hour`, **weekly** = `rate_limits.seven_day`. Each window
  may be independently absent (free tier, or before the first API response) → segment
  self-hides. `resets_at` is epoch seconds → render a countdown.
- Status line **runs locally, consumes no API tokens**; it hides during autocomplete /
  help / permission prompts.

### 2.2 Animation cadence
Claude Code re-invokes the status-line command on a throttled tick (~300ms ≈ 3fps) while
a session is active. We cannot push frames; each invocation renders one frame as a pure
function of `Date.now()`. This supports smooth ambient motion (pulse, shimmer, glitch,
marquee), not high-fps motion.

### 2.3 Plugins cannot register a status line directly
No cached plugin declares `statusLine` via its manifest; the status line lives in the
user's `settings.json`. Proven pattern (used by OMC): the plugin ships the renderer, and
a bundled command/skill writes `statusLine` into `settings.json`.

### 2.4 Distribution
Single GitHub repo containing `.claude-plugin/plugin.json` (the plugin) and
`.claude-plugin/marketplace.json` (marketplace entry, `source: "./"`). Install:
`/plugin marketplace add ultimatevegance/cyberpunk-hud` →
`/plugin install cyberpunk-hud@cyberpunk-hud` → `/cyberpunk-hud setup`.

### 2.5 Usage-limit fallbacks (optional, older CC only)
On-disk caches exist (`~/.claude/.statusline-usage-cache`,
`~/.claude/plugins/oh-my-claudecode/.usage-cache-anthropic.json`) and may be read if
`rate_limits` is absent from stdin. We do **not** depend on them, and we do **not** use the
credential-bearing `fetch-claude-usage.swift` scraper.

## 3. Architecture

**Approach A — zero-dependency Node ESM, modular, no build step.** Chosen for minimal
startup latency (spawned ~3×/sec), zero install friction, hackability, and easy testing.

### 3.1 Repo layout
```
cyberpunk-hud/
  .claude-plugin/
    plugin.json            # name, version, author, repo, license, keywords, commands path
    marketplace.json       # owner + plugins:[{ name, source:"./" }]
  bin/
    cyberpunk-hud.mjs      # dual-mode entry: piped stdin → render frame; argv → config CLI
  lib/
    data.mjs               # parse stdin, git HEAD, fallbacks, reset countdowns
    config.mjs             # load/merge/validate config + defaults
    themes.mjs             # named palettes
    color.mjs              # truecolor / 256 / NO_COLOR; brightness + gradient interpolation
    anim.mjs               # pure time-driven effects
    segments.mjs           # segment registry
    render.mjs             # compose enabled segments, separators, width handling
    state.mjs              # best-effort per-session activity state (adaptive motion)
    install.mjs            # wire/revert settings.json; write resolver wrapper
  commands/
    cyberpunk-hud.md       # /cyberpunk-hud slash command → drives the CLI
  test/ *.test.mjs         # node:test units
  README.md  LICENSE(MIT)  CHANGELOG.md  package.json
  .github/workflows/test.yml
```

### 3.2 Module responsibilities & interfaces
- **data.mjs** — `parseInput(stdinJson) -> Ctx`. Normalizes stdin into a stable `Ctx`
  object: `{ model, dir, branch, contextPct, contextSize, fiveHour, weekly, cost, lines,
  durationMs, version }`. Handles nulls/absence; computes reset countdowns; reads
  `.git/HEAD` (no subprocess); optional cache fallback. Depends on: node fs only.
- **config.mjs** — `loadConfig() -> Config`, `saveConfig(c)`, `defaults`. Deep-merges user
  config over defaults; validates and repairs unknown/invalid keys. Config path:
  `${CLAUDE_CONFIG_DIR:-~/.claude}/cyberpunk-hud/config.json`.
- **themes.mjs** — named palettes (`netrun` default, `synthwave`, `matrix`, `vapor`,
  `ice`). Each = token map `{ accent, accent2, ok, warn, crit, dim, ink }`.
- **color.mjs** — ANSI emit with capability detection (truecolor via `COLORTERM`,
  else 256-color, else none via `NO_COLOR`); `interp(a,b,t)`, `gradient(stops,t)`,
  `brightness(rgb,factor)`.
- **anim.mjs** — pure `f(now, ...)` effects: `pulse`, `shimmer`, `glitch`, `marquee`,
  `spinner`. No global state; deterministic for a given `now`.
- **segments.mjs** — registry of segments; each `{ id, enabledByDefault, render(ctx,cfg,anim)
  -> string | null }`. `null` ⇒ hidden.
- **render.mjs** — `render(ctx, cfg) -> string`. Selects enabled segments in configured
  order, joins with themed separators, applies width handling (drop low-priority segments
  on narrow terminals), applies activity/alert animation mode.
- **state.mjs** — `readState(sessionId)`, `writeState(sessionId, snapshot)`. Best-effort
  atomic write of `{ tokens, cost, ts }` to detect activity; all errors swallowed.
- **install.mjs** — `setup()`, `restore()`. Writes resolver wrapper + edits `settings.json`;
  backs up prior `statusLine` into config.

### 3.3 Entry behavior (`bin/cyberpunk-hud.mjs`)
- If stdin is piped (not a TTY) → read stdin, `render`, print one line. Never throws: any
  error prints a minimal safe line (`dim "cyberpunk-hud ⚠"`).
- If invoked with argv → dispatch to CLI (§6).

## 4. Segments (per-element visibility)

Built-in segments, each independently toggleable and reorderable via config:

| id | shows | notes |
|----|-------|-------|
| `callsign` | neon bookend label | text configurable (default `NETRUN`) |
| `model` | `⟨OPUS⟩` | from `model.display_name` |
| `dir` | basename of cwd | optional OSC-8 clickable (later) |
| `git` | `⎇ branch` | optional dirty flag / ahead-behind (off by default) |
| `context` | `CTX ███░░ 24%` | gradient by %; alert ≥85% |
| `fiveHour` | `5H ██░ 15% ↻4h02m` | hidden if `rate_limits.five_hour` absent; alert ≥90% |
| `weekly` | `WK ████░ 44% ↻3d` | hidden if `rate_limits.seven_day` absent; alert ≥90% |
| `cost` | `$0.041` | from `cost.total_cost_usd` |
| `lines` | `+64/-9` | from cost line counts |
| `duration` | session wall-clock | from `cost.total_duration_ms` |
| `clock` | `⌁10:14` | local time |
| `version` | `v2.1.158` | off by default |

Default order: `callsign · model · dir · git · context · fiveHour · weekly · cost · lines · clock`.

## 5. Theme & color system
- Truecolor by default; degrade to 256-color, then plain (`NO_COLOR`).
- Gauges interpolate **ok → warn → crit** across the palette as they fill.
- Themes selectable by name; any palette token overridable in config.

## 6. Animation engine — adaptive
All effects are pure functions of `Date.now()`:
- **Idle** → slow breathing glow on accent.
- **Active** (state.mjs detects tokens/cost changed within ~3s) → shimmer sweep on the
  context bar + spinner glyph.
- **Alert** (context ≥85% OR any limit ≥90%) → red pulse + subtle glitch flicker.
- Long values → marquee.
- Each effect individually toggleable; whole engine can be disabled (static neon).

## 7. Config schema (example)
Path: `${CLAUDE_CONFIG_DIR:-~/.claude}/cyberpunk-hud/config.json`
```jsonc
{
  "theme": "netrun",
  "callsign": "NETRUN",
  "segments": ["callsign","model","dir","git","context","fiveHour","weekly","cost","lines","clock"],
  "segmentOptions": {
    "git": { "showDirty": false, "showAheadBehind": false },
    "clock": { "format24h": true }
  },
  "animation": { "enabled": true, "mode": "adaptive", "pulse": true, "shimmer": true, "glitch": true, "marquee": true },
  "palette": {},                     // optional per-token overrides
  "separator": "  ░  ",
  "previousStatusLine": null         // populated by setup for restore
}
```

## 8. CLI + slash command
`bin/cyberpunk-hud.mjs <subcommand>`:
- `setup` — create default config, write resolver wrapper, wire `settings.json`, back up prior `statusLine`.
- `restore` — revert `settings.json` to backed-up `statusLine`.
- `theme <name>` / `themes` — set / list themes.
- `enable <seg>` / `disable <seg>` / `toggle <seg>`.
- `order <seg...>` — set segment order.
- `set <key> <value>` — set a config value (e.g. `callsign GHOST`).
- `animation on|off|<effect> on|off`.
- `preview` — render a sample frame to stdout (terminal preview).
- `doctor` — verify wiring, config validity, CC version, color support.

`commands/cyberpunk-hud.md` is a thin slash command that runs the CLI and reports results.

## 9. Setup & revert (survives plugin updates)
`setup` writes a small **resolver wrapper** to
`${CLAUDE_CONFIG_DIR:-~/.claude}/cyberpunk-hud/statusline.mjs` that locates the plugin's
renderer (newest version under `plugins/cache`, or a dev path via env override) and imports
it — the robustness pattern OMC uses. `settings.json.statusLine.command` points at this
wrapper, so plugin version bumps don't break the path. The prior `statusLine` command is
saved to config for `restore`.

## 10. Publishing
- Repo `ultimatevegance/cyberpunk-hud`, MIT.
- `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` (`source: "./"`).
- README: animated GIF/screenshots, theme gallery, install + manual-setup instructions.
- CI: `.github/workflows/test.yml` running `node --test` (token has `workflow` scope).

## 11. Testing & safety
- `node --test` units: stdin parsing (rate_limits present/absent/null; 200k vs 1M window;
  current_usage null), config merge/validation, animation determinism at fixed `now`,
  segment width/truncation, color fallbacks (`NO_COLOR`, `COLORTERM`).
- Manual: pipe sample payloads (with/without rate_limits, narrow/wide width) through the
  renderer; eyeball ANSI; run `preview`.
- Renderer **never throws**; reads capped; state writes best-effort.

## 12. Open questions / confirmations needed
- Confirm project location `~/Career/SideProjects/cyberpunk-hud` (default).
- Confirm I should create + push the public GitHub repo under `ultimatevegance` when ready
  (outward action; will confirm before pushing).
- Theme names/defaults acceptable (`netrun` default)?
