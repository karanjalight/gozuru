-- Per-slot meeting place support for host availability.

alter table public.experience_availability
  add column if not exists meeting_place_name text;

create index if not exists idx_experience_availability_meeting_place_name
  on public.experience_availability(meeting_place_name);

create or replace function public.create_host_availability_slot(
  p_experience_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity integer,
  p_price_amount numeric default null,
  p_currency public.currency_code default null,
  p_meeting_place_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_user_id uuid;
  v_slot_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'Invalid slot time range.';
  end if;

  if p_capacity is null or p_capacity <= 0 then
    raise exception 'Capacity must be greater than zero.';
  end if;

  select e.host_user_id
  into v_host_user_id
  from public.experiences e
  where e.id = p_experience_id
    and e.host_user_id = auth.uid();

  if v_host_user_id is null then
    raise exception 'You can only add slots to your own experience.';
  end if;

  begin
    insert into public.experience_availability (
      experience_id,
      host_user_id,
      starts_at,
      ends_at,
      capacity,
      price_amount,
      currency,
      meeting_place_name
    )
    values (
      p_experience_id,
      v_host_user_id,
      p_starts_at,
      p_ends_at,
      p_capacity,
      p_price_amount,
      coalesce(p_currency, 'USD'),
      nullif(trim(p_meeting_place_name), '')
    )
    returning id into v_slot_id;
  exception
    when exclusion_violation then
      raise exception 'This slot overlaps with another active slot for this host.';
  end;

  return v_slot_id;
end;
$$;

grant execute on function public.create_host_availability_slot(
  uuid,
  timestamptz,
  timestamptz,
  integer,
  numeric,
  public.currency_code,
  text
) to authenticated;
