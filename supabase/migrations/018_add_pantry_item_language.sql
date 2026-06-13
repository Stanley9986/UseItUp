-- Record the language a pantry item's name was entered in. Item names are stored
-- verbatim and translated on view, so this lets translate-on-view compare the
-- name's source language against the active UI language and skip translating
-- names already in that language (and translate non-English names back to other
-- languages, including English).
--
-- Null means the source language is unknown (legacy rows created before this
-- column existed); translate-on-view treats null as English, matching the prior
-- English-source assumption.

alter table public.pantry_items
add column if not exists language text
check (language is null or language in ('en', 'es', 'zh', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'vi'));
