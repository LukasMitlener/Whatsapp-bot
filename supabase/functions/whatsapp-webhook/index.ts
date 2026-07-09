// WhatsApp Cloud API webhook — inbound pipeline (krok 5).
//
// GET  = Meta subscription handshake (hub.verify_token).
// POST = ① HMAC verify (krok 4) → ② opt-out gate (pre-LLM, deterministicky)
//        → ③ Claude (scoped prompt) → ④ output guardrail → ⑤ odeslání + log.
//
// Idempotence: unique wa_message_id v `messages` — duplicitní webhook
// (Meta retry) se detekuje na DB constraint a dál se nezpracovává.

import { verifySignature } from "./signature.ts";
import {
  countMessagesInConversation,
  findContactByPhone,
  getDb,
  getOrCreateConversation,
  insertMessage,
  updateContact,
  updateConversation,
  type Contact,
} from "../_shared/db.ts";
import { checkGuardrail, getClaudeReply, type Interest } from "../_shared/claude.ts";
import { sendText, sendTemplate, TEMPLATE_BY_LANGUAGE } from "../_shared/whatsapp.ts";
import { getAskForTextMessage, getFallbackMessage, getOptOutConfirmation } from "../_shared/prompts.ts";
import { isOptOutMessage } from "../_shared/optout.ts";

// Threat model: "strop zpráv na konverzaci" — brání neomezenému pálení
// Claude kreditů v jedné konverzaci (spam / smyčka).
const MAX_MESSAGES_PER_CONVERSATION = 40;

// 24h okno: volný text smíme posílat jen do 24h od poslední zprávy klienta.
// Počítá se z reálného message.timestamp (kdy zprávu klient opravdu poslal
// dle Mety), ne z okamžiku zpracování — u zpožděné/backfillované doručenky
// se tak správně pozná, že okno už je zavřené.
const WINDOW_MS = 24 * 60 * 60 * 1000;

function isWithinReplyWindow(messageTimestamp: string | undefined): boolean {
  const ts = Number(messageTimestamp) * 1000;
  if (!Number.isFinite(ts) || ts <= 0) return true; // chybějící timestamp: fail-open, neblokuj normální odpověď
  return Date.now() - ts < WINDOW_MS;
}

interface InboundMessage {
  from: string;
  id: string;
  type: string;
  timestamp?: string;
  text?: { body?: string };
}

interface StatusUpdate {
  id: string;
  status: string;
  errors?: { code: string | number; title?: string }[];
}

function normalizePhone(from: string): string {
  return from.startsWith("+") ? from : `+${from}`;
}

// Nedoručení → kontakt error, ale nepřepisuj opted_out (ten stav je záměrný
// a důležitější než technická chyba doručení).
async function markContactErrorUnlessOptedOut(db: ReturnType<typeof getDb>, contactId: string) {
  const { data: contact } = await db.from("contacts").select("status").eq("id", contactId).maybeSingle();
  if (contact?.status === "opted_out") return;
  await updateContact(db, contactId, { status: "error" });
}

async function handleStatusUpdate(db: ReturnType<typeof getDb>, status: StatusUpdate) {
  const err = status.errors?.[0];
  const { data: updated, error } = await db
    .from("messages")
    .update({
      status: status.status,
      error_code: err ? String(err.code) : null,
      error_detail: err?.title ?? null,
    })
    .eq("wa_message_id", status.id)
    .select("contact_id")
    .maybeSingle();

  if (error) {
    console.error("webhook: status update failed", error.message);
    return;
  }

  // Nedoručení nahlášené asynchronně (Meta pošle statuses[] samostatně,
  // ne vždy v odpovědi na send) → stejné pravidlo jako u přímého selhání sendu.
  if (status.status === "failed" && updated?.contact_id) {
    await markContactErrorUnlessOptedOut(db, updated.contact_id);
  }
}

