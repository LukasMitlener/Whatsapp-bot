# Organization Tips

Good organization makes Claude Code more effective.

## The specs/ Folder System

**Covered in detail:** Module 3 (Core Workflow)

Quick summary:
```
specs/
├── todo/     # Plans waiting to be built
└── done/     # Completed plans (moved after /build)
```

**Pattern:**
1. `/plan` creates spec in `specs/todo/`
2. `/build` implements and moves to `specs/done/`
3. Reference completed specs later if needed

## Ideas Folder

Capture inspiration before it disappears:

```
project/
├── ideas/
│   ├── 2026-01-25-new-feature.md
│   ├── 2026-01-24-refactor-auth.md
│   └── random-thoughts.md
```

### Voice-to-Text Workflow

Using voice dictation (like Whisper, Wispr Flow, or your phone's dictation):

1. Create `ideas/voice-dump.md`
2. Open it and start dictating
3. Word vomit all your thoughts
4. Later, ask Claude Code to organize:
   ```
   @ideas/voice-dump.md - organize these ideas into actionable items
   ```

### Quick Capture Template

```markdown
# Idea: [Brief Title]
**Date:** YYYY-MM-DD
**Category:** feature | refactor | bug | enhancement

## Description
[What is it?]

## Why It Matters
[Why should we do this?]

## Rough Approach
[Initial thoughts on how]
```

## Screenshot Organization

Keep visual context organized:

```
project/
├── docs/
│   └── images/
│       ├── architecture/
│       ├── mockups/
│       └── bugs/
└── validation/
    └── screenshots/
        ├── 01_2026-01-25_feature-complete.png
        └── 02_2026-01-25_tests-passing.png
```

### Naming Convention

`NN_YYYY-MM-DD_description.png`

- `NN` = Sequential number (for ordering)
- `YYYY-MM-DD` = Date
- `description` = What it shows

Examples:
- `01_2026-01-25_login-page-before.png`
- `02_2026-01-25_login-page-after.png`

## Handoff/Pickup Pattern

**Covered in detail:** Module 3 (Core Workflow)

Quick summary:
- `/handoff` saves session context to `specs/handoffs/`
- `/pickup` resumes from the latest handoff
- Useful when ending a session or switching tasks

## Research Before Planning

Before diving into implementation:

```
1. Research Phase
   - Understand requirements
   - Review existing code
   - Check for similar patterns
   - Identify potential challenges

2. Planning Phase
   - Create detailed spec
   - Define success criteria
   - Consider edge cases

3. Build Phase
   - Implement from spec
   - Fresh context
```

**Tip:** Sometimes a quick research phase saves hours of rework.
