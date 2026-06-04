-- Record the language a recipe's user-facing content (title, description,
-- instructions, ingredient names) was generated or saved in. Switching the app
-- language does not rewrite stored content, so translate-on-view compares this
-- against the current UI language to decide whether a translation is needed.
--
-- Null means the source language is unknown (legacy rows created before this
-- column existed); translate-on-view treats null as "let the model auto-detect
-- the source language".

alter table public.recipes
add column if not exists language text
check (language is null or language in ('en', 'es', 'zh', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'vi'));

alter table public.favorite_recipes
add column if not exists language text
check (language is null or language in ('en', 'es', 'zh', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'vi'));
