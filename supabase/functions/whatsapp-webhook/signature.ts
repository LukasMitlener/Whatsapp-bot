// HMAC-SHA256 verifikace X-Hub-Signature-256 (Meta webhook signing).
// Čisté funkce (jen Web Crypto + TextEncoder), žádné Deno-specifické globály —
// jde otestovat i mimo Edge runtime (Node/tsx).

export async function computeHmacSha256Hex(secret: string, body: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, body);
  return Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time string compare — délku i obsah porovnává bez early-exit,
// aby porovnávací čas nezávisel na tom, kde se řetězce poprvé liší.
export function timingSafeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

export async function verifySignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const received = signatureHeader.slice("sha256=".length);
  const computed = await computeHmacSha256Hex(appSecret, rawBody);
  return timingSafeEqual(computed, received);
}
