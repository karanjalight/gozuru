-- Idempotent multi-item paid checkout for experience bookings.

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  guest_user_id uuid not null references auth.users(id) on delete cascade,
  experience_id uuid not null references public.experiences(id) on delete cascade,
  paystack_reference text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  items jsonb not null,
  guest_note text,
  amount_minor integer not null check (amount_minor > 0),
  currency public.currency_code not null,
  booking_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_checkout_sessions_guest
  on public.checkout_sessions(guest_user_id, created_at desc);

create index if not exists idx_checkout_sessions_experience
  on public.checkout_sessions(experience_id, created_at desc);

alter table public.checkout_sessions enable row level security;

drop policy if exists checkout_sessions_guest_read on public.checkout_sessions;
create policy checkout_sessions_guest_read
on public.checkout_sessions
for select
to authenticated
using (guest_user_id = auth.uid());

create or replace function public.create_checkout_session(
  p_experience_id uuid,
  p_paystack_reference text,
  p_items jsonb,
  p_guest_note text,
  p_amount_minor integer,
  p_currency public.currency_code
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest_user_id uuid;
  v_experience public.experiences%rowtype;
  v_item jsonb;
  v_availability_id uuid;
  v_guests_count integer;
  v_slot public.experience_availability%rowtype;
  v_booked_guests integer;
  v_session_id uuid;
begin
  v_guest_user_id := auth.uid();
  if v_guest_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_paystack_reference is null or length(trim(p_paystack_reference)) = 0 then
    raise exception 'Missing payment reference.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Checkout cart is empty.';
  end if;

  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'Invalid checkout amount.';
  end if;

  select *
  into v_experience
  from public.experiences e
  where e.id = p_experience_id;

  if not found then
    raise exception 'Experience not found.';
  end if;

  if v_experience.status <> 'published' then
    raise exception 'This experience is not bookable right now.';
  end if;

  if v_experience.host_user_id = v_guest_user_id then
    raise exception 'You cannot book your own experience.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_availability_id := nullif(v_item->>'availabilityId', '')::uuid;
    v_guests_count := (v_item->>'guestsCount')::integer;

    if v_availability_id is null or v_guests_count is null or v_guests_count < 1 then
      raise exception 'Invalid cart item.';
    end if;

    if v_guests_count > coalesce(v_experience.max_guests, 20) then
      raise exception 'Guest count exceeds allowed maximum for this experience.';
    end if;

    select *
    into v_slot
    from public.experience_availability ea
    where ea.id = v_availability_id
      and ea.experience_id = p_experience_id
      and ea.is_cancelled = false
      and ea.starts_at > now();

    if not found then
      raise exception 'One or more selected slots are no longer available.';
    end if;

    select coalesce(sum(b.guests_count), 0)
    into v_booked_guests
    from public.bookings b
    where b.availability_id = v_slot.id
      and b.status in ('requested', 'confirmed', 'completed', 'no_show');

    if v_booked_guests + v_guests_count > v_slot.capacity then
      raise exception 'Not enough remaining seats for one of the selected slots.';
    end if;
  end loop;

  insert into public.checkout_sessions (
    guest_user_id,
    experience_id,
    paystack_reference,
    status,
    items,
    guest_note,
    amount_minor,
    currency
  )
  values (
    v_guest_user_id,
    p_experience_id,
    trim(p_paystack_reference),
    'pending',
    p_items,
    nullif(trim(p_guest_note), ''),
    p_amount_minor,
    p_currency
  )
  on conflict (paystack_reference) do update
    set
      items = excluded.items,
      guest_note = excluded.guest_note,
      amount_minor = excluded.amount_minor,
      currency = excluded.currency
  where public.checkout_sessions.status = 'pending'
    and public.checkout_sessions.guest_user_id = v_guest_user_id
  returning id into v_session_id;

  return v_session_id;
end;
$$;

create or replace function public.complete_paid_checkout(
  p_paystack_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest_user_id uuid;
  v_session public.checkout_sessions%rowtype;
  v_experience public.experiences%rowtype;
  v_item jsonb;
  v_availability_id uuid;
  v_guests_count integer;
  v_slot public.experience_availability%rowtype;
  v_booked_guests integer;
  v_booking_id uuid;
  v_line_total numeric(10,2);
  v_unit_price numeric(10,2);
  v_currency public.currency_code;
  v_booking_ids uuid[] := '{}';
begin
  v_guest_user_id := auth.uid();
  if v_guest_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_paystack_reference is null or length(trim(p_paystack_reference)) = 0 then
    raise exception 'Missing payment reference.';
  end if;

  select *
  into v_session
  from public.checkout_sessions cs
  where cs.paystack_reference = trim(p_paystack_reference)
  for update;

  if not found then
    raise exception 'Checkout session not found for this payment reference.';
  end if;

  if v_session.guest_user_id <> v_guest_user_id then
    raise exception 'This checkout does not belong to the current user.';
  end if;

  if v_session.status = 'completed' then
    return jsonb_build_object(
      'bookingIds', to_jsonb(v_session.booking_ids),
      'bookedCount', coalesce(array_length(v_session.booking_ids, 1), 0),
      'alreadyCompleted', true
    );
  end if;

  select *
  into v_experience
  from public.experiences e
  where e.id = v_session.experience_id;

  if not found or v_experience.status <> 'published' then
    raise exception 'This experience is no longer bookable.';
  end if;

  for v_item in select value from jsonb_array_elements(v_session.items)
  loop
    v_availability_id := nullif(v_item->>'availabilityId', '')::uuid;
    v_guests_count := (v_item->>'guestsCount')::integer;

    if v_availability_id is null or v_guests_count is null or v_guests_count < 1 then
      raise exception 'Invalid checkout item.';
    end if;

    select *
    into v_slot
    from public.experience_availability ea
    where ea.id = v_availability_id
      and ea.experience_id = v_session.experience_id
    for update;

    if not found or v_slot.is_cancelled or v_slot.starts_at <= now() then
      raise exception 'One or more selected slots are no longer available.';
    end if;

    select coalesce(sum(b.guests_count), 0)
    into v_booked_guests
    from public.bookings b
    where b.availability_id = v_slot.id
      and b.status in ('requested', 'confirmed', 'completed', 'no_show');

    if v_booked_guests + v_guests_count > v_slot.capacity then
      raise exception 'Not enough remaining seats for one of the selected slots.';
    end if;

    v_unit_price := coalesce(v_slot.price_amount, v_experience.price_amount, 0);
    v_line_total := v_unit_price * v_guests_count;
    v_currency := coalesce(v_slot.currency, v_experience.currency, v_session.currency, 'USD');

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
      v_session.experience_id,
      v_availability_id,
      v_guest_user_id,
      v_experience.host_user_id,
      'confirmed',
      v_guests_count,
      v_line_total,
      v_currency,
      v_session.guest_note
    )
    returning id into v_booking_id;

    v_booking_ids := array_append(v_booking_ids, v_booking_id);

    insert into public.payments (
      booking_id,
      payer_user_id,
      payee_user_id,
      amount,
      currency,
      provider,
      provider_payment_id,
      status,
      paid_at
    )
    values (
      v_booking_id,
      v_guest_user_id,
      v_experience.host_user_id,
      v_line_total,
      v_currency,
      'paystack',
      trim(p_paystack_reference),
      'succeeded',
      now()
    );

    begin
      insert into public.booking_status_history (booking_id, status, changed_by, note)
      values (
        v_booking_id,
        'confirmed',
        v_guest_user_id,
        'Booking confirmed after successful Paystack payment.'
      );
    exception
      when others then
        null;
    end;
  end loop;

  update public.checkout_sessions
  set
    status = 'completed',
    booking_ids = v_booking_ids,
    completed_at = now()
  where id = v_session.id;

  return jsonb_build_object(
    'bookingIds', to_jsonb(v_booking_ids),
    'bookedCount', coalesce(array_length(v_booking_ids, 1), 0),
    'alreadyCompleted', false
  );
end;
$$;

grant execute on function public.create_checkout_session(
  uuid,
  text,
  jsonb,
  text,
  integer,
  public.currency_code
) to authenticated;

grant execute on function public.complete_paid_checkout(text) to authenticated;
