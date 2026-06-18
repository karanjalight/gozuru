-- Ensure affiliate dashboard totals return clean numeric figures.

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
    return jsonb_build_object(
      'enrolled', false,
      'totalEarned', 0,
      'availableBalance', 0,
      'pendingCashout', 0
    );
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

  v_available_balance := greatest(round(v_available_balance - v_pending_cashout, 2), 0);
  v_total_earned := round(v_total_earned, 2);
  v_pending_cashout := round(v_pending_cashout, 2);

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
      round(ac.commission_amount, 2) as commission_amount,
      round(ac.transaction_amount, 2) as transaction_amount,
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
      round(ac.amount, 2) as amount,
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
