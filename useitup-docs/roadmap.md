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
- Migrations run through 019 (recipe source-language column, content-addressed translation cache, OpenAI food-image provider allowance, Edge Function rate-limit storage, pantry item source-language column, user cuisine preferences).
- The Edge Function falls back across providers only for retryable provider failures (`PROVIDER_FALLBACK_ORDER`), caps each provider request (`PROVIDER_TIMEOUT_MS`), rate-limits LLM generation/translation per user, and the Recipes screen briefly disables regenerate after a run to avoid double-fire.
- Generated recipes require concrete ingredient amounts: `quantityValue`/`quantityUnit` are required in `recipeSchema` and the generation prompt demands a number plus a common cooking unit per ingredient, reserving null ("to taste") for true seasonings. Needs an Edge Function deploy to take effect in production.
- The generation prompt recognizes well-known named dishes: when available ingredients clearly correspond to one (e.g. tteokbokki), the model makes that dish under its authentic name instead of a generic recipe, while still favoring expiring items. Needs an Edge Function deploy to take effect in production.
- Pantry/ingredient-name translation tries a local common-food dictionary (~120 foods across the nine non-English app languages, with descriptor/plural normalization and shared alias entries like scallion/green onion) before the cached and LLM term-translation fallbacks, cutting LLM calls for everyday items.
- Pantry items record the language their name was entered in (migration 018, stamped from the active app language on create/edit, null = legacy/English). Translate-on-view (`useTranslatedItemNames`) skips names already in the active language and translates names in another language into it (including non-English names back into English), replacing the old "names are always English" assumption. Editing an item restamps its source language to the active app language.
- Generated recipe batches are de-duplicated client-side in `normalizeGeneratedRecipes` (`lib/recipes/recipe-dedupe.ts`): two recipes collapse when their title token sets match after stopword removal and singularization ("Tomato Pasta" = "Pasta with Tomatoes"), or when one title is a subset of the other and they share at least half their ingredients, keeping the first occurrence. This goes beyond the exact normalized-title favorite dedupe and runs on every regenerate.
- The local food dictionary is multidirectional (`lib/i18n/pantry-term-dictionary.ts`): a reverse index built from `pantryTerms` plus an `extraSourceAliases` table (multiple valid names per language, e.g. 西红柿/番茄 for tomato) maps any supported-language name back to its English key, with English as the pivot. `normalizeForeignTerm` lowercases/trims while preserving non-Latin scripts (the older `normalizePantryTerm` stripped them). `getLocalPantryTermTranslation`/`resolveEnglishKey` now take an optional source language; `translateTerms` and `useTranslatedItemNames` thread each item's source language through, so non-English names translate locally (foreign->English, foreign->foreign) instead of hitting the LLM.
- Cuisine preference setting: the recipe-preferences screen (`app/dietary-preferences.tsx`) has a multi-select cuisine card (Italian, Mexican, Chinese, Japanese, Indian, Thai, Mediterranean, American) stored as `cuisine_preferences` on `user_preferences` (migration 019) alongside dietary preferences, surfaced in the profile preference summary, and threaded into recipe generation. The Edge Function prompt leans recipes toward the chosen cuisines while still favoring expiring items and respecting dietary limits (empty list = no bias). Canonical English values are stored; labels are translated across all ten languages. Needs an Edge Function deploy to take effect in production.
- Natural-language pantry intake agent: the Recipes/pantry Add screen links to a Quick Add screen (`app/intake.tsx`) where free text ("two Greek yogurts and a bag of spinach") is parsed by the `generate-recipes` Edge Function `intake` action into structured drafts (name in the active language, quantity/unit, category, storage, and a shelf-life-derived expiration), shown as editable cards for confirmation before a batch save via `createPantryItem`. Client sanitization lives in `lib/pantry/pantry-intake.ts` (clamps every field to the pantry model, caps shelf life, skips nameless items). Rate-limited per user (`INTAKE_RATE_LIMIT_PER_HOUR`, default 60). Needs an Edge Function deploy to take effect in production. Barcode scanning (the other half of the roadmap intake item) is not built yet.

