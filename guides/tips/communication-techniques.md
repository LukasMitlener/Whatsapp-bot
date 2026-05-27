# Communication Techniques

How you communicate with Claude Code affects the quality of results.

## ASCII Diagrams

When you need to visualize architecture, ask for ASCII diagrams:

**Request:** "Show me an ASCII diagram of the API request flow"

**Result:**

```
┌─────────┐     ┌─────────┐     ┌──────────┐
│ Client  │────▶│   API   │────▶│ Database │
└─────────┘     └─────────┘     └──────────┘
     │               │               │
     │◀──────────────┼───────────────┤
     │   Response    │   Query       │
```

**Tips for better diagrams:**

- "Show me an ASCII architecture diagram"
- "Create a box-and-arrow diagram of the data flow"
- "Draw an ASCII representation of the component hierarchy"

## ASCII Folder Structures

Visualize project organization:

**Request:** "Show me an ASCII folder structure for this project"

**Result:**

```
project/
├── .claude/
│   ├── commands/
│   └── settings.json
├── src/
│   ├── components/
│   └── utils/
├── tests/
└── README.md
```

This is especially useful when:

- Planning new features
- Understanding unfamiliar codebases
- Documenting project structure

## Magic Keywords

### "ultrathink"

For complex reasoning tasks, include "ultrathink" in your prompt:

```
ultrathink about the best architecture for this feature
```

This signals Claude to:

- Take more time reasoning
- Consider multiple approaches
- Provide deeper analysis

**When to use:**

- Architectural decisions
- Complex debugging
- Trade-off analysis
- Design reviews

### "IMPORTANT" in Markdown Files

When writing instructions in `.md` files (like CLAUDE.md or command files), use "IMPORTANT" to emphasize critical points:

```markdown
## Instructions

IMPORTANT: Never delete files without user confirmation.

IMPORTANT: Always run tests before committing.
```

Claude Code pays extra attention to content marked as IMPORTANT.

## Visual Context with Screenshots

Give Claude Code "eyes" by including screenshots:

### Where to Store Screenshots

Create a dedicated folder:

```
project/
├── validation/
│   └── screenshots/
│       ├── 01_2026-01-25_login-page.png
│       └── 02_2026-01-25_dashboard.png
```

Or in docs:

```
project/
├── docs/
│   └── images/
│       └── error-screenshot.png
```

### How to Reference

Drag and drop the image into Claude Code, or reference the path:

```
Look at @docs/images/error-screenshot.png - why is this happening?
```

### When Screenshots Help

- UI bugs ("the button is misaligned")
- Error messages (show the exact error)
- Design references (show what you want it to look like)
- Documentation (visual guides)

## Browser Automation

Claude Code can interact with Chrome for testing and automation.

### What It Can Do

- Navigate to URLs
- Click elements
- Fill forms
- Take screenshots
- Read page content

### Example Use Cases

```
# Visual verification
"Open http://localhost:3000 and take a screenshot of the homepage"

# Form testing
"Go to the login page and test submitting with invalid credentials"

# Content extraction
"Navigate to [URL] and summarize what you see"
```

### Requirements

- Chrome browser installed
- Claude-in-Chrome MCP configured

**Note:** Browser automation is covered in more detail in Module 9 (Validation).
