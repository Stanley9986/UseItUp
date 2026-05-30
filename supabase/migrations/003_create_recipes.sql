create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  instructions jsonb not null default '[]'::jsonb,
  prep_time_minutes integer,
  uses_expiring_items boolean not null default false,
  created_by_ai boolean not null default true,
  source text not null default 'ai' check (source in ('ai', 'user_saved', 'imported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  pantry_item_id uuid references public.pantry_items(id) on delete set null,
  name text not null,
  quantity_value numeric,
  quantity_unit text,
  is_available boolean not null default false,
  is_optional boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

create policy "Users can view their own recipes"
on public.recipes
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own recipes"
on public.recipes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own recipes"
on public.recipes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own recipes"
on public.recipes
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can view ingredients for their own recipes"
on public.recipe_ingredients
for select
to authenticated
using (
  exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  )
);

create policy "Users can create ingredients for their own recipes"
on public.recipe_ingredients
for insert
to authenticated
with check (
  exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  )
  and (
    recipe_ingredients.pantry_item_id is null
    or exists (
      select 1
      from public.pantry_items
      where pantry_items.id = recipe_ingredients.pantry_item_id
        and pantry_items.user_id = auth.uid()
    )
  )
);

create policy "Users can update ingredients for their own recipes"
on public.recipe_ingredients
for update
to authenticated
using (
  exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  )
  and (
    recipe_ingredients.pantry_item_id is null
    or exists (
      select 1
      from public.pantry_items
      where pantry_items.id = recipe_ingredients.pantry_item_id
        and pantry_items.user_id = auth.uid()
    )
  )
);

create policy "Users can delete ingredients for their own recipes"
on public.recipe_ingredients
for delete
to authenticated
using (
  exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  )
);

create index recipes_user_created_at_idx
on public.recipes (user_id, created_at desc);

create index recipe_ingredients_recipe_sort_idx
on public.recipe_ingredients (recipe_id, sort_order);

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on public.recipes, public.recipe_ingredients
to authenticated;