- Rate limits use production-reasonable per-user hourly defaults (generation 30, translation 240, intake 60), overridable per environment via the matching `*_RATE_LIMIT_PER_HOUR` secret.

## Section 2 - Tech Debt / Cleanup

- Squash migration 005 into the later favorite recipe migration before shipping or presenting a fresh setup path.
- Finish mock-data removal as leftovers appear.
- Remove unused UI/data leftovers as they appear.

## Section 3 - Core Features / Product Value

- Cuisine preference setting: shipped (see Current Status). Remaining follow-ups if requested: broaden the cuisine list (more regional cuisines), or allow weighting/ranking instead of a flat multi-select.
- Upgrade expiry reminders from local scheduled notifications to remote push if the app needs server-driven alerts later.
- Pantry intake agent: natural-language input has shipped (see Current Status; `app/intake.tsx` + `intake` Edge Function action). Remaining: product barcode scanning. Needs a camera/barcode dependency (expo-camera works in Expo Go) plus a product lookup (e.g. Open Food Facts, mind the ODbL attribution/share-alike terms) to resolve a scanned code into a name/category, then reuse the existing draft-confirmation flow before saving.

## Section 4 - Quality / Robustness

- Tune backend abuse prevention and provider-failure handling from real usage data before public launch. Recipe generation intentionally remains fresh per request so users get variety; translation results are cached.
- Expand the local common-food translation dictionary further. The fallback order (local dictionary -> cached term translation -> LLM term translation -> original name), name normalization (lowercase, trim, singular/plural, descriptor stripping), and ~120-food coverage are in place in `lib/i18n/pantry-term-dictionary.ts`; recipe prose translation stays on the LLM. For broader coverage consider Wikidata labels (structured data is CC0); be cautious with bulk Open Food Facts taxonomy/product data because it is ODbL and has attribution/share-alike obligations.
- Make the local food dictionary multidirectional: shipped (see Current Status). Remaining follow-ups if needed: broaden `extraSourceAliases` coverage (more regional/synonym names per language) and consider script-specific normalization edge cases beyond the current lowercase/trim approach.
- Add Supabase Storage-backed generated image support before enabling `IMAGE_PROVIDER=openai`.
- Extend recipe duplicate handling further if needed: within-batch title/ingredient dedupe now ships (see Current Status); remaining ideas are de-duplicating generated suggestions against the user's existing saved/favorited recipes (weigh against the intentional "fresh per request" variety) and fuzzier matching such as stemming or embeddings.
- Keep adding focused tests with every new feature.

## Section 5 - Infra / Release

- Keep environment setup and deployment docs current.
- Add EAS build/submit config for TestFlight and Play Store testing.
- Add Expo web/Vercel deployment support so the same Expo Router app can run as mobile apps and a hosted web app. Current app config already uses `expo.web.output = "static"` and has `react-native-web`; expected Vercel settings are build command `npx expo export --platform web` and output directory `dist`.
- Web deployment risks to handle before treating web as supported:
  - Audit native-only modules and add web fallbacks/guards, especially `expo-notifications`, `expo-haptics`, and `@react-native-community/datetimepicker`.
  - Expiry reminders can remain mobile-only initially; web should not try to schedule local native notifications.
  - Supabase auth needs web redirect URLs/site URL configured once a Vercel preview/production URL exists, while preserving mobile deep-link behavior.
  - Vercel should host only the static Expo web frontend; Supabase remains the backend for auth, database, Edge Functions, recipe generation, translation, and image lookup.
  - Add web verification to the release checklist: run `npx expo export --platform web`, test the generated `dist` app or Vercel preview, and smoke-test login, pantry CRUD, recipe generation, translation, date picking, and responsive layouts.

## Later / Nice-to-Have

- More advanced recipe search and filters.
- Partial/streaming recipe generation UI.
- More detailed household or multi-user support.
