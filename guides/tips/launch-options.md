# Launch Options & CLI Aliases

Speed up your Claude Code workflow with command-line shortcuts.

## Basic Launch Commands

```bash
# Standard launch (interactive mode)
claude

# Launch with specific model
claude --model opus      # Best quality, complex reasoning
claude --model sonnet    # Balanced speed/quality (default)
claude --model haiku     # Fastest, simple tasks
```

## The /init Command

Starting a new project? Run `/init` to set up Claude Code configuration:

```bash
claude
> /init
```

This creates:

- `.claude/` directory structure
- Basic `CLAUDE.md` file
- Initial settings

Great for beginners who want proper project structure from the start.

## Session Management

```bash
# Resume your last session
claude --resume

# Or use the slash command after starting
claude
> /resume
```

**Tip:** Name your sessions with `/rename session-name` for easier identification.

## The Skip Permissions Flag

For experienced users who want uninterrupted workflow:

```bash
claude --dangerously-skip-permissions
```

**What it does:** Skips all permission prompts (file edits, bash commands, etc.)

**When to use:**

- You understand Claude Code well
- You're working in a sandboxed/safe environment
- You want maximum speed

**When NOT to use:**

- Learning Claude Code
- Working with important/production files
- Unfamiliar codebase

## Setting Up CLI Aliases

Save typing with shell aliases.

### PowerShell (Windows)

1. Open your PowerShell profile:
   ```powershell
   notepad $PROFILE
   ```

2. Add these functions:
   ```powershell
   # Basic aliases
   function cld { claude $args }
   function cldo { claude --model opus $args }
   function clds { claude --model sonnet $args }
   function cldh { claude --model haiku $args }

   # Resume session
   function cldr { claude --resume $args }

   # Skip permissions (use carefully!)
   function lfg { claude --dangerously-skip-permissions --model opus $args }
   ```

3. Save and restart PowerShell, or run:
   ```powershell
   . $PROFILE
   ```

### Bash/Zsh (Mac/Linux)

1. Open your shell config:
   ```bash
   # For Bash
   nano ~/.bashrc

   # For Zsh
   nano ~/.zshrc
   ```

2. Add these aliases:
   ```bash
   # Basic aliases
   alias cld="claude"
   alias cldo="claude --model opus"
   alias clds="claude --model sonnet"
   alias cldh="claude --model haiku"

   # Resume session
   alias cldr="claude --resume"

   # Skip permissions (use carefully!)
   alias lfg="claude --dangerously-skip-permissions --model opus"
   ```

3. Save and run:
   ```bash
   source ~/.bashrc  # or ~/.zshrc
   ```

## Quick Reference

| Alias | Full Command | Use Case |
|-------|--------------|----------|
| `cld` | `claude` | Standard launch |
| `cldo` | `claude --model opus` | Complex reasoning tasks |
| `clds` | `claude --model sonnet` | Balanced everyday use |
| `cldh` | `claude --model haiku` | Quick simple tasks |
| `cldr` | `claude --resume` | Continue previous session |
| `lfg` | `claude --dangerously-skip-permissions --model opus` | Maximum speed (advanced) |
