-- Regenerating suggestions must be atomic: the previous batch is demoted and the
-- new batch (recipes + ingredients) is inserted in a single transaction, so a
-- failure can never leave the user with zero or a partial suggestion list.
--
-- Runs as SECURITY INVOKER so row-level security still applies and auth.uid()
-- identifies the caller; the user_id is taken from the session, never the client.
create or replace function public.replace_suggested_recipes(p_recipes jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_recipe jsonb;
  v_recipe_id uuid;
  v_ingredient jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Demote the current batch instead of deleting it, so cook_sessions that
  -- reference these recipes (and their history) survive.
  update public.recipes
  set is_suggested = false,
      updated_at = now()
  where user_id = v_user_id
    and is_suggested = true;

  for v_recipe in select * from jsonb_array_elements(coalesce(p_recipes, '[]'::jsonb))
  loop
    insert into public.recipes (
      user_id, title, description, instructions,
      prep_time_minutes, uses_expiring_items, is_suggested, created_by_ai, source
    )
    values (
      v_user_id,
      v_recipe->>'title',
      nullif(v_recipe->>'description', ''),
      coalesce(v_recipe->'instructions', '[]'::jsonb),
      nullif(v_recipe->>'prep_time_minutes', '')::int,
      coalesce((v_recipe->>'uses_expiring_items')::boolean, false),
      true,
      true,
      'ai'
    )
    returning id into v_recipe_id;

    for v_ingredient in select * from jsonb_array_elements(coalesce(v_recipe->'ingredients', '[]'::jsonb))
    loop
      insert into public.recipe_ingredients (
        recipe_id, pantry_item_id, name, quantity_value, quantity_unit,
        is_available, is_optional, sort_order
      )
      values (
        v_recipe_id,
        nullif(v_ingredient->>'pantry_item_id', '')::uuid,
        v_ingredient->>'name',
        nullif(v_ingredient->>'quantity_value', '')::numeric,
        nullif(v_ingredient->>'quantity_unit', ''),
        coalesce((v_ingredient->>'is_available')::boolean, false),
        coalesce((v_ingredient->>'is_optional')::boolean, false),
        coalesce((v_ingredient->>'sort_order')::int, 0)
      );
    end loop;
  end loop;
end;
$$;

grant execute on function public.replace_suggested_recipes(jsonb) to authenticated;
