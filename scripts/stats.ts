// Vypíše přehled výsledků kampaně: stats_overview view + nákladový souhrn
// z input/output_tokens v messages (viz sekce 8 plánu — měřený, ne odhadovaný náklad).

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Chybí SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY v .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: overview, error: overviewErr } = await supabase.from("stats_overview").select("*").single();
  if (overviewErr) {
    console.error("Načtení stats_overview selhalo:", overviewErr.message);
    process.exit(1);
  }

  const { count: totalContacts } = await supabase.from("contacts").select("id", { count: "exact", head: true });

  const { data: tokenRows, error: tokenErr } = await supabase
    .from("messages")
    .select("input_tokens, output_tokens, conversation_id")
    .not("input_tokens", "is", null);

  if (tokenErr) {
    console.error("Načtení tokenů selhalo:", tokenErr.message);
    process.exit(1);
  }

  const totalInputTokens = (tokenRows ?? []).reduce((sum, r) => sum + (r.input_tokens ?? 0), 0);
  const totalOutputTokens = (tokenRows ?? []).reduce((sum, r) => sum + (r.output_tokens ?? 0), 0);
  const claudeCalls = (tokenRows ?? []).length;
  const conversationsWithClaude = new Set((tokenRows ?? []).map((r) => r.conversation_id)).size;

  console.log("=== Přehled kampaně ===\n");
  console.log(`Celkem kontaktů v DB:     ${totalContacts ?? 0}`);
  console.log(`Osloveno (ne pending):    ${overview.osloveno}`);
  console.log(`Odpovědělo:               ${overview.odpovedelo}`);
  console.log(`Projevilo zájem:          ${overview.zajem}`);
  console.log(`Odhlásilo se:             ${overview.odhlaseno}`);
  console.log(`Chyby (nedoručeno atd.):  ${overview.chyby}`);

  console.log("\n=== Náklady (měřeno, ne odhadováno) ===\n");
  console.log(`Claude volání celkem:          ${claudeCalls}`);
  console.log(`Konverzací s Claude odpovědí:  ${conversationsWithClaude}`);
  console.log(`Input tokeny celkem:           ${totalInputTokens}`);
  console.log(`Output tokeny celkem:          ${totalOutputTokens}`);
  if (claudeCalls > 0) {
    console.log(`Průměr input/volání:           ${Math.round(totalInputTokens / claudeCalls)}`);
    console.log(`Průměr output/volání:          ${Math.round(totalOutputTokens / claudeCalls)}`);
  }
  console.log(
    "\n(Konkrétní cenu dopočítej z aktuálního ceníku Anthropic — viz README, sekce Náklady.)",
  );
}

main();
