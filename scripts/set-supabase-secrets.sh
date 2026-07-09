#!/usr/bin/env bash
# Nastaví Supabase Edge Function secrets z hodnot v .env (repo root).
# Nikdy netiskne hodnoty — jen potvrzení a seznam názvů (supabase secrets list
# vrací názvy + digest, ne plaintext hodnoty).
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
# shellcheck disable=SC1091
source ./.env
set +a

: "${META_WA_TOKEN:?META_WA_TOKEN chybí}"
: "${META_PHONE_NUMBER_ID:?META_PHONE_NUMBER_ID chybí}"
: "${META_APP_SECRET:?META_APP_SECRET chybí}"
: "${META_VERIFY_TOKEN:?META_VERIFY_TOKEN chybí}"
: "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY chybí}"

npx supabase secrets set \
  META_WA_TOKEN="$META_WA_TOKEN" \
  META_PHONE_NUMBER_ID="$META_PHONE_NUMBER_ID" \
  META_APP_SECRET="$META_APP_SECRET" \
  META_VERIFY_TOKEN="$META_VERIFY_TOKEN" \
  ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"

echo
echo "=== supabase secrets list (jen názvy/digest, ne hodnoty) ==="
npx supabase secrets list
