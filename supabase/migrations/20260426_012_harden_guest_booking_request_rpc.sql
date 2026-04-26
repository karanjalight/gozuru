-- Harden guest booking request RPC against RLS recursion side-effects.
-- This version is idempotent and tolerant of booking_status_history policy recursion.

create or replace function public.request_experience_booking(
  p_experience_id uuid,
  p_availability_id uuid,
  p_guests_count integer,
  p_guest_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest_user_id uuid;
  v_experience public.experiences%rowtype;
  v_slot public.experience_availability%rowtype;
  v_booked_guests integer;
  v_total_amount numeric(10,2);
  v_booking_id uuid;
begin
  v_guest_user_id := auth.uid();
  if v_guest_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_guests_count is null or p_guests_count < 1 or p_guests_count > 20 then
    raise exception 'Guests count must be between 1 and 20.';
  end if;

  -- Return existing active booking for same guest+slot to avoid duplicates on repeated verify callbacks.
  select b.id
  into v_booking_id
  from public.bookings b
  where b.guest_user_id = v_guest_user_id
    and b.availability_id = p_availability_id
    and b.status in ('requested', 'confirmed', 'completed', 'no_show')
  order by b.booked_at desc
  limit 1;

  if v_booking_id is not null then
    return v_booking_id;
  end if;

  select *
  into v_experience
  from public.experiences e
  where e.id = p_experience_id
  for share;

  if not found then
    raise exception 'Experience not found.';
  end if;

  if v_experience.status <> 'published' then
    raise exception 'This experience is not bookable right now.';
  end if;

  if v_experience.host_user_id = v_guest_user_id then
    raise exception 'You cannot book your own experience.';
  end if;

  if p_guests_count > coalesce(v_experience.max_guests, 1) then
    raise exception 'Guest count exceeds allowed maximum for this experience.';
  end if;

  select *
  into v_slot
  from public.experience_availability ea
  where ea.id = p_availability_id
    and ea.experience_id = p_experience_id
  for update;

  if not found then
    raise exception 'Selected slot not found.';
  end if;

  if v_slot.is_cancelled then
    raise exception 'This slot is no longer available.';
  end if;

  if v_slot.starts_at <= now() then
    raise exception 'This slot has already started.';
  end if;

  select coalesce(sum(b.guests_count), 0)
  into v_booked_guests
  from public.bookings b
  where b.availability_id = v_slot.id
    and b.status in ('requested', 'confirmed', 'completed', 'no_show');

  if v_booked_guests + p_guests_count > v_slot.capacity then
    raise exception 'Not enough remaining seats for this slot.';
  end if;

  v_total_amount := coalesce(v_slot.price_amount, v_experience.price_amount, 0) * p_guests_count;

  insert into public.bookings (
    experience_id,
    availability_id,
    guest_user_id,
    host_user_id,
    status,
    guests_count,
    total_amount,
    currency,
    guest_note
  )
  values (
    p_experience_id,
    p_availability_id,
    v_guest_user_id,
    v_experience.host_user_id,
    'requested',
    p_guests_count,
    v_total_amount,
    coalesce(v_slot.currency, v_experience.currency, 'USD'),
    nullif(trim(p_guest_note), '')
  )
  returning id into v_booking_id;

  -- Best-effort audit trail; booking creation must not fail if history policy recurses.
  begin
    insert into public.booking_status_history (booking_id, status, changed_by, note)
    values (
      v_booking_id,
      'requested',
      v_guest_user_id,
      'Booking request submitted by guest.'
    );
  exception
    when others then
      null;
  end;

  return v_booking_id;
end;
$$;

grant execute on function public.request_experience_booking(
  uuid,
  uuid,
  integer,
  text
) to authenticated;
