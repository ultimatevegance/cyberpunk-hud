// lib/config.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

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
  separator: "  │  ",
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
        c[k] = { ...c[k], ...(isPlainObject(user[k]) ? user[k] : {}) };
      } else {
        c[k] = user[k];
      }
    }
  }
  const segs = Array.isArray(c.segments) ? c.segments : DEFAULTS.segments;
  c.segments = [...new Set(segs.filter((s) => ALL_SEGMENTS.includes(s)))];
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
