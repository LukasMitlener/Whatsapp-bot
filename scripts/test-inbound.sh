#!/usr/bin/env bash
# Pošle jeden signed inbound test na whatsapp-webhook s unikátním
# wa_message_id (idempotence by jinak druhé volání přeskočila).
# Usage: bash scripts/test-inbound.sh "+420XXXXXXXXX" "text zprávy" [unix-timestamp]
# (telefon musí odpovídat existujícímu kontaktu v DB)
# Bez 3. argumentu použije aktuální čas (uvnitř 24h okna). Pro test
# re-engagement větve dej starý timestamp, např. 1234567890.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
# shellcheck disable=SC1091
source ./.env
set +a

: "${META_APP_SECRET:?META_APP_SECRET chybí}"

PHONE="${1:?použití: test-inbound.sh <telefon-s-plus> <text> [timestamp]}"
TEXT="${2:?použití: test-inbound.sh <telefon-s-plus> <text> [timestamp]}"
TIMESTAMP="${3:-$(date +%s)}"
PHONE_DIGITS="${PHONE#+}"
WAMID="wamid.TEST-$(date +%s%N)"

FUNCTION_URL="https://zweorumgtocxyocrjtdc.supabase.co/functions/v1/whatsapp-webhook"

BODY=$(jq -n --arg from "$PHONE_DIGITS" --arg id "$WAMID" --arg text "$TEXT" --arg ts "$TIMESTAMP" '
{
  object: "whatsapp_business_account",
  entry: [{
    id: "0",
    changes: [{
      value: {
        messaging_product: "whatsapp",
        metadata: { phone_number_id: "TEST" },
        messages: [{ from: $from, id: $id, timestamp: $ts, type: "text", text: { body: $text } }]
      },
      field: "messages"
    }]
  }]
}')

SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$META_APP_SECRET" | sed 's/^.* //')

echo "=== POST inbound: \"$TEXT\" (wa_message_id=$WAMID) ==="
curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=${SIG}" \
  -d "$BODY" \
  -w '\nHTTP %{http_code}\n'
