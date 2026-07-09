#!/usr/bin/env bash
# Odešle custom WhatsApp templates (imperium_datacenters_intro_cs/en) ke
# schválení přes Graph API. Čte secrets ze souboru v repo rootu (viz .env.example),
# nikdy je netiskne — jen odpověď Meta API (obsahuje template id/status, ne token).
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
# shellcheck disable=SC1091
source ./.env
set +a

: "${META_WA_TOKEN:?META_WA_TOKEN chybí}"
: "${META_WAB_ACCOUNT_ID:?META_WAB_ACCOUNT_ID chybí}"
WABA_ID="$META_WAB_ACCOUNT_ID"

GRAPH_VERSION="v21.0"

submit() {
  local name="$1" lang="$2" body="$3" example="$4"
  local payload
  payload=$(jq -n \
    --arg name "$name" \
    --arg lang "$lang" \
    --arg body "$body" \
    --arg example "$example" \
    '{
      name: $name,
      language: $lang,
      category: "MARKETING",
      components: [
        { type: "BODY", text: $body, example: { body_text: [[$example]] } }
      ]
    }')

  echo "=== $name ($lang) ==="
  curl -s -X POST "https://graph.facebook.com/${GRAPH_VERSION}/${WABA_ID}/message_templates" \
    -H "Authorization: Bearer ${META_WA_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload"
  echo
  echo
}

submit "imperium_datacenters_intro_cs" "cs" \
  "Dobrý den {{1}}, tady automatický asistent Imperium Finance. Máme pro vás informaci o investiční příležitosti do datových center a AI infrastruktury. Chcete se dozvědět víc? Napište ANO, nebo se zeptejte přímo.\n\nOdpovědí STOP se kdykoliv odhlásíte." \
  "Jan"

submit "imperium_datacenters_intro_en" "en_US" \
  "Hello {{1}}, this is an automated assistant from Imperium Finance. We have information about an investment opportunity in data centers and AI infrastructure. Want to learn more? Reply YES, or ask us directly.\n\nReply STOP anytime to opt out." \
  "John"
