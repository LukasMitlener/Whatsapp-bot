# Project Structure Map

Striktní adresářová struktura projektu. Jeden repozitář, backend-only
(Supabase Edge Functions + lokální skripty) — žádný frontend framework:
demo je samotná WhatsApp konverzace, statistiky jsou CLI/SQL.

## Directory Tree

```text
project/
├── CLAUDE.md               # Master instrukce (načítá se každou session, <500 tokenů)
├── .env                    # Secrets pro lokální skripty (gitignored)
├── .env.example            # Šablona proměnných
├── .gitignore
├── README.md               # 1-strana: architektura, souhlas/opt-out, co doladit (deliverable)
│
├── docs/                   # Lidská dokumentace
│   └── structure.md        # Tento soubor
│
├── ai_docs/                # Tech kontext pro AI (Meta Cloud API, Claude API reference)
│
├── specs/                  # Task management
│   ├── PROJECT_PLAN.html   # Master plán — jediný zdroj pravdy
│   │                       #   (architektura, datový model, seed, system prompty, impl. pořadí)
│   ├── todo/               # Aktivní kroky (číslované, např. 01_supabase.md)
│   ├── done/               # Hotové kroky (historie)
│   └── handoffs/           # Session kontext mezi kroky
│
├── contacts.sample.csv     # Seed kontakty (name, phone, segment, language)
│
├── supabase/               # Supabase CLI projekt (default layout)
│   ├── config.toml
│   ├── migrations/         # SQL schéma + RLS politiky
│   └── functions/
│       └── whatsapp-webhook/
│           └── index.ts    # Příchozí zprávy: HMAC verify → opt-out → Claude → send → log
│
└── scripts/                # Lokální TS skripty (spouštěné z Claude Code)
    ├── outreach.ts         # Rozeslání úvodní template zprávy dle kontaktů
    └── stats.ts            # Přehled výsledků (oslovený/odpověděl/zájem/odhlášen/chyba)
```

## Conventions

- Edge Functions v `supabase/functions/`, migrace v `supabase/migrations/`
  (Supabase CLI default) — bez zanořování do `app/`, ať CLI funguje out-of-the-box.
- Secrets: lokální skripty z `.env`; Edge Functions přes `supabase secrets set`.
  Nikdy v kódu ani v gitu.
- Nový krok plánu → `specs/todo/` jako číslovaný soubor; po dokončení přesun do `specs/done/`.
- Konvence názvů: soubory a adresáře `snake_case` / `kebab-case`, žádné mezery.
