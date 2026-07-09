// Tenký klient pro Anthropic Messages API — přímý fetch, žádný SDK balíček
// (jednodušší audit, žádné bundlování navíc v Edge runtime).

import { buildGuardrailPrompt, buildSystemPrompt } from "./prompts.ts";

const ANTHROPIC_VERSION = "2023-06-01";
const REPLY_MODEL = "claude-sonnet-5";
const GUARDRAIL_MODEL = "claude-haiku-4-5-20251001";

// Pevná, vývojářem daná instrukce pro "user" turn — samotný text klienta je
// vložený jako DATA uvnitř system promptu (buildSystemPrompt), ne sem.
// Tohle udržuje netrusted vstup mimo konverzační roli úplně (role-lock).
const REPLY_TRIGGER = "Odpověz klientovi podle pravidel a FAKT v systémovém promptu, na základě zprávy v DATA bloku.";

export interface ClaudeReply {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

async function callMessages(
  apiKey: string,
  model: string,
  maxTokens: number,
  system: string | undefined,
  userContent: string,
): Promise<{ text: string; inputTokens: number; outputTokens: number; stopReason: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");

  return {
    text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    stopReason: data.stop_reason ?? "unknown",
  };
}

export async function getClaudeReply(
  apiKey: string,
  language: string,
  segment: string | null,
  clientName: string | null,
  userMessage: string,
): Promise<ClaudeReply> {
  const system = buildSystemPrompt(language, segment, clientName, userMessage);
  const { text, inputTokens, outputTokens, stopReason } = await callMessages(
    apiKey,
    REPLY_MODEL,
    900,
    system,
    REPLY_TRIGGER,
  );
  if (stopReason === "max_tokens") {
    console.warn("claude: reply truncated at max_tokens — consider raising the limit");
  }
  return { text: text.trim(), inputTokens, outputTokens };
}

export type Interest = "interested" | "not_interested" | "neutral";

export interface GuardrailResult {
  safe: boolean;
  reason: string;
  interest: Interest;
  inputTokens: number;
  outputTokens: number;
}

function parseInterest(value: unknown): Interest {
  return value === "interested" || value === "not_interested" ? value : "neutral";
}

// Modely občas zabalí JSON do markdown code fence (```json ... ```) i přes
// instrukci "vrať POUZE JSON, nic jiného". Odstraní fence, pokud tam je.
function stripCodeFence(text: string): string {
  const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : text.trim();
}

// Jeden levný Haiku call se dvěma úkoly zároveň — safety check (compliance)
// a detekce zájmu klienta (pro handoff). Šetří druhé volání navíc.
export async function checkGuardrail(
  apiKey: string,
  userMessage: string,
  assistantReply: string,
): Promise<GuardrailResult> {
  const prompt = buildGuardrailPrompt(userMessage, assistantReply);
  const { text, inputTokens, outputTokens, stopReason } = await callMessages(
    apiKey,
    GUARDRAIL_MODEL,
    300,
    undefined,
    prompt,
  );

  try {
    const parsed = JSON.parse(stripCodeFence(text));
    return {
      safe: parsed.safe === true,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
      interest: parseInterest(parsed.interest),
      inputTokens,
      outputTokens,
    };
  } catch {
    // Fail-closed: nečitelná odpověď guardrailu (i truncated JSON kvůli
    // stopReason === "max_tokens") = neber jako bezpečnou ani jako signál zájmu.
    console.warn("guardrail: failed to parse JSON response, stopReason=", stopReason, "raw=", text);
    return { safe: false, reason: "guardrail: unparsable response", interest: "neutral", inputTokens, outputTokens };
  }
}