async function sendAndLog(
  db: ReturnType<typeof getDb>,
  contact: Contact,
  conversationId: string,
  phoneNumberId: string,
  waToken: string,
  body: string,
  tokens?: { input: number; output: number },
) {
  const result = await sendText(phoneNumberId, waToken, contact.phone, body);
  await insertMessage(db, {
    conversation_id: conversationId,
    contact_id: contact.id,
    direction: "outbound",
    wa_message_id: result.waMessageId ?? null,
    type: "text",
    body,
    status: result.ok ? "sent" : "failed",
    error_code: result.errorCode ?? null,
    error_detail: result.errorDetail ?? null,
    input_tokens: tokens?.input ?? null,
    output_tokens: tokens?.output ?? null,
  });
  if (!result.ok) {
    console.error("webhook: WhatsApp send failed", result.errorCode, result.errorDetail);
    // Nedoručení / failed status → kontakt error, neopakovat do nekonečna.
    await markContactErrorUnlessOptedOut(db, contact.id);
  }
  return result;
}

async function handleInboundMessage(
  db: ReturnType<typeof getDb>,
  anthropicKey: string,
  phoneNumberId: string,
  waToken: string,
  message: InboundMessage,
) {
  const phone = normalizePhone(message.from);
  const contact = await findContactByPhone(db, phone);
  if (!contact) {
    console.warn("webhook: message from unknown number, ignoring", phone);
    return;
  }

  const conversation = await getOrCreateConversation(db, contact.id);
  await updateConversation(db, conversation.id, { last_inbound_at: new Date().toISOString() });

  const text = message.type === "text" ? (message.text?.body ?? "").trim() : "";

  // Idempotence: pokud wa_message_id už existuje, insert selže na unique
  // constraintu a insertMessage vrátí null → duplicitní webhook, nic dál.
  const inboundRow = await insertMessage(db, {
    conversation_id: conversation.id,
    contact_id: contact.id,
    direction: "inbound",
    wa_message_id: message.id,
    type: message.type,
    body: text || null,
    status: "received",
  });
  if (inboundRow === null) {
    console.log("webhook: duplicate wa_message_id, skipping", message.id);
    return;
  }

  // Opt-out gate — deterministicky, PŘED jakýmkoli voláním LLM.
  if (isOptOutMessage(text)) {
    await updateContact(db, contact.id, { status: "opted_out", opted_out_at: new Date().toISOString() });
    await updateConversation(db, conversation.id, { state: "opted_out", outcome: "opted_out" });
    await sendAndLog(
      db,
      contact,
      conversation.id,
      phoneNumberId,
      waToken,
      getOptOutConfirmation(contact.language),
    );
    console.log("webhook: opt-out processed for", contact.phone);
    return;
  }

  // Neočekávaný vstup (obrázek/audio/prázdné) — nevolej LLM naprázdno.
  if (message.type !== "text" || !text) {
    await sendAndLog(
      db,
      contact,
      conversation.id,
      phoneNumberId,
      waToken,
      getAskForTextMessage(contact.language),
    );
    return;
  }

  // Strop zpráv na konverzaci.
  const messageCount = await countMessagesInConversation(db, conversation.id);
  if (messageCount > MAX_MESSAGES_PER_CONVERSATION) {
    console.warn("webhook: conversation message cap reached, handing off", conversation.id);
    await sendAndLog(db, contact, conversation.id, phoneNumberId, waToken, getFallbackMessage(contact.language));
    await updateConversation(db, conversation.id, { state: "handed_off" });
    return;
  }

  if (contact.status === "pending" || contact.status === "contacted") {
    await updateContact(db, contact.id, { status: "replied" });
  }

  // Mimo 24h okno nesmíme poslat volný text — jen schválenou (re-engagement)
  // template. Vrací se stejná úvodní template, campaign má jen jednu.
  if (!isWithinReplyWindow(message.timestamp)) {
    console.warn("webhook: mimo 24h okno, posílám re-engagement template místo volného textu");
    const tpl = TEMPLATE_BY_LANGUAGE[contact.language] ?? TEMPLATE_BY_LANGUAGE.cs;
    const tplResult = await sendTemplate(phoneNumberId, waToken, contact.phone, contact.name, contact.language);
    await insertMessage(db, {
      conversation_id: conversation.id,
      contact_id: contact.id,
      direction: "outbound",
      wa_message_id: tplResult.waMessageId ?? null,
      type: "template",
      template_name: tpl.name,
      status: tplResult.ok ? "sent" : "failed",
      error_code: tplResult.errorCode ?? null,
      error_detail: tplResult.errorDetail ?? null,
    });
    if (!tplResult.ok) {
      console.error("webhook: re-engagement template send failed", tplResult.errorCode, tplResult.errorDetail);
      await markContactErrorUnlessOptedOut(db, contact.id);
    }
    await updateConversation(db, conversation.id, { state: "awaiting_reply" });
    return;
  }

  let replyText: string;
  let tokens: { input: number; output: number } | undefined;
  let interest: Interest = "neutral";

  try {
    const claudeReply = await getClaudeReply(anthropicKey, contact.language, contact.segment, contact.name, text);
    const guardrail = await checkGuardrail(anthropicKey, text, claudeReply.text);
    tokens = { input: claudeReply.inputTokens, output: claudeReply.outputTokens };

    if (guardrail.safe) {
      replyText = claudeReply.text;
      interest = guardrail.interest;
    } else {
      console.warn("webhook: guardrail blocked reply —", guardrail.reason);
      replyText = getFallbackMessage(contact.language);
    }
  } catch (err) {
    console.error("webhook: Claude call failed —", err);
    replyText = getFallbackMessage(contact.language);
  }

  await sendAndLog(db, contact, conversation.id, phoneNumberId, waToken, replyText, tokens);

  // Rozpoznání zájmu/nezájmu → handoff, nebo slušné ukončení (v prototypu =
  // označení kontaktu/konverzace + log, žádná zvláštní zpráva navíc —
  // Claude odpověď už je zdvořilá a stručná dle system promptu).
  if (interest === "interested") {
    console.log("webhook: zájem rozpoznán, handoff na poradce —", contact.phone);
    await updateContact(db, contact.id, { status: "interested" });
    await updateConversation(db, conversation.id, { state: "handed_off", outcome: "interested" });
  } else if (interest === "not_interested") {
    console.log("webhook: klient nemá zájem, ukončuji konverzaci —", contact.phone);
    await updateConversation(db, conversation.id, { state: "closed", outcome: "not_interested" });
  } else {
    await updateConversation(db, conversation.id, { state: "active" });
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = Deno.env.get("META_VERIFY_TOKEN");

    if (mode === "subscribe" && challenge && token === verifyToken) {
      console.log("webhook: verify handshake OK");
      return new Response(challenge, { status: 200 });
    }

    console.warn("webhook: verify handshake rejected", { mode, tokenMatches: token === verifyToken });
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    const rawBody = new Uint8Array(await req.arrayBuffer());
    const signatureHeader = req.headers.get("x-hub-signature-256");
    const appSecret = Deno.env.get("META_APP_SECRET");

    if (!appSecret) {
      console.error("webhook: META_APP_SECRET not configured");
      return new Response("Server misconfigured", { status: 500 });
    }

    const valid = await verifySignature(rawBody, signatureHeader, appSecret);
    if (!valid) {
      console.warn("webhook: rejected — invalid or missing X-Hub-Signature-256", {
        hasHeader: !!signatureHeader,
      });
      return new Response("Unauthorized", { status: 401 });
    }

    // deno-lint-ignore no-explicit-any
    let payload: any;
    try {
      payload = JSON.parse(new TextDecoder().decode(rawBody));
    } catch {
      console.error("webhook: valid signature but body is not valid JSON");
      return new Response("OK", { status: 200 });
    }

    console.log("webhook: verified POST accepted");

    const db = getDb();
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
    const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID")!;
    const waToken = Deno.env.get("META_WA_TOKEN")!;

    for (const entry of payload?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value ?? {};

        for (const status of value.statuses ?? []) {
          await handleStatusUpdate(db, status);
        }

        for (const message of value.messages ?? []) {
          try {
            await handleInboundMessage(db, anthropicKey, phoneNumberId, waToken, message);
          } catch (err) {
            console.error("webhook: error processing inbound message", err);
          }
        }
      }
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Method Not Allowed", { status: 405 });
});
