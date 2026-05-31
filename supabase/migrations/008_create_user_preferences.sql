create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dietary_preferences text[] not null default '{}'::text[],
  avoided_ingredients text[] not null default '{}'::text[],
  max_prep_time_minutes integer check (
    max_prep_time_minutes is null
    or max_prep_time_minutes between 5 and 180
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can view their own preferences"
on public.user_preferences
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own preferences"
on public.user_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
on public.user_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own preferences"
on public.user_preferences
for delete
to authenticated
using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on public.user_preferences
to authenticated;
