# Trusting Your Agents

## The Challenge

When Claude Code runs autonomously, how do you know it's doing things correctly? You can't watch every step.

## The Solution: Validation Hooks

Hooks are automatic checks that run during agent execution. They ensure quality without manual oversight.

```
Agent does work
      ↓
Hook automatically validates
      ↓
Issues caught immediately
      ↓
Agent fixes problems
      ↓
You get quality output
```

## Why This Matters

With validation hooks in place:

| Without Hooks | With Hooks |
|---------------|------------|
| Manual review required | Automatic validation |
| Issues found late | Issues caught immediately |
| Inconsistent quality | Consistent standards |
| More babysitting | Less terminal time |

## Hooks in Different Places

### Global Hooks (All Projects)
```
~/.claude/settings.json → hooks section
```

### Project Hooks (This Project)
```
.claude/settings.json → hooks section
```

### Frontmatter Hooks (Single Command/Agent)
```yaml
---
hooks:
  PostToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: uv run ./validator.py
  Stop:
    - hooks:
        - type: command
          command: uv run ./build-validator.py
---
```

## The Trust Pyramid

```
        /\
       /  \      Frontmatter hooks
      /    \     (specific validation)
     /------\
    /        \   Project hooks
   /          \  (project standards)
  /------------\
 /              \ Global hooks
/                \(universal protection)
------------------
```

## What to Validate

| Area | Hook Type | Example |
|------|-----------|---------|
| Tests | PostToolUse on Bash | Validate test results |
| Build | Stop | Verify build artifacts exist |
| Security | PreToolUse on Bash | Block dangerous commands |
| Format | PostToolUse on Write | Validate file format |

## Blocking vs Informational Hooks

**Informational hooks** report but don't stop:
```python
# Always continues, just logs
print(json.dumps({"continue": True}))
```

**Blocking hooks** can stop execution:
```python
# Block the agent - it will receive feedback and retry
print(json.dumps({
    "decision": "block",
    "reason": "Tests failed: 3 assertions failed"
}))

# Allow - empty object means success
print(json.dumps({}))
```

## The Self-Correction Loop

This is the key pattern that makes agents trustworthy:

```
Agent does work
      ↓
Hook validates output
      ↓
BLOCKED with feedback ←─────┐
      ↓                      │
Agent receives error message │
      ↓                      │
Agent fixes the issue        │
      ↓                      │
Hook validates again ────────┘
      ↓
PASS → Work complete
```

The agent **cannot finish** until validation passes. This creates self-correcting behavior.

## Setting It Up

1. **Start with security** (Module 07 covers this)
2. **Add test validation** (this module's `test-validator.py`)
3. **Add build validation** (this module's `build-validator.py`)
4. **Check logs** (validators write to `validators/*.log`)

## Peace of Mind

Once hooks are configured:
- Agents validate their own work
- You don't have to micromanage
- Quality is consistent
- You can focus on higher-level tasks

**This is the power of validation hooks: Trust, but verify automatically.**

## Validator Script Pattern

All validators follow this structure (using `uv run` for dependency management):

```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
import json
import sys
from pathlib import Path
from datetime import datetime

LOG_FILE = Path(__file__).parent / "validator-name.log"

def log(message: str):
    timestamp = datetime.now().strftime("%H:%M:%S")
    with open(LOG_FILE, "a") as f:
        f.write(f"[{timestamp}] {message}\n")

def main():
    # Read hook input from stdin
    hook_input = json.loads(sys.stdin.read())

    errors = []
    # ... validation logic ...

    if errors:
        # BLOCK - agent receives feedback
        print(json.dumps({
            "decision": "block",
            "reason": "\\n".join(errors)
        }))
    else:
        # PASS - empty object
        print(json.dumps({}))

if __name__ == "__main__":
    main()
```

This pattern ensures:
- **Logging** for debugging (check `validators/*.log`)
- **JSON output** for Claude Code to parse
- **Dependencies** embedded in script (no pip install needed)
