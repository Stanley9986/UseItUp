create table if not exists public.edge_function_rate_limits (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.edge_function_rate_limits enable row level security;

grant usage on schema public to service_role;
grant select, insert, update
on public.edge_function_rate_limits
to service_role;

create or replace function public.check_edge_function_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_record public.edge_function_rate_limits%rowtype;
  v_window interval := make_interval(secs => greatest(p_window_seconds, 1));
  v_remaining integer;
  v_retry_after_seconds integer;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'rate limit key is required';
  end if;

  if p_limit is null or p_limit <= 0 then
    return jsonb_build_object(
      'allowed', true,
      'limit', p_limit,
      'remaining', null,
      'retryAfterSeconds', 0
    );
  end if;

  insert into public.edge_function_rate_limits as limits (key, count, window_start, updated_at)
  values (p_key, 0, v_now, v_now)
  on conflict (key) do nothing;

  select *
  into v_record
  from public.edge_function_rate_limits
  where key = p_key
  for update;

  if v_record.window_start <= v_now - v_window then
    update public.edge_function_rate_limits
    set count = 1,
        window_start = v_now,
        updated_at = v_now
    where key = p_key;

    return jsonb_build_object(
      'allowed', true,
      'limit', p_limit,
      'remaining', p_limit - 1,
      'retryAfterSeconds', 0
    );
  end if;

  if v_record.count >= p_limit then
    v_retry_after_seconds := greatest(
      1,
      ceiling(extract(epoch from (v_record.window_start + v_window - v_now)))::integer
    );

    return jsonb_build_object(
      'allowed', false,
      'limit', p_limit,
      'remaining', 0,
      'retryAfterSeconds', v_retry_after_seconds
    );
  end if;

  v_remaining := greatest(p_limit - v_record.count - 1, 0);

  update public.edge_function_rate_limits
  set count = v_record.count + 1,
      updated_at = v_now
  where key = p_key;

  return jsonb_build_object(
    'allowed', true,
    'limit', p_limit,
    'remaining', v_remaining,
    'retryAfterSeconds', 0
  );
end;
$$;

revoke all on function public.check_edge_function_rate_limit(text, integer, integer) from public;
grant execute on function public.check_edge_function_rate_limit(text, integer, integer) to service_role;
