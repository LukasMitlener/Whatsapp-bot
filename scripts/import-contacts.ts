// Import kontaktů z CSV do Supabase (status = 'pending').
// Usage: npx tsx scripts/import-contacts.ts [cesta-k-csv]
// Default cesta: contacts.sample.csv

import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const csvPath = process.argv[2] ?? "contacts.sample.csv";
const raw = readFileSync(csvPath, "utf-8").trim();
const [header, ...lines] = raw.split("\n");
const columns = header.split(",").map((c) => c.trim());

type Row = { name: string; phone: string; segment: string; language: string };

const rows: Row[] = lines.map((line) => {
  const values = line.split(",").map((v) => v.trim());
  const row = Object.fromEntries(columns.map((c, i) => [c, values[i]]));
  return row as Row;
});

const isPlaceholder = (phone: string) => phone.includes("XXXXXXXXX");

const toImport = rows.filter((r) => !isPlaceholder(r.phone));
const skipped = rows.filter((r) => isPlaceholder(r.phone));

for (const r of skipped) {
  console.warn(`⚠️  přeskočeno (placeholder telefon): ${r.name} <${r.phone}>`);
}

if (toImport.length === 0) {
  console.log("Žádné kontakty s reálným telefonním číslem k importu.");
  process.exit(0);
}

const { data, error } = await supabase
  .from("contacts")
  .upsert(
    toImport.map((r) => ({
      name: r.name,
      phone: r.phone,
      segment: r.segment || null,
      language: r.language || "cs",
      status: "pending",
    })),
    { onConflict: "phone" },
  )
  .select();

if (error) {
  console.error("Import selhal:", error.message);
  process.exit(1);
}

console.log(`Importováno ${data?.length ?? 0} kontaktů:`);
for (const c of data ?? []) {
  console.log(`  ${c.name} <${c.phone}> [${c.segment}/${c.language}] status=${c.status}`);
}
