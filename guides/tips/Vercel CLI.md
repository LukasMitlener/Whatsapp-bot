To, co jsi viděl, je pravděpodobně workflow založené na **Vercel Remote Development** nebo extrémně rychlém **CI/CD (Continuous Deployment)**. Pokud se ti lokální prostředí načítá 3 minuty (což je u větších Next.js nebo React projektů na slabším HW nebo při špatné konfiguraci běžné), dává smysl nechat "těžkou práci" na serverech Vercelu.

Zde je návod, jak takové workflow nastavit krok za krokem:

---

## 1. Propojení s Vercel CLI

Místo spoléhání se na automatický build po každém `git push` (který může trvat déle), tito vývojáři používají **Vercel CLI**. To umožňuje poslat lokální kód přímo do cloudu k okamžitému buildu.

* **Instalace:** `npm i -g vercel`
* **Přihlášení:** `vercel login`
* **Propojení projektu:** V kořenovém adresáři projektu napiš `vercel`. Tím projekt spáruješ s Vercel účtem.

## 2. Používání Preview Deploymentů (Klíčový krok)

Tajemství rychlosti, které jsi viděl, je příkaz pro okamžitý redeploy bez čekání na GitHub pipeline:

```bash
vercel --prod

```

Nebo pro vývojovou verzi (Preview):

```bash
vercel

```

**Proč je to rychlé?**
Vercel používá technologii **Remote Caching**. Pokud se většina tvého kódu nezměnila, Vercel znovu nesestavuje celou aplikaci, ale použije mezipaměť z předchozích buildů. Na jejich serverech to často běží rychleji než na lokálním procesoru.

## 3. Workflow s "Claude Code" (AI integrace)

Pokud borec v tutoriálu používal Claude Code (nebo jiný terminálový AI nástroj), pravděpodobně to měl nastavené takto:

1. **Zadání úkolu:** „Claude, uprav barvu tlačítek a přidej kontakt na patičku.“
2. **Úprava kódu:** AI provede změny v lokálních souborech.
3. **Okamžitý Deploy:** AI (nebo vývojář) hned poté spustí `vercel --prod --yes`.
4. **Kontrola:** Vývojář jen refreshne prohlížeč s URL od Vercelu.

## 4. Proč je to rychlejší než lokální `npm run dev`?

* **Odlehčení RAM:** `npm run dev` (zejména u Next.js) spotřebovává obrovské množství paměti pro sledování změn (hot reload). Pokud to tvůj PC nezvládá, vše se seká.
* **Server-side specifikace:** Vercel buildery běží na optimalizovaném železe, které je často výkonnější než běžný notebook.
* **Network Edge:** Aplikace běží přímo v prostředí, kde bude nakonec hostovaná, takže vidíš reálný výkon a chování API.

---

### Srovnání workflow

| Činnost | Lokální vývoj (`npm run dev`) | Vercel Deploy workflow |
| --- | --- | --- |
| **Zátěž PC** | Vysoká (CPU, RAM) | Minimální (jen upload souborů) |
| **Rychlost startu** | Často pomalé (tvůj případ 3 min) | Rychlé (přírůstkový build v cloudu) |
| **Přesnost** | Simulace prostředí | Reálné produkční prostředí |
| **Sdílení** | Jen tvůj počítač | Okamžitý link pro kohokoliv |

### Jak to můžeš udělat hned teď?

1. Zruš lokální proces (Ctrl+C).
2. Spusť `vercel` a proklikej nastavení (stačí entrovat výchozí hodnoty).
3. Jakmile uděláš změnu v kódu, napiš `vercel --deploy`.

> **Tip:** Pokud chceš úplně přeskočit psaní příkazů, můžeš si v `package.json` vytvořit skript:
> `"scripts": { "deploy": "vercel --prod --yes" }`
> Pak už jen píšeš `npm run deploy`.

Chtěl bys pomoci s nastavením konkrétního souboru `.md` pro tvůj projekt, aby ti s tímto workflow pomáhal Claude efektivněji?