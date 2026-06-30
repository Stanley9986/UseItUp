#!/usr/bin/env bash
#
# Bootstraps the UseItUp Supabase backend against the currently linked project:
#   1. applies all database migrations
#   2. sets every Edge Function secret from .env.supabase in one shot
#   3. deploys the Edge Functions
#
# Prerequisites (run once):
#   npx supabase login
#   npx supabase link --project-ref <your-project-ref>
#   cp .env.supabase.example .env.supabase   # then fill in real values
#
# Usage:
#   npm run setup:supabase
#   # or, with a custom secrets file:
#   bash scripts/setup-supabase.sh path/to/secrets.env
set -euo pipefail

SECRETS_FILE="${1:-.env.supabase}"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "Missing secrets file: $SECRETS_FILE" >&2
  echo "Create it with: cp .env.supabase.example .env.supabase   (then fill in values)" >&2
  exit 1
fi

echo "==> Applying database migrations (supabase db push)"
npx supabase db push

echo "==> Setting Edge Function secrets from $SECRETS_FILE"
npx supabase secrets set --env-file "$SECRETS_FILE"

echo "==> Deploying Edge Functions"
npx supabase functions deploy

echo "==> Done. Supabase backend is set up."
