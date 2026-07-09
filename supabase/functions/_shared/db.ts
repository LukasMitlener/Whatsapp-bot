// Supabase datový přístup pro whatsapp-webhook. Vždy service_role (obchází
// RLS) — funkce běží server-side, nikdy v prohlížeči.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  segment: string | null;
  language: string;
  status: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  state: string;
  last_inbound_at: string | null;
  outcome: string | null;
}

export function getDb(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function findContactByPhone(db: SupabaseClient, phone: string): Promise<Contact | null> {
  const { data, error } = await db.from("contacts").select("*").eq("phone", phone).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getOrCreateConversation(db: SupabaseClient, contactId: string): Promise<Conversation> {
  const { data: existing, error: selErr } = await db
    .from("conversations")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;

  const { data: created, error: insErr } = await db
    .from("conversations")
    .insert({ contact_id: contactId, state: "new" })
    .select("*")
    .single();
  if (insErr) throw insErr;
  return created;
}

export async function countMessagesInConversation(db: SupabaseClient, conversationId: string): Promise<number> {
  const { count, error } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);
  if (error) throw error;
  return count ?? 0;
}

// Vrací null, pokud jde o duplicitní wa_message_id (idempotence — unique
// constraint), jinak vloženou řádku.
export async function insertMessage(
  db: SupabaseClient,
  row: {
    conversation_id: string;
    contact_id: string;
    direction: "inbound" | "outbound";
    wa_message_id?: string | null;
    type: string;
    template_name?: string | null;
    body?: string | null;
    status?: string | null;
    error_code?: string | null;
    error_detail?: string | null;
    input_tokens?: number | null;
    output_tokens?: number | null;
  },
  // deno-lint-ignore no-explicit-any
): Promise<any | null> {
  const { data, error } = await db.from("messages").insert(row).select("*").single();
  if (error) {
    if (error.code === "23505") return null; // duplicate wa_message_id
    throw error;
  }
  return data;
}

export async function updateConversation(
  db: SupabaseClient,
  id: string,
  fields: Partial<Pick<Conversation, "state" | "last_inbound_at" | "outcome">>,
) {
  const { error } = await db
    .from("conversations")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function updateContact(
  db: SupabaseClient,
  id: string,
  fields: Partial<Pick<Contact, "status">> & { opted_out_at?: string },
) {
  const { error } = await db.from("contacts").update(fields).eq("id", id);
  if (error) throw error;
}
