-- Saved recipe edits touch both recipes and recipe_ingredients. Keep that
-- change atomic so the app never saves recipe text without its ingredient list.
create or replace function public.update_saved_recipe(p_recipe_id uuid, p_recipe jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ingredient jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.recipes
  set title = p_recipe->>'title',
      description = nullif(p_recipe->>'description', ''),
      instructions = coalesce(p_recipe->'instructions', '[]'::jsonb),
      prep_time_minutes = nullif(p_recipe->>'prep_time_minutes', '')::int,
      uses_expiring_items = coalesce((p_recipe->>'uses_expiring_items')::boolean, false),
      updated_at = now()
  where id = p_recipe_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Recipe not found';
  end if;

  delete from public.recipe_ingredients
  where recipe_id = p_recipe_id;

  for v_ingredient in select * from jsonb_array_elements(coalesce(p_recipe->'ingredients', '[]'::jsonb))
  loop
    insert into public.recipe_ingredients (
      recipe_id, pantry_item_id, name, quantity_value, quantity_unit,
      is_available, is_optional, sort_order
    )
    values (
      p_recipe_id,
      nullif(v_ingredient->>'pantry_item_id', '')::uuid,
      v_ingredient->>'name',
      nullif(v_ingredient->>'quantity_value', '')::numeric,
      nullif(v_ingredient->>'quantity_unit', ''),
      coalesce((v_ingredient->>'is_available')::boolean, false),
      coalesce((v_ingredient->>'is_optional')::boolean, false),
      coalesce((v_ingredient->>'sort_order')::int, 0)
    );
  end loop;
end;
$$;

grant execute on function public.update_saved_recipe(uuid, jsonb) to authenticated;
