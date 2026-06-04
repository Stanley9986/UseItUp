create table public.cook_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  cooked_at timestamptz not null default now(),
  notes text
);

create table public.pantry_updates (
  id uuid primary key default gen_random_uuid(),
  cook_session_id uuid not null references public.cook_sessions(id) on delete cascade,
  pantry_item_id uuid not null references public.pantry_items(id) on delete cascade,
  amount_used numeric,
  unit_used text,
  previous_quantity_value numeric,
  new_quantity_value numeric,
  previous_quantity_label text,
  new_quantity_label text,
  update_action text not null check (update_action in ('suggested_amount', 'used_all', 'used_less', 'skipped', 'set_level')),
  user_confirmed boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.cook_sessions enable row level security;
alter table public.pantry_updates enable row level security;

create policy "Users can view their own cook sessions"
on public.cook_sessions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own cook sessions"
on public.cook_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own cook sessions"
on public.cook_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own cook sessions"
on public.cook_sessions
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can view their own pantry updates"
on public.pantry_updates
for select
to authenticated
using (
  exists (
    select 1
    from public.cook_sessions
    where cook_sessions.id = pantry_updates.cook_session_id
      and cook_sessions.user_id = auth.uid()
  )
);

create policy "Users can create their own pantry updates"
on public.pantry_updates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.cook_sessions
    where cook_sessions.id = pantry_updates.cook_session_id
      and cook_sessions.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.pantry_items
    where pantry_items.id = pantry_updates.pantry_item_id
      and pantry_items.user_id = auth.uid()
  )
);

create policy "Users can update their own pantry updates"
on public.pantry_updates
for update
to authenticated
using (
  exists (
    select 1
    from public.cook_sessions
    where cook_sessions.id = pantry_updates.cook_session_id
      and cook_sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.cook_sessions
    where cook_sessions.id = pantry_updates.cook_session_id
      and cook_sessions.user_id = auth.uid()
  )
);

create policy "Users can delete their own pantry updates"
on public.pantry_updates
for delete
to authenticated
using (
  exists (
    select 1
    from public.cook_sessions
    where cook_sessions.id = pantry_updates.cook_session_id
      and cook_sessions.user_id = auth.uid()
  )
);

create index cook_sessions_user_cooked_at_idx
on public.cook_sessions (user_id, cooked_at desc);

create index pantry_updates_cook_session_idx
on public.pantry_updates (cook_session_id);

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on public.cook_sessions, public.pantry_updates
to authenticated;
