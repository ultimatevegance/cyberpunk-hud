// lib/cli.mjs
import { loadConfig, saveConfig, mergeConfig, ALL_SEGMENTS, configPath } from "./config.mjs";
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
    effort: { level: "high" },
    thinking: { enabled: true },
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
      cfg[key] = coerce(value);
      const merged = mergeConfig(cfg);
      saveConfig(merged);
      console.log(`✓ ${key} = ${JSON.stringify(merged[key])}`);
      return 0;
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
