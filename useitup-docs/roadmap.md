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
- All ten supported languages have complete app-copy dictionaries (English, Spanish, Chinese, French, German, Italian, Japanese, Korean, Portuguese, Vietnamese); the language picker lists each language in its own name (autonym).
- Stored recipe content (title, description, instructions) and item/ingredient names are translated on view into the active language through the Edge Function, cached in Supabase (content-addressed) and on-device, so switching language localizes AI-generated recipes and pantry names without regenerating.
- Expiration dates are entered with a native date picker instead of free-text parsing.
- List and detail screens reload on focus, so deleting or editing no longer leaves stale duplicate screens; deleting from cook history removes the history entry.
- Edge Functions have provider selection env vars for recipe generation, translation, and image lookup so Gemini/OpenAI/DeepSeek/Pexels choices can be swapped without mobile app changes.
- lib modules are grouped into domain folders (recipes, pantry, cooking, i18n, shopping, reminders, preferences, shared) and the on-device caches share one client-cache utility.
- Migrations run through 016 (recipe source-language column, content-addressed translation cache, OpenAI food-image provider allowance).
- The Edge Function falls back across providers on error or timeout (`PROVIDER_FALLBACK_ORDER`), caps each provider request (`PROVIDER_TIMEOUT_MS`), and the Recipes screen briefly disables regenerate after a run to avoid double-fire.

## Section 2 - Tech Debt / Cleanup

- Squash migration 005 into the later favorite recipe migration before shipping or presenting a fresh setup path.
- Finish mock-data removal as leftovers appear.
- Remove unused UI/data leftovers as they appear.

## Section 3 - Core Features / Product Value

- Show concrete ingredient amounts in recipes. Generated recipes currently leave `quantityValue`/`quantityUnit` null, so the detail screen falls back to "to taste" for every ingredient. Make those two fields required in `recipeSchema` and add a generation-prompt line requiring a number plus a common cooking unit (g, ml, cup, tbsp, tsp, piece, clove) per ingredient, reserving "to taste" for true seasonings. Edge-only change (deploy + regenerate to see it); the display layer already formats value + unit.
- Recognize well-known named dishes during generation. The prompt is purely pantry-driven, so ingredients for a known dish (e.g. tteokbokki) become a generic stir-fry. Add a prompt line: when the available ingredients clearly correspond to a well-known named dish, make that dish and use its authentic name, while still favoring items that expire soon. Edge-only prompt change.
- Cuisine preference setting (deferred). Let users bias generation toward cuisines they like (e.g. a multi-select in recipe preferences, stored alongside dietary preferences, injected into the prompt). Distinct from the named-dish fix above; only build if users ask to steer cuisine after that ships.
- Upgrade expiry reminders from local scheduled notifications to remote push if the app needs server-driven alerts later.
- Add barcode scanning to make pantry item entry faster.

## Section 4 - Quality / Robustness

- Add a per-user generation cost cap (cost control, not rate compliance) before a public launch. DeepSeek imposes no requests-per-minute limit, only a high concurrency cap (500/2500), so dedicated rate limiting is not needed at current scale; provider fallback and request timeouts are already in place.
- Cache recipe generation results where appropriate (translation results are already cached; generation is still fresh per request).
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
