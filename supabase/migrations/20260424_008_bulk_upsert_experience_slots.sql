-- Bulk slot sync RPC to avoid recursive policy evaluation during create/edit flows.

drop function if exists public.sync_host_experience_slots(uuid, jsonb);

create function public.sync_host_experience_slots(
  p_experience_id uuid,
  p_slots jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_user_id uuid;
  v_slot jsonb;
  v_slot_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_capacity integer;
  v_price_amount numeric;
  v_currency public.currency_code;
  v_meeting_place_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select e.host_user_id
  into v_host_user_id
  from public.experiences e
  where e.id = p_experience_id
    and e.host_user_id = auth.uid();

  if v_host_user_id is null then
    raise exception 'You can only manage slots for your own experience.';
  end if;

  if p_slots is null then
    p_slots := '[]'::jsonb;
  end if;

  -- Cancel slots that are no longer present in payload.
  update public.experience_availability ea
  set is_cancelled = true
  where ea.experience_id = p_experience_id
    and ea.id not in (
      select (item->>'id')::uuid
      from jsonb_array_elements(p_slots) as item
      where coalesce(item->>'id', '') <> ''
    );

  -- Upsert each slot from payload.
  for v_slot in
    select value from jsonb_array_elements(p_slots)
  loop
    v_slot_id := nullif(v_slot->>'id', '')::uuid;
    v_starts_at := (v_slot->>'starts_at')::timestamptz;
    v_ends_at := (v_slot->>'ends_at')::timestamptz;
    v_capacity := (v_slot->>'capacity')::integer;
    v_price_amount := nullif(v_slot->>'price_amount', '')::numeric;
    v_currency := coalesce(nullif(v_slot->>'currency', '')::public.currency_code, 'USD');
    v_meeting_place_name := nullif(trim(v_slot->>'meeting_place_name'), '');

    if v_starts_at is null or v_ends_at is null or v_ends_at <= v_starts_at then
      raise exception 'Invalid slot time range.';
    end if;

    if v_capacity is null or v_capacity <= 0 then
      raise exception 'Capacity must be greater than zero.';
    end if;

    if v_slot_id is not null then
      update public.experience_availability
      set
        starts_at = v_starts_at,
        ends_at = v_ends_at,
        capacity = v_capacity,
        price_amount = v_price_amount,
        currency = v_currency,
        meeting_place_name = v_meeting_place_name,
        is_cancelled = false
      where id = v_slot_id
        and experience_id = p_experience_id;
    else
      insert into public.experience_availability (
        experience_id,
        host_user_id,
        starts_at,
        ends_at,
        capacity,
        price_amount,
        currency,
        meeting_place_name,
        is_cancelled
      )
      values (
        p_experience_id,
        v_host_user_id,
        v_starts_at,
        v_ends_at,
        v_capacity,
        v_price_amount,
        v_currency,
        v_meeting_place_name,
        false
      );
    end if;
  end loop;
end;
$$;

grant execute on function public.sync_host_experience_slots(uuid, jsonb) to authenticated;

