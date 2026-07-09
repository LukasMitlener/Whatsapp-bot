#!/usr/bin/env bash
# Ověří whatsapp-webhook: GET handshake, podepsaný POST (200), nepodepsaný
# a špatně podepsaný POST (401). Secrets čte z .env interně, netiskne je.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
# shellcheck disable=SC1091
source ./.env
set +a

: "${META_APP_SECRET:?META_APP_SECRET chybí}"
: "${META_VERIFY_TOKEN:?META_VERIFY_TOKEN chybí}"

FUNCTION_URL="https://zweorumgtocxyocrjtdc.supabase.co/functions/v1/whatsapp-webhook"

# Číslo je záměrně fiktivní placeholder (tento skript testuje jen HMAC
# verify, ne plný pipeline — na neznámé číslo webhook jen zaloguje "unknown
# number" a vrátí 200; pro test celé pipeline použij test-inbound.sh
# s telefonem reálného kontaktu z DB).
BODY='{"object":"whatsapp_business_account","entry":[{"id":"0","changes":[{"value":{"messaging_product":"whatsapp","metadata":{"phone_number_id":"TEST"},"messages":[{"from":"420000000000","id":"wamid.TEST123","timestamp":"1234567890","type":"text","text":{"body":"Ahoj, mam zajem o datacentra"}}]},"field":"messages"}]}]}'

SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$META_APP_SECRET" | sed 's/^.* //')

echo "=== GET verify handshake ==="
curl -s -G "$FUNCTION_URL" \
  --data-urlencode "hub.mode=subscribe" \
  --data-urlencode "hub.verify_token=${META_VERIFY_TOKEN}" \
  --data-urlencode "hub.challenge=test-challenge-123" \
  -w '\nHTTP %{http_code}\n'

echo
echo "=== POST signed (platný HMAC) — čekám 200 ==="
curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=${SIG}" \
  -d "$BODY" \
  -w '\nHTTP %{http_code}\n'

echo
echo "=== POST bez podpisu — čekám 401 ==="
curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d "$BODY" \
  -w '\nHTTP %{http_code}\n'

echo
echo "=== POST se špatným podpisem — čekám 401 ==="
curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=deadbeef00112233445566778899aabbccddeeff00112233445566778899aa" \
  -d "$BODY" \
  -w '\nHTTP %{http_code}\n'
