create table public.food_image_cache (
  query text primary key,
  image_url text not null,
  alt text,
  photographer text,
  photographer_url text,
  provider text not null default 'pexels' check (provider in ('pexels')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_image_cache_expires_at_idx
on public.food_image_cache (expires_at);

alter table public.food_image_cache enable row level security;

grant usage on schema public to anon, authenticated;

