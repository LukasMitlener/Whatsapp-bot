// Deterministická detekce opt-outu — musí běžet PŘED jakýmkoli voláním LLM
// (žádná z těchto frází se nespoléhá na to, že to model rozpozná/dodrží).
// Čisté funkce, žádné Deno-specifické API — testovatelné i přes tsx.

const OPT_OUT_PATTERNS: RegExp[] = [
  /^stop\b/i,
  /nem[áa]m\s+z[áa]jem/i, // "nemám zájem"
  /\bodhl[áa]s/i, // odhlásit, odhlaste, odhlásím se, odhlaš mě...
  /\bunsubscribe\b/i,
  /\bnot\s+interested\b/i,
];

export function isOptOutMessage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return OPT_OUT_PATTERNS.some((re) => re.test(trimmed));
}
