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
