// lib/data.mjs
import { readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, basename, resolve } from "node:path";

export function parseInput(input, opts = {}) {
  const now = opts.now ?? Date.now();
  const cwd = input?.workspace?.current_dir || input?.cwd || opts.cwd || "";
  const cw = input?.context_window || {};

  let contextPct = typeof cw.used_percentage === "number" ? Math.round(cw.used_percentage) : null;
  if (contextPct == null && cw.current_usage) {
    const u = cw.current_usage;
    const used = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
    const size = cw.context_window_size || 200000;
    if (used > 0) contextPct = Math.round((used / size) * 100);
  }

  const rl = input?.rate_limits || {};
  const win = (w) =>
    w && typeof w.used_percentage === "number"
      ? { pct: Math.round(w.used_percentage), resetsAt: typeof w.resets_at === "number" ? w.resets_at : null }
      : null;

  const cost = input?.cost || {};
  const branch = opts.branch !== undefined ? opts.branch : gitBranchFromHead(cwd);

  return {
    now,
    model: input?.model?.display_name || "Claude",
    effort: input?.effort?.level || null,
    thinking: input?.thinking?.enabled || false,
    fastMode: input?.fast_mode || false,
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
          if (m) gitDir = resolve(dir, m[1].trim());
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
  return m === 0 ? "<1m" : `${m}m`;
}
