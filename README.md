# WhatsApp AI Outreach — Imperium Finance

Prototyp AI asistenta, který přes WhatsApp osloví kontakty s jednou konkrétní
investiční příležitostí (datová centra), věcně odpoví na dotazy v mezích
zveřejněných faktů a zájemce předá živému poradci. Jediný zdroj pravdy pro
implementaci: [`specs/PROJECT_PLAN.html`](specs/PROJECT_PLAN.html). Detailní
technický rozpis (bezpečnost, personalizace, 24h okno, náklady, nápady na
rozšíření, dev skripty): [`ai_docs/technical-details.md`](ai_docs/technical-details.md).

## Stav odevzdání: custom template čeká na schválení Metou

Custom úvodní template (`imperium_datacenters_intro_cs/en`, kategorie
MARKETING) byl podán ke schválení, ale k datu odevzdání je stále `PENDING`
— schvalovací fronta je čistě na straně Mety, nejde uspíšit ani odhadnout
z API. Demo proto ukazuje dvě věci odděleně:

1. **Mechanismus business-initiated oslovení** (`scripts/outreach.ts`) —
   rate-limit, logování, přechod statusů — reálně otestovaný proti
   schválenému `hello_world` templatu jako náhradě za obsah.
2. **Celá reálná konverzace** (LLM odpovědi, rozpoznání zájmu/nezájmu,
   opt-out, handoff) — otestováno end-to-end na skutečných WhatsApp
   číslech a nezávisí na schválení template, protože jde o odpovědi
   v rámci 24h okna, ne o zahájení konverzace.

Jakmile Meta template schválí, `npm run outreach` pošle reálný obsah bez
další úpravy kódu.

## Architektura a proč

```
contacts.sample.csv → scripts/outreach.ts → Meta Cloud API → supabase/functions/whatsapp-webhook
                                                                  ↓ HMAC verify → opt-out gate → Claude → guardrail → odeslání + log
                                                              Supabase (contacts / conversations / messages)
                                                                  ↑
                                                         scripts/stats.ts (přehled)
```

Tři pohyblivé části nad jednou Supabase databází, žádný frontend — demo je
samotná WhatsApp konverzace.

- **Supabase Edge Functions místo n8n/Make:** veřejná HTTPS URL z krabice
  (bez ngrok/tunelování), verzovatelný a testovatelný kód, jeden jazyk
  (TypeScript/Deno) pro celý projekt, nasazení jedním CLI příkazem. Pro
  tenhle rozsah (jeden webhook, jasně daná pipeline) je vlastní kód
  přímočařejší a snáz auditovatelný než skládání z automatizační platformy.
- **Tenké fetch klienty místo SDK balíčků** (`_shared/claude.ts`,
  `_shared/whatsapp.ts`): žádné bundlování navíc v Edge runtime, je vidět
  přesně, jaký request/response tvar se posílá/čte.
- **Oficiální Meta Cloud API, ne Baileys/web automatizace:** neoficiální
  knihovny (Baileys a podobné, které automatizují WhatsApp Web) porušují
  Meta ToS a riskují trvalý ban čísla/účtu — nepřijatelné riziko i pro
  prototyp, natožpak produkci s reálnými klienty. Cloud API je pomalejší
  na rozjezd (schvalování templatů, testovací čísla), ale je to jediná
  cesta, která v produkci vydrží.
- **Scope:** bot je záměrně omezený na jedno téma s handoffem mimo rozsah
  (lead-qualification/zákaznická podpora, ne obecný AI asistent) — vědomá
  volba, mj. s ohledem na to, kam Meta od 1/2026 směřuje politiku AI na
  WhatsApp Business Solution (detail v `ai_docs/technical-details.md`).

## Souhlas, opt-out a co doladit pro produkci

- Kontakty v `contacts.sample.csv` jsou "kontaktovatelné" — souhlas s
  kontaktováním je vstupní předpoklad testu, ne něco, co prototyp sbírá.
- Opt-out se vyhodnocuje **deterministicky, regexem, před jakýmkoli
  voláním LLM** (`_shared/optout.ts`) — nejde o rozhodnutí modelu, aby ho
  nešlo obejít přes obsah zprávy. Rozpoznává `STOP`, „nemám zájem",
  „odhlásit"/„odhlaste", `unsubscribe`/`not interested`. Nastaví
  `contacts.status = opted_out`, ukončí konverzaci a pošle jedinou
  deterministickou potvrzovací zprávu bez Claude volání. Jakmile je
  kontakt `opted_out`, nic v kódu ho nepřepíše zpět (ani technická chyba
  doručení).
- **Pro ostré nasazení by bylo potřeba:** WhatsApp-specifický opt-in tok
  (obecný marketingový souhlas ≠ WhatsApp opt-in) + frequency capping;
  trvalý System User token místo dočasného 24h tokenu (na tenhle rozdíl
  jsme reálně narazili při stavbě); skutečné směrování handoffu
  (CRM/Slack/e-mail, ne jen DB flag); víc než jedna template/kampaň
  s počítáním se schvalovací frontou Mety do timeline; přesun ze
  synchronního request-response webhooku na frontu/worker při větším
  objemu (dnes celá pipeline — Claude, guardrail, odeslání — běží
  v jednom HTTP requestu, pro prototyp v pořádku).

## Co bych udělal líp

- **Guardrail model občas zabalí JSON do markdown code fence** i přes
  explicitní instrukci "vrať POUZE JSON" — objeveno a opraveno
  (`stripCodeFence` v `_shared/claude.ts`), ale ukazuje, že spoléhat na
  "model vrátí čistý JSON" bez obranné vrstvy je křehké i u jednoduchých
  klasifikačních promptů.
- **Konverzační historie se do promptu vůbec neposílá** — každé volání
  vidí jen aktuální zprávu klienta, ne předchozí tahy stejné konverzace.
  V testování to nevadilo (STOP/zájem/nezájem jsou kontextově nezávislé
  signály), ale navazující dotaz na dřívější odpověď by asistent
  nezvládl. Zjištěno až při ručním testování — mělo to být pokryto dřív.
- Detekce zájmu je jedno LLM posouzení na zprávu — u hraničních
  formulací může být false negative/positive; pomohl by kalibrační set
  testovacích zpráv s očekávaným výstupem (viz `ai_docs/technical-details.md`).
- Sdílený Supabase projekt (více kodebází pohromadě) vyžadoval
  jednorázové sladění historie migrací — pro nový produkční projekt by
  bylo čistší mít dedikovaný projekt od začátku.

## Spuštění

```bash
cp .env.example .env               # doplň Supabase/Meta/Anthropic klíče
npx supabase db push               # migrace (schema, RLS, stats view)
npm run import-contacts            # import contacts.sample.csv, status=pending
npx supabase functions deploy whatsapp-webhook --no-verify-jwt --use-api
npm run outreach                   # rozešle úvodní template
npm run stats                      # přehled výsledků + náklady
```

Detailní checklist pro Meta setup: [`ai_docs/meta-whatsapp-setup.md`](ai_docs/meta-whatsapp-setup.md).
