# UseItUp

UseItUp is an Expo React Native pantry app that helps people track ingredients, spot expiring food, and generate meal ideas from what they already have.

## Prerequisites

- Node.js 20.19 or newer
- npm
- Expo Go on a mobile device, or a browser for web testing
- A Supabase account and project
- A Gemini API key for recipe generation

## Development

Install dependencies:

```bash
npm ci
```

Create a local environment file:

```bash
cp .env.example .env
```

Start Expo:

```bash
npm start -- --port 8081
```

Open the app with Expo Go, or press `w` in the Expo terminal to run the web build.

Run project checks:

```bash
npm run test
npm run lint
npx tsc --noEmit
```

## Supabase

Create a Supabase project, then copy the project API URL and anon public key into `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Do not commit `.env`. Use `.env.example` as the shared template for collaborators.

### Environment Variables And Secrets

Use `.env.example` for local Expo development. Use `.env.production.example` as the production deployment checklist.

- Public app values such as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` belong in local `.env`, EAS build environment variables, or Vercel environment variables.
- Supabase Edge Function secrets such as AI provider keys, `PEXELS_API_KEY`, and `SERVICE_ROLE_KEY` must be set in the Supabase Dashboard under **Project Settings > Edge Functions > Secrets**, or with `npx supabase secrets set NAME=value`.
- Never commit real `.env` files or expose `SERVICE_ROLE_KEY` through an `EXPO_PUBLIC_*` variable.

Database migrations live in this folder:

```text
supabase/migrations/
```

For manual setup, open the Supabase SQL Editor and run every migration file in
`supabase/migrations/` in numeric order (currently `001` through `018`), for example:

```text
001_create_pantry_items.sql
002_add_pantry_item_normalized_name.sql
...
018_add_pantry_item_language.sql
```

The migrations create the pantry table, enable Row Level Security, add
authenticated-user policies, grant the app access through Supabase's
authenticated role, and add later tables/columns for recipes, favorites, cook
history, translation caches, image caches, and rate-limit storage. Run all of
them; the app expects the full schema, not just the first two.

### Auth Redirect URLs

In Supabase, go to **Authentication > URL Configuration**.

For local web development, add:

```text
http://localhost:8081/**
```

If you run Expo web on a different port, add that port too.

For mobile password reset flows in Expo Go, the reset link may open in the browser. Production mobile deep links should be configured later when the app has a production URL or native scheme.

### Edge Function Deploy

The app uses two Edge Functions, both under `supabase/functions/`:

```text
supabase/functions/generate-recipes/   # recipe generation AND translate-on-view
supabase/functions/recipe-image/       # Pexels/AI image lookup with caching
```

`generate-recipes` handles both AI recipe generation and the translate-on-view
flow, so a single deploy covers both; they share the AI provider secret.

Install/use the Supabase CLI through `npx` and link once per machine:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
```

Deploy both functions at once:

```bash
npx supabase functions deploy
```

Or deploy them individually:

```bash
npx supabase functions deploy generate-recipes
npx supabase functions deploy recipe-image
```

`functions deploy` pushes code only. Secrets (see below) are set separately and
persist across deploys, so you do not re-set them each time.

You can find your project ref in the Supabase project URL or project settings. For example, in `https://abcxyz.supabase.co`, the project ref is `abcxyz`.

## Recipe Generation

Phase 3A generates recipes without saving them to the database. The Expo app calls this Supabase Edge Function:

```text
supabase/functions/generate-recipes/
```

Set the Gemini key as a Supabase secret, not in Expo `.env`. This can be done in the Supabase dashboard or with the CLI.

Dashboard path:

```text
Project Settings > Edge Functions > Secrets
```

CLI option:

```bash
npx supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

Optional provider/model overrides:

```bash
npx supabase secrets set AI_PROVIDER=gemini
npx supabase secrets set GEMINI_MODEL=gemini-2.0-flash
```

Generated recipes are session-only for now. A later Phase 3B will add saved recipes.

The function is organized by provider so the app can keep calling the same `generate-recipes`
endpoint if we later switch from Gemini to OpenAI or another LLM.

## Recipe And Pantry Images

The `recipe-image` Edge Function looks up images (default provider: Pexels) and
caches results in Supabase. Set the provider key as a Supabase secret:

```bash
npx supabase secrets set PEXELS_API_KEY=your-pexels-api-key
```

Without this key, image lookups fail and the app falls back to local icon
placeholders. Get a free key at https://www.pexels.com/api/.

## Reproducing The Project

From a fresh clone:

```bash
npm ci
cp .env.example .env
```

Then:

1. Create a Supabase project.
2. Fill in `.env` with the Supabase URL and anon key.
3. Run all SQL migrations in `supabase/migrations/` in order (`001` through `018`).
4. Add the auth redirect URL for your local Expo port.
5. Add `GEMINI_API_KEY` and `PEXELS_API_KEY` as Supabase Edge Function secrets.
6. Link the project, then deploy both functions with `npx supabase functions deploy`.
7. Start Expo with `npm start -- --port 8081`.
8. Run `npm run test`, `npm run lint`, and `npx tsc --noEmit` before committing.

Docker is not required for the current Expo Go workflow. Reproducibility is handled through `package-lock.json`, `.env.example`, Supabase migrations, Edge Function source, and CI.
