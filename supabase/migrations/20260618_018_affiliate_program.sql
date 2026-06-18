-- Affiliate program: referral tracking, 5% commissions, and cash-out requests.

create table if not exists public.affiliate_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  referral_code text not null unique,
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affiliate_referral_code_format check (referral_code ~ '^[A-Z0-9]{6,12}$')
);

create index if not exists idx_affiliate_profiles_code
  on public.affiliate_profiles(referral_code);

create table if not exists public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.affiliate_profiles(user_id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referred_at timestamptz not null default now(),
  constraint affiliate_no_self_referral check (affiliate_user_id <> referred_user_id)
);

create index if not exists idx_affiliate_referrals_affiliate
  on public.affiliate_referrals(affiliate_user_id, referred_at desc);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.affiliate_profiles(user_id) on delete cascade,
  payment_id uuid not null unique references public.payments(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  transaction_amount numeric(10,2) not null check (transaction_amount >= 0),
  commission_rate numeric(5,4) not null default 0.05 check (commission_rate > 0 and commission_rate <= 1),
  commission_amount numeric(10,2) not null check (commission_amount >= 0),
  currency public.currency_code not null default 'KES',
  status text not null default 'accrued'
    check (status in ('accrued', 'paid', 'cancelled')),
  cashout_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_affiliate_commissions_affiliate
  on public.affiliate_commissions(affiliate_user_id, created_at desc);

create table if not exists public.affiliate_cashouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.affiliate_profiles(user_id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  currency public.currency_code not null default 'KES',
  payout_method text not null,
  payout_details jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  admin_note text
);

create index if not exists idx_affiliate_cashouts_affiliate
  on public.affiliate_cashouts(affiliate_user_id, requested_at desc);

alter table public.affiliate_commissions
  drop constraint if exists affiliate_commissions_cashout_id_fkey;

alter table public.affiliate_commissions
  add constraint affiliate_commissions_cashout_id_fkey
  foreign key (cashout_id) references public.affiliate_cashouts(id) on delete set null;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.affiliate_profiles enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.affiliate_cashouts enable row level security;

drop policy if exists affiliate_profiles_owner_read on public.affiliate_profiles;
create policy affiliate_profiles_owner_read
on public.affiliate_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists affiliate_referrals_owner_read on public.affiliate_referrals;
create policy affiliate_referrals_owner_read
on public.affiliate_referrals
for select
to authenticated
using (affiliate_user_id = auth.uid() or public.is_admin());

drop policy if exists affiliate_commissions_owner_read on public.affiliate_commissions;
create policy affiliate_commissions_owner_read
on public.affiliate_commissions
for select
to authenticated
using (affiliate_user_id = auth.uid() or public.is_admin());

drop policy if exists affiliate_cashouts_owner_read on public.affiliate_cashouts;
create policy affiliate_cashouts_owner_read
on public.affiliate_cashouts
for select
to authenticated
using (affiliate_user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
create or replace function public.generate_affiliate_referral_code()
returns text
language plpgsql
as $$
declare
  v_code text;
  v_attempts integer := 0;
begin
  loop
    v_attempts := v_attempts + 1;
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1 from public.affiliate_profiles ap where ap.referral_code = v_code
    );
    if v_attempts >= 20 then
      raise exception 'Unable to generate a unique referral code.';
    end if;
  end loop;
  return v_code;
end;
$$;

create or replace function public.create_affiliate_commission(
  p_affiliate_user_id uuid,
  p_payment_id uuid,
  p_booking_id uuid,
  p_transaction_amount numeric,
  p_currency public.currency_code
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commission_amount numeric(10,2);
begin
  if p_affiliate_user_id is null
    or p_payment_id is null
    or p_booking_id is null
    or p_transaction_amount is null
    or p_transaction_amount <= 0 then
    return;
  end if;

  v_commission_amount := round(p_transaction_amount * 0.05, 2);
  if v_commission_amount <= 0 then
    return;
  end if;

  insert into public.affiliate_commissions (
    affiliate_user_id,
    payment_id,
    booking_id,
    transaction_amount,
    commission_rate,
    commission_amount,
    currency,
    status
  )
  values (
    p_affiliate_user_id,
    p_payment_id,
    p_booking_id,
    p_transaction_amount,
    0.05,
    v_commission_amount,
    coalesce(p_currency, 'KES'),
    'accrued'
  )
  on conflict (payment_id) do nothing;
end;
$$;

-- ------------------------------------------------------------
-- RPCs
-- ------------------------------------------------------------
create or replace function public.enroll_as_affiliate()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_code text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if exists (select 1 from public.affiliate_profiles ap where ap.user_id = v_user_id) then
    select ap.referral_code into v_code
    from public.affiliate_profiles ap
    where ap.user_id = v_user_id;
    return jsonb_build_object('referralCode', v_code, 'alreadyEnrolled', true);
  end if;

  v_code := public.generate_affiliate_referral_code();

  insert into public.affiliate_profiles (user_id, referral_code)
  values (v_user_id, v_code);

  return jsonb_build_object('referralCode', v_code, 'alreadyEnrolled', false);
end;
$$;

create or replace function public.is_affiliate()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.affiliate_profiles ap
    where ap.user_id = auth.uid()
  );
$$;

create or replace function public.attribute_referral(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_affiliate_user_id uuid;
  v_normalized_code text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_normalized_code := upper(trim(coalesce(p_referral_code, '')));
  if length(v_normalized_code) = 0 then
    raise exception 'Referral code is required.';
  end if;

  select ap.user_id
  into v_affiliate_user_id
  from public.affiliate_profiles ap
  where ap.referral_code = v_normalized_code;

  if not found then
    raise exception 'Invalid referral code.';
  end if;

  if v_affiliate_user_id = v_user_id then
    raise exception 'You cannot refer yourself.';
  end if;

  if exists (
    select 1
    from public.affiliate_referrals ar
    where ar.referred_user_id = v_user_id
  ) then
    return jsonb_build_object('attributed', false, 'reason', 'already_referred');
  end if;

  insert into public.affiliate_referrals (affiliate_user_id, referred_user_id)
  values (v_affiliate_user_id, v_user_id);

  return jsonb_build_object('attributed', true);
end;
$$;

create or replace function public.get_affiliate_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_profile public.affiliate_profiles%rowtype;
  v_total_earned numeric(10,2) := 0;
  v_available_balance numeric(10,2) := 0;
  v_pending_cashout numeric(10,2) := 0;
  v_referrals jsonb := '[]'::jsonb;
  v_commissions jsonb := '[]'::jsonb;
  v_cashouts jsonb := '[]'::jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into v_profile
  from public.affiliate_profiles ap
  where ap.user_id = v_user_id;

  if not found then
    return jsonb_build_object('enrolled', false);
  end if;

  select coalesce(sum(ac.commission_amount), 0)
  into v_total_earned
  from public.affiliate_commissions ac
  where ac.affiliate_user_id = v_user_id
    and ac.status in ('accrued', 'paid');

  select coalesce(sum(ac.commission_amount), 0)
  into v_available_balance
  from public.affiliate_commissions ac
  where ac.affiliate_user_id = v_user_id
    and ac.status = 'accrued'
    and ac.cashout_id is null;

  select coalesce(sum(ac.amount), 0)
  into v_pending_cashout
  from public.affiliate_cashouts ac
  where ac.affiliate_user_id = v_user_id
    and ac.status in ('pending', 'processing');

  v_available_balance := greatest(v_available_balance - v_pending_cashout, 0);

  select coalesce(jsonb_agg(row_to_json(r) order by r.referred_at desc), '[]'::jsonb)
  into v_referrals
  from (
    select
      ar.id,
      ar.referred_at,
      p.email,
      p.first_name,
      p.last_name,
      p.display_name
    from public.affiliate_referrals ar
    join public.profiles p on p.user_id = ar.referred_user_id
    where ar.affiliate_user_id = v_user_id
    order by ar.referred_at desc
    limit 100
  ) r;

  select coalesce(jsonb_agg(row_to_json(c) order by c.created_at desc), '[]'::jsonb)
  into v_commissions
  from (
    select
      ac.id,
      ac.commission_amount,
      ac.transaction_amount,
      ac.commission_rate,
      ac.currency,
      ac.status,
      ac.created_at,
      e.title as experience_title
    from public.affiliate_commissions ac
    join public.bookings b on b.id = ac.booking_id
    join public.experiences e on e.id = b.experience_id
    where ac.affiliate_user_id = v_user_id
    order by ac.created_at desc
    limit 100
  ) c;

  select coalesce(jsonb_agg(row_to_json(c) order by c.requested_at desc), '[]'::jsonb)
  into v_cashouts
  from (
    select
      ac.id,
      ac.amount,
      ac.currency,
      ac.payout_method,
      ac.status,
      ac.requested_at,
      ac.paid_at
    from public.affiliate_cashouts ac
    where ac.affiliate_user_id = v_user_id
    order by ac.requested_at desc
    limit 50
  ) c;

  return jsonb_build_object(
    'enrolled', true,
    'referralCode', v_profile.referral_code,
    'enrolledAt', v_profile.enrolled_at,
    'totalEarned', v_total_earned,
    'availableBalance', v_available_balance,
    'pendingCashout', v_pending_cashout,
    'referrals', v_referrals,
    'commissions', v_commissions,
    'cashouts', v_cashouts
  );
end;
$$;

create or replace function public.request_affiliate_cashout(
  p_amount numeric,
  p_payout_method text,
  p_payout_details jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_available_balance numeric(10,2) := 0;
  v_pending_cashout numeric(10,2) := 0;
  v_cashout_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (select 1 from public.affiliate_profiles ap where ap.user_id = v_user_id) then
    raise exception 'You must enroll in the affiliate program first.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Cash-out amount must be greater than zero.';
  end if;

  if p_payout_method is null or length(trim(p_payout_method)) = 0 then
    raise exception 'Payout method is required.';
  end if;

  select coalesce(sum(ac.commission_amount), 0)
  into v_available_balance
  from public.affiliate_commissions ac
  where ac.affiliate_user_id = v_user_id
    and ac.status = 'accrued'
    and ac.cashout_id is null;

  select coalesce(sum(ac.amount), 0)
  into v_pending_cashout
  from public.affiliate_cashouts ac
  where ac.affiliate_user_id = v_user_id
    and ac.status in ('pending', 'processing');

  v_available_balance := greatest(v_available_balance - v_pending_cashout, 0);

  if p_amount > v_available_balance then
    raise exception 'Insufficient available balance for cash-out.';
  end if;

  insert into public.affiliate_cashouts (
    affiliate_user_id,
    amount,
    currency,
    payout_method,
    payout_details,
    status
  )
  values (
    v_user_id,
    round(p_amount, 2),
    'KES',
    trim(p_payout_method),
    coalesce(p_payout_details, '{}'::jsonb),
    'pending'
  )
  returning id into v_cashout_id;

  return jsonb_build_object(
    'cashoutId', v_cashout_id,
    'amount', round(p_amount, 2),
    'status', 'pending'
  );
end;
$$;

-- Extend paid checkout to accrue affiliate commissions (5% of transaction).
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
  v_payment_id uuid;
  v_line_total numeric(10,2);
  v_unit_price numeric(10,2);
  v_currency public.currency_code;
  v_booking_ids uuid[] := '{}';
  v_affiliate_user_id uuid;
begin
  v_guest_user_id := auth.uid();
  if v_guest_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_paystack_reference is null or length(trim(p_paystack_reference)) = 0 then
    raise exception 'Missing payment reference.';
  end if;

  select ar.affiliate_user_id
  into v_affiliate_user_id
  from public.affiliate_referrals ar
  where ar.referred_user_id = v_guest_user_id;

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
    )
    returning id into v_payment_id;

    if v_affiliate_user_id is not null then
      perform public.create_affiliate_commission(
        v_affiliate_user_id,
        v_payment_id,
        v_booking_id,
        v_line_total,
        v_currency
      );
    end if;

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

grant execute on function public.enroll_as_affiliate() to authenticated;
grant execute on function public.is_affiliate() to authenticated;
grant execute on function public.attribute_referral(text) to authenticated;
grant execute on function public.get_affiliate_dashboard() to authenticated;
grant execute on function public.request_affiliate_cashout(numeric, text, jsonb) to authenticated;
