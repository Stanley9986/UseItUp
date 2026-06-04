-- Suggested recipes live in public.recipes and are replaced each time the user
-- regenerates. Mark the active batch so regeneration can demote the old batch
-- without deleting rows that cook_sessions still reference (preserving history).
alter table public.recipes
add column if not exists is_suggested boolean not null default true;

create index if not exists recipes_user_suggested_created_at_idx
on public.recipes (user_id, is_suggested, created_at desc);

-- Favorites moved out of public.recipes into their own table (below), so the
-- is_favorite flag and its index added in migration 005 are no longer used.
drop index if exists public.recipes_user_favorite_created_at_idx;

alter table public.recipes
drop column if exists is_favorite;

-- Favorites are a permanent, self-contained snapshot of a recipe. They are
-- decoupled from the pantry-derived suggestions, so a favorite survives even
-- when its ingredients run out or the suggestion list is regenerated.
create table public.favorite_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  normalized_title text not null,
  description text,
  instructions jsonb not null default '[]'::jsonb,
  ingredients jsonb not null default '[]'::jsonb,
  prep_time_minutes integer,
  uses_expiring_items boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index favorite_recipes_user_normalized_title_idx
on public.favorite_recipes (user_id, normalized_title);

create index favorite_recipes_user_created_at_idx
on public.favorite_recipes (user_id, created_at desc);

alter table public.favorite_recipes enable row level security;

create policy "Users can view their own favorite recipes"
on public.favorite_recipes
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own favorite recipes"
on public.favorite_recipes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own favorite recipes"
on public.favorite_recipes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own favorite recipes"
on public.favorite_recipes
for delete
to authenticated
using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on public.favorite_recipes
to authenticated;
