# Project Structure Map:

This document defines the strict directory structure for the project.
We follow a monorepo-style split within a single repo.

## Directory Tree

```text
project/
├── .claude/                # AI Context & Rules
│   ├── CLAUDE.md           # Master instructions
│   └── ...
├── .env                    # Environment variables
├── .gitignore
├── README.md
│
├── docs/                   # Human documentation
│   ├── structure.md        # This file
│   └── ...
│
├── ai_docs/                # Tech context for AI (API references)
│
├── specs/                  # Task Management
│   ├── todo/               # Active tasks (numbered, e.g., 01_setup.md)
│   ├── done/               # Completed history
│   └── handoffs/           # Session context
│
├── app/                    # SOURCE CODE ROOT
│   │
│   ├── client/             # FRONTEND (Next.js Application)
│   │   ├── app/            # App Router pages
│   │   ├── components/
│   │   │   ├── ui/         # Generic (shadcn)
│   │   │   ├── wizard/     # Wizard logic
│   │   │   └── dashboard/  # Agent interface
│   │   ├── lib/            # Utils, Zod schemas
│   │   ├── hooks/          # React hooks
│   │   ├── public/         # Static assets
│   │   ├── package.json    # Frontend dependencies
│   │   └── next.config.mjs
│   │
│   └── server/             # BACKEND (Supabase / Node)
│       ├── functions/      # Edge Functions
│       ├── db/             # SQL migrations & schema
│       └── package.json    # Backend dependencies (if needed)