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
