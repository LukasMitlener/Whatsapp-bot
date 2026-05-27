# Utility Commands

Helpful commands for managing your Claude Code sessions.

## Session Information

### /stats

Shows session statistics:
- Token usage
- API calls made
- Session duration
- Cost estimate

```
> /stats
Session Stats:
- Duration: 45 minutes
- Tokens used: 125,000
- API calls: 23
- Estimated cost: $0.45
```

### /status

Shows current session status:
- Session ID
- Model in use
- Active tools
- Configuration state

### /usage

Shows usage information:
- Current plan limits
- Usage this period
- Remaining quota

## Troubleshooting

### /doctor

Diagnoses common issues:
- Configuration problems
- MCP server status
- Permission issues
- Tool availability

```
> /doctor
Checking Claude Code health...
✓ Configuration valid
✓ All MCP servers responding
✓ Permissions configured
✓ Tools available
```

**Run /doctor when:**
- Tools aren't working
- Strange behavior occurs
- After configuration changes

## Reference Commands

### /tools

Lists all available tools:
- Built-in tools (Read, Write, Bash, etc.)
- MCP tools (from configured servers)
- Tool descriptions and capabilities

### /help

Shows available commands:
- Built-in slash commands
- Custom commands (from .claude/commands/)
- Command descriptions

**Tip:** `/help` is your quick reference guide.

## Session Management

### /rename

Name your sessions for easy identification:

```
> /rename refactoring-auth-system
Session renamed to: refactoring-auth-system
```

**Benefits:**
- Find sessions easily with `--resume`
- Know what each session was about
- Better organization

### /resume

Continue a previous session:

```bash
# From command line
claude --resume

# Or as slash command
> /resume
```

Shows list of recent sessions to choose from.

## Quick Reference Table

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/stats` | Session statistics | Check usage and cost |
| `/status` | Session status | Verify current state |
| `/usage` | Account usage | Check plan limits |
| `/doctor` | Troubleshoot issues | When things break |
| `/tools` | List tools | See what's available |
| `/help` | List commands | Quick reference |
| `/rename` | Name session | Organize sessions |
| `/context` | Context usage | Monitor token usage |
| `/clear` | Reset context | Fresh start |
