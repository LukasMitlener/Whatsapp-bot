# WhatsApp AI Outreach — Imperium Finance

Prototyp AI asistenta, který přes WhatsApp osloví kontakty s jednou konkrétní
investiční příležitostí (datová centra), věcně odpoví na dotazy v mezích
zveřejněných faktů a zájemce předá živému poradci. Jediný zdroj pravdy pro
implementaci: [`specs/PROJECT_PLAN.html`](specs/PROJECT_PLAN.html). Detailní
technický rozpis (bezpečnost, personalizace, 24h okno, náklady, nápady na
rozšíření, dev skripty): [`ai_docs/technical-details.md`](ai_docs/technical-details.md).

## Stav odevzdání: custom template čeká na schválení Metou

Custom úvodní šablona (`imperium_datacenters_intro_cs/en`, kategorie
MARKETING) byla podána ke schválení, ale k datu odevzdání (deadline 10. 7.)
je stále ve stavu `PENDING`. Schvalovací frontu drží výhradně Meta — nejde
ji uspíšit ani z API odhadnout, jak dlouho potrvá. Nespoléhám proto na to,
že schválení dorazí včas; demo je místo toho postavené tak, aby prokázalo
vše i bez něj, ve dvou částech:

1. **Mechanismus rozesílání** — běh `scripts/outreach.ts`: rozeslání,
   rate-limit, logování a přechody statusů. Ověřeno přes předschválenou
   šablonu `hello_world`, protože tato část dokazuje funkčnost samotného
   rozesílání, nezávisle na obsahu zprávy.
2. **Reálný obsah a konverzace** — skutečná výměna přes WhatsApp: úvodní
   text (shodný s čekající šablonou) → dotaz → věcná odpověď → zájem
   a předání poradci → STOP. Tato část dokazuje, že asistent vede
   smysluplnou konverzaci nad reálnou nabídkou, a na schválení šablony
   nezávisí — jde o odpovědi v rámci 24h okna, ne o zahájení konverzace.

Chybí tedy jediný krok, a to čistě externí: jakmile Meta šablonu schválí,
`npm run outreach` odešle rovnou ji místo `hello_world`, beze změny v kódu.
Zbývající mezera je na straně Meta review, ne v samotném řešení.

## Architektura a proč

```
contacts.sample.csv → scripts/outreach.ts → Meta Cloud API → supabase/functions/whatsapp-webhook
                                                                  ↓ HMAC verify → opt-out gate → Claude → guardrail → odeslání + log
                                                              Supabase (contacts / conversations / messages)
                                                                  ↑
                                                         scripts/stats.ts (přehled)
```

Tři pohyblivé části nad jednou databází Supabase; žádný frontend — samotným
demem je WhatsApp konverzace.

- **Supabase Edge Functions místo n8n/Make:** veřejná HTTPS adresa rovnou
  z krabice (bez ngrok/tunelování), verzovatelný a testovatelný kód a jeden
  jazyk (TypeScript/Deno) pro celý projekt, s nasazením jediným CLI příkazem.
  Pro tenhle rozsah — jeden webhook a jasně daná pipeline — je vlastní kód
  přímočařejší a snáz auditovatelný než skládání z automatizační platformy.
- **Tenké fetch klienty místo SDK balíčků** (`_shared/claude.ts`,
  `_shared/whatsapp.ts`): odpadá bundlování navíc v Edge runtime a je přesně
  vidět, jaký tvar requestu/response se posílá a čte.
- **Oficiální Meta Cloud API, ne Baileys/web automatizace:** neoficiální
  knihovny (Baileys a podobné, které automatizují WhatsApp Web) porušují
  podmínky Mety a riskují trvalý ban čísla i účtu — nepřijatelné riziko už
  pro prototyp, natož pro produkci s reálnými klienty. Cloud API je pomalejší
  na rozjezd (schvalování šablon, testovací čísla), ale je to jediná cesta,
  která v produkci obstojí.
- **Rozsah asistenta:** bot je záměrně omezený na jedno téma a vše mimo něj
  předává člověku (lead-qualification/zákaznická podpora, ne obecný AI
  asistent). Vědomá volba, mimo jiné s ohledem na to, kam Meta od ledna 2026
  směřuje politiku AI na WhatsApp Business Solution (podrobnosti v
  `ai_docs/technical-details.md`).

## Souhlas, opt-out a co doladit pro produkci

- Kontakty v `contacts.sample.csv` jsou „kontaktovatelné" — souhlas
  s oslovením je vstupním předpokladem testu, ne něčím, co prototyp sám
  sbírá.
