# Validation Workflow Guide

## Why Validate?

Validation confirms that what you built actually works. It catches issues before they reach users.

## The Validation Phase

In the core workflow (Plan → Build → **Validate** → Review → Release), validation sits between building and reviewing.

```
BUILD something
    ↓
VALIDATE it works
    ↓
REVIEW against requirements
```

## When to Validate

- After completing a build phase
- Before committing code
- After making changes to existing code
- Before deploying to production

## Validation Methods

| Method | Use When | Command |
|--------|----------|---------|
| Tests | Code has test coverage | `/EA-validate` |
| Visual | UI changes | `/EA-visual-verify` |
| Manual | Complex flows | Review in browser |

## Quick Validation Workflow

1. Run `/EA-validate --quick` for fast feedback
2. Run `/EA-validate` for full test suite
3. Run `/EA-visual-verify <url>` to capture UI state
4. Review results and fix any issues

## Trusting Your Agents

With validation hooks in place, agents validate their own work automatically. This means:
- Less manual checking required
- Consistent quality
- Faster iteration
- Peace of mind
