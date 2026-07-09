# WhatsApp AI Outreach — Imperium Finance

Prototyp AI asistenta, který přes WhatsApp osloví kontakty s jednou konkrétní
investiční příležitostí (datová centra), věcně odpoví na dotazy v mezích
zveřejněných faktů a zájemce předá živému poradci. Jediný zdroj pravdy pro
implementaci: [`specs/PROJECT_PLAN.html`](specs/PROJECT_PLAN.html).

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

**Proč Supabase Edge Functions místo n8n:** veřejná HTTPS URL z krabice (bez
ngrok/tunelování), verzovatelný a testovatelný kód, jeden jazyk
(TypeScript/Deno) pro celý projekt, nasazení jedním CLI příkazem přímo
z Claude Code.

**Proč tenké fetch klienty místo SDK** (`_shared/claude.ts`,
`_shared/whatsapp.ts`): žádné bundlování navíc v Edge runtime, snazší audit
— je vidět přesně, jaký request/response tvar se posílá/čte.

**Proč oficiální Meta Cloud API, ne Baileys/web automatizace:** neoficiální
knihovny (Baileys a podobné, které automatizují WhatsApp Web) porušují Meta
ToS a riskují trvalý ban čísla/účtu — nevhodné i pro prototyp, natožpak pro
produkci s reálnými klienty. Cloud API je pomalejší na rozjezd (schvalování
templatů, testovací čísla), ale je to jediná cesta, která v produkci vydrží.

## Compliance: proč tenhle scope

Meta od 15. 1. 2026 omezuje na WhatsApp Business Solution používání AI
providerů tam, kde je AI hlavní funkcí kanálu; business automatizace a
zákaznická podpora zůstávají povolené. Bot je proto záměrně scoped na jedno
téma (jedna investiční příležitost) s deterministickým handoffem mimo rozsah
— funguje jako lead-qualification/zákaznická podpora, ne jako obecný
open-ended AI asistent. Nejde o formální právní posouzení (přesné znění
podmínek stojí za ověření přímo u Mety před produkčním nasazením), ale scope
+ handoff je vědomá implementační volba udělaná s touhle politikou na mysli,
ne náhoda.

## Souhlas a opt-out

- Kontakty v `contacts.sample.csv` jsou "kontaktovatelné" — souhlas s
  kontaktováním je vstupní předpoklad testu, ne něco, co tenhle prototyp
  sbírá. **Pro produkci** je potřeba WhatsApp-specifický opt-in (obecný
  marketingový souhlas ≠ WhatsApp opt-in dle Meta policy) + frequency
  capping.
- Opt-out se vyhodnocuje **deterministicky, regexem, před jakýmkoli voláním
  LLM** (`_shared/optout.ts`) — nejde o rozhodnutí modelu, aby ho nešlo
  obejít prompt injection přes obsah zprávy. Rozpoznává `STOP`, „nemám
  zájem", „odhlásit"/„odhlaste" i anglické `unsubscribe`/`not interested`.
  Nastaví `contacts.status = opted_out` + `opted_out_at`, ukončí konverzaci
  (`conversations.state = opted_out`) a pošle jedinou deterministickou
  potvrzovací zprávu — bez Claude volání.
- Jakmile je kontakt `opted_out`, žádná další cesta v kódu ho nepřepíše
  (viz `markContactErrorUnlessOptedOut` v `whatsapp-webhook/index.ts`) —
  technická chyba doručení nemá přednost před explicitním odhlášením.

## Známý stav: Imperium Test = `error`

Kontakt `+420608092412` má v demu záměrně a doloženě `status = error`, ne
přehlédnutou chybu: číslo vyžaduje, aby firma přeposlala ověřovací kód od
Mety (testovací číslo smí psát jen ověřeným příjemcům), což se v tomhle
běhu nestalo. Odeslání selhalo s `131030 "Recipient phone number not in
allowed list"`, zalogováno s `error_code`/`error_detail`, kontakt korektně
přešel do `error` bez opakování — přesně chování ze sekce 6 plánu, na
reálném příkladu. Viz `ai_docs/meta-whatsapp-setup.md`.

## Bezpečnost (shrnutí — detailně viz PROJECT_PLAN.html sekce 5)

- **Webhook:** `X-Hub-Signature-256` (HMAC-SHA256 přes raw body, App Secret,
  constant-time compare) → jinak 401. Bez podpisu se netouchne DB ani LLM.
  Funkce je nasazená s `--no-verify-jwt` — to je **vědomé rozhodnutí, ne
  vypnutá obrana**: Meta neposílá Supabase JWT, takže Supabase-level auth by
  na tenhle request typ stejně neplatila. Autentizace se přesouvá na
  správnou vrstvu (HMAC podpis), ne že by chyběla.
