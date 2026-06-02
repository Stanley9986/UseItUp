alter table public.user_preferences
add column language_code text not null default 'en';

alter table public.user_preferences
add constraint user_preferences_language_code_check
check (language_code in ('en', 'es', 'zh', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'vi'));
