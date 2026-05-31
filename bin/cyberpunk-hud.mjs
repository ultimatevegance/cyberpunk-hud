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
  process.stdout.on("error", () => {});
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
