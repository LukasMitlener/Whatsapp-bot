// Debug helper — volá claude.ts (reply + guardrail) přímo, mimo Edge
// Function. Spouštěj přes scripts/debug-claude.sh (ten čte ANTHROPIC_API_KEY
// z .env). Usage: bash scripts/debug-claude.sh cs "Jaky je vynos?" [segment] [jméno]
import { getClaudeReply, checkGuardrail } from "../supabase/functions/_shared/claude.ts";

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const language = process.argv[2] ?? "cs";
  const userMessage = process.argv[3] ?? "Ahoj, mam zajem o datacentra, jaky je vynos?";
  const segment = process.argv[4] ?? null;
  const clientName = process.argv[5] ?? null;

  console.log(`--- volám Claude (language=${language}, segment=${segment ?? "neznámý"}, jméno=${clientName ?? "neznámé"}) ---`);
  console.log(`Zpráva klienta: ${userMessage}\n`);

  const reply = await getClaudeReply(apiKey, language, segment, clientName, userMessage);
  console.log("=== ODPOVĚĎ ASISTENTA ===");
  console.log(reply.text);
  console.log(`\n(input_tokens=${reply.inputTokens}, output_tokens=${reply.outputTokens})\n`);

  console.log("=== GUARDRAIL ===");
  const guardrail = await checkGuardrail(apiKey, userMessage, reply.text);
  console.log(guardrail);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