- Opt-out se vyhodnocuje **deterministicky, regexem a před jakýmkoli
  voláním LLM** (`_shared/optout.ts`) — není to rozhodnutí modelu, aby ho
  nešlo obejít obsahem zprávy. Rozpozná `STOP`, „nemám zájem",
  „odhlásit"/„odhlaste", `unsubscribe` i `not interested`, nastaví
  `contacts.status = opted_out`, ukončí konverzaci a pošle jedinou
  deterministickou potvrzovací zprávu — bez jediného volání Clauda.
  Jakmile je kontakt `opted_out`, nic v kódu ho nepřepíše zpět, ani
  technická chyba doručení.
- **Opt-out je záměrně konečný a automatem nevratný** — odhlášený kontakt
  už nedostane žádnou odpověď, ani když napíše, že má znovu zájem. Je to
  úmysl, ne omezení: opětovné přihlášení musí být vědomý krok ze strany
  klienta (např. klíčové slovo `START` nebo přes poradce), ne vedlejší
  efekt jakékoli další zprávy — jinak by šlo samotnou opt-out záruku
  obejít tím, že člověk prostě napíše cokoli dalšího. Znovupřihlašovací
  tok přes `START` je přímé rozšíření, v tomto prototypu není
  implementované.
- **Pro ostré nasazení by bylo potřeba doplnit:**
  - WhatsApp-specifický opt-in tok (obecný marketingový souhlas ≠ WhatsApp
    opt-in) a frequency capping;
  - trvalý System User token místo dočasného 24hodinového (na tento rozdíl
    jsme reálně narazili při stavbě);
  - skutečné směrování handoffu do CRM/Slacku/e-mailu, ne jen příznak
    v databázi;
  - více šablon/kampaní, se schvalovací frontou Mety započítanou do
    harmonogramu;
  - přesun ze synchronního request-response webhooku na frontu/worker při
    větším objemu (dnes běží celá pipeline — Claude, guardrail, odeslání —
    v jednom HTTP requestu, což pro prototyp stačí).

## Co bych udělal líp

- **Guardrail model občas zabalí JSON do markdown code fence** i přes
  explicitní instrukci „vrať POUZE JSON" — nalezeno a opraveno
  (`stripCodeFence` v `_shared/claude.ts`). Ukazuje to, že spoléhat na
  „model vrátí čistý JSON" bez obranné vrstvy je křehké i u jednoduchých
  klasifikačních promptů.
- **Konverzační historie se do promptu vůbec neposílá** — každé volání
  vidí jen aktuální zprávu klienta, ne předchozí tahy téže konverzace.
  V testech to nevadilo (STOP, zájem i nezájem jsou kontextově nezávislé
  signály), ale navazující dotaz na dřívější odpověď by asistent nezvládl.
  Přišel jsem na to až při ručním testování — mělo to být pokryto dřív.
- **Detekce zájmu stojí na jednom posouzení modelem na každou zprávu** —
  u hraničních formulací může vzniknout falešně pozitivní i negativní
  výsledek. Pomohl by kalibrační set testovacích zpráv s očekávaným
  výstupem (viz `ai_docs/technical-details.md`).
- **Sdílený Supabase projekt** (více kódových bází pohromadě) si vyžádal
  jednorázové sladění historie migrací — pro nový produkční projekt by bylo
  čistší mít vyhrazený projekt od začátku.
- **Úvodní šablona oslovuje křestním jménem** („Dobrý den Jane"), zatímco
  odpovědi bota uvnitř konverzace už oslovují příjmením („pane Nováku") —
  a příjmení je pro produkci správná volba (u finanční nabídky od neznámého
  odesílatele je v češtině formálnější oslovení na místě). U křestního
  jména šablona zůstala vědomě, ne přehlédnutím: oslovení je součástí textu
  podané `imperium_datacenters_intro_cs`, kterou drží Meta, ne kódu bota,
  a k datu odevzdání je stále `PENDING`. Editace by vyžadovala novou verzi
  a nové schvalovací kolo a přepodání den před deadline by frontu jen
  resetovalo, bez záruky, že projde včas. Produkční řešení (rozdělit jméno
  na křestní/příjmení a v parametru šablony použít příjmení) i důvody, proč
  není triviální, jsou v `ai_docs/technical-details.md` (Nápady na
  rozšíření).

## Spuštění

```bash
cp .env.example .env               # doplň Supabase/Meta/Anthropic klíče
npx supabase db push               # migrace (schema, RLS, stats view)
npm run import-contacts            # import contacts.sample.csv, status=pending
npx supabase functions deploy whatsapp-webhook --no-verify-jwt --use-api
npm run outreach                   # rozešle úvodní template
npm run stats                      # přehled výsledků + náklady
```

`--use-api` bundluje funkci server-side (bez závislosti na lokálním
Dockeru) — funguje i bez něj, pokud Docker máš; ponecháno kvůli
přenositelnosti na stroj bez Dockeru.

Detailní checklist pro Meta setup: [`ai_docs/meta-whatsapp-setup.md`](ai_docs/meta-whatsapp-setup.md).
