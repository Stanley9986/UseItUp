# Supabase Workflow

This project uses Supabase CLI migrations as the source of truth for database schema changes.

## Requirements

- Docker Desktop must be running for local Supabase.
- Use `npx supabase ...` unless the Supabase CLI is installed globally.
- Do not create schema changes only through the Supabase Dashboard SQL Editor. If SQL is tested in the dashboard, add the final version as a migration file before treating it as project state.

## Local Migration Validation

Use this workflow before shipping schema changes or when validating a fresh setup:

```sh
npx supabase start
npx supabase db reset --local --no-seed
npx supabase stop
```

`db reset --local --no-seed` recreates the local database and applies every file in `supabase/migrations` in order. A successful reset means a fresh local database can be rebuilt from the committed migrations.

## Remote Migration Preview

Before applying new migrations to the linked Supabase project, preview them:

```sh
npx supabase db push --dry-run
```

If the dry run only shows the expected pending migrations, apply them:

```sh
npx supabase db push
```

## Migration History Repair

If SQL was run manually in the Dashboard, the remote schema may exist while the Supabase CLI migration history still shows migrations as unapplied. Check history with:

```sh
npx supabase migration list
```

If local migrations exist but the remote column is blank for migrations that were already applied manually, mark them as applied instead of rerunning them:

```sh
npx supabase migration repair --status applied 001
npx supabase migration repair --status applied 002
```

Repeat for each migration version that exists in the remote schema. After repair, rerun:

```sh
npx supabase migration list
```

The `Local` and `Remote` columns should match for applied migrations.

## Edge Functions

Deploy Supabase Edge Functions explicitly after function source changes:

```sh
npx supabase functions deploy generate-recipes
npx supabase functions deploy recipe-image
```

Function secrets are managed separately from migrations. Set them all at once from a git-ignored secrets file:

```sh
cp .env.supabase.example .env.supabase   # then fill in values
npx supabase secrets set --env-file ./.env.supabase
```

`npm run setup:supabase` wraps `db push` + this secrets load + `functions deploy` into one step. Or set values individually:

```sh
npx supabase secrets set AI_PROVIDER=gemini
npx supabase secrets set TRANSLATION_PROVIDER=gemini
npx supabase secrets set IMAGE_PROVIDER=pexels
npx supabase secrets set GEMINI_API_KEY=...
npx supabase secrets set PEXELS_API_KEY=...
npx supabase secrets set SERVICE_ROLE_KEY=...
```

Do not commit secret values. `SERVICE_ROLE_KEY` is intentionally not named with a `SUPABASE_` prefix because the dashboard blocks user-created secrets with that prefix.

`generate-recipes` supports `AI_PROVIDER=gemini|openai|deepseek` for recipe generation and `TRANSLATION_PROVIDER=gemini|openai|deepseek` for recipe and term translation. If `TRANSLATION_PROVIDER` is unset, it falls back to `AI_PROVIDER`.

Provider resilience:

- `PROVIDER_FALLBACK_ORDER` is a comma-separated list of providers to try after the primary if it hits a retryable failure such as quota, rate limiting, provider downtime, or timeout (e.g. `deepseek,gemini`). Applies to both generation and translation. Leave unset or set to `none` for no fallback. Only list providers whose API keys are configured.
- `PROVIDER_TIMEOUT_MS` caps each AI provider request (default `45000`). DeepSeek can hold a connection open for minutes under load, so this bounds the wait and turns a stall into a fallback. Keep it well under the Edge Function's own timeout.
- `GENERATION_RATE_LIMIT_PER_HOUR` limits fresh recipe generation requests per authenticated user per rolling hour (default `30`, set `0` to disable).
- `TRANSLATION_RATE_LIMIT_PER_HOUR` limits uncached recipe and term translation requests per authenticated user per rolling hour (default `240`, set `0` to disable). Cached translation hits do not count against this limit.
- `INTAKE_RATE_LIMIT_PER_HOUR` limits natural-language pantry intake parsing requests per authenticated user per rolling hour (default `60`, set `0` to disable).

When a `*_RATE_LIMIT_PER_HOUR` secret is set, its value **overrides the code default** — the in-code default only applies when the secret is absent. So if you set a low value for testing (e.g. `1`), changing the code default has no effect until you update or unset that secret (`npx supabase secrets unset GENERATION_RATE_LIMIT_PER_HOUR`). Secret changes take effect on the next invocation; redeploy the function if it seems sticky. Limits are a rolling one-hour window, so raising a limit immediately unblocks a user without clearing any table.

`recipe-image` supports `IMAGE_PROVIDER=pexels` today. `IMAGE_PROVIDER=openai` is reserved for future generated image support after adding Supabase Storage for stable image URLs.
