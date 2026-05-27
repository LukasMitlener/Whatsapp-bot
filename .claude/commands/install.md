---
description: Install Core Workflow commands globally or to a project
allowed-tools: Read, Write, Bash, Glob, AskUserQuestion
model: sonnet
---

# Install

## Purpose

Install the Core Workflow commands from this module to your global `~/.claude/commands/` folder (available everywhere) or to a specific project's `.claude/commands/` folder. Since you cloned this repo, you already have these commands at the project level - this lets you install them elsewhere.

## Instructions

- List all available commands in this module
- Use AskUserQuestion to let user choose installation scope
- Use AskUserQuestion to let user select which commands to install
- Check for existing commands and handle conflicts
- Copy selected commands to the chosen location

## Workflow

1. **List available commands**
   - Read all `.md` files in `.claude/commands/`
   - Display each with its description

2. **Ask installation scope**
   - Use AskUserQuestion to ask:
     - **Global** (`~/.claude/commands/`) - Available in all projects
     - **Project** (specify path) - Available only in that project

3. **Check target location**
   - Verify the target folder exists (create if needed)
   - List any existing commands that would be overwritten

4. **Ask which commands to install**
   - Use AskUserQuestion with multiSelect: true
   - Show all available commands
   - Indicate which already exist at target

5. **Handle conflicts**
   - If command exists at target, ask:
     - Skip (keep existing)
     - Overwrite (replace with this version)

6. **Copy commands**
   - Copy each selected command to target
   - Preserve filenames

7. **Confirm installation**
   - List what was installed
   - List what was skipped
   - Show how to use the commands

## Available Commands

### Core Workflow (5 Phases)
| Command | Description |
|---------|-------------|
| plan | Create implementation specification |
| build | Implement from spec file |
| validate | Run tests and verify functionality |
| review | Compare implementation to spec |
| commit | Create git commit with message |

### Supporting Commands
| Command | Description |
|---------|-------------|
| prime | Understand the codebase quickly |
| handoff | Save session state for later |
| pickup | Resume from previous session |

## Report

```
Installation Complete

Target: [~/.claude/commands/ or /path/to/project/.claude/commands/]
Scope: [Global / Project]

Installed:
- plan.md
- build.md
- validate.md
- review.md
- commit.md

Skipped (already exist):
- prime.md

These commands are now available.
Try: /plan "your feature idea"

Workflow reminder:
  /plan → /build → /validate → /review → /commit
```

## Examples

**Run interactive install:**
```
/install
```

The command will ask you:
1. Where to install (global vs project)
2. Which commands to install
3. How to handle any conflicts
