# WhatsApp AI Outreach — Imperium Finance

Prototyp AI asistenta, který přes WhatsApp osloví kontakty s jednou konkrétní
investiční příležitostí (datová centra), věcně odpoví na dotazy v mezích
zveřejněných faktů a zájemce předá živému poradci. Jediný zdroj pravdy pro
implementaci: [`specs/PROJECT_PLAN.html`](specs/PROJECT_PLAN.html). Detailní
technický rozpis (bezpečnost, personalizace, 24h okno, náklady, nápady na
rozšíření, dev skripty): [`ai_docs/technical-details.md`](ai_docs/technical-details.md).

## Stav odevzdání: custom template čeká na schválení Metou

Custom úvodní template (`imperium_datacenters_intro_cs/en`, kategorie
MARKETING) byl podán ke schválení, ale k datu odevzdání (deadline 10. 7.)
je stále `PENDING` — schvalovací fronta je čistě na straně Mety, nejde
uspíšit ani odhadnout z API. Nespoléhám na to, že to den před deadline
dojde — místo čekání jde demo cestou transparentnosti a je natočené
(resp. naklikané živě na hovoru) ve dvou částech, které dohromady
prokazují všechno:

1. **Mechanismus** — běh `scripts/outreach.ts`: rozeslání, rate-limit,
   logování, přechod statusů. Přes `hello_world` template, protože tady
   se dokazuje, že rozesílání funguje, ne obsah.
2. **Reálný obsah a konverzace** — skutečná výměna přes WhatsApp: úvodní
   text identický s čekající šablonou → dotaz → odpověď → zájem/handoff
   → STOP. Tady se dokazuje, že bot vede smysluplnou konverzaci nad
   reálnou nabídkou. Nezávisí na schválení template, protože jde
   o odpovědi v rámci 24h okna, ne o zahájení konverzace.

Jediné, co chybí, je jeden proklik: až Meta šablonu schválí, `npm run
outreach` pošle rovnou ji místo `hello_world` — nic dalšího se v kódu
nemění. Mezera je tedy externí (Meta review), ne v řešení.

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
- **Opt-out je záměrně konečný a nevratný automatem** — odhlášený kontakt
  už nedostane žádnou odpověď, ani když napíše, že má znovu zájem. Je to
  úmysl, ne omezení: reaktivace odhlášeného kontaktu musí být explicitní
  krok (např. klíčové slovo `START`, nebo přes poradce), ne vedlejší efekt
  další zprávy — jinak by šlo samotnou opt-out záruku obejít prostým
  napsáním čehokoliv jiného. Znovupřihlašovací tok přes `START` je přímé
  rozšíření, není v tomto prototypu implementované.
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
- **Úvodní template oslovuje křestním jménem** ("Dobrý den Jane"), zatímco
  odpovědi bota v konverzaci oslovují příjmením ("pane Nováku") — v
  češtině je u finanční nabídky od neznámého odesílatele správně oslovení
  příjmením, ne křestním, takže je to nekonzistentní. Vědomé rozhodnutí,
  ne přehlédnutí: podaná template visí v Metině schvalovací frontě těsně
  před deadline a nová verze by frontu resetovala, takže ji neupravuju.
  Produkční řešení (rozdělit jméno na křestní/příjmení a v template
  parametru použít příjmení) i proč to není triviální je v
  `ai_docs/technical-details.md` (Nápady na rozšíření).

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
