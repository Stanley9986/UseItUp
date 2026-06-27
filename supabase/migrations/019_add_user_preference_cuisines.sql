alter table public.user_preferences
add column cuisine_preferences text[] not null default '{}'::text[];