- **Prompt injection:** text klienta jde do promptu jako ohraničená DATA
  (`<<<...>>>`), ne jako instrukce; navíc output guardrail (Claude Haiku)
  před odesláním kontroluje bezpečnost i únik promptu/off-topic.
- **Finanční pojistky:** system prompt drží model výhradně u zveřejněných
  faktů (`OPPORTUNITY_FACTS` v `_shared/prompts.ts`); modelové scénáře
  výkonnosti mají povinný disclaimer napevno spojený s čísly v datech, ne
  jen jako pokyn navíc — guardrail navíc explicitně kontroluje, že disclaimer
  u čísel nechybí. Fakta jsou **kurátorovaný statický snapshot** k datu
  stažení (viz zdrojová URL v `OPPORTUNITY_FACTS`), ne živý scrape stránky —
  záměrně, aby se do promptu nedostala marketingová omáčka ("plně
  garantováno", nepodložené odhady) a nerozbila finanční pojistky. Cena za
  aktuálnost: fakta je nutné ručně obnovit, pokud se zdroj změní.
- **Idempotence:** `messages.wa_message_id` je `unique` — Meta retry
  (timeout/non-2xx) se na DB constraintu tiše zahodí, žádné dvojí volání
  Clauda ani dvojí odpověď.
- **RLS:** zapnuté na všech tabulkách, žádné policy pro `anon` — přístup
  jen přes `service_role`. Navíc `stats_overview` view běží se
  `security_invoker = true` (jinak by view defaultně běželo s právy
  vlastníka a obcházelo RLS podkladových tabulek — reálně nalezená a
  opravená mezera při stavbě, ne teoretická).
- **Náklady/rate-limit:** podpis blokuje nepodepsané requesty; strop 40
  zpráv na konverzaci; outreach skript má rate-limit + exponenciální
  backoff na HTTP 429.

## 24h okno

WhatsApp dovoluje volný text jen do 24 h od poslední zprávy klienta; mimo
okno smí jít jen schválená template. Webhook to počítá ze skutečného
`message.timestamp` (kdy Meta zaznamenala zprávu klienta), ne z okamžiku
zpracování — funguje správně i při zpožděné/backfillované doručence.

## Personalizace

Jazyk a segment jdou do system promptu jako **datové fakty**, ne jako
samostatný pravidlový engine s větvenou logikou (`buildSystemPrompt` v
`_shared/prompts.ts`):

- **Jazyk** (`contact.language`) — řídí jazyk odpovědi i výběr template
  (cs/en varianta).
- **Segment** (`contact.segment`) — jemně ovlivňuje tón/míru detailu:
  `retail` bez žargonu, `affluent` může zmínit diskrétní konzultaci,
  `existing_client` krátce naváže na existující vztah. Fakta a compliance
  pravidla se segmentem nemění, jen způsob podání.
- **Oslovení:** vždy vykání ("Vy"/"Vám"), nikdy tykání — explicitní
  pravidlo v system promptu, nezávislé na tom, jak píše klient.

## Rozpoznání zájmu, nezájmu a handoff

Guardrail (Claude Haiku) dostává při jednom volání dvojí úkol: safety-check
odpovědi asistenta + třístavovou klasifikaci **zprávy klienta**
(`interested` / `not_interested` / `neutral`). Žádné druhé LLM volání navíc.

- `interested` → `contacts.status = interested`, `conversations.state =
  handed_off`. Handoff je v tomto prototypu **označení + log** — reálné
  směrování k poradci (e-mail/Slack notifikace) je přímé rozšíření, ne
  součást MVP.
- `not_interested` → `conversations.state = closed`, `outcome =
  not_interested`. Žádná zvláštní zpráva navíc — Claude odpověď je díky
  system promptu už sama zdvořilá a stručná (splňuje "pokud zájem nemá,
  slušně a krátce ukončit").
- `neutral` (dotaz, nejasná odpověď) → konverzace pokračuje normálně
  (`state = active`).

Explicitní žádost o úplné odhlášení (STOP a synonyma) řeší samostatný
deterministický opt-out gate výše, ne guardrail — má přednost před touhle
klasifikací.

## Náklady

- **WhatsApp:** Meta účtuje per-message podle kategorie template; na
  testovacím čísle je vše zdarma. Sazba je per-country, ceník se mění —
  nefixováno v kódu.
- **Claude:** `messages.input_tokens` / `output_tokens` se loguje na každé
  volání → `npm run stats` ukáže reálný, měřený náklad (ne odhad), včetně
  průměru na konverzaci. Guardrail běží na Haiku (levný model), hlavní
  odpověď na Sonnetu.
- **Škálování:** náklad roste lineárně s (počet konverzací × zprávy na
  konverzaci). Páky: kratší FAKTA blok, strop délky konverzace před
  handoffem (už implementováno — 40 zpráv). Pozn.: prompt zatím neposílá
  historii konverzace vůbec (viz Nápady na rozšíření níže) — až se přidá,
  bude "limit délky historie" další páka.

## Co doladit pro produkci

- Trvalý System User token místo dočasného 24h tokenu z API Setup portálu
  (dočasný token v `.env` je snadné si nevšimnout a druhý den přestane
  fungovat — narazili jsme na to při stavbě).
- Skutečné směrování handoffu (CRM/Slack/e-mail), ne jen DB flag.
- WhatsApp-specifický opt-in tok (ne převzatý obecný souhlas).
- Víc než jedna template/kampaň, řízení schvalovacích front u Mety
  (schválení může trvat hodiny až dny — počítat do timeline).
- Přesun ze synchronního request-response webhooku na frontu/worker, pokud
  by objem zpráv rostl (současný návrh vyřizuje celou pipeline — Claude,
  guardrail, WhatsApp send — v jednom HTTP requestu; pro prototyp v pořádku,
  pro produkci s vyšším objemem riziko timeoutů).

## Co bych udělal líp (retrospektiva)

- Guardrail model občas zabalí JSON do markdown code fence i přes explicitní
  instrukci "vrať POUZE JSON" — objeveno a opraveno (`stripCodeFence` v
  `_shared/claude.ts`), ale ukazuje, že spoléhat na "model vrátí čistý JSON"
  bez obranné vrstvy je křehké i u jednoduchých klasifikačních promptů.
- Detekce zájmu je jedno LLM posouzení na zprávu — u hraničních formulací
  (nejasný souhlas) může být false negative/positive; pro produkci by
  pomohl kalibrační set testovacích zpráv a threshold na počet potvrzení.
- Sdílený Supabase projekt (více kodebází v jednom projektu) vyžadoval
  jednorázové sladění historie migrací — pro nový produkční projekt by
  bylo čistší mít dedikovaný Supabase projekt od začátku.
- **Konverzační historie se do promptu vůbec neposílá** — `getClaudeReply`
  dostává jen aktuální zprávu klienta, ne předchozí tahy stejné konverzace
  (plán přitom s "krátkou historií" v nákladovém modelu počítal, viz sekce
  8). V testování to nevadilo, protože STOP/zájem/nezájem jsou
  kontextově nezávislé signály a systémový prompt je samostatný — ale
  navazující dotaz typu "a jak to souvisí s tím, co jste psal předtím?"
  by asistent nezvládl, protože si "nepamatuje" vlastní předchozí odpověď.
  Zjištěno až při ručním testování, ne review — mělo to být pokryto dřív.

## Nápady na rozšíření (mimo scope tohoto promptu)

Věci, které dávají smysl jako další krok, ale záměrně nejsou v tomhle
prototypu implementované:

- **Konverzační historie v promptu** — poslat posledních N zpráv
  konverzace (z `messages`) do `getClaudeReply` jako krátký kontext, aby
  asistent zvládl navazující dotazy. Přímo souvisí s bodem výše.
- **Google Calendar integrace** — při handoffu (`interest = "interested"`)
  nabídnout klientovi konkrétní volné termíny konzultace (Calendar API),
  po potvrzení automaticky založit event, a den před schůzkou poslat
  WhatsApp připomínku (nová template kategorie UTILITY, ne MARKETING —
  jednodušší schvalování). Vyžaduje novou tabulku/pole pro naplánovanou
  schůzku a buď cron job, nebo Supabase scheduled function pro
  den-předem připomínku.
- **Skutečné směrování handoffu** (viz "Co doladit pro produkci" výše) —
  Calendar integrace by ho částečně nahradila/doplnila: poradce by dostal
  rovnou obsazený slot v kalendáři, ne jen DB flag k ručnímu dohledání.
- **Kalibrace guardrail klasifikace** — sada testovacích zpráv (cs/en,
  různé segmenty) s očekávaným `safe`/`interest` výstupem, spouštěná při
  každé změně promptu, aby šlo číselně vidět, jestli úprava promptu
  nezhoršila false positive/negative rate (dnes se to ověřuje ručně, viz
  `scripts/debug-claude.sh`).
- **Vícejazyčnost nad rámec cs/en** — `LANGUAGE_LABEL`/`TEMPLATE_BY_LANGUAGE`
  jsou malé lookup mapy, přidání dalšího jazyka je otázka nového klíče +
  nové schválené template, ne přepisu logiky.

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

### Dev/test skripty

`scripts/test-webhook.sh` (HMAC verify demo), `scripts/test-inbound.sh <telefon> <text> [timestamp]`
(signed inbound test s reálným HMAC — timestamp volitelně pro test 24h okna),
`scripts/debug-claude.sh <cs|en> <text>` (Claude reply + guardrail mimo Edge
Function), `scripts/check-templates.sh` (stav schválení templatů),
`scripts/deploy-templates.sh` / `scripts/set-supabase-secrets.sh` (jednorázový
setup z kroku 3). Všechny čtou `.env` interně a nikdy netisknou secrets.
