-- Cache of LLM translations of recipe content, keyed by a hash of the source
-- content plus the target language.
--
-- Content-addressed (not recipe-id-scoped) on purpose: a translation is a pure
-- function of (source content, target language), so this survives suggestion
-- regeneration (which replaces rows in public.recipes), dedupes identical
-- recipes across users, and never goes stale for a given source. Translations
-- hold no user data, so a single shared cache is safe.
--
-- Owned by the translate edge function (service_role), mirroring
-- public.food_image_cache: RLS is enabled with no policies and only
-- service_role is granted table access, so clients never read or write it
-- directly -- they go through the edge function.

create table public.recipe_translations (
  source_hash text not null,
  target_language text not null
    check (target_language in ('en', 'es', 'zh', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'vi')),
  title text,
  description text,
  instructions jsonb not null default '[]'::jsonb,
  -- Map of original ingredient name -> translated name, so it is robust to
  -- ingredient reordering and dedupes repeated names.
  ingredient_names jsonb not null default '{}'::jsonb,
  provider text not null default 'gemini',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_hash, target_language)
);

alter table public.recipe_translations enable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update
on public.recipe_translations
to service_role;
