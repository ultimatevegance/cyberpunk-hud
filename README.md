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
