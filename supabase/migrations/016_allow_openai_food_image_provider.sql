alter table public.food_image_cache
drop constraint if exists food_image_cache_provider_check;

alter table public.food_image_cache
add constraint food_image_cache_provider_check
check (provider in ('pexels', 'openai'));
