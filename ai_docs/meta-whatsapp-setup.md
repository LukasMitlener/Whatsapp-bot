# Meta WhatsApp Cloud API — setup checklist (krok 3)

Referenční checklist pro krok 3 z `specs/PROJECT_PLAN.html`. Části označené
**[MANUÁLNĚ]** musí udělat člověk v Meta portálu (přihlášení účtem, SMS/WA
ověřovací kódy) — agent k nim nemá přístup. Části **[AGENT]** může Claude Code
dokončit sám, jakmile dostane potřebné hodnoty.

## 1. Meta App + WhatsApp produkt [MANUÁLNĚ]

1. https://developers.facebook.com/apps → **Create App** → typ *Business*.
2. V appce přidat produkt **WhatsApp**.
3. V **WhatsApp → API Setup** zkopírovat:
   - **Temporary access token** (nebo vytvoř permanentní System User token
     v Business Settings → System Users, scope `whatsapp_business_messaging`
     + `whatsapp_business_management`)
   - **Phone number ID** (testovací číslo, přidělené automaticky)
   - **WhatsApp Business Account ID** (WABA ID)
4. App Dashboard → **Settings → Basic** → zkopírovat **App Secret**.

## 2. Ověření příjemců [MANUÁLNĚ]

Testovací číslo smí psát jen na **ověřené příjemce**. V **WhatsApp → API
Setup → To** přidej:

| Jméno | Telefon | Poznámka |
|---|---|---|
| Jan Novák (ty) | `+420XXXXXXXXX` | vlastní číslo — přijde SMS/WA kód, potvrď v portálu |
| Petra Svobodová | `+420XXXXXXXXX` | druhé vlastní ověřené číslo — přijde SMS/WA kód, potvrď v portálu |
| Imperium Test | `+420608092412` | **firma musí přeposlat kód tobě** — naplánuj dopředu (viz sekce 6 plánu) |

## 3. `hello_world` test [AGENT — jakmile máš token]

Jakmile máš `META_WA_TOKEN` a `META_PHONE_NUMBER_ID`, dej je Claude Code
(do `.env`, ne do chatu) a agent ověří doručení:

```bash
curl -X POST "https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer ${META_WA_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "+420XXXXXXXXX",
    "type": "template",
    "template": { "name": "hello_world", "language": { "code": "en_US" } }
  }'
```

Hotovo, když dorazí zpráva "Hello World" na ověřené číslo.

## 4. Custom template ke schválení [AGENT navrhne, MANUÁLNĚ nebo AGENT odešle přes Graph API]

Úvodní oslovení musí jít jako **schválená template** (business-initiated
konverzace, mimo 24h okno). Draft níže — cs + en varianta. Kategorie
**MARKETING** (obsahuje investiční nabídku → přísnější review, počítej
s vyšší latencí schválení, klidně i dny).

Odešli ke schválení buď v **WhatsApp Manager → Message Templates → Create
Template**, nebo agent to umí přes Graph API, pokud dodáš `WABA_ID`:

```bash
curl -X POST "https://graph.facebook.com/v21.0/${WABA_ID}/message_templates" \
  -H "Authorization: Bearer ${META_WA_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @template-cs.json
```

### CS varianta (`imperium_datacenters_intro_cs`)

```
Dobrý den {{1}}, tady automatický asistent Imperium Finance. Máme pro vás
informaci o investiční příležitosti do datových center a AI infrastruktury.
Chcete se dozvědět víc? Napište ANO, nebo se zeptejte přímo.

Odpovědí STOP se kdykoliv odhlásíte.
```
- proměnná `{{1}}` = jméno kontaktu
- kategorie: Marketing, jazyk: `cs`

### EN varianta (`imperium_datacenters_intro_en`)

```
Hello {{1}}, this is an automated assistant from Imperium Finance. We have
information about an investment opportunity in data centers and AI
infrastructure. Want to learn more? Reply YES, or ask us directly.

Reply STOP anytime to opt out.
```
- proměnná `{{1}}` = jméno kontaktu
- kategorie: Marketing, jazyk: `en`

**Pozn.:** template záměrně neobsahuje konkrétní čísla výnosů (viz threat
model — kompliance/finanční pojistky). Konkrétní zveřejněná čísla (KID
scénáře) patří do `{OPPORTUNITY_FACTS}` konverzačního promptu (krok 4), ne
do cold-outreach zprávy.

## 5. Supabase secrets [AGENT — jakmile máš hodnoty]

Jakmile jsou hodnoty v `.env`, agent spustí:

```bash
npx supabase secrets set \
  META_WA_TOKEN=... \
  META_PHONE_NUMBER_ID=... \
  META_APP_SECRET=... \
  META_VERIFY_TOKEN=... \
  ANTHROPIC_API_KEY=...
```

`META_VERIFY_TOKEN` je libovolný řetězec, který si sám zvolíš — zadá se
stejný do Meta webhook konfigurace (krok 4) i sem.

## Hotovo, když

- [ ] `hello_world` dorazil na testovací číslo
- [ ] custom template (cs + en) podaná ke schválení ve WhatsApp Manageru
- [ ] Supabase secrets nastavené
