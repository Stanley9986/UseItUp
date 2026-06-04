alter table public.recipes
add column if not exists is_favorite boolean not null default false;

create index if not exists recipes_user_favorite_created_at_idx
on public.recipes (user_id, is_favorite desc, created_at desc);
