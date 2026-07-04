-- =============================================================================
-- Admin dashboard
-- -----------------------------------------------------------------------------
-- Server-side aggregation + moderation RPCs for the Gozuru admin dashboard.
-- Every function is SECURITY DEFINER and gated by public.is_admin(), so only a
-- user with an 'admin' row in public.user_roles can read aggregates or perform
-- moderation actions. Mirrors the affiliate module's RPC pattern.
--
-- ----------------------------------------------------------------------------
-- Granting admin access (no admin exists by default). Run ONE of these in the
-- Supabase SQL editor against the user you want to promote:
--
--   insert into public.user_roles (user_id, role)
--   select user_id, 'admin'::public.app_role
--   from public.profiles
--   where email = 'you@example.com'
--   on conflict (user_id, role) do nothing;
--
-- To revoke:  delete from public.user_roles where role = 'admin' and user_id = '<uuid>';
-- =============================================================================

-- A small guard helper so every function reads the same way.
create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_overview() — KPIs, time series, status breakdowns, recent activity.
-- -----------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_30 timestamptz := now() - interval '30 days';
  v_60 timestamptz := now() - interval '60 days';

  v_revenue_total numeric := 0;
  v_revenue_30 numeric := 0;
  v_revenue_prev numeric := 0;

  v_bookings_total bigint := 0;
  v_bookings_30 bigint := 0;
  v_bookings_prev bigint := 0;

  v_users_total bigint := 0;
  v_users_30 bigint := 0;
  v_users_prev bigint := 0;

  v_hosts_total bigint := 0;
  v_hosts_pending bigint := 0;

  v_experiences_total bigint := 0;
  v_experiences_published bigint := 0;
  v_experiences_pending bigint := 0;

  v_avg_rating numeric := 0;
  v_reviews_total bigint := 0;

  v_revenue_series jsonb := '[]'::jsonb;
  v_bookings_by_status jsonb := '[]'::jsonb;
  v_experiences_by_status jsonb := '[]'::jsonb;
  v_recent_bookings jsonb := '[]'::jsonb;
  v_recent_signups jsonb := '[]'::jsonb;
  v_top_experiences jsonb := '[]'::jsonb;
  v_pending_hosts jsonb := '[]'::jsonb;
  v_pending_experiences jsonb := '[]'::jsonb;
