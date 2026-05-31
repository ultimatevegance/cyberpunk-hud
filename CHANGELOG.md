# Changelog

## 0.1.1
- Fix: round context, 5-hour, and weekly usage percentages so the status line shows clean integers (e.g. `57%`) instead of floating-point artifacts like `56.99999999999999%`.

## 0.1.0
- Initial release.
- Single-line neon status line with adaptive (~3fps) animation.
- Live 5-hour and weekly usage-limit gauges with reset countdowns (from stdin).
- Context gauge, cost, line diff, git branch, model, clock, duration, version.
- Per-element visibility + ordering via config and `/cyberpunk-hud` command.
- Themes: netrun, synthwave, matrix, vapor, ice.
- One-command setup with update-proof resolver wrapper; clean restore.
