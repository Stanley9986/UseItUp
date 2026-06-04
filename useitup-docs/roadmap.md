# UseItUp Roadmap

This file tracks the working backlog for UseItUp so project direction survives chat context resets and is easy for collaborators to review.

## Current Status

- Static MVP screens are implemented.
- Supabase auth and pantry CRUD are connected.
- Recipe generation uses a Supabase Edge Function.
- Generated recipe suggestions are saved in Supabase.
- Favorite recipes are stored as separate snapshots.
- Cook history and pantry updates exist.
- Most mock data wiring has been removed.
- Dietary preferences are saved in Supabase and included in recipe generation.
- Shopping list items can be created from a recipe's missing ingredients.
- Expiry reminder settings and local scheduled notifications are wired to the Home bell.
- Data-access tests cover the core Supabase modules for pantry, recipes, favorites, and cooking.
- Home shows monthly waste-reduction stats from cook history and pantry updates.
- Favorite recipe snapshots can be edited after saving.
- Saved suggested recipes can be edited through a transactional Supabase RPC.
- Suggested recipes, favorite recipes, and expiring-soon lists paginate instead of rendering unbounded lists.
- Recipe cards and pantry item previews use Pexels image search through a Supabase Edge Function with local icon fallbacks.
- Pexels image lookups are cached in Supabase to avoid redundant provider API calls.
- Recipe and pantry image responses are cached on-device to reduce repeated Edge Function calls and placeholder swaps.
- Fresh local database validation applies migrations cleanly through 012.
- Supabase CLI workflow for local migration validation and remote migration repair is documented.
- Recipe language preferences are saved in Supabase and included in generated recipe prompts.
- App language can be selected from the More page and drives static copy across app screens.
- Spanish app copy is filled out across localized screens; other supported languages currently use partial dictionaries with English fallback.
- Edge Functions have provider selection env vars for recipe generation, translation, and image lookup so Gemini/OpenAI/DeepSeek/Pexels choices can be swapped without mobile app changes.

## Section 2 - Tech Debt / Cleanup

- Squash migration 005 into the later favorite recipe migration before shipping or presenting a fresh setup path.
- Finish mock-data removal as leftovers appear.
- Remove unused UI/data leftovers as they appear.

## Section 3 - Core Features / Product Value

- Fill out complete non-Spanish translation dictionaries after deciding which languages to ship first.
- Upgrade expiry reminders from local scheduled notifications to remote push if the app needs server-driven alerts later.
- Add barcode scanning to make pantry item entry faster.

## Section 4 - Quality / Robustness

- Harden the Edge Function with rate limiting, provider fallback, and generation caching.
- Add Supabase Storage-backed generated image support before enabling `IMAGE_PROVIDER=openai`.
- Improve duplicate handling for generated recipes, beyond title-based favorite dedupe.
- Keep adding focused tests with every new feature.

## Section 5 - Infra / Release

- Keep environment setup and deployment docs current.
- Add EAS build/submit config for TestFlight and Play Store testing.

## Later / Nice-to-Have

- Premium usage limits and payments.
- More advanced recipe search and filters.
- Partial/streaming recipe generation UI.
- More detailed household or multi-user support.
