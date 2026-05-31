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
