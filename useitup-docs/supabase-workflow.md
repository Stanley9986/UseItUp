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
npx supabase functions deploy recipe-image
```

Function secrets are managed separately from migrations:

```sh
npx supabase secrets set PEXELS_API_KEY=...
npx supabase secrets set SERVICE_ROLE_KEY=...
```

Do not commit secret values. `SERVICE_ROLE_KEY` is intentionally not named with a `SUPABASE_` prefix because the dashboard blocks user-created secrets with that prefix.
