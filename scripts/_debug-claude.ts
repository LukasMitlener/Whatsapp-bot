// Debug helper — volá claude.ts (reply + guardrail) přímo, mimo Edge
// Function. Spouštěj přes scripts/debug-claude.sh (ten čte ANTHROPIC_API_KEY
// z .env). Usage: bash scripts/debug-claude.sh cs "Jaky je vynos?"
import { getClaudeReply, checkGuardrail } from "../supabase/functions/_shared/claude.ts";

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const language = process.argv[2] ?? "cs";
  const userMessage = process.argv[3] ?? "Ahoj, mam zajem o datacentra, jaky je vynos?";

  console.log(`--- volám Claude (language=${language}) ---`);
  console.log(`Zpráva klienta: ${userMessage}\n`);

  const reply = await getClaudeReply(apiKey, language, userMessage);
  console.log("=== ODPOVĚĎ ASISTENTA ===");
  console.log(reply.text);
  console.log(`\n(input_tokens=${reply.inputTokens}, output_tokens=${reply.outputTokens})\n`);

  console.log("=== GUARDRAIL ===");
  const guardrail = await checkGuardrail(apiKey, reply.text);
  console.log(guardrail);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