begin
  perform public.assert_admin();

  -- Revenue (succeeded payments).
  select coalesce(sum(amount), 0) into v_revenue_total
  from public.payments where status = 'succeeded';

  select coalesce(sum(amount), 0) into v_revenue_30
  from public.payments
  where status = 'succeeded' and coalesce(paid_at, created_at) >= v_30;

  select coalesce(sum(amount), 0) into v_revenue_prev
  from public.payments
  where status = 'succeeded'
    and coalesce(paid_at, created_at) >= v_60
    and coalesce(paid_at, created_at) < v_30;

  -- Bookings.
  select count(*) into v_bookings_total from public.bookings;
  select count(*) into v_bookings_30 from public.bookings where booked_at >= v_30;
  select count(*) into v_bookings_prev from public.bookings
    where booked_at >= v_60 and booked_at < v_30;

  -- Users.
  select count(*) into v_users_total from public.profiles;
  select count(*) into v_users_30 from public.profiles where created_at >= v_30;
  select count(*) into v_users_prev from public.profiles
    where created_at >= v_60 and created_at < v_30;

  -- Hosts.
  select count(*) into v_hosts_total from public.host_profiles;
  select count(*) into v_hosts_pending from public.host_profiles
    where verification_status = 'pending';

  -- Experiences.
  select count(*) into v_experiences_total from public.experiences;
  select count(*) into v_experiences_published from public.experiences
    where status = 'published';
  select count(*) into v_experiences_pending from public.experiences
    where status in ('submitted', 'in_review');

  -- Reviews.
  select coalesce(round(avg(rating)::numeric, 2), 0), count(*)
  into v_avg_rating, v_reviews_total
  from public.reviews;

  -- 30-day daily revenue + bookings series (continuous via generate_series).
  select coalesce(jsonb_agg(row_to_json(s) order by s.day), '[]'::jsonb)
  into v_revenue_series
  from (
    select
      d::date as day,
      (
        select coalesce(sum(p.amount), 0)
        from public.payments p
        where p.status = 'succeeded'
          and coalesce(p.paid_at, p.created_at)::date = d::date
      ) as revenue,
      (
        select count(*)
        from public.bookings b
        where b.booked_at::date = d::date
      ) as bookings
    from generate_series(
      (current_date - interval '29 days'),
      current_date,
      interval '1 day'
    ) d
  ) s;

  -- Bookings grouped by status.
  select coalesce(jsonb_agg(row_to_json(s) order by s.count desc), '[]'::jsonb)
  into v_bookings_by_status
  from (
    select status::text as status, count(*) as count
    from public.bookings
    group by status
  ) s;

  -- Experiences grouped by status.
  select coalesce(jsonb_agg(row_to_json(s) order by s.count desc), '[]'::jsonb)
  into v_experiences_by_status
  from (
    select status::text as status, count(*) as count
    from public.experiences
    group by status
  ) s;

  -- Recent bookings.
  select coalesce(jsonb_agg(row_to_json(r) order by r.booked_at desc), '[]'::jsonb)
  into v_recent_bookings
  from (
    select
      b.id,
      b.status::text as status,
      b.total_amount,
      b.currency::text as currency,
      b.booked_at,
      e.title as experience_title,
      coalesce(p.display_name, p.email) as guest_name
    from public.bookings b
    left join public.experiences e on e.id = b.experience_id
    left join public.profiles p on p.user_id = b.guest_user_id
    order by b.booked_at desc
    limit 8
  ) r;

  -- Recent signups.
  select coalesce(jsonb_agg(row_to_json(r) order by r.created_at desc), '[]'::jsonb)
  into v_recent_signups
  from (
    select
      p.user_id,
      coalesce(p.display_name, p.email) as name,
      p.email,
      p.city,
      p.created_at
    from public.profiles p
    order by p.created_at desc
    limit 8
  ) r;

  -- Top experiences by booking count + revenue.
  select coalesce(jsonb_agg(row_to_json(r) order by r.bookings desc, r.revenue desc), '[]'::jsonb)
  into v_top_experiences
  from (
    select
      e.id,
      e.title,
      e.status::text as status,
      count(b.id) as bookings,
      coalesce(sum(b.total_amount) filter (where b.status in ('confirmed', 'completed')), 0) as revenue
    from public.experiences e
    left join public.bookings b on b.experience_id = e.id
    group by e.id, e.title, e.status
    order by count(b.id) desc, coalesce(sum(b.total_amount), 0) desc
    limit 6
  ) r;

  -- Pending hosts (verification queue).
  select coalesce(jsonb_agg(row_to_json(r) order by r.created_at asc), '[]'::jsonb)
  into v_pending_hosts
  from (
    select
      hp.user_id,
      coalesce(p.display_name, p.email) as name,
      hp.headline,
      hp.created_at
    from public.host_profiles hp
    left join public.profiles p on p.user_id = hp.user_id
    where hp.verification_status = 'pending'
    order by hp.created_at asc
    limit 5
  ) r;

  -- Pending experiences (moderation queue).
  select coalesce(jsonb_agg(row_to_json(r) order by r.created_at asc), '[]'::jsonb)
  into v_pending_experiences
  from (
    select
      e.id,
      e.title,
      e.status::text as status,
      e.created_at,
      coalesce(p.display_name, p.email) as host_name
    from public.experiences e
    left join public.profiles p on p.user_id = e.host_user_id
    where e.status in ('submitted', 'in_review')
    order by e.created_at asc
    limit 5
  ) r;

  return jsonb_build_object(
    'kpis', jsonb_build_object(
      'revenueTotal', v_revenue_total,
      'revenue30', v_revenue_30,
      'revenuePrev', v_revenue_prev,
      'bookingsTotal', v_bookings_total,
      'bookings30', v_bookings_30,
      'bookingsPrev', v_bookings_prev,
      'usersTotal', v_users_total,
      'users30', v_users_30,
      'usersPrev', v_users_prev,
      'hostsTotal', v_hosts_total,
      'hostsPending', v_hosts_pending,
      'experiencesTotal', v_experiences_total,
      'experiencesPublished', v_experiences_published,
      'experiencesPending', v_experiences_pending,
      'avgRating', v_avg_rating,
      'reviewsTotal', v_reviews_total
    ),
    'revenueSeries', v_revenue_series,
    'bookingsByStatus', v_bookings_by_status,
    'experiencesByStatus', v_experiences_by_status,
    'recentBookings', v_recent_bookings,
    'recentSignups', v_recent_signups,
    'topExperiences', v_top_experiences,
    'pendingHosts', v_pending_hosts,
    'pendingExperiences', v_pending_experiences
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_list_hosts(search, status, limit, offset)
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_hosts(
  p_search text default null,
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb := '[]'::jsonb;
  v_total bigint := 0;
begin
  perform public.assert_admin();

  select count(*) into v_total
  from public.host_profiles hp
  left join public.profiles p on p.user_id = hp.user_id
  where (p_status is null or hp.verification_status::text = p_status)
    and (
      p_search is null or p_search = '' or
      coalesce(p.display_name, '') ilike '%' || p_search || '%' or
      coalesce(p.email::text, '') ilike '%' || p_search || '%' or
      coalesce(hp.headline, '') ilike '%' || p_search || '%'
    );

  select coalesce(jsonb_agg(row_to_json(r) order by r.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      hp.user_id,
      coalesce(p.display_name, p.email) as name,
      p.email,
      p.city,
      p.avatar_path,
      hp.headline,
      hp.expertise,
      hp.years_experience,
      hp.verification_status::text as verification_status,
      hp.payout_account_ready,
      hp.created_at,
      (select count(*) from public.experiences e where e.host_user_id = hp.user_id) as experiences_count
    from public.host_profiles hp
    left join public.profiles p on p.user_id = hp.user_id
    where (p_status is null or hp.verification_status::text = p_status)
      and (
        p_search is null or p_search = '' or
        coalesce(p.display_name, '') ilike '%' || p_search || '%' or
        coalesce(p.email::text, '') ilike '%' || p_search || '%' or
        coalesce(hp.headline, '') ilike '%' || p_search || '%'
      )
    order by hp.created_at desc
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  ) r;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_list_experiences(search, status, limit, offset)
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_experiences(
  p_search text default null,
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb := '[]'::jsonb;
  v_total bigint := 0;
begin
  perform public.assert_admin();

  select count(*) into v_total
  from public.experiences e
  where (p_status is null or e.status::text = p_status)
    and (p_search is null or p_search = '' or e.title ilike '%' || p_search || '%');

  select coalesce(jsonb_agg(row_to_json(r) order by r.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      e.id,
      e.title,
      e.subtitle,
      e.status::text as status,
      e.price_amount,
      e.currency::text as currency,
      e.is_online,
      e.created_at,
      coalesce(p.display_name, p.email) as host_name,
      e.host_user_id,
      c.name as category_name,
      (select count(*) from public.bookings b where b.experience_id = e.id) as bookings_count
    from public.experiences e
    left join public.profiles p on p.user_id = e.host_user_id
    left join public.categories c on c.id = e.category_id
    where (p_status is null or e.status::text = p_status)
      and (p_search is null or p_search = '' or e.title ilike '%' || p_search || '%')
    order by e.created_at desc
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  ) r;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_list_bookings(search, status, limit, offset)
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_bookings(
  p_search text default null,
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb := '[]'::jsonb;
  v_total bigint := 0;
begin
  perform public.assert_admin();

  select count(*) into v_total
  from public.bookings b
  left join public.experiences e on e.id = b.experience_id
  left join public.profiles g on g.user_id = b.guest_user_id
  where (p_status is null or b.status::text = p_status)
    and (
      p_search is null or p_search = '' or
      coalesce(e.title, '') ilike '%' || p_search || '%' or
      coalesce(g.display_name, '') ilike '%' || p_search || '%' or
      coalesce(g.email::text, '') ilike '%' || p_search || '%'
    );

  select coalesce(jsonb_agg(row_to_json(r) order by r.booked_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      b.id,
      b.status::text as status,
      b.guests_count,
      b.total_amount,
      b.currency::text as currency,
      b.booked_at,
      e.title as experience_title,
      coalesce(g.display_name, g.email) as guest_name,
      coalesce(h.display_name, h.email) as host_name
    from public.bookings b
    left join public.experiences e on e.id = b.experience_id
    left join public.profiles g on g.user_id = b.guest_user_id
    left join public.profiles h on h.user_id = b.host_user_id
    where (p_status is null or b.status::text = p_status)
      and (
        p_search is null or p_search = '' or
        coalesce(e.title, '') ilike '%' || p_search || '%' or
        coalesce(g.display_name, '') ilike '%' || p_search || '%' or
        coalesce(g.email::text, '') ilike '%' || p_search || '%'
      )
    order by b.booked_at desc
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  ) r;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_list_payments(search, status, limit, offset)
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_payments(
  p_search text default null,
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_succeeded numeric := 0;
  v_pending numeric := 0;
  v_refunded numeric := 0;
begin
  perform public.assert_admin();

  select count(*) into v_total
  from public.payments pay
  left join public.profiles payer on payer.user_id = pay.payer_user_id
  where (p_status is null or pay.status::text = p_status)
    and (
      p_search is null or p_search = '' or
      coalesce(payer.display_name, '') ilike '%' || p_search || '%' or
      coalesce(payer.email::text, '') ilike '%' || p_search || '%' or
      coalesce(pay.provider, '') ilike '%' || p_search || '%'
    );

  select coalesce(sum(amount) filter (where status = 'succeeded'), 0),
         coalesce(sum(amount) filter (where status = 'pending'), 0),
         coalesce(sum(amount) filter (where status in ('refunded', 'partially_refunded')), 0)
  into v_succeeded, v_pending, v_refunded
  from public.payments;

  select coalesce(jsonb_agg(row_to_json(r) order by r.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      pay.id,
      pay.amount,
      pay.currency::text as currency,
      pay.status::text as status,
      pay.provider,
      pay.paid_at,
      pay.created_at,
      coalesce(payer.display_name, payer.email) as payer_name,
      coalesce(payee.display_name, payee.email) as payee_name,
      e.title as experience_title
    from public.payments pay
    left join public.profiles payer on payer.user_id = pay.payer_user_id
    left join public.profiles payee on payee.user_id = pay.payee_user_id
    left join public.bookings b on b.id = pay.booking_id
    left join public.experiences e on e.id = b.experience_id
    where (p_status is null or pay.status::text = p_status)
      and (
        p_search is null or p_search = '' or
        coalesce(payer.display_name, '') ilike '%' || p_search || '%' or
        coalesce(payer.email::text, '') ilike '%' || p_search || '%' or
        coalesce(pay.provider, '') ilike '%' || p_search || '%'
      )
    order by pay.created_at desc
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  ) r;

  return jsonb_build_object(
    'rows', v_rows,
    'total', v_total,
    'totals', jsonb_build_object(
      'succeeded', v_succeeded,
      'pending', v_pending,
      'refunded', v_refunded
    )
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_list_users(search, limit, offset)
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb := '[]'::jsonb;
  v_total bigint := 0;
begin
  perform public.assert_admin();

  select count(*) into v_total
  from public.profiles p
  where (
    p_search is null or p_search = '' or
    coalesce(p.display_name, '') ilike '%' || p_search || '%' or
    coalesce(p.email::text, '') ilike '%' || p_search || '%'
  );

  select coalesce(jsonb_agg(row_to_json(r) order by r.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      p.user_id,
      coalesce(p.display_name, p.email) as name,
      p.email,
      p.city,
      p.country_code,
      p.avatar_path,
      p.created_at,
      exists (select 1 from public.host_profiles hp where hp.user_id = p.user_id) as is_host,
      exists (select 1 from public.user_roles ur where ur.user_id = p.user_id and ur.role = 'admin') as is_admin,
      exists (select 1 from public.affiliate_profiles ap where ap.user_id = p.user_id) as is_affiliate,
      (select count(*) from public.bookings b where b.guest_user_id = p.user_id) as bookings_count
    from public.profiles p
    where (
      p_search is null or p_search = '' or
      coalesce(p.display_name, '') ilike '%' || p_search || '%' or
      coalesce(p.email::text, '') ilike '%' || p_search || '%'
    )
    order by p.created_at desc
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  ) r;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_list_affiliates(search, limit, offset)
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_affiliates(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb := '[]'::jsonb;
  v_total bigint := 0;
begin
  perform public.assert_admin();

  select count(*) into v_total
  from public.affiliate_profiles ap
  left join public.profiles p on p.user_id = ap.user_id
  where (
    p_search is null or p_search = '' or
    coalesce(p.display_name, '') ilike '%' || p_search || '%' or
    coalesce(p.email::text, '') ilike '%' || p_search || '%' or
    ap.referral_code ilike '%' || p_search || '%'
  );

  select coalesce(jsonb_agg(row_to_json(r) order by r.enrolled_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      ap.user_id,
      coalesce(p.display_name, p.email) as name,
      p.email,
      ap.referral_code,
      ap.enrolled_at,
      (select count(*) from public.affiliate_referrals ar where ar.affiliate_user_id = ap.user_id) as referrals_count,
      (
        select coalesce(sum(ac.commission_amount), 0)
        from public.affiliate_commissions ac
        where ac.affiliate_user_id = ap.user_id and ac.status in ('accrued', 'paid')
      ) as total_earned,
      (
        select coalesce(sum(c.amount), 0)
        from public.affiliate_cashouts c
        where c.affiliate_user_id = ap.user_id and c.status in ('pending', 'processing')
      ) as pending_cashout
    from public.affiliate_profiles ap
    left join public.profiles p on p.user_id = ap.user_id
    where (
      p_search is null or p_search = '' or
      coalesce(p.display_name, '') ilike '%' || p_search || '%' or
      coalesce(p.email::text, '') ilike '%' || p_search || '%' or
      ap.referral_code ilike '%' || p_search || '%'
    )
    order by ap.enrolled_at desc
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  ) r;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_list_reviews(search, rating, limit, offset)
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_reviews(
  p_search text default null,
  p_rating integer default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb := '[]'::jsonb;
  v_total bigint := 0;
begin
  perform public.assert_admin();

  select count(*) into v_total
  from public.reviews rv
  left join public.experiences e on e.id = rv.experience_id
  where (p_rating is null or rv.rating = p_rating)
    and (
      p_search is null or p_search = '' or
      coalesce(e.title, '') ilike '%' || p_search || '%' or
      coalesce(rv.review_text, '') ilike '%' || p_search || '%'
    );

  select coalesce(jsonb_agg(row_to_json(r) order by r.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      rv.id,
      rv.rating,
      rv.review_text,
      rv.created_at,
      e.title as experience_title,
      coalesce(p.display_name, p.email) as reviewer_name
    from public.reviews rv
    left join public.experiences e on e.id = rv.experience_id
    left join public.profiles p on p.user_id = rv.reviewer_user_id
    where (p_rating is null or rv.rating = p_rating)
      and (
        p_search is null or p_search = '' or
        coalesce(e.title, '') ilike '%' || p_search || '%' or
        coalesce(rv.review_text, '') ilike '%' || p_search || '%'
      )
    order by rv.created_at desc
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  ) r;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

-- =============================================================================
-- Moderation actions (write).
-- =============================================================================

create or replace function public.admin_set_host_verification(
  p_user_id uuid,
  p_status text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  if p_status not in ('not_started', 'pending', 'approved', 'rejected') then
    raise exception 'Invalid verification status: %', p_status using errcode = '22023';
  end if;

  update public.host_profiles
  set verification_status = p_status::public.host_verification_status,
      verification_notes = coalesce(p_notes, verification_notes),
      updated_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'Host not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'status', p_status);
end;
$$;

create or replace function public.admin_set_experience_status(
  p_experience_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  if p_status not in (
    'draft', 'submitted', 'in_review', 'approved',
    'published', 'unpublished', 'rejected', 'archived'
  ) then
    raise exception 'Invalid experience status: %', p_status using errcode = '22023';
  end if;

  update public.experiences
  set status = p_status::public.experience_status,
      updated_at = now()
  where id = p_experience_id;

  if not found then
    raise exception 'Experience not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('ok', true, 'id', p_experience_id, 'status', p_status);
end;
$$;

create or replace function public.admin_set_admin_role(
  p_user_id uuid,
  p_grant boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  if p_grant then
    insert into public.user_roles (user_id, role)
    values (p_user_id, 'admin')
    on conflict (user_id, role) do nothing;
  else
    -- Guard against removing the last admin.
    if (select count(*) from public.user_roles where role = 'admin') <= 1
       and exists (select 1 from public.user_roles where role = 'admin' and user_id = p_user_id) then
      raise exception 'Cannot remove the last remaining admin.' using errcode = '23514';
    end if;
    delete from public.user_roles where user_id = p_user_id and role = 'admin';
  end if;

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'is_admin', p_grant);
end;
$$;

create or replace function public.admin_delete_review(p_review_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  delete from public.reviews where id = p_review_id;
  if not found then
    raise exception 'Review not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('ok', true, 'id', p_review_id);
end;
$$;

create or replace function public.admin_update_cashout_status(
  p_cashout_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  if p_status not in ('pending', 'processing', 'paid', 'failed', 'cancelled') then
    raise exception 'Invalid cashout status: %', p_status using errcode = '22023';
  end if;

  update public.affiliate_cashouts
  set status = p_status,
      paid_at = case when p_status = 'paid' then now() else paid_at end
  where id = p_cashout_id;

  if not found then
    raise exception 'Cashout not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('ok', true, 'id', p_cashout_id, 'status', p_status);
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants — anon/authenticated may execute; the is_admin() gate inside each
-- function is the real access control (consistent with the affiliate RPCs).
-- -----------------------------------------------------------------------------
grant execute on function public.admin_overview() to anon, authenticated;
grant execute on function public.admin_list_hosts(text, text, integer, integer) to anon, authenticated;
grant execute on function public.admin_list_experiences(text, text, integer, integer) to anon, authenticated;
grant execute on function public.admin_list_bookings(text, text, integer, integer) to anon, authenticated;
grant execute on function public.admin_list_payments(text, text, integer, integer) to anon, authenticated;
grant execute on function public.admin_list_users(text, integer, integer) to anon, authenticated;
grant execute on function public.admin_list_affiliates(text, integer, integer) to anon, authenticated;
grant execute on function public.admin_list_reviews(text, integer, integer, integer) to anon, authenticated;
grant execute on function public.admin_set_host_verification(uuid, text, text) to anon, authenticated;
grant execute on function public.admin_set_experience_status(uuid, text) to anon, authenticated;
grant execute on function public.admin_set_admin_role(uuid, boolean) to anon, authenticated;
grant execute on function public.admin_delete_review(uuid) to anon, authenticated;
grant execute on function public.admin_update_cashout_status(uuid, text) to anon, authenticated;
