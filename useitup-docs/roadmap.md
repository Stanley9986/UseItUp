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

## Section 2 - Tech Debt / Cleanup

- Squash migration 005 into the later favorite recipe migration before shipping or presenting a fresh setup path.
- Finish mock-data removal as leftovers appear.
- Remove unused UI/data leftovers as they appear.

## Section 3 - Core Features / Product Value

- Upgrade expiry reminders from local scheduled notifications to remote push if the app needs server-driven alerts later.
- Add barcode scanning to make pantry item entry faster.
- Add a recipe image strategy for generated recipes. Prefer simple category artwork first; generated/API images can come later.

## Section 4 - Quality / Robustness

- Harden the Edge Function with rate limiting, provider fallback, and generation caching.
- Improve duplicate handling for generated recipes, beyond title-based favorite dedupe.
- Keep adding focused tests with every new feature.

## Section 5 - Infra / Release

- Verify a fresh database applies migrations cleanly through the latest migration.
- Adopt a Supabase CLI workflow for local migration validation.
- Keep environment setup and deployment docs current.
- Add EAS build/submit config for TestFlight and Play Store testing.

## Later / Nice-to-Have

- Premium usage limits and payments.
- More advanced recipe search and filters.
- Partial/streaming recipe generation UI.
- More detailed household or multi-user support.
