---
description: Set Sisyphus as your default operating mode
---

$ARGUMENTS

## Task: Configure Sisyphus

### Step 1: Fetch and Write CLAUDE.md

1. Use WebFetch to get the latest CLAUDE.md:
```
WebFetch(url: "https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claude-sisyphus/main/docs/CLAUDE.md", prompt: "Return the complete raw markdown content exactly as-is")
```

2. Use the Write tool to write the fetched content to `~/.claude/CLAUDE.md` (ALWAYS overwrite)

**FALLBACK** if WebFetch fails:
Tell user to visit https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claude-sisyphus/main/docs/CLAUDE.md and copy the content manually.

### Step 2: Clean Up Legacy Hooks (if present)

Check if old manual hooks exist and remove them to prevent duplicates:

```bash
# Remove legacy bash hook scripts (now handled by plugin system)
rm -f ~/.claude/hooks/keyword-detector.sh
rm -f ~/.claude/hooks/stop-continuation.sh
rm -f ~/.claude/hooks/persistent-mode.sh
rm -f ~/.claude/hooks/session-start.sh
```

Check `~/.claude/settings.json` for manual hook entries. If the "hooks" key exists with UserPromptSubmit, Stop, or SessionStart entries pointing to bash scripts, inform the user:

> **Note**: Found legacy hooks in settings.json. These should be removed since the plugin now provides hooks automatically. Remove the "hooks" section from ~/.claude/settings.json to prevent duplicate hook execution.

### Step 3: Verify Plugin Installation

The oh-my-claude-sisyphus plugin provides all hooks automatically via the plugin system. Verify the plugin is enabled:

```bash
grep -q "oh-my-claude-sisyphus" ~/.claude/settings.json && echo "Plugin enabled" || echo "Plugin NOT enabled"
```

If plugin is not enabled, instruct user:
> Run: `claude /install-plugin oh-my-claude-sisyphus` to enable the plugin.

### Step 4: Confirm Success

After completing all steps, report:

✅ **Sisyphus Configuration Complete**
- CLAUDE.md: Updated with latest configuration
- Hooks: Provided by plugin (no manual installation needed)
- Agents: 19+ available (base + tiered variants)
- Model routing: Haiku/Sonnet/Opus based on task complexity

**Note**: Hooks are now managed by the plugin system automatically. No manual hook installation required.
