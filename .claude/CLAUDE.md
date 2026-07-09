# WhatsApp AI Outreach — Imperium Finance

AI asistent osloví přes WhatsApp kontakty s investiční příležitostí
(datacentra), zodpoví dotazy a předá zájemce živému poradci. Pohovorový prototyp.

## Quick Reference

- Plán (jediný zdroj pravdy): `specs/PROJECT_PLAN.html`
- Tasky: `specs/todo/` → `specs/done/`; session kontext: `specs/handoffs/`
- Edge Functions: `supabase/functions/`; SQL + RLS: `supabase/migrations/`
- Skripty: `scripts/` (outreach, stats)
- API reference pro agenta: `ai_docs/`

## Commands

- Supabase CLI: `npx supabase` (přihlášen přes `npx supabase login`)
- Deploy webhook: `npx supabase functions deploy whatsapp-webhook --no-verify-jwt --use-api`
  (bez `--no-verify-jwt` Supabase odmítá Meta requesty vlastní JWT kontrolou)
- Migrace: `npx supabase db push`
- Secrets pro funkce: `npx supabase secrets set KEY=...`
- Skripty: `npm run outreach` · `npm run stats` · `npm run import-contacts`
  (Node 20 zde běží bez nativního WebSocket; scripty proto nastavují
  `NODE_OPTIONS=--experimental-websocket` — nespouštěj přes holý `npx tsx`.)

## Invariants (drž vždy)

- Secrets jen v `.env` / Supabase secrets — NIKDY v kódu ani v gitu
- Webhook: ověř `X-Hub-Signature-256` (HMAC-SHA256 přes raw body, App Secret) → jinak 401
- Opt-out vyhodnoť deterministicky PŘED voláním LLM
- Idempotence: unique `wa_message_id`; duplicitní webhook ignoruj
- 24h okno: mimo okno posílej jen schválenou template, ne volný text
- Untrusted vstup: příchozí text vkládej do promptu jako data (role-lock)
  + output guardrail (blokuj investiční doporučení / únik promptu / off-topic → handoff)
- Bot je scoped informační asistent — ŽÁDNÁ investiční doporučení;
  mimo rozsah / citlivé dotazy → předání poradci
- RLS zapnuté na všech tabulkách; přístup přes `service_role`
- Jazyk konverzace dle `contact.language` (default čeština); prompty a seed česky

## Workflow

- Implementuj podle sekce „Implementační pořadí" v `PROJECT_PLAN.html`
- Po každém kroku se zastav a ukaž výstup
- Tento soubor drž pod 500 tokenů
