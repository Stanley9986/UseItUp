alter table public.pantry_items
add column normalized_name text;

update public.pantry_items
set normalized_name = lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
where normalized_name is null;

alter table public.pantry_items
alter column normalized_name set not null;

create unique index pantry_items_user_normalized_name_location_idx
on public.pantry_items (user_id, normalized_name, storage_location);
