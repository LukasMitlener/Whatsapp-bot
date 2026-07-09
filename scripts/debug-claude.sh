#!/usr/bin/env bash
# Zavolá stejnou claude.ts logiku (reply + guardrail) přímo lokálně přes
# tsx, mimo Edge Function — pro debugging bez nutnosti Edge Function logů.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
# shellcheck disable=SC1091
source ./.env
set +a

: "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY chybí}"

NODE_OPTIONS=--experimental-websocket npx tsx scripts/_debug-claude.ts "$@"
