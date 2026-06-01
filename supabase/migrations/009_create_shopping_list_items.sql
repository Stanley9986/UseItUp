create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  source_recipe_id uuid references public.recipes(id) on delete set null,
  source_recipe_title text,
  is_checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index shopping_list_items_user_normalized_name_idx
on public.shopping_list_items (user_id, normalized_name);

create index shopping_list_items_user_checked_created_at_idx
on public.shopping_list_items (user_id, is_checked, created_at desc);

alter table public.shopping_list_items enable row level security;

create policy "Users can view their own shopping list items"
on public.shopping_list_items
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own shopping list items"
on public.shopping_list_items
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own shopping list items"
on public.shopping_list_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own shopping list items"
on public.shopping_list_items
for delete
to authenticated
using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on public.shopping_list_items
to authenticated;
