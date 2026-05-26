create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  storage_location text not null check (storage_location in ('fridge', 'freezer', 'pantry')),
  quantity_value numeric,
  quantity_unit text not null check (quantity_unit in ('count', 'portion', 'level')),
  quantity_label text check (
    quantity_label is null
    or quantity_label in ('empty', 'low', 'medium', 'half', 'full')
  ),
  expiration_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pantry_items enable row level security;

create policy "Users can view their own pantry items"
on public.pantry_items
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own pantry items"
on public.pantry_items
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own pantry items"
on public.pantry_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own pantry items"
on public.pantry_items
for delete
to authenticated
using (auth.uid() = user_id);

create index pantry_items_user_expiration_idx
on public.pantry_items (user_id, expiration_date);

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on public.pantry_items
to authenticated;
