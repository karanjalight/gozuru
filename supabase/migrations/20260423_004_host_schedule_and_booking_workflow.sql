-- Host-side schedule management and booking approval workflow.
-- Adds:
-- 1) Host overlap prevention across all experiences
-- 2) Host-safe RPC to create slots
-- 3) Host-safe RPC to approve/reject requested bookings

create extension if not exists btree_gist;

alter table public.experience_availability
  add column if not exists host_user_id uuid references public.host_profiles(user_id) on delete cascade;

update public.experience_availability ea
set host_user_id = e.host_user_id
from public.experiences e
where e.id = ea.experience_id
  and ea.host_user_id is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'experience_availability'
      and column_name = 'host_user_id'
      and is_nullable = 'YES'
  ) then
    alter table public.experience_availability
      alter column host_user_id set not null;
  end if;
end
$$;

create index if not exists idx_experience_availability_host_user
  on public.experience_availability(host_user_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'experience_availability_no_host_overlap'
      and conrelid = 'public.experience_availability'::regclass
  ) then
    alter table public.experience_availability
      add constraint experience_availability_no_host_overlap
      exclude using gist (
        host_user_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (is_cancelled = false);
  end if;
end
$$;

create or replace function public.create_host_availability_slot(
  p_experience_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity integer,
  p_price_amount numeric default null,
  p_currency public.currency_code default null
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
      currency
    )
    values (
      p_experience_id,
      v_host_user_id,
      p_starts_at,
      p_ends_at,
      p_capacity,
      p_price_amount,
      coalesce(p_currency, 'USD')
    )
    returning id into v_slot_id;
  exception
    when exclusion_violation then
      raise exception 'This slot overlaps with another active slot for this host.';
  end;

  return v_slot_id;
end;
$$;

create or replace function public.host_respond_to_booking(
  p_booking_id uuid,
  p_next_status public.booking_status,
  p_host_note text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_slot public.experience_availability%rowtype;
  v_confirmed_guests integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if p_next_status not in ('confirmed', 'cancelled_by_host') then
    raise exception 'Hosts can only confirm or decline a booking request.';
  end if;

  select *
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking.host_user_id <> auth.uid() then
    raise exception 'You can only manage your own booking requests.';
  end if;

  if v_booking.status <> 'requested' then
    raise exception 'Only requested bookings can be updated by the host.';
  end if;

  if p_next_status = 'confirmed' and v_booking.availability_id is not null then
    select *
    into v_slot
    from public.experience_availability ea
    where ea.id = v_booking.availability_id
    for update;

    if not found then
      raise exception 'Associated slot was not found.';
    end if;

    if v_slot.is_cancelled then
      raise exception 'This slot is cancelled and cannot be confirmed.';
    end if;

    if v_slot.host_user_id <> auth.uid() then
      raise exception 'This slot does not belong to you.';
    end if;

    select coalesce(sum(b.guests_count), 0)
    into v_confirmed_guests
    from public.bookings b
    where b.availability_id = v_slot.id
      and b.status in ('confirmed', 'completed', 'no_show');

    if v_confirmed_guests + v_booking.guests_count > v_slot.capacity then
      raise exception 'Not enough remaining seats for this slot.';
    end if;
  end if;

  update public.bookings
  set
    status = p_next_status,
    host_note = coalesce(nullif(trim(p_host_note), ''), host_note),
    updated_at = now()
  where id = p_booking_id
  returning * into v_booking;

  insert into public.booking_status_history (booking_id, status, changed_by, note)
  values (
    v_booking.id,
    p_next_status,
    auth.uid(),
    coalesce(nullif(trim(p_host_note), ''), 'Host updated booking status.')
  );

  return v_booking;
end;
$$;

grant execute on function public.create_host_availability_slot(
  uuid,
  timestamptz,
  timestamptz,
  integer,
  numeric,
  public.currency_code
) to authenticated;

grant execute on function public.host_respond_to_booking(
  uuid,
  public.booking_status,
  text
) to authenticated;
