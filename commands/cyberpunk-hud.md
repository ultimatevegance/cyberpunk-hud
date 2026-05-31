---
description: Configure the cyberpunk-hud status line (setup, themes, toggle elements, preview)
argument-hint: "[setup|restore|theme <name>|themes|enable <seg>|disable <seg>|toggle <seg>|order <seg...>|set <key> <val>|animation ...|preview|doctor]"
---

Run the cyberpunk-hud CLI with the user's arguments and report the result.

Execute this command:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/cyberpunk-hud.mjs" $ARGUMENTS
```

Then:
- If no arguments were given, run `doctor` to show current status, then list the available subcommands.
- After `setup` or `restore`, remind the user to **restart Claude Code** for the change to take effect.
- After `preview`, show the rendered line so the user can see the result.

Report the command output verbatim, followed by a one-line summary of what changed.
