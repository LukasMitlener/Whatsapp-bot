# Context Management

Your context window is precious. Learn to manage it effectively.

## Understanding Context

Claude Code has a limited context window (how much it can "remember" in a conversation). As you work, this fills up with:

- Your prompts and Claude's responses
- Files you've read or edited
- Tool outputs and results
- System overhead (tools, settings, etc.)

When context fills up, Claude Code becomes less effective. Managing context is key to productive sessions.

## The /context Command

**Run `/context` regularly** to see your current usage:

```
Context window: 45% used (90K/200K tokens)
- Messages: 38%
- System: 7%
```

**When to check:**

- Start of session (should be < 10%)
- After major operations
- Every 15-20 minutes during active work
- Before starting a new task

## /clear vs /compact

| Command | What It Does | When to Use |
|---------|--------------|-------------|
| `/clear` | Completely resets context | Start fresh, especially between workflow phases |
| `/compact` | Compresses conversation history | NOT recommended - can lose important context |

### The /clear + /prime Pattern

Instead of trying to compress a bloated session:

1. Run `/clear` to reset completely
2. Run `/prime` to re-establish codebase understanding
3. Continue with a fresh, focused context

This pattern gives better results than trying to salvage a polluted context.

### Disable Auto Compact

Auto Compact can trigger at inconvenient times. Consider disabling it:

1. The status line will warn you when context is high
2. You decide when to clear based on your workflow
3. More control over your session state

## @ Mentions for Quick Context

Instead of asking Claude to search for files:

```
# Slower (Claude searches):
"Look at the user model and tell me the fields"

# Faster (you provide context):
"@src/models/user.ts - explain these fields"
```

**Benefits:**

- Saves tokens (no search tool calls)
- Faster responses
- You control exactly what context is included

## Fresh Instances for Each Phase

The Plan → Build → Validate → Review workflow works best with fresh context:

| Phase | Why Fresh Context Helps |
|-------|------------------------|
| Plan | Focus on requirements, not old code discussions |
| Build | Clean slate for implementation |
| Validate | No confusion from build-phase errors |
| Review | Fresh perspective on the completed work |

**Pattern:**

1. Complete planning phase
2. `/clear` + `/prime`
3. Start build phase with plan file reference
4. Repeat for each subsequent phase

## Custom Status Line

Want to always see your context usage? Set up a custom status line.

See: `templates/statusline-setup.md` for the complete guide.

Quick preview of what you'll see:

```
[Opus 4.5] ▓▓▓▓░░░░░░ 38% ~53% (76K/200K) · @ main · D:\Projects\MyApp · 34m
```

The dual percentage shows:

- 38% = Raw message tokens
- ~53% = Estimated total including system overhead
