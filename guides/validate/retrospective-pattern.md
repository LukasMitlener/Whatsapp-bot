# The Retrospective Pattern

## What is a Retrospective?

A retrospective is an end-of-session reflection that captures:
- What went well
- What went wrong
- What to improve

## Why Retrospectives?

- **Learn from mistakes** - Don't repeat errors
- **Capture knowledge** - Document solutions
- **Improve commands** - Make tools better
- **Track progress** - See patterns over time

## When to Run

Run `/EA-retrospective` at the end of:
- Each coding session
- After completing a feature
- When encountering significant issues
- Before taking a break

## The Workflow

```
1. Complete your work session
       ↓
2. Run /EA-retrospective [session-name]
       ↓
3. Review the generated report
       ↓
4. Next session: Run /EA-apply-learnings
       ↓
5. Improvements applied automatically
```

## Output Location

Retrospectives are saved to:
```
docs/retrospectives/
├── retrospective-2026-01-25-001-feature-login.md
├── retrospective-2026-01-25-002-bugfix-api.md
└── retrospective-2026-01-26-001-refactor.md
```

## File Naming

Format: `retrospective-YYYY-MM-DD-NNN-session-name.md`

- **Date**: When created
- **Number**: Sequential per day (001, 002...)
- **Session**: Optional description

## What Gets Captured

### Errors Encountered
Build failures, type errors, API issues, merge conflicts

### Snags & Blockers
Unexpected issues, missing dependencies, configuration problems

### Lessons Learned
Key takeaways, new knowledge, things that worked well

### Improvement Recommendations
Command updates, process changes, documentation needs

## Applying Learnings

After creating a retrospective, apply the improvements:

```bash
/EA-apply-learnings        # Most recent
/EA-apply-learnings 3      # Last 3 retrospectives
```

## Tips

1. **Name sessions descriptively** - Makes finding them easier
2. **Be honest** - Capture real issues, not just successes
3. **Apply learnings promptly** - Don't let improvements pile up
4. **Review periodically** - Look for patterns across sessions
