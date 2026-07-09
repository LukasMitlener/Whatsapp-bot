#!/usr/bin/env bash
# Zkontroluje stav schválení custom templatů přes Graph API.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
source ./.env
set +a

: "${META_WA_TOKEN:?META_WA_TOKEN chybí}"
: "${META_WAB_ACCOUNT_ID:?META_WAB_ACCOUNT_ID chybí}"

curl -s "https://graph.facebook.com/v21.0/${META_WAB_ACCOUNT_ID}/message_templates?fields=name,status,language,category" \
  -H "Authorization: Bearer ${META_WA_TOKEN}" | python3 -m json.tool
