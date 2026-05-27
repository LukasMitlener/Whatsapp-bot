# Vercel Auto-Deploy Setup (monorepo)

  

Postup který fungoval pro projekt se strukturou kde Next.js app leží v `app/client/`, ne v rootu repozitáře.


## Prerekvizity

  

- Vercel CLI nainstalovaný a přihlášený (`vercel whoami` vrátí tvé jméno)

- Repozitář pushnutý na GitHub

  

---

  

## 1. Nalinkovat projekt ze git rootu

  

Důležité: spouštět z **rootu repozitáře** (kde je `.git`), ne z `app/client/`.

  

```bash

cd /home/lukas/projects/RealiShield

vercel link --yes --scope lukasmitleners-projects --project realishield

```

  

- `--scope` = název Vercel týmu/účtu (zjistíš přes `vercel whoami` nebo z chybové hlášky při `--yes`)

- `--project` = název projektu na Vercel, musí být **lowercase** (např. `realishield`, ne `RealiShield`)

  

Příkaz vytvoří `.vercel/project.json` v rootu a zároveň **automaticky připojí GitHub repozitář**.

  

---

  

## 2. Nastavit root directory přes API

  

Vercel nedetekuje Next.js, protože framework leží v `app/client/`, ne v rootu. Nastavit přes REST API:

  

```bash

VERCEL_TOKEN=$(python3 -c "import json; d=json.load(open('/home/lukas/.local/share/com.vercel.cli/auth.json')); print(d['token'])")

PROJECT_ID="prj_OIfPNR4B2HtJnRDf56VQ73Cj126H"   # z .vercel/project.json

TEAM_ID="team_DLhbj05S7pIvHVQHQ9cuCqXh"          # z .vercel/project.json (orgId)

  

curl -s -X PATCH "https://api.vercel.com/v9/projects/$PROJECT_ID?teamId=$TEAM_ID" \

  -H "Authorization: Bearer $VERCEL_TOKEN" \

  -H "Content-Type: application/json" \

  -d '{"rootDirectory": "app/client", "framework": "nextjs"}'

```

  

Úspěšná odpověď obsahuje `"rootDirectory": "app/client"`.

  

---

  

## 3. První deploy

  

```bash

vercel deploy --yes

```

  

Spustí preview deployment. Pro produkci:

  

```bash

vercel deploy --prod

```

  

---

  

## Výsledek

  

Od teď každý `git push origin main` automaticky spustí **preview deployment** na Vercel.  

Pro produkci je potřeba explicitně `vercel deploy --prod` nebo nastavit branch rule ve Vercel dashboardu.

  

---

  

## Co nefungovalo

  

| Pokus | Problém |

|---|---|

| `vercel link` z `app/client/` | `vercel git connect` pak selhal — nenašel `.git` adresář |

| `vercel link --yes` bez `--scope` | Chyba: "Provide --scope explicitly in non-interactive mode" |

| Název projektu `RealiShield` | Chyba: projekt musí být lowercase |

  

---

  

## Soubory vytvořené tímto setupem

  

- `.vercel/project.json` — ID projektu a týmu, přidáno do `.gitignore` automaticky

- `app/client/vercel.json` — build/dev/install příkazy (byl již přítomen před setupem)