# Technické detaily — WhatsApp AI Outreach

Doplněk k hlavnímu [`README.md`](../README.md) — detailní rozpis bezpečnosti,
personalizace, 24h okna, nákladů, nápadů na rozšíření a dev skriptů. README
drží jen jádro (architektura, souhlas/opt-out, produkční dolaďování, co bych
udělal líp); tady je zbytek.

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

## Známý stav: Imperium Test = `error`

Kontakt `+420608092412` má v demu záměrně a doloženě `status = error`, ne
přehlédnutou chybu: číslo vyžaduje, aby firma přeposlala ověřovací kód od
Mety (testovací číslo smí psát jen ověřeným příjemcům), což se v tomhle
běhu nestalo. Odeslání selhalo s `131030 "Recipient phone number not in
allowed list"`, zalogováno s `error_code`/`error_detail`, kontakt korektně
přešel do `error` bez opakování — přesně chování ze sekce 6 plánu, na
reálném příkladu. Viz [`meta-whatsapp-setup.md`](meta-whatsapp-setup.md).

## Bezpečnost (detailní rozpis — shrnutí je v README, mapování na threat model v `specs/PROJECT_PLAN.html` sekce 5)

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
- **Jméno klienta** — model z něj (nebo z gramatického rodu, který klient
  použije o sobě v textu) odvodí, jak s ním mluvit v tvarech vyžadujících
  shodu rodu ("byl/a byste"). O sobě mluví vždy v mužském rodě ("asistent",
  "rád") bez ohledu na klienta — konzistence byla reálně nalezený problém
  při testování (viz README, "co bych udělal líp").
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
deterministický opt-out gate, ne guardrail — má přednost před touhle
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

## Nápady na rozšíření (mimo scope tohoto zadání)

- **Rozdělit jméno kontaktu na křestní/příjmení.** Dnes je `contacts.name`
  jedno pole s celým jménem (`"Jan Novák"`) — do system promptu jde vcelku
  (`buildSystemPrompt` v `_shared/prompts.ts:66`, `JMÉNO KLIENTA:
  ${nameLine}`), a to, že Claude v konverzaci osloví příjmením ("pane
  Nováku"), je jeho vlastní odvození z konvence, ne explicitní pravidlo v
  promptu. Úvodní WhatsApp template ale oslovuje parametrem `{{1}}`
  natvrdo vyplněným křestním jménem — odděleně od promptu, takže
  nekonzistentně. Produkční řešení: `first_name`/`last_name` jako
  samostatná pole a template parametr = příjmení. Není to triviální kvůli
  dvěma věcem:
  - **České skloňování oslovení (5. pád)** — "Novák" → "Nováku", "Svoboda"
    → "Svobodo", "Němec" → "Němče"; pravidlo skloňování nejde odvodit
    jednoduchým algoritmem pro všechna česká příjmení, potřeboval by se
    buď morfologický nástroj/knihovna, nebo LLM volání navíc jen na
    generování 5. pádu (další náklad na kontakt).
  - **Odvození rodu/skloňovaného tvaru není spolehlivé u všech jmen** —
    stejný problém jako u gender-aware oslovování v konverzaci (viz
    `buildSystemPrompt`, pravidlo o pohlaví klienta): cizí, neobvyklá nebo
    rodově nejednoznačná jména (např. přechýlení u cizinek, jednoslovná
    jména) skloňování/rod neurčí spolehlivě ani člověk bez kontextu, natož
    pravidlový algoritmus.
- **Konverzační historie v promptu** — poslat posledních N zpráv
  konverzace (z `messages`) do `getClaudeReply` jako krátký kontext, aby
  asistent zvládl navazující dotazy (dnes vidí jen aktuální zprávu).
- **Google Calendar integrace** — při handoffu (`interest = "interested"`)
  nabídnout klientovi konkrétní volné termíny konzultace (Calendar API),
  po potvrzení automaticky založit event, a den před schůzkou poslat
  WhatsApp připomínku (nová template kategorie UTILITY, ne MARKETING —
  jednodušší schvalování). Vyžaduje novou tabulku/pole pro naplánovanou
  schůzku a buď cron job, nebo Supabase scheduled function pro
  den-předem připomínku. Částečně nahrazuje/doplňuje "skutečné směrování
  handoffu" — poradce by dostal rovnou obsazený slot v kalendáři, ne jen
  DB flag k ručnímu dohledání.
- **Kalibrace guardrail klasifikace** — sada testovacích zpráv (cs/en,
  různé segmenty) s očekávaným `safe`/`interest` výstupem, spouštěná při
  každé změně promptu, aby šlo číselně vidět, jestli úprava promptu
  nezhoršila false positive/negative rate (dnes se to ověřuje ručně, viz
  `scripts/debug-claude.sh`).
- **Vícejazyčnost nad rámec cs/en** — `LANGUAGE_LABEL`/`TEMPLATE_BY_LANGUAGE`
  jsou malé lookup mapy, přidání dalšího jazyka je otázka nového klíče +
  nové schválené template, ne přepisu logiky.

## Dev/test skripty

`scripts/test-webhook.sh` (HMAC verify demo), `scripts/test-inbound.sh <telefon> <text> [timestamp]`
(signed inbound test s reálným HMAC — timestamp volitelně pro test 24h okna),
`scripts/debug-claude.sh <cs|en> <text> [segment] [jméno]` (Claude reply +
guardrail mimo Edge Function), `scripts/check-templates.sh` (stav schválení
templatů), `scripts/deploy-templates.sh` / `scripts/set-supabase-secrets.sh`
(jednorázový setup). Všechny čtou `.env` interně a nikdy netisknou secrets.
