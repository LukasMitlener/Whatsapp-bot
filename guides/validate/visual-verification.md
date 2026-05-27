# Visual Verification Guide

## What is Visual Verification?

Visual verification captures screenshots of your application to prove it works as expected. It creates visual evidence of functionality.

## Why Screenshots?

- **Proof**: Evidence that features work
- **Documentation**: Visual history of changes
- **Debugging**: See exactly what happened
- **Review**: Share progress with others

## Using EA-Visual-Verify

### Basic Usage

```bash
/EA-visual-verify http://localhost:3000
```

### With Description

```bash
/EA-visual-verify http://localhost:3000 --name login-page-loaded
```

### Full Page Capture

```bash
/EA-visual-verify http://localhost:3000/dashboard --name dashboard --full-page
```

## Screenshot Naming

Screenshots are automatically named with:
- **Number**: Order captured (01, 02, 03...)
- **Date**: When captured (YYYY-MM-DD)
- **Description**: What it shows

Example: `01_2026-01-25_login-page.png`

## Storage Location

All screenshots go to:
```
validation/
└── screenshots/
    ├── 01_2026-01-25_login-page.png
    ├── 02_2026-01-25_dashboard.png
    └── 03_2026-01-25_user-profile.png
```

## The Validation Log

Each screenshot is logged in `validation/validation-log.md`:

```markdown
## [2026-01-25 14:30] Screenshot Captured
- **File**: validation/screenshots/01_2026-01-25_login-page.png
- **URL**: http://localhost:3000
- **Notes**: Login form visible, no errors
```

## Playwright MCP

Visual verification uses the Playwright MCP. Ensure your `.mcp.json` includes:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

## Tips

1. **Be descriptive** - Name screenshots clearly
2. **Capture critical paths** - Focus on key functionality
3. **Review the log** - Check validation-log.md for history
4. **Clean up periodically** - Archive old screenshots
