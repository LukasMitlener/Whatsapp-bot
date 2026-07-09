// Rozešle úvodní custom template kontaktům se statusem 'pending' (jazyk dle
// contact.language). Rate-limit mezi sendy; při 429 exponenciální backoff.
// Loguje do messages, aktualizuje contacts.status na 'contacted'/'error'.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_WA_TOKEN = process.env.META_WA_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !META_WA_TOKEN || !META_PHONE_NUMBER_ID) {
  console.error("Chybí SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / META_WA_TOKEN / META_PHONE_NUMBER_ID v .env");
  process.exit(1);
}

const GRAPH_VERSION = "v21.0";
const RATE_LIMIT_DELAY_MS = 1500;
const MAX_RETRIES = 3;

// OUTREACH_TEMPLATE_NAME/OUTREACH_TEMPLATE_LANG: volitelný override pro
// dry-run proti už schválenému templatu (např. hello_world), dokud čeká
// custom template na schválení. Bez override použije produkční templaty.
const overrideName = process.env.OUTREACH_TEMPLATE_NAME;
const overrideLang = process.env.OUTREACH_TEMPLATE_LANG;

const TEMPLATE_BY_LANGUAGE: Record<string, { name: string; code: string }> = overrideName
  ? {
      cs: { name: overrideName, code: overrideLang ?? "en_US" },
      en: { name: overrideName, code: overrideLang ?? "en_US" },
    }
  : {
      cs: { name: "imperium_datacenters_intro_cs", code: "cs" },
      en: { name: "imperium_datacenters_intro_en", code: "en_US" },
    };

if (overrideName) {
  console.log(`[dry-run] Používám override template: ${overrideName} (${overrideLang ?? "en_US"})\n`);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SendResult {
  ok: boolean;
  waMessageId?: string;
  errorCode?: string;
  errorDetail?: string;
}

async function sendTemplate(to: string, name: string, languageCode: string, contactName: string): Promise<SendResult> {
  const toDigits = to.startsWith("+") ? to.slice(1) : to;
  // hello_world (a jiné dry-run override templaty) nemají {{1}} proměnnou.
  const hasBodyVariable = !overrideName;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${META_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${META_WA_TOKEN}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toDigits,
        type: "template",
        template: {
          name,
          language: { code: languageCode },
          ...(hasBodyVariable
            ? { components: [{ type: "body", parameters: [{ type: "text", text: contactName }] }] }
            : {}),
        },
      }),
    });

    const data = await res.json();

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const backoff = 2 ** attempt * 1000;
      console.warn(`  429 rate limit — čekám ${backoff}ms (pokus ${attempt}/${MAX_RETRIES})`);
      await sleep(backoff);
      continue;
    }

    if (!res.ok) {
      const err = data?.error ?? {};
      return { ok: false, errorCode: String(err.code ?? res.status), errorDetail: err.message ?? JSON.stringify(data) };
    }

    return { ok: true, waMessageId: data?.messages?.[0]?.id };
  }

  return { ok: false, errorCode: "429", errorDetail: "rate limit — vyčerpány pokusy" };
}

async function getOrCreateConversation(contactId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ contact_id: contactId, state: "awaiting_reply" })
    .select("id")
    .single();

  if (error) {
    console.error("  Vytvoření konverzace selhalo:", error.message);
    return null;
  }
  return created.id;
}

async function main() {
  const { data: contacts, error } = await supabase.from("contacts").select("*").eq("status", "pending");

  if (error) {
    console.error("Načtení kontaktů selhalo:", error.message);
    process.exit(1);
  }

  if (!contacts || contacts.length === 0) {
    console.log("Žádní kontakti se statusem 'pending' k oslovení.");
    return;
  }

  console.log(`Nalezeno ${contacts.length} kontaktů k oslovení.\n`);

  for (const contact of contacts) {
    const tpl = TEMPLATE_BY_LANGUAGE[contact.language] ?? TEMPLATE_BY_LANGUAGE.cs;
    console.log(`→ ${contact.name} <${contact.phone}> [${contact.language}] — template ${tpl.name}`);

    const result = await sendTemplate(contact.phone, tpl.name, tpl.code, contact.name);
    const conversationId = await getOrCreateConversation(contact.id);

    if (conversationId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        contact_id: contact.id,
        direction: "outbound",
        wa_message_id: result.ok ? result.waMessageId : null,
        type: "template",
        template_name: tpl.name,
        status: result.ok ? "sent" : "failed",
        error_code: result.ok ? null : result.errorCode,
        error_detail: result.ok ? null : result.errorDetail,
      });
    }

    if (result.ok) {
      await supabase.from("contacts").update({ status: "contacted" }).eq("id", contact.id);
      console.log(`  OK — wa_message_id=${result.waMessageId}`);
    } else {
      await supabase.from("contacts").update({ status: "error" }).eq("id", contact.id);
      console.error(`  CHYBA (${result.errorCode}): ${result.errorDetail}`);
    }

    await sleep(RATE_LIMIT_DELAY_MS);
  }

  console.log("\nHotovo.");
}

main();
