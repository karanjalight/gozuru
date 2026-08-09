# Reviews & Ratings System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every placeholder/fake review and rating in Gozuru with a real, booking-backed review system: travelers can submit one review per completed booking, all rating/review-count displays (experience pages, cards, expert/host pages, homepage, admin) derive from the same database aggregates, and admins can moderate reviews.

**Architecture:** One new Postgres migration adds a `status` moderation column + re-enabled RLS to the existing `public.reviews` table, plus `security definer` RPCs for submitting/editing reviews and for aggregating stats (experience-level, host-level, and platform-featured), following the exact pattern already used by every other write path in this app (bookings, checkout, affiliate, admin). The frontend adds a shared star-rating UI, a review submission/edit modal, wires the new RPCs into the traveler's "Sent" bookings tab, the experience detail page, expert/host pages, experience cards, the admin reviews page, and the homepage testimonials section.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Supabase (Postgres + supabase-js, no ORM), Tailwind v4 + `class-variance-authority` + `@base-ui/react`, TanStack Query (admin only), `lucide-react` icons.

## Global Constraints

- Ratings are integers 1–5 only, enforced by the existing `reviews_rating_check` constraint and re-validated in every RPC.
- Review text is optional, capped at 500 characters in the UI and 1000 characters at the database level (hard backstop).
- One review per booking is enforced by the existing `unique(booking_id)` constraint on `public.reviews` — never remove or work around it.
- All rating/review-count values shown anywhere in the app must come from the RPCs added in Task 1 (`get_experience_review_stats[_bulk]`, `get_host_reputation_stats[_bulk]`, `get_featured_reviews`) — never hardcode, never recompute a full aggregate from a partial client-side fetch.
- No fake/placeholder review data, reviewer names, ratings, or counts may be introduced anywhere, including empty states — an experience/host with zero reviews must honestly show zero.
- Star rating color is orange (`text-orange-400 fill-orange-400` for compact display, `text-orange-500 fill-orange-500` where the codebase already uses the 500 shade) — matches the existing convention used almost everywhere in the public-facing app; do not introduce a new accent color for this feature.
- Follow existing data-access conventions exactly: client components import the shared singleton from `lib/supabase/client.ts`; the two `*-server.ts` query files each create their own anon `createClient(...)` instance (do not introduce a shared server client helper); all Postgres RPCs are `security definer`, `set search_path = public`, and gate access via `auth.uid()` checks or `perform public.assert_admin()` — matching `supabase/migrations/20260629_021_admin_dashboard.sql` and `supabase/migrations/20260426_013_get_account_applications_rpc.sql`.
- **This repository has no automated test runner** (no jest/vitest/playwright, no `*.test.*` files, no `test` script in `package.json`). Verification for frontend tasks is: `npx tsc --noEmit` (typecheck), `npm run lint`, and manual verification via `npm run dev`. Do not introduce a new test framework as a side effect of this feature.
- **The Supabase project referenced by `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` / `DATABASE_URL`) is a live, shared database.** Writing a migration *file* is a safe, local, reversible action. Actually *applying* that migration (Task 2) mutates live shared infrastructure and must only be done after the user explicitly confirms — never run `psql "$DATABASE_URL" -f ...` or paste SQL into the Supabase SQL editor without that confirmation, regardless of execution mode (subagent-driven or inline).
- Package manager is `npm` (see `package-lock.json`); there is no `tailwind.config.*` — theme lives in `app/globals.css` via `@theme inline`.

---

## Task 1: Author the reviews-system SQL migration

**Files:**
- Create: `supabase/migrations/20260809_022_reviews_system.sql`

**Interfaces:**
- Produces (for later tasks): RPCs `submit_review(uuid, integer, text)`, `update_review(uuid, integer, text)`, `get_experience_review_stats(uuid)`, `get_experience_review_stats_bulk(uuid[])`, `get_host_reputation_stats(uuid)`, `get_host_reputation_stats_bulk(uuid[])`, `get_featured_reviews(integer)`, extended `get_account_applications(text, uuid, integer)`, extended `admin_list_reviews(text, integer, integer, integer, text)`, new `admin_set_review_status(uuid, text)`. Also produces column `public.reviews.status public.review_status` (values `'published'`/`'hidden'`, default `'published'`).
- Consumes: existing tables `public.reviews`, `public.bookings`, `public.experience_availability`, `public.experiences`, `public.profiles`, `public.host_profiles`; existing functions `public.is_admin()`, `public.assert_admin()`.

This task only **writes the file** — it does not apply it to the database. That happens in Task 2, after explicit user confirmation.

- [ ] **Step 1: Write the complete migration file**

Create `supabase/migrations/20260809_022_reviews_system.sql` with this exact content:

```sql
-- =============================================================================
-- Reviews & Ratings system
-- -----------------------------------------------------------------------------
-- Adds moderation status + RLS to public.reviews, and RPCs for submitting,
-- editing, and aggregating reviews, plus host reputation stats and admin
-- moderation extensions. Mirrors the SECURITY DEFINER RPC pattern used by
-- the booking, affiliate, and admin-dashboard migrations. Booking status is
-- never flipped to 'completed' anywhere in this app, so eligibility is
-- computed live from experience_availability.ends_at instead of trusted
-- from bookings.status.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Schema: moderation status on reviews
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type public.review_status as enum ('published', 'hidden');
  end if;
end
$$;

alter table public.reviews
  add column if not exists status public.review_status not null default 'published';

alter table public.reviews
  drop constraint if exists reviews_review_text_length;
alter table public.reviews
  add constraint reviews_review_text_length
  check (review_text is null or char_length(review_text) <= 1000);

create index if not exists idx_reviews_experience_status on public.reviews(experience_id, status);
create index if not exists idx_reviews_reviewer on public.reviews(reviewer_user_id);

-- -----------------------------------------------------------------------------
-- RLS: re-enable for reviews only. All writes must go through the
-- SECURITY DEFINER RPCs below, which bypass RLS (same pattern already used
-- by booking_messages, checkout_sessions, and the affiliate tables).
-- -----------------------------------------------------------------------------
alter table public.reviews enable row level security;

drop policy if exists reviews_select_published_or_own_or_admin on public.reviews;
create policy reviews_select_published_or_own_or_admin
on public.reviews
for select
using (
  status = 'published'
  or reviewer_user_id = auth.uid()
  or public.is_admin()
);

-- -----------------------------------------------------------------------------
-- submit_review(booking, rating, text) — the only way to create a review.
-- -----------------------------------------------------------------------------
create or replace function public.submit_review(
  p_booking_id uuid,
  p_rating integer,
  p_review_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_booking record;
  v_review_id uuid;
  v_clean_text text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5.' using errcode = '22023';
  end if;

  select b.id, b.guest_user_id, b.experience_id, b.status, ea.ends_at
  into v_booking
  from public.bookings b
  left join public.experience_availability ea on ea.id = b.availability_id
  where b.id = p_booking_id;

  if not found then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;

  if v_booking.guest_user_id <> v_uid then
    raise exception 'You can only review your own bookings.' using errcode = '42501';
  end if;

  if v_booking.status not in ('confirmed', 'completed')
     or v_booking.ends_at is null
     or v_booking.ends_at >= now() then
    raise exception 'This booking is not eligible for a review yet.' using errcode = '22023';
  end if;

  if exists (select 1 from public.reviews where booking_id = p_booking_id) then
    raise exception 'You have already reviewed this booking.' using errcode = '23505';
  end if;

  v_clean_text := nullif(trim(both from coalesce(p_review_text, '')), '');
  if v_clean_text is not null and char_length(v_clean_text) > 1000 then
    v_clean_text := left(v_clean_text, 1000);
  end if;

  insert into public.reviews (booking_id, experience_id, reviewer_user_id, rating, review_text, status)
  values (p_booking_id, v_booking.experience_id, v_uid, p_rating, v_clean_text, 'published')
  returning id into v_review_id;

  return jsonb_build_object('ok', true, 'id', v_review_id);
end;
$$;

grant execute on function public.submit_review(uuid, integer, text) to authenticated;

-- -----------------------------------------------------------------------------
-- update_review(review_id, rating, text) — owner or admin only. Updates the
-- existing row in place; never creates a second review for the same booking.
-- -----------------------------------------------------------------------------
create or replace function public.update_review(
  p_review_id uuid,
  p_rating integer,
  p_review_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_owner uuid;
  v_clean_text text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5.' using errcode = '22023';
  end if;

  select reviewer_user_id into v_owner from public.reviews where id = p_review_id;
  if not found then
    raise exception 'Review not found.' using errcode = 'P0002';
  end if;

  if v_owner <> v_uid and not public.is_admin() then
    raise exception 'You can only edit your own review.' using errcode = '42501';
  end if;

  v_clean_text := nullif(trim(both from coalesce(p_review_text, '')), '');
  if v_clean_text is not null and char_length(v_clean_text) > 1000 then
    v_clean_text := left(v_clean_text, 1000);
  end if;

  update public.reviews
  set rating = p_rating,
      review_text = v_clean_text,
      updated_at = now()
  where id = p_review_id;

  return jsonb_build_object('ok', true, 'id', p_review_id);
end;
$$;

grant execute on function public.update_review(uuid, integer, text) to authenticated;

-- -----------------------------------------------------------------------------
-- get_experience_review_stats(experience_id) — average/count/distribution,
-- published reviews only. Single source of truth for one experience's stats.
-- -----------------------------------------------------------------------------
create or replace function public.get_experience_review_stats(p_experience_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'average', round(avg(rating)::numeric, 2),
    'count', count(*),
    'distribution', jsonb_build_object(
      '5', count(*) filter (where rating = 5),
      '4', count(*) filter (where rating = 4),
      '3', count(*) filter (where rating = 3),
      '2', count(*) filter (where rating = 2),
      '1', count(*) filter (where rating = 1)
    )
  )
  from public.reviews
  where experience_id = p_experience_id
    and status = 'published';
$$;

grant execute on function public.get_experience_review_stats(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- get_experience_review_stats_bulk(experience_ids[]) — batched for listing
-- pages / experience cards, avoids one round trip per card.
-- -----------------------------------------------------------------------------
create or replace function public.get_experience_review_stats_bulk(p_experience_ids uuid[])
returns table (
  experience_id uuid,
  average numeric,
  review_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id as experience_id,
    round(avg(r.rating)::numeric, 2) as average,
    count(r.id)::integer as review_count
  from unnest(p_experience_ids) as e(id)
  left join public.reviews r on r.experience_id = e.id and r.status = 'published'
  group by e.id;
$$;

grant execute on function public.get_experience_review_stats_bulk(uuid[]) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- get_host_reputation_stats(host_user_id) — real reputation numbers for one
-- host: average rating, review count, completed bookings, distinct travelers.
-- "Completed" is computed live from experience_availability.ends_at, since
-- bookings.status is never actually set to 'completed' anywhere in this app.
-- -----------------------------------------------------------------------------
create or replace function public.get_host_reputation_stats(p_host_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_avg_rating numeric;
  v_review_count integer;
  v_completed_count integer;
  v_travelers_count integer;
begin
  select round(avg(r.rating)::numeric, 2), count(r.id)
  into v_avg_rating, v_review_count
  from public.reviews r
  join public.experiences e on e.id = r.experience_id
  where e.host_user_id = p_host_user_id
    and r.status = 'published';

  select count(*), count(distinct b.guest_user_id)
  into v_completed_count, v_travelers_count
  from public.bookings b
  join public.experience_availability ea on ea.id = b.availability_id
  where b.host_user_id = p_host_user_id
    and b.status in ('confirmed', 'completed')
    and ea.ends_at < now();

  return jsonb_build_object(
    'average_rating', v_avg_rating,
    'review_count', coalesce(v_review_count, 0),
    'completed_bookings_count', coalesce(v_completed_count, 0),
    'travelers_hosted_count', coalesce(v_travelers_count, 0)
  );
end;
$$;

grant execute on function public.get_host_reputation_stats(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- get_host_reputation_stats_bulk(host_user_ids[]) — batched, for the
-- /experts listing grid.
-- -----------------------------------------------------------------------------
create or replace function public.get_host_reputation_stats_bulk(p_host_user_ids uuid[])
returns table (
  host_user_id uuid,
  average_rating numeric,
  review_count integer,
  completed_bookings_count integer,
  travelers_hosted_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    h.id as host_user_id,
    (
      select round(avg(r.rating)::numeric, 2)
      from public.reviews r
      join public.experiences e on e.id = r.experience_id
      where e.host_user_id = h.id and r.status = 'published'
    ) as average_rating,
    (
      select count(r.id)::integer
      from public.reviews r
      join public.experiences e on e.id = r.experience_id
      where e.host_user_id = h.id and r.status = 'published'
    ) as review_count,
    (
      select count(*)::integer
      from public.bookings b
      join public.experience_availability ea on ea.id = b.availability_id
      where b.host_user_id = h.id
        and b.status in ('confirmed', 'completed')
        and ea.ends_at < now()
    ) as completed_bookings_count,
    (
      select count(distinct b.guest_user_id)::integer
      from public.bookings b
      join public.experience_availability ea on ea.id = b.availability_id
      where b.host_user_id = h.id
        and b.status in ('confirmed', 'completed')
        and ea.ends_at < now()
    ) as travelers_hosted_count
  from unnest(p_host_user_ids) as h(id);
$$;

grant execute on function public.get_host_reputation_stats_bulk(uuid[]) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- get_featured_reviews(limit) — real, recent, high-rated, texted reviews for
-- the homepage. Returns fewer rows than requested if that's all that exists;
-- never pads with fabricated data.
-- -----------------------------------------------------------------------------
create or replace function public.get_featured_reviews(p_limit integer default 5)
returns table (
  id uuid,
  rating integer,
  review_text text,
  created_at timestamptz,
  reviewer_name text,
  reviewer_avatar_path text,
  experience_id uuid,
  experience_title text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.rating,
    r.review_text,
    r.created_at,
    coalesce(p.display_name, p.email::text) as reviewer_name,
    p.avatar_path as reviewer_avatar_path,
    e.id as experience_id,
    e.title as experience_title
  from public.reviews r
  join public.experiences e on e.id = r.experience_id
  left join public.profiles p on p.user_id = r.reviewer_user_id
  where r.status = 'published'
    and r.rating >= 4
    and r.review_text is not null
  order by r.created_at desc
  limit greatest(coalesce(p_limit, 5), 0);
$$;

grant execute on function public.get_featured_reviews(integer) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- get_account_applications — extended with review-eligibility columns.
-- Return shape changed, so the function must be dropped before recreating.
-- Confirmed single call site: app/account/applied/page.tsx.
-- -----------------------------------------------------------------------------
drop function if exists public.get_account_applications(text, uuid, integer);

create function public.get_account_applications(
  p_view text default 'incoming',
  p_experience_id uuid default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  booked_at timestamptz,
  status public.booking_status,
  guests_count integer,
  availability_id uuid,
  host_note text,
  experience_id uuid,
  experience_title text,
  slot_starts_at timestamptz,
  slot_ends_at timestamptz,
  is_review_eligible boolean,
  has_review boolean,
  review_id uuid,
  review_rating integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_limit integer;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 50), 200));

  if coalesce(p_view, 'incoming') = 'sent' then
    return query
    select
      b.id,
      b.booked_at,
      b.status,
      b.guests_count,
      b.availability_id,
      b.host_note,
      e.id as experience_id,
      e.title as experience_title,
      ea.starts_at as slot_starts_at,
      ea.ends_at as slot_ends_at,
      (
        b.guest_user_id = v_uid
        and b.status in ('confirmed', 'completed')
        and ea.ends_at is not null
        and ea.ends_at < now()
        and rv.id is null
      ) as is_review_eligible,
      (rv.id is not null) as has_review,
      rv.id as review_id,
      rv.rating as review_rating
    from public.bookings b
    left join public.experiences e on e.id = b.experience_id
    left join public.experience_availability ea on ea.id = b.availability_id
    left join public.reviews rv on rv.booking_id = b.id
    where b.guest_user_id = v_uid
      and (p_experience_id is null or b.experience_id = p_experience_id)
    order by b.booked_at desc
    limit v_limit;
  else
    return query
    select
      b.id,
      b.booked_at,
      b.status,
      b.guests_count,
      b.availability_id,
      b.host_note,
      e.id as experience_id,
      e.title as experience_title,
      ea.starts_at as slot_starts_at,
      ea.ends_at as slot_ends_at,
      false as is_review_eligible,
      (rv.id is not null) as has_review,
      rv.id as review_id,
      rv.rating as review_rating
    from public.bookings b
    left join public.experiences e on e.id = b.experience_id
    left join public.experience_availability ea on ea.id = b.availability_id
    left join public.reviews rv on rv.booking_id = b.id
    where b.host_user_id = v_uid
      and (p_experience_id is null or b.experience_id = p_experience_id)
    order by b.booked_at desc
    limit v_limit;
  end if;
end;
$$;

grant execute on function public.get_account_applications(text, uuid, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_list_reviews — extended with status/booking/host + a status filter.
-- p_status appended after existing params so both positional and named
-- callers stay compatible; existing frontend caller uses named args.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_reviews(
  p_search text default null,
  p_rating integer default null,
  p_limit integer default 25,
  p_offset integer default 0,
  p_status text default null
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
    and (p_status is null or rv.status::text = p_status)
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
      rv.booking_id,
      rv.rating,
      rv.review_text,
      rv.status::text as status,
      rv.created_at,
      e.title as experience_title,
      coalesce(hostp.display_name, hostp.email) as host_name,
      coalesce(p.display_name, p.email) as reviewer_name
    from public.reviews rv
    left join public.experiences e on e.id = rv.experience_id
    left join public.profiles p on p.user_id = rv.reviewer_user_id
    left join public.profiles hostp on hostp.user_id = e.host_user_id
    where (p_rating is null or rv.rating = p_rating)
      and (p_status is null or rv.status::text = p_status)
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

grant execute on function public.admin_list_reviews(text, integer, integer, integer, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- admin_set_review_status(review_id, status) — hide/unhide, alongside the
-- existing hard-delete admin_delete_review.
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_review_status(
  p_review_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  if p_status not in ('published', 'hidden') then
    raise exception 'Invalid review status: %', p_status using errcode = '22023';
  end if;

  update public.reviews
  set status = p_status::public.review_status,
      updated_at = now()
  where id = p_review_id;

  if not found then
    raise exception 'Review not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('ok', true, 'id', p_review_id, 'status', p_status);
end;
$$;

grant execute on function public.admin_set_review_status(uuid, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- admin_overview — full function replaced (Postgres requires the complete
-- body for CREATE OR REPLACE); the ONLY change is the reviews KPI now
-- filters to status = 'published', matching what travelers actually see.
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

  -- Reviews (published only — matches what travelers see).
  select coalesce(round(avg(rating)::numeric, 2), 0), count(*)
  into v_avg_rating, v_reviews_total
  from public.reviews
  where status = 'published';

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
```

- [ ] **Step 2: Self-review the migration file**

Run each check and confirm the expected result before moving on:

```bash
grep -c '^create or replace function\|^create function' supabase/migrations/20260809_022_reviews_system.sql
```
Expected: `10` (submit_review, update_review, get_experience_review_stats, get_experience_review_stats_bulk, get_host_reputation_stats, get_host_reputation_stats_bulk, get_featured_reviews, get_account_applications, admin_list_reviews, admin_set_review_status) — `admin_overview` makes 11, confirm the count is `11`.

```bash
grep -c '^\$\$;' supabase/migrations/20260809_022_reviews_system.sql
```
Expected: matches the number of `as \$\$` function bodies (every `create ... function` above ends its body with `$$;` on its own line) — visually confirm each function has a matching closing `$$;`.

```bash
grep -c 'grant execute on function' supabase/migrations/20260809_022_reviews_system.sql
```
Expected: `9` (every new/changed function except `admin_overview`, which keeps its existing grant from the prior migration).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260809_022_reviews_system.sql
git commit -m "$(cat <<'EOF'
Add reviews-system migration: moderation status, RLS, and review RPCs

Adds a status column + re-enabled RLS to public.reviews, submit_review/
update_review RPCs, experience and host reputation aggregate RPCs, a
get_featured_reviews RPC for the homepage, and extends
get_account_applications and the admin reviews RPCs. Not yet applied to
the database — see Task 2.
EOF
)"
```

---

## Task 2: Apply the migration and verify it end-to-end (human checkpoint)

**Files:**
- Create: `scripts/verify-reviews-system.sql`
- Apply (not create/modify in git): `supabase/migrations/20260809_022_reviews_system.sql` (from Task 1) against the live Supabase Postgres database.

**Interfaces:**
- Consumes: every RPC produced by Task 1.
- Produces: a live, migrated `reviews` table that Tasks 3–11 depend on. **Do not start Task 3 until this task's verification output has been reviewed and confirmed correct.**

> **STOP — this task applies schema changes to the live Supabase project referenced by `NEXT_PUBLIC_SUPABASE_URL`/`DATABASE_URL` in `.env.local`.** Confirm with the user before running Step 2. This is not something to run automatically as part of a batch — pause and get explicit go-ahead first, even in autonomous execution modes.

- [ ] **Step 1: Write the verification script**

Create `scripts/verify-reviews-system.sql` with this exact content. It runs entirely inside one transaction that is rolled back at the end, so it never leaves residue in the database and is safe to re-run at any time:

```sql
-- Verifies the reviews-system migration end-to-end against real FK-safe
-- data, entirely inside a transaction that is rolled back at the end.
-- Safe to re-run any time; it never leaves residue in the database.
\set ON_ERROR_STOP on
begin;

\echo '--- Setup: pick a real host + guest already in the database ---'
select user_id as host_id from public.host_profiles limit 1 \gset
select user_id as guest_id from public.profiles where user_id <> :'host_id' limit 1 \gset
\echo Using host: :host_id
\echo Using guest: :guest_id

\echo '--- Create a synthetic experience + past slot + confirmed booking ---'
insert into public.experiences (id, host_user_id, title, status, max_guests, price_amount, currency)
values (gen_random_uuid(), :'host_id', 'TEST -- reviews verification', 'published', 4, 10, 'USD')
returning id as exp_id \gset

insert into public.experience_availability (id, experience_id, starts_at, ends_at, capacity, host_user_id)
values (gen_random_uuid(), :'exp_id', now() - interval '2 days', now() - interval '1 day', 4, :'host_id')
returning id as slot_id \gset

insert into public.bookings (id, experience_id, availability_id, guest_user_id, host_user_id, status, guests_count, total_amount)
values (gen_random_uuid(), :'exp_id', :'slot_id', :'guest_id', :'host_id', 'confirmed', 1, 10)
returning id as booking_id \gset

\echo '--- Zero-review state: expect average null, count 0 ---'
select public.get_experience_review_stats(:'exp_id'::uuid);

\echo '--- Impersonate the guest as the authenticated role ---'
select set_config('request.jwt.claims', json_build_object('sub', :'guest_id', 'role', 'authenticated')::text, true);
set local role authenticated;

\echo '--- 1) Eligible booking: submit_review should succeed ---'
select public.submit_review(:'booking_id'::uuid, 5, 'Fantastic, would book again.') as submit_result \gset
select :'submit_result';

\echo '--- 2) Duplicate review on the same booking must be rejected ---'
do $verify$
begin
  perform public.submit_review(:'booking_id'::uuid, 4, 'Second attempt.');
  raise exception 'TEST FAILED: duplicate review was not rejected';
exception when others then
  raise notice 'OK -- duplicate correctly rejected: %', sqlerrm;
end
$verify$;

\echo '--- 3) A different user cannot review someone elses booking ---'
select set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
do $verify$
begin
  perform public.submit_review(:'booking_id'::uuid, 3, 'Not my booking.');
  raise exception 'TEST FAILED: non-owner review was not rejected';
exception when others then
  raise notice 'OK -- non-owner correctly rejected: %', sqlerrm;
end
$verify$;

\echo '--- Switch back to the real reviewer for edit + stats checks ---'
select set_config('request.jwt.claims', json_build_object('sub', :'guest_id', 'role', 'authenticated')::text, true);
select id as review_id from public.reviews where booking_id = :'booking_id' \gset

\echo '--- 4) Owner can edit their review in place (no new row) ---'
select public.update_review(:'review_id'::uuid, 4, 'Updated: still great, minor notes.') as update_result \gset
select :'update_result';
select count(*) as should_be_1 from public.reviews where booking_id = :'booking_id';

\echo '--- 5) Aggregation reflects the edited review ---'
\echo 'Expect average 4.00, count 1, distribution.4 = 1:'
select public.get_experience_review_stats(:'exp_id'::uuid);

\echo '--- 6) get_account_applications (sent view) reflects the review ---'
select id, status, is_review_eligible, has_review, review_id, review_rating
from public.get_account_applications('sent', :'exp_id'::uuid, 10);

\echo '--- 7) Host reputation reflects the completed booking + review ---'
\echo 'Expect review_count 1, completed_bookings_count >= 1, travelers_hosted_count >= 1:'
select public.get_host_reputation_stats(:'host_id'::uuid);

\echo '--- 8) Hiding a review removes it from stats and from non-owner reads (RLS) ---'
reset role;
update public.reviews set status = 'hidden' where id = :'review_id';

select set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
set local role authenticated;
select count(*) as should_be_zero_hidden_from_others from public.reviews where id = :'review_id';
\echo 'Expect count 0 (hidden review excluded from stats):'
select public.get_experience_review_stats(:'exp_id'::uuid);

reset role;
select set_config('request.jwt.claims', '', true);

\echo '--- All checks ran. Rolling back -- no permanent changes were made. ---'
rollback;
```

- [ ] **Step 2: Confirm with the user, then apply the migration**

Pause here and get explicit confirmation before running this. Then:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260809_022_reviews_system.sql
```

Expected: no errors; output ends with the final `GRANT` statements succeeding.

- [ ] **Step 3: Run the verification script and read every `\echo`/`NOTICE` line**

```bash
psql "$DATABASE_URL" -f scripts/verify-reviews-system.sql
```

Expected, in order: zero-review stats show `"average": null, "count": 0`; `submit_result` shows `"ok": true` with an id; a `NOTICE` confirms the duplicate was rejected; a `NOTICE` confirms the non-owner attempt was rejected; `update_result` shows `"ok": true`; `should_be_1` is `1`; post-edit stats show `"average": 4.00, "count": 1, "distribution": {"4": 1, ...}`; the `get_account_applications` row shows `has_review = t`, `review_rating = 4`; host reputation shows `review_count: 1` and both counts `>= 1`; `should_be_zero_hidden_from_others` is `0`; final stats after hiding show `"count": 0`. The script ends with `ROLLBACK` — confirm with `select count(*) from public.reviews where review_text = 'Updated: still great, minor notes.';` returning `0` (proves no residue was left).

If any expectation doesn't match, stop and fix the migration (Task 1) before proceeding — do not continue to frontend work against a backend that didn't verify correctly.

- [ ] **Step 4: Commit the verification script**

```bash
git add scripts/verify-reviews-system.sql
git commit -m "$(cat <<'EOF'
Add reviews-system verification script

Exercises submit/update/duplicate-rejection/ownership/aggregation/hide
against real FK-safe data inside a rolled-back transaction. Re-run any
time to sanity-check the reviews RPCs against the live database.
EOF
)"
```

---

## Task 3: Shared review UI primitives and client API helpers

**Files:**
- Create: `components/ui/star-rating.tsx`
- Create: `components/ui/textarea.tsx`
- Create: `lib/reviews/api.ts`

**Interfaces:**
- Consumes: `lib/supabase/client.ts` (`supabase` singleton), `lib/utils.ts` (`cn`).
- Produces: `StarRating({ rating, size? })`, `StarRatingInput({ value, onChange, size?, disabled? })` from `components/ui/star-rating.tsx`; `Textarea` from `components/ui/textarea.tsx`; `submitReview`, `updateReview`, `getExperienceReviewStats`, `getExperienceReviewStatsBulk`, `getHostReputationStats`, `getHostReputationStatsBulk`, `getFeaturedReviews`, and types `ExperienceReviewStats`, `HostReputationStats`, `FeaturedReview` from `lib/reviews/api.ts` — used by Tasks 4, 5, 6, 10, 11.

- [ ] **Step 1: Create the star rating components**

Create `components/ui/star-rating.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

const SIZE_CLASSES = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const

type StarSize = keyof typeof SIZE_CLASSES

export function StarRating({
  rating,
  size = "md",
  className,
}: {
  rating: number
  size?: StarSize
  className?: string
}) {
  const filled = Math.round(rating)
  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            SIZE_CLASSES[size],
            i < filled ? "fill-orange-400 text-orange-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  )
}

export function StarRatingInput({
  value,
  onChange,
  size = "lg",
  disabled = false,
}: {
  value: number
  onChange: (next: number) => void
  size?: StarSize
  disabled?: boolean
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value

  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === starValue}
            aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
            disabled={disabled}
            onMouseEnter={() => setHovered(starValue)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(starValue)}
            className="rounded-full p-0.5 outline-none transition-transform hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            <Star
              className={cn(
                SIZE_CLASSES[size],
                starValue <= display ? "fill-orange-400 text-orange-400" : "text-muted-foreground/30",
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create the textarea primitive**

Create `components/ui/textarea.tsx`:

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
```

- [ ] **Step 3: Create the review API helper module**

Create `lib/reviews/api.ts`:

```ts
import { supabase } from "@/lib/supabase/client";

export type ExperienceReviewStats = {
  average: number | null;
  count: number;
  distribution: { "1": number; "2": number; "3": number; "4": number; "5": number };
};

export type HostReputationStats = {
  average_rating: number | null;
  review_count: number;
  completed_bookings_count: number;
  travelers_hosted_count: number;
};

export type FeaturedReview = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer_name: string | null;
  reviewer_avatar_path: string | null;
  experience_id: string;
  experience_title: string | null;
};

const EMPTY_STATS: ExperienceReviewStats = {
  average: null,
  count: 0,
  distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
};

const EMPTY_HOST_STATS: HostReputationStats = {
  average_rating: null,
  review_count: 0,
  completed_bookings_count: 0,
  travelers_hosted_count: 0,
};

export async function submitReview(input: {
  bookingId: string;
  rating: number;
  reviewText: string;
}): Promise<void> {
  const { error } = await supabase.rpc("submit_review", {
    p_booking_id: input.bookingId,
    p_rating: input.rating,
    p_review_text: input.reviewText.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function updateReview(input: {
  reviewId: string;
  rating: number;
  reviewText: string;
}): Promise<void> {
  const { error } = await supabase.rpc("update_review", {
    p_review_id: input.reviewId,
    p_rating: input.rating,
    p_review_text: input.reviewText.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function getExperienceReviewStats(experienceId: string): Promise<ExperienceReviewStats> {
  const { data, error } = await supabase.rpc("get_experience_review_stats", {
    p_experience_id: experienceId,
  });
  if (error) throw new Error(error.message);
  return (data as ExperienceReviewStats | null) ?? EMPTY_STATS;
}

export type BulkExperienceStat = { experience_id: string; average: number | null; review_count: number };

export async function getExperienceReviewStatsBulk(
  experienceIds: string[],
): Promise<Record<string, BulkExperienceStat>> {
  if (experienceIds.length === 0) return {};
  const { data, error } = await supabase.rpc("get_experience_review_stats_bulk", {
    p_experience_ids: experienceIds,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as BulkExperienceStat[];
  return Object.fromEntries(rows.map((row) => [row.experience_id, row]));
}

export async function getHostReputationStats(hostUserId: string): Promise<HostReputationStats> {
  const { data, error } = await supabase.rpc("get_host_reputation_stats", {
    p_host_user_id: hostUserId,
  });
  if (error) throw new Error(error.message);
  return (data as HostReputationStats | null) ?? EMPTY_HOST_STATS;
}

export type BulkHostStat = HostReputationStats & { host_user_id: string };

export async function getHostReputationStatsBulk(
  hostUserIds: string[],
): Promise<Record<string, BulkHostStat>> {
  if (hostUserIds.length === 0) return {};
  const { data, error } = await supabase.rpc("get_host_reputation_stats_bulk", {
    p_host_user_ids: hostUserIds,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as BulkHostStat[];
  return Object.fromEntries(rows.map((row) => [row.host_user_id, row]));
}

export async function getFeaturedReviews(limit = 5): Promise<FeaturedReview[]> {
  const { data, error } = await supabase.rpc("get_featured_reviews", { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []) as FeaturedReview[];
}
```

- [ ] **Step 4: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```
Expected: no errors referencing the three new files (pre-existing unrelated errors, if any, are not this task's concern).

- [ ] **Step 5: Commit**

```bash
git add components/ui/star-rating.tsx components/ui/textarea.tsx lib/reviews/api.ts
git commit -m "$(cat <<'EOF'
Add shared star-rating UI primitives and review API client helpers

StarRating (display) and StarRatingInput (interactive) replace ad-hoc
Star-icon loops; lib/reviews/api.ts centralizes calls to the new review
RPCs, matching the lib/admin/api.ts pattern.
EOF
)"
```

---

## Task 4: Review submission/edit modal

**Files:**
- Create: `components/reviews/ReviewFormModal.tsx`

**Interfaces:**
- Consumes: `StarRatingInput` (Task 3), `Textarea` (Task 3), `submitReview`/`updateReview` (Task 3), `Button` from `components/ui/button.tsx`.
- Produces: `ReviewFormModal({ open, onOpenChange, mode, experienceTitle, bookingId?, reviewId?, initialRating?, initialReviewText?, onSaved })` — used by Task 5.

- [ ] **Step 1: Create the modal**

Create `components/reviews/ReviewFormModal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRatingInput } from "@/components/ui/star-rating";
import { submitReview, updateReview } from "@/lib/reviews/api";

const REVIEW_TEXT_MAX = 500;

export type ReviewFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  experienceTitle: string;
  bookingId?: string;
  reviewId?: string;
  initialRating?: number;
  initialReviewText?: string | null;
  onSaved: (result: { rating: number; reviewText: string }) => void;
};

export function ReviewFormModal({
  open,
  onOpenChange,
  mode,
  experienceTitle,
  bookingId,
  reviewId,
  initialRating = 0,
  initialReviewText,
  onSaved,
}: ReviewFormModalProps) {
  const [mounted, setMounted] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [reviewText, setReviewText] = useState(initialReviewText ?? "");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setRating(initialRating);
    setReviewText(initialReviewText ?? "");
    setStatus("idle");
    setErrorMessage(null);
  }, [open, initialRating, initialReviewText]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open || !mounted) return null;

  async function handleSubmit() {
    if (rating < 1 || rating > 5) return;
    setStatus("submitting");
    setErrorMessage(null);
    try {
      if (mode === "create") {
        if (!bookingId) throw new Error("Missing booking reference.");
        await submitReview({ bookingId, rating, reviewText });
      } else {
        if (!reviewId) throw new Error("Missing review reference.");
        await updateReview({ reviewId, rating, reviewText });
      }
      setStatus("success");
      onSaved({ rating, reviewText });
      setTimeout(() => onOpenChange(false), 1200);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close review form"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="relative z-[101] flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:rounded-3xl"
      >
        <div className="bg-zinc-950 px-5 pb-5 pt-6 text-white sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
                {mode === "create" ? "Leave a review" : "Edit your review"}
              </p>
              <h2 id="review-modal-title" className="mt-1 truncate text-xl font-bold">
                {experienceTitle}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-white/15 p-2 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-6">
          {status === "success" ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-base font-semibold text-foreground">Thanks for sharing!</p>
              <p className="text-sm text-muted-foreground">Your review helps other travelers decide.</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-semibold text-foreground">Your rating</p>
                <div className="mt-2">
                  <StarRatingInput value={rating} onChange={setRating} disabled={status === "submitting"} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="review-text" className="text-sm font-semibold text-foreground">
                    Your review <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {reviewText.length}/{REVIEW_TEXT_MAX}
                  </span>
                </div>
                <Textarea
                  id="review-text"
                  value={reviewText}
                  maxLength={REVIEW_TEXT_MAX}
                  disabled={status === "submitting"}
                  onChange={(event) => setReviewText(event.target.value)}
                  placeholder="What stood out about this experience?"
                  className="mt-2 min-h-28"
                />
              </div>

              {errorMessage ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}

              <Button
                type="button"
                className="w-full rounded-full bg-orange-500 text-white hover:bg-orange-600"
                disabled={rating < 1 || status === "submitting"}
                onClick={() => void handleSubmit()}
              >
                {status === "submitting" ? "Submitting..." : mode === "create" ? "Submit review" : "Save changes"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/reviews/ReviewFormModal.tsx
git commit -m "$(cat <<'EOF'
Add ReviewFormModal for creating and editing reviews

Star input + 500-char-limited textarea + loading/success/error states,
following the existing createPortal modal pattern from
ExperienceTicketModal.
EOF
)"
```

---

## Task 5: Wire the review flow into the Account > Applied (Sent) tab

**Files:**
- Modify: `app/account/applied/page.tsx`

**Interfaces:**
- Consumes: `get_account_applications` (extended, Task 1/2), `ReviewFormModal` (Task 4).

- [ ] **Step 1: Extend the `ApplicationRow` type and imports**

In `app/account/applied/page.tsx`, replace:

```ts
type ApplicationRow = {
  id: string;
  booked_at: string;
  status: string;
  guests_count: number;
  availability_id: string | null;
  host_note: string | null;
  experience_id: string | null;
  experience_title: string | null;
  slot_starts_at: string | null;
  slot_ends_at: string | null;
};
```

with:

```ts
type ApplicationRow = {
  id: string;
  booked_at: string;
  status: string;
  guests_count: number;
  availability_id: string | null;
  host_note: string | null;
  experience_id: string | null;
  experience_title: string | null;
  slot_starts_at: string | null;
  slot_ends_at: string | null;
  is_review_eligible: boolean;
  has_review: boolean;
  review_id: string | null;
  review_rating: number | null;
};
```

Add the modal import alongside the existing imports:

```ts
import { ReviewFormModal } from "@/components/reviews/ReviewFormModal";
```

- [ ] **Step 2: Carry the new fields into `rows` and add modal state**

Replace the `rows` useMemo body:

```ts
  const rows = useMemo(() => {
    return applications.slice(0, 50).map((application) => ({
      id: application.id,
      title: application.experience_title ?? "Untitled experience",
      status: application.status.replaceAll("_", " "),
      guestsCount: application.guests_count,
      createdAt: new Date(application.booked_at).toLocaleDateString(),
      startsAt: application.slot_starts_at ?? null,
      endsAt: application.slot_ends_at ?? null,
      hostNote: application.host_note,
    }));
  }, [applications]);
```

with:

```ts
  const rows = useMemo(() => {
    return applications.slice(0, 50).map((application) => ({
      id: application.id,
      title: application.experience_title ?? "Untitled experience",
      status: application.status.replaceAll("_", " "),
      guestsCount: application.guests_count,
      createdAt: new Date(application.booked_at).toLocaleDateString(),
      startsAt: application.slot_starts_at ?? null,
      endsAt: application.slot_ends_at ?? null,
      hostNote: application.host_note,
      isReviewEligible: application.is_review_eligible,
      hasReview: application.has_review,
      reviewId: application.review_id,
      reviewRating: application.review_rating,
    }));
  }, [applications]);
```

Add modal state right after the existing `actionMessage` state:

```ts
  const [reviewTarget, setReviewTarget] = useState<
    | { mode: "create"; bookingId: string; experienceTitle: string }
    | { mode: "edit"; reviewId: string; experienceTitle: string; initialRating: number }
    | null
  >(null);
```

- [ ] **Step 3: Add the desktop action column for the Sent view**

Replace the header row (the block containing `<span>Experience</span> ... {activeView === "incoming" ? <span>Action</span> : null}`):

```tsx
                <div
                  className={cn(
                    "grid items-center rounded-xl bg-background px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                    activeView === "incoming"
                      ? "grid-cols-[2fr_0.7fr_0.9fr_1.5fr_0.8fr_1.2fr]"
                      : "grid-cols-[2fr_0.7fr_0.9fr_1.5fr_0.8fr]",
                  )}
                >
                  <span>Experience</span>
                  <span>Guests</span>
                  <span>Requested</span>
                  <span>Slot</span>
                  <span>Status</span>
                  {activeView === "incoming" ? <span>Action</span> : null}
                </div>
```

with:

```tsx
                <div className="grid grid-cols-[2fr_0.7fr_0.9fr_1.5fr_0.8fr_1.2fr] items-center rounded-xl bg-background px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Experience</span>
                  <span>Guests</span>
                  <span>Requested</span>
                  <span>Slot</span>
                  <span>Status</span>
                  <span>{activeView === "incoming" ? "Action" : "Review"}</span>
                </div>
```

Then replace the row template's grid className and its trailing action block. Find:

```tsx
                      <div
                        key={r.id}
                        className={cn(
                          "grid items-center rounded-xl border border-border/70 bg-background px-4 py-3 shadow-sm transition hover:border-orange-200 hover:shadow",
                          activeView === "incoming"
                            ? "grid-cols-[2fr_0.7fr_0.9fr_1.5fr_0.8fr_1.2fr]"
                            : "grid-cols-[2fr_0.7fr_0.9fr_1.5fr_0.8fr]",
                        )}
                      >
```

Replace with:

```tsx
                      <div
                        key={r.id}
                        className="grid grid-cols-[2fr_0.7fr_0.9fr_1.5fr_0.8fr_1.2fr] items-center rounded-xl border border-border/70 bg-background px-4 py-3 shadow-sm transition hover:border-orange-200 hover:shadow"
                      >
```

Then find the trailing conditional block right after the status `<span>`:

```tsx
                        {activeView === "incoming" ? (
                          <div className="flex items-center justify-end gap-2">
                            {r.status === "requested" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={updatingBookingId === r.id}
                                  onClick={() => updateBookingStatus(r.id, "confirmed")}
                                  className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={updatingBookingId === r.id}
                                  onClick={() => updateBookingStatus(r.id, "cancelled_by_host")}
                                  className="rounded-full bg-zinc-700 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                                >
                                  Decline
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                {r.hostNote || "No action required"}
                              </span>
                            )}
                          </div>
                        ) : null}
```

Replace with:

```tsx
                        {activeView === "incoming" ? (
                          <div className="flex items-center justify-end gap-2">
                            {r.status === "requested" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={updatingBookingId === r.id}
                                  onClick={() => updateBookingStatus(r.id, "confirmed")}
                                  className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={updatingBookingId === r.id}
                                  onClick={() => updateBookingStatus(r.id, "cancelled_by_host")}
                                  className="rounded-full bg-zinc-700 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                                >
                                  Decline
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                {r.hostNote || "No action required"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            {r.hasReview ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setReviewTarget({
                                    mode: "edit",
                                    reviewId: r.reviewId!,
                                    experienceTitle: r.title,
                                    initialRating: r.reviewRating ?? 0,
                                  })
                                }
                                className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-foreground transition hover:border-orange-300 hover:text-orange-600"
                              >
                                Edit review ({r.reviewRating}★)
                              </button>
                            ) : r.isReviewEligible ? (
                              <button
                                type="button"
                                onClick={() => setReviewTarget({ mode: "create", bookingId: r.id, experienceTitle: r.title })}
                                className="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-orange-600"
                              >
                                Leave a review
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </div>
                        )}
```

- [ ] **Step 4: Add the mobile card action for the Sent view**

Find the mobile card's action block:

```tsx
                      {activeView === "incoming" && r.status === "requested" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={updatingBookingId === r.id}
                            onClick={() => updateBookingStatus(r.id, "confirmed")}
                            className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={updatingBookingId === r.id}
                            onClick={() => updateBookingStatus(r.id, "cancelled_by_host")}
                            className="rounded-full bg-zinc-700 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      ) : null}
```

Replace with:

```tsx
                      {activeView === "incoming" && r.status === "requested" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={updatingBookingId === r.id}
                            onClick={() => updateBookingStatus(r.id, "confirmed")}
                            className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={updatingBookingId === r.id}
                            onClick={() => updateBookingStatus(r.id, "cancelled_by_host")}
                            className="rounded-full bg-zinc-700 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      ) : activeView === "sent" && r.hasReview ? (
                        <button
                          type="button"
                          onClick={() =>
                            setReviewTarget({
                              mode: "edit",
                              reviewId: r.reviewId!,
                              experienceTitle: r.title,
                              initialRating: r.reviewRating ?? 0,
                            })
                          }
                          className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-foreground"
                        >
                          Edit review ({r.reviewRating}★)
                        </button>
                      ) : activeView === "sent" && r.isReviewEligible ? (
                        <button
                          type="button"
                          onClick={() => setReviewTarget({ mode: "create", bookingId: r.id, experienceTitle: r.title })}
                          className="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-semibold text-white"
                        >
                          Leave a review
                        </button>
                      ) : null}
```

- [ ] **Step 5: Render the modal**

Find the closing of the component's root `<div>` (the final `</div>` right before `);` at the end of the returned JSX) and add the modal render just before it, i.e. replace:

```tsx
        </Card>
      </div>
    </div>
  );
}
```

with:

```tsx
        </Card>
      </div>

      {reviewTarget ? (
        <ReviewFormModal
          open={Boolean(reviewTarget)}
          onOpenChange={(next) => {
            if (!next) setReviewTarget(null);
          }}
          mode={reviewTarget.mode}
          experienceTitle={reviewTarget.experienceTitle}
          bookingId={reviewTarget.mode === "create" ? reviewTarget.bookingId : undefined}
          reviewId={reviewTarget.mode === "edit" ? reviewTarget.reviewId : undefined}
          initialRating={reviewTarget.mode === "edit" ? reviewTarget.initialRating : undefined}
          onSaved={() => {
            void loadApplications();
          }}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```
Expected: no new errors.

- [ ] **Step 7: Manual verification**

Run `npm run dev`, sign in as a traveler with at least one booking, and check `/account/applied?view=sent`:
- A booking whose slot has ended and is `confirmed`/`completed` with no review shows "Leave a review"; clicking opens the modal, submitting a rating updates the row to "Edit review (N★)" without a page reload.
- A booking not yet past its slot, or still `requested`, shows `—` in the Review column.
- Editing an existing review pre-fills the star rating and text, and saving updates the displayed rating.
- Confirm the "Incoming" tab is visually unchanged (still 6 columns, Approve/Decline intact).
- Resize to a mobile width and confirm the same three states render correctly in the card layout.

- [ ] **Step 8: Commit**

```bash
git add app/account/applied/page.tsx
git commit -m "$(cat <<'EOF'
Add review entry point to the Sent bookings tab

Completed, unreviewed bookings get a "Leave a review" CTA; reviewed
bookings show "Edit review" with the given rating. Uses the
review-eligibility columns added to get_account_applications.
EOF
)"
```

---

## Task 6: Experience detail page — real aggregate stats, published-only filter

**Files:**
- Modify: `app/(landing)/experiences/[experienceId]/page.tsx`

**Interfaces:**
- Consumes: `get_experience_review_stats` RPC (Task 1/2), `ExperienceReviewStats` type (Task 3).

- [ ] **Step 1: Add the stats import and state**

Add to the imports:

```ts
import type { ExperienceReviewStats } from "@/lib/reviews/api";
```

Add state alongside the existing `reviews` state:

```ts
  const [reviewStats, setReviewStats] = useState<ExperienceReviewStats | null>(null);
```

- [ ] **Step 2: Fetch stats alongside the existing parallel queries and filter reviews to published**

Replace:

```ts
        const [
          { data: locationData },
          { data: mediaRows },
          slots,
          { data: reviewRows },
          { data: hostData },
          { data: hostUserData },
        ] =
          await Promise.all([
            supabase
              .from("experience_locations")
              .select("city,country_region,street_address")
              .eq("experience_id", experienceId)
              .maybeSingle(),
            supabase
              .from("experience_media")
              .select("storage_path,alt_text,sort_order,media_type")
              .eq("experience_id", experienceId)
              .order("sort_order", { ascending: true }),
            loadUpcomingAvailability(),
            supabase
              .from("reviews")
              .select("id,reviewer_user_id,rating,review_text,created_at")
              .eq("experience_id", experienceId)
              .order("created_at", { ascending: false })
              .limit(6),
            supabase
              .from("host_profiles")
              .select("headline,expertise,highlight_story")
              .eq("user_id", experienceRow.host_user_id)
              .maybeSingle(),
            supabase
              .from("profiles")
              .select("user_id,first_name,last_name,avatar_path")
              .eq("user_id", experienceRow.host_user_id)
              .maybeSingle(),
          ]);
```

with:

```ts
        const [
          { data: locationData },
          { data: mediaRows },
          slots,
          { data: reviewRows },
          { data: hostData },
          { data: hostUserData },
          { data: statsData },
        ] =
          await Promise.all([
            supabase
              .from("experience_locations")
              .select("city,country_region,street_address")
              .eq("experience_id", experienceId)
              .maybeSingle(),
            supabase
              .from("experience_media")
              .select("storage_path,alt_text,sort_order,media_type")
              .eq("experience_id", experienceId)
              .order("sort_order", { ascending: true }),
            loadUpcomingAvailability(),
            supabase
              .from("reviews")
              .select("id,reviewer_user_id,rating,review_text,created_at")
              .eq("experience_id", experienceId)
              .eq("status", "published")
              .order("created_at", { ascending: false })
              .limit(6),
            supabase
              .from("host_profiles")
              .select("headline,expertise,highlight_story")
              .eq("user_id", experienceRow.host_user_id)
              .maybeSingle(),
            supabase
              .from("profiles")
              .select("user_id,first_name,last_name,avatar_path")
              .eq("user_id", experienceRow.host_user_id)
              .maybeSingle(),
            supabase.rpc("get_experience_review_stats", { p_experience_id: experienceId }),
          ]);
```

Then right after `setReviews(nextReviews);`, add:

```ts
        setReviewStats((statsData as ExperienceReviewStats | null) ?? null);
```

- [ ] **Step 3: Remove the client-computed rating summary and use the RPC result**

Delete this block entirely:

```ts
  const ratingSummary = useMemo(() => {
    if (!reviews.length) return { average: null, count: 0 };
    const total = reviews.reduce((acc, review) => acc + review.rating, 0);
    return {
      average: total / reviews.length,
      count: reviews.length,
    };
  }, [reviews]);
```

Then in the JSX, replace:

```tsx
              <ExperienceBookingPurchasePanel
                title={experience.title}
                subtitle={experience.subtitle}
                priceLabel={priceLabel}
                ratingAverage={ratingSummary.average}
                ratingCount={ratingSummary.count}
                shortDescription={shortDescription}
                locationLabel={locationLabel}
                durationLabel={durationLabel}
                maxGuestsLabel={maxGuestsLabel}
              />
```

with:

```tsx
              <ExperienceBookingPurchasePanel
                title={experience.title}
                subtitle={experience.subtitle}
                priceLabel={priceLabel}
                ratingAverage={reviewStats?.average ?? null}
                ratingCount={reviewStats?.count ?? 0}
                shortDescription={shortDescription}
                locationLabel={locationLabel}
                durationLabel={durationLabel}
                maxGuestsLabel={maxGuestsLabel}
              />
```

- [ ] **Step 4: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```
Expected: no new errors (in particular, no leftover reference to the removed `ratingSummary`).

- [ ] **Step 5: Manual verification**

`npm run dev`, open an experience with at least one review and one with zero reviews. Confirm: the rating badge near the price shows the same average/count as computed by `get_experience_review_stats` (cross-check with `psql` if needed); an experience with zero reviews shows no rating badge and the "No reviews yet..." empty state in the Reviews card; a review that's hidden via `admin_set_review_status` (test manually via psql or wait for Task 10's UI) disappears from both the list and the count.

- [ ] **Step 6: Commit**

```bash
git add "app/(landing)/experiences/[experienceId]/page.tsx"
git commit -m "$(cat <<'EOF'
Use get_experience_review_stats as the single source of truth on the
experience detail page

Replaces client-side average/count computed from a partial (limit 6)
fetch, and filters the review list to published only.
EOF
)"
```

---

## Task 7: Real host reputation on the `/experts` listing

**Files:**
- Modify: `lib/queries/experts.ts`
- Modify: `lib/queries/experts-server.ts`
- Modify: `app/(landing)/components/sections/AgentCard.tsx`
- Modify: `app/(landing)/components/sections/ExperienceHostGrid.tsx`
- Modify: `app/(landing)/components/sections/ExpertCard.tsx`

**Interfaces:**
- Consumes: `get_host_reputation_stats_bulk` RPC (Task 1/2).
- Produces: real `rating`/`reviewCount` on every `LocalExpert`/`Expert` object flowing into `AgentCard` and `ExpertCard`.

- [ ] **Step 1: Thread real reputation through `lib/queries/experts.ts`**

Replace the `mapHostToLocalExpert` signature and hardcoded fields:

```ts
export function mapHostToLocalExpert(
  hostId: string,
  host: HostProfileRow | undefined,
  profile: ProfileRow | undefined,
  experience: ExperienceRow | undefined,
  image: string,
): LocalExpert {
```

with:

```ts
export function mapHostToLocalExpert(
  hostId: string,
  host: HostProfileRow | undefined,
  profile: ProfileRow | undefined,
  experience: ExperienceRow | undefined,
  image: string,
  reputation?: { average_rating: number | null; review_count: number },
): LocalExpert {
```

Replace:

```ts
    rating: 5,
    reviewCount: 0,
```

with:

```ts
    rating: reputation?.average_rating ?? 0,
    reviewCount: reputation?.review_count ?? 0,
```

Then update `ExpertsQueryDeps` and `buildLandingExperts` to accept and thread the reputation map. Replace:

```ts
export type ExpertsQueryDeps = {
  hostRows: HostProfileRow[];
  profileRows: ProfileRow[];
  experienceRows: ExperienceRow[];
  mediaRows: MediaRow[];
  getAvatarUrl: (path: string) => string;
  getCoverByExperienceId: (experienceIds: string[]) => Record<string, { url: string }>;
};
```

with:

```ts
export type ExpertsQueryDeps = {
  hostRows: HostProfileRow[];
  profileRows: ProfileRow[];
  experienceRows: ExperienceRow[];
  mediaRows: MediaRow[];
  getAvatarUrl: (path: string) => string;
  getCoverByExperienceId: (experienceIds: string[]) => Record<string, { url: string }>;
  reputationByHost?: Record<string, { average_rating: number | null; review_count: number }>;
};
```

Replace:

```ts
export function buildLandingExperts({
  hostRows,
  profileRows,
  experienceRows,
  mediaRows,
  getAvatarUrl,
  getCoverByExperienceId,
}: ExpertsQueryDeps): LandingExpertsResult {
```

with:

```ts
export function buildLandingExperts({
  hostRows,
  profileRows,
  experienceRows,
  mediaRows,
  getAvatarUrl,
  getCoverByExperienceId,
  reputationByHost = {},
}: ExpertsQueryDeps): LandingExpertsResult {
```

And replace the final mapping call:

```ts
    const profile = profileByHost[host.user_id];
    return mapHostToLocalExpert(host.user_id, host, profile, experience, image);
  });
```

with:

```ts
    const profile = profileByHost[host.user_id];
    return mapHostToLocalExpert(host.user_id, host, profile, experience, image, reputationByHost[host.user_id]);
  });
```

- [ ] **Step 2: Fetch real reputation in `fetchLandingExpertsServer`**

In `lib/queries/experts-server.ts`, replace:

```ts
  return buildLandingExperts({
    hostRows: publishedHosts,
    profileRows: ((profileRows ?? []) as ProfileRow[]).filter((row) =>
      publishedHostIds.has(row.user_id),
    ),
    experienceRows: publishedExperiences,
    mediaRows: (mediaRows ?? []) as MediaRow[],
    getAvatarUrl: (path) => supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl,
    getCoverByExperienceId: (ids) =>
      Object.fromEntries(
        ids
          .filter((id) => coverByExperienceId[id])
          .map((id) => [id, { url: coverByExperienceId[id].url }]),
      ),
  });
}
```

with:

```ts
  const publishedHostIdList = publishedHosts.map((host) => host.user_id);
  const { data: reputationRows } = await supabase.rpc("get_host_reputation_stats_bulk", {
    p_host_user_ids: publishedHostIdList,
  });
  const reputationByHost = Object.fromEntries(
    ((reputationRows ?? []) as Array<{
      host_user_id: string;
      average_rating: number | null;
      review_count: number;
    }>).map((row) => [row.host_user_id, row]),
  );

  return buildLandingExperts({
    hostRows: publishedHosts,
    profileRows: ((profileRows ?? []) as ProfileRow[]).filter((row) =>
      publishedHostIds.has(row.user_id),
    ),
    experienceRows: publishedExperiences,
    mediaRows: (mediaRows ?? []) as MediaRow[],
    getAvatarUrl: (path) => supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl,
    getCoverByExperienceId: (ids) =>
      Object.fromEntries(
        ids
          .filter((id) => coverByExperienceId[id])
          .map((id) => [id, { url: coverByExperienceId[id].url }]),
      ),
    reputationByHost,
  });
}
```

- [ ] **Step 3: Show a real rating badge on `AgentCard`**

In `app/(landing)/components/sections/AgentCard.tsx`, add `Star` to the lucide import:

```ts
import { ArrowUpRight, BadgeCheck, Star } from "lucide-react";
```

Replace the "Verified" badge block:

```tsx
          <span className="absolute right-3 top-3 z-[2] inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
            <BadgeCheck className="size-3 text-orange-300" aria-hidden />
            Verified
          </span>
```

with:

```tsx
          <div className="absolute right-3 top-3 z-[2] flex flex-col items-end gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
              <BadgeCheck className="size-3 text-orange-300" aria-hidden />
              Verified
            </span>
            {agent.reviewCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
                <Star className="size-3 fill-orange-400 text-orange-400" aria-hidden />
                {agent.rating.toFixed(1)} ({agent.reviewCount})
              </span>
            ) : null}
          </div>
```

- [ ] **Step 4: Thread real reputation through `ExperienceHostGrid.tsx`**

Replace `mapToExpert`'s signature and hardcoded fields:

```ts
function mapToExpert(
  hostId: string,
  host: HostProfileRow | undefined,
  profile: ProfileRow | undefined,
  row: ExperienceRow | undefined,
  coverUrl: string,
): Expert {
```

with:

```ts
function mapToExpert(
  hostId: string,
  host: HostProfileRow | undefined,
  profile: ProfileRow | undefined,
  row: ExperienceRow | undefined,
  coverUrl: string,
  reputation: { average_rating: number | null; review_count: number } | undefined,
): Expert {
```

Replace:

```ts
    rating: 5,
    reviewCount: 0,
```

with:

```ts
    rating: reputation?.average_rating ?? 0,
    reviewCount: reputation?.review_count ?? 0,
```

Then in the `load()` function, after the `hostIds` are known and before building `nextExperts`, add the bulk fetch. Replace:

```ts
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("user_id,first_name,last_name,bio,city,country_code,avatar_path")
        .in("user_id", hostIds);

      if (!mounted) return;
```

with:

```ts
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("user_id,first_name,last_name,bio,city,country_code,avatar_path")
        .in("user_id", hostIds);

      const { data: reputationRows } = await supabase.rpc("get_host_reputation_stats_bulk", {
        p_host_user_ids: hostIds,
      });
      const reputationByHost = Object.fromEntries(
        ((reputationRows ?? []) as Array<{
          host_user_id: string;
          average_rating: number | null;
          review_count: number;
        }>).map((row) => [row.host_user_id, row]),
      );

      if (!mounted) return;
```

Then replace the final mapping call:

```ts
        const profile = profileByHost[host.user_id];
        return mapToExpert(host.user_id, host, profile, row, image);
      });
```

with:

```ts
        const profile = profileByHost[host.user_id];
        return mapToExpert(host.user_id, host, profile, row, image, reputationByHost[host.user_id]);
      });
```

- [ ] **Step 5: Only show the rating badge on `ExpertCard` when reviews exist**

In `app/(landing)/components/sections/ExpertCard.tsx`, replace:

```tsx
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow backdrop-blur-sm">
                <Star className="size-3.5 fill-amber-500 text-amber-500" aria-hidden />
                {expert.rating}
              </div>
```

with:

```tsx
              {expert.reviewCount > 0 ? (
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow backdrop-blur-sm">
                  <Star className="size-3.5 fill-orange-400 text-orange-400" aria-hidden />
                  {expert.rating.toFixed(1)}
                </div>
              ) : null}
```

- [ ] **Step 6: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```
Expected: no new errors.

- [ ] **Step 7: Manual verification**

`npm run dev`, visit `/experts` and confirm cards only show a rating badge for hosts with at least one published review, with the real average/count; visit the homepage "Meet our experts" section and confirm the same (no card shows a "5" badge with a host that has zero reviews).

- [ ] **Step 8: Commit**

```bash
git add lib/queries/experts.ts lib/queries/experts-server.ts \
  "app/(landing)/components/sections/AgentCard.tsx" \
  "app/(landing)/components/sections/ExperienceHostGrid.tsx" \
  "app/(landing)/components/sections/ExpertCard.tsx"
git commit -m "$(cat <<'EOF'
Replace hardcoded expert rating stub with real host reputation stats

mapHostToLocalExpert/mapToExpert no longer hardcode rating: 5,
reviewCount: 0 — both /experts and the homepage expert grid now show a
rating badge only when the host has real published reviews.
EOF
)"
```

---

## Task 8: Host detail page — real reputation stats and per-experience ratings

**Files:**
- Modify: `app/(landing)/hosts/[hostId]/page.tsx`
- Modify: `app/(landing)/components/HostProfilePortfolio.tsx`

**Interfaces:**
- Consumes: `get_host_reputation_stats`, `get_experience_review_stats_bulk` RPCs (Task 1/2).

- [ ] **Step 1: Fetch reputation and per-experience stats in the host page**

In `app/(landing)/hosts/[hostId]/page.tsx`, add state alongside the existing ones:

```ts
  const [reputation, setReputation] = useState<{
    average_rating: number | null;
    review_count: number;
    completed_bookings_count: number;
    travelers_hosted_count: number;
  } | null>(null);
  const [reviewStatsByExperienceId, setReviewStatsByExperienceId] = useState<
    Record<string, { average: number | null; review_count: number }>
  >({});
```

In the `load()` function, after `setCoverByExperienceId(...)` and before `setLoading(false);`, add:

```ts
      const [{ data: reputationData }, { data: expStatsRows }] = await Promise.all([
        supabase.rpc("get_host_reputation_stats", { p_host_user_id: hostId }),
        ids.length > 0
          ? supabase.rpc("get_experience_review_stats_bulk", { p_experience_ids: ids })
          : Promise.resolve({ data: [] }),
      ]);

      if (!mounted) return;

      setReputation(
        (reputationData as {
          average_rating: number | null;
          review_count: number;
          completed_bookings_count: number;
          travelers_hosted_count: number;
        } | null) ?? {
          average_rating: null,
          review_count: 0,
          completed_bookings_count: 0,
          travelers_hosted_count: 0,
        },
      );
      setReviewStatsByExperienceId(
        Object.fromEntries(
          ((expStatsRows ?? []) as Array<{
            experience_id: string;
            average: number | null;
            review_count: number;
          }>).map((row) => [row.experience_id, row]),
        ),
      );
```

- [ ] **Step 2: Pass real stats into `portfolioExperiences` and the new `reputation` prop**

Replace:

```ts
  const portfolioExperiences = experiences.map((exp) => ({
    id: exp.id,
    title: exp.title,
    subtitle: exp.subtitle,
    description: exp.description,
    price_amount: exp.price_amount,
    currency: exp.currency,
    duration_minutes: exp.duration_minutes,
    max_guests: exp.max_guests,
    category: pickCategory(exp),
    location: locationLabel(exp),
    coverMedia: coverByExperienceId[exp.id],
  }));
```

with:

```ts
  const portfolioExperiences = experiences.map((exp) => {
    const stats = reviewStatsByExperienceId[exp.id];
    return {
      id: exp.id,
      title: exp.title,
      subtitle: exp.subtitle,
      description: exp.description,
      price_amount: exp.price_amount,
      currency: exp.currency,
      duration_minutes: exp.duration_minutes,
      max_guests: exp.max_guests,
      category: pickCategory(exp),
      location: locationLabel(exp),
      coverMedia: coverByExperienceId[exp.id],
      rating: stats?.average ?? null,
      reviewCount: stats?.review_count ?? 0,
    };
  });
```

Replace the `<HostProfilePortfolio ...>` call:

```tsx
      <HostProfilePortfolio
        profileName={profileName}
        headline={headline}
        aboutText={aboutText}
        expertiseText={expertiseText}
        careerHighlight={careerHighlight}
        highlightStory={highlightStory}
        primaryLocation={primaryLocation}
        yearsExperience={yearsExperience}
        isVerified={isVerified}
        avatarUrl={avatarUrl}
        bannerImage={bannerImage}
        experiences={portfolioExperiences}
        focusAreas={focusAreas}
        socialLinks={safeSocialLinks}
      />
```

with:

```tsx
      <HostProfilePortfolio
        profileName={profileName}
        headline={headline}
        aboutText={aboutText}
        expertiseText={expertiseText}
        careerHighlight={careerHighlight}
        highlightStory={highlightStory}
        primaryLocation={primaryLocation}
        yearsExperience={yearsExperience}
        isVerified={isVerified}
        avatarUrl={avatarUrl}
        bannerImage={bannerImage}
        experiences={portfolioExperiences}
        focusAreas={focusAreas}
        socialLinks={safeSocialLinks}
        reputation={
          reputation ?? {
            average_rating: null,
            review_count: 0,
            completed_bookings_count: 0,
            travelers_hosted_count: 0,
          }
        }
      />
```

- [ ] **Step 3: Extend `HostProfilePortfolio`'s types and props**

In `app/(landing)/components/HostProfilePortfolio.tsx`, replace:

```ts
export type HostPortfolioExperience = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price_amount: number | null;
  currency: string;
  duration_minutes: number | null;
  max_guests: number | null;
  category: string | null;
  location: string;
  coverMedia?: ExperienceMediaItem;
};
```

with:

```ts
export type HostPortfolioExperience = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price_amount: number | null;
  currency: string;
  duration_minutes: number | null;
  max_guests: number | null;
  category: string | null;
  location: string;
  coverMedia?: ExperienceMediaItem;
  rating?: number | null;
  reviewCount?: number | null;
};

export type HostReputation = {
  average_rating: number | null;
  review_count: number;
  completed_bookings_count: number;
  travelers_hosted_count: number;
};
```

Replace:

```ts
export type HostPortfolioProps = {
  profileName: string;
  headline: string;
  aboutText: string;
  expertiseText?: string | null;
  careerHighlight?: string | null;
  highlightStory?: string | null;
  primaryLocation: string;
  yearsExperience: number | null;
  isVerified: boolean;
  avatarUrl: string | null;
  bannerImage: string;
  experiences: HostPortfolioExperience[];
  focusAreas: string[];
  socialLinks: Array<{ id: string; url: string; label: string }>;
};
```

with:

```ts
export type HostPortfolioProps = {
  profileName: string;
  headline: string;
  aboutText: string;
  expertiseText?: string | null;
  careerHighlight?: string | null;
  highlightStory?: string | null;
  primaryLocation: string;
  yearsExperience: number | null;
  isVerified: boolean;
  avatarUrl: string | null;
  bannerImage: string;
  experiences: HostPortfolioExperience[];
  focusAreas: string[];
  socialLinks: Array<{ id: string; url: string; label: string }>;
  reputation: HostReputation;
};
```

Add `reputation` to the destructured function params:

```ts
export function HostProfilePortfolio({
  profileName,
  headline,
  aboutText,
  expertiseText,
  careerHighlight,
  highlightStory,
  primaryLocation,
  yearsExperience,
  isVerified,
  avatarUrl,
  bannerImage,
  experiences,
  focusAreas,
  socialLinks,
  reputation,
}: HostPortfolioProps) {
```

- [ ] **Step 4: Replace fabricated stat formulas with real numbers**

Delete:

```ts
  const clientsStat = experiences.length > 0 ? `${experiences.length * 12}+` : "10+";
  const projectsStat = experiences.length > 0 ? `${experiences.length * 40}+` : "25+";
```

Replace:

```tsx
              <StatBlock
                value={yearsExperience ? String(yearsExperience) : "5+"}
                label="Years of experience"
              />
              <StatBlock value={clientsStat} label="Travelers hosted" />
              <StatBlock value={projectsStat} label="Experiences delivered" />
```

with:

```tsx
              <StatBlock
                value={yearsExperience ? String(yearsExperience) : "—"}
                label="Years of experience"
              />
              <StatBlock value={String(reputation.travelers_hosted_count)} label="Travelers hosted" />
              <StatBlock value={String(reputation.completed_bookings_count)} label="Experiences delivered" />
```

- [ ] **Step 5: Replace the unconditional "Top-rated sessions" tile with a real-or-honest one**

Replace:

```tsx
              <FeatureTile
                icon={Star}
                title="Top-rated sessions"
                description="Consistently high ratings from guests who book direct on the platform."
              />
```

with:

```tsx
              {reputation.review_count > 0 && reputation.average_rating !== null ? (
                <FeatureTile
                  icon={Star}
                  title={`${reputation.average_rating.toFixed(1)}★ average rating`}
                  description={`Based on ${reputation.review_count} traveler review${reputation.review_count === 1 ? "" : "s"}.`}
                />
              ) : (
                <FeatureTile
                  icon={Sparkles}
                  title="New on Gozuru"
                  description="This host is just getting started — be one of the first to leave a review."
                />
              )}
```

`Sparkles` is already imported at the top of this file (used in the hero section) — no import change needed.

- [ ] **Step 6: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```
Expected: no new errors, no leftover references to `clientsStat`/`projectsStat`.

- [ ] **Step 7: Manual verification**

`npm run dev`, visit a host's `/hosts/[hostId]` page. Confirm: "Travelers hosted" and "Experiences delivered" show real integers (cross-check against `get_host_reputation_stats` via psql for that host); the rating tile shows either the real average+count or the honest "New on Gozuru" copy, never a static "Top-rated" claim with no data behind it; the portfolio's `ExperienceOfferCard`s show a real rating badge where the experience has reviews, and fall back to the hours display otherwise (unchanged prior behavior for zero-review experiences).

- [ ] **Step 8: Commit**

```bash
git add "app/(landing)/hosts/[hostId]/page.tsx" "app/(landing)/components/HostProfilePortfolio.tsx"
git commit -m "$(cat <<'EOF'
Replace fabricated host stats with real reputation data

"Travelers hosted" and "Experiences delivered" now come from
get_host_reputation_stats instead of experienceCount * 12 / * 40; the
static "Top-rated sessions" claim is replaced with the real rating (or
an honest "New on Gozuru" state when there are no reviews yet).
EOF
)"
```

---

## Task 9: Experience cards — real ratings from bulk stats

**Files:**
- Modify: `lib/queries/experiences.ts`
- Modify: `lib/queries/experiences-server.ts`
- Modify: `app/(landing)/components/sections/ExperienceCard.tsx`
- Modify: `app/(landing)/components/sections/FeaturedExperiences.tsx`
- Modify: `app/(landing)/components/sections/ExperiencesSection.tsx`
- Modify: `app/(landing)/components/sections/FeaturedExperiencesShowcase.tsx`

**Interfaces:**
- Consumes: `get_experience_review_stats_bulk` RPC (Task 1/2).
- Produces: `rating`/`reviewCount` on `ExperienceCardData`, populated on every card render path.

- [ ] **Step 1: Add review stats to `LandingExperiencesResult` in `lib/queries/experiences.ts`**

Replace:

```ts
export type LandingExperiencesResult = {
  experiences: ExperienceRow[];
  coverByExperienceId: Record<string, ExperienceMediaItem>;
  locationByExperienceId: Record<string, string>;
};
```

with:

```ts
export type ExperienceReviewSummary = { average: number | null; count: number };

export type LandingExperiencesResult = {
  experiences: ExperienceRow[];
  coverByExperienceId: Record<string, ExperienceMediaItem>;
  locationByExperienceId: Record<string, string>;
  reviewStatsByExperienceId: Record<string, ExperienceReviewSummary>;
};
```

Replace the empty-result early return:

```ts
  if (experienceRows.length === 0) {
    return {
      experiences: [],
      coverByExperienceId: {} as Record<string, ExperienceMediaItem>,
      locationByExperienceId: {} as Record<string, string>,
    };
  }
```

with:

```ts
  if (experienceRows.length === 0) {
    return {
      experiences: [],
      coverByExperienceId: {} as Record<string, ExperienceMediaItem>,
      locationByExperienceId: {} as Record<string, string>,
      reviewStatsByExperienceId: {},
    };
  }
```

Replace the final query + return block:

```ts
  const ids = experienceRows.map((row) => row.id);
  const [{ data: mediaRows }, { data: locationRows }] = await Promise.all([
    supabase
      .from("experience_media")
      .select("experience_id,storage_path,sort_order,media_type")
      .in("experience_id", ids)
      .order("sort_order", { ascending: true }),
    supabase
      .from("experience_locations")
      .select("experience_id,city,country_region")
      .in("experience_id", ids),
  ]);

  const coverByExperienceId = buildCoverByExperienceId(
    supabase,
    (mediaRows ?? []) as ExperienceMediaRowInput[],
    transform,
  );

  const locationByExperienceId: Record<string, string> = {};
  for (const location of (locationRows ?? []) as ExperienceLocationRow[]) {
    if (location.city && location.country_region) {
      locationByExperienceId[location.experience_id] = `${location.city}, ${location.country_region}`;
    } else if (location.city) {
      locationByExperienceId[location.experience_id] = location.city;
    } else if (location.country_region) {
      locationByExperienceId[location.experience_id] = location.country_region;
    }
  }

  return {
    experiences: experienceRows,
    coverByExperienceId,
    locationByExperienceId,
  };
}
```

with:

```ts
  const ids = experienceRows.map((row) => row.id);
  const [{ data: mediaRows }, { data: locationRows }, { data: statsRows }] = await Promise.all([
    supabase
      .from("experience_media")
      .select("experience_id,storage_path,sort_order,media_type")
      .in("experience_id", ids)
      .order("sort_order", { ascending: true }),
    supabase
      .from("experience_locations")
      .select("experience_id,city,country_region")
      .in("experience_id", ids),
    supabase.rpc("get_experience_review_stats_bulk", { p_experience_ids: ids }),
  ]);

  const coverByExperienceId = buildCoverByExperienceId(
    supabase,
    (mediaRows ?? []) as ExperienceMediaRowInput[],
    transform,
  );

  const locationByExperienceId: Record<string, string> = {};
  for (const location of (locationRows ?? []) as ExperienceLocationRow[]) {
    if (location.city && location.country_region) {
      locationByExperienceId[location.experience_id] = `${location.city}, ${location.country_region}`;
    } else if (location.city) {
      locationByExperienceId[location.experience_id] = location.city;
    } else if (location.country_region) {
      locationByExperienceId[location.experience_id] = location.country_region;
    }
  }

  const reviewStatsByExperienceId: Record<string, ExperienceReviewSummary> = {};
  for (const row of (statsRows ?? []) as Array<{ experience_id: string; average: number | null; review_count: number }>) {
    reviewStatsByExperienceId[row.experience_id] = { average: row.average, count: row.review_count };
  }

  return {
    experiences: experienceRows,
    coverByExperienceId,
    locationByExperienceId,
    reviewStatsByExperienceId,
  };
}
```

- [ ] **Step 2: Apply the identical change to `lib/queries/experiences-server.ts`**

Replace the empty-result early return:

```ts
  if (experienceRows.length === 0) {
    return {
      experiences: [],
      coverByExperienceId: {},
      locationByExperienceId: {},
    };
  }
```

with:

```ts
  if (experienceRows.length === 0) {
    return {
      experiences: [],
      coverByExperienceId: {},
      locationByExperienceId: {},
      reviewStatsByExperienceId: {},
    };
  }
```

Replace the final query + return block:

```ts
  const ids = experienceRows.map((row) => row.id);

  const [{ data: mediaRows }, { data: locationRows }] = await Promise.all([
    supabase
      .from("experience_media")
      .select("experience_id,storage_path,sort_order,media_type")
      .in("experience_id", ids)
      .order("sort_order", { ascending: true }),
    supabase
      .from("experience_locations")
      .select("experience_id,city,country_region")
      .in("experience_id", ids),
  ]);

  const coverByExperienceId = buildCoverByExperienceId(
    supabase,
    (mediaRows ?? []) as ExperienceMediaRowInput[],
    transform,
  );

  const locationByExperienceId: Record<string, string> = {};
  for (const location of (locationRows ?? []) as ExperienceLocationRow[]) {
    if (location.city && location.country_region) {
      locationByExperienceId[location.experience_id] = `${location.city}, ${location.country_region}`;
    } else if (location.city) {
      locationByExperienceId[location.experience_id] = location.city;
    } else if (location.country_region) {
      locationByExperienceId[location.experience_id] = location.country_region;
    }
  }

  return {
    experiences: experienceRows,
    coverByExperienceId,
    locationByExperienceId,
  };
}
```

with:

```ts
  const ids = experienceRows.map((row) => row.id);

  const [{ data: mediaRows }, { data: locationRows }, { data: statsRows }] = await Promise.all([
    supabase
      .from("experience_media")
      .select("experience_id,storage_path,sort_order,media_type")
      .in("experience_id", ids)
      .order("sort_order", { ascending: true }),
    supabase
      .from("experience_locations")
      .select("experience_id,city,country_region")
      .in("experience_id", ids),
    supabase.rpc("get_experience_review_stats_bulk", { p_experience_ids: ids }),
  ]);

  const coverByExperienceId = buildCoverByExperienceId(
    supabase,
    (mediaRows ?? []) as ExperienceMediaRowInput[],
    transform,
  );

  const locationByExperienceId: Record<string, string> = {};
  for (const location of (locationRows ?? []) as ExperienceLocationRow[]) {
    if (location.city && location.country_region) {
      locationByExperienceId[location.experience_id] = `${location.city}, ${location.country_region}`;
    } else if (location.city) {
      locationByExperienceId[location.experience_id] = location.city;
    } else if (location.country_region) {
      locationByExperienceId[location.experience_id] = location.country_region;
    }
  }

  const reviewStatsByExperienceId: Record<string, { average: number | null; count: number }> = {};
  for (const row of (statsRows ?? []) as Array<{ experience_id: string; average: number | null; review_count: number }>) {
    reviewStatsByExperienceId[row.experience_id] = { average: row.average, count: row.review_count };
  }

  return {
    experiences: experienceRows,
    coverByExperienceId,
    locationByExperienceId,
    reviewStatsByExperienceId,
  };
}
```

- [ ] **Step 3: Add rating fields to `ExperienceCardData` and render them**

In `app/(landing)/components/sections/ExperienceCard.tsx`, add `Star` to the import:

```ts
import { Clock, MapPin, Star, Users } from "lucide-react";
```

Replace `mapExperienceToCardData`'s signature and body:

```ts
export function mapExperienceToCardData(
  exp: {
    id: string;
    title: string;
    subtitle: string | null;
    duration_minutes: number | null;
    max_guests: number | null;
    price_amount: number | null;
    currency: string;
    meeting_point_name: string | null;
    categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
  },
  locationByExperienceId: Record<string, string>,
  coverByExperienceId: Record<string, ExperienceMediaItem | undefined>,
  pickCategory: (categories: typeof exp.categories) => { name: string; slug: string } | null,
): ExperienceCardData {
  const category = pickCategory(exp.categories);
  const durationHours = exp.duration_minutes
    ? Math.max(1, Math.round(exp.duration_minutes / 60))
    : null;
  const priceLabel =
    exp.price_amount && Number(exp.price_amount) > 0
      ? formatDisplayMoney(Number(exp.price_amount), exp.currency)
      : "Price on request";
  const location =
    locationByExperienceId[exp.id] ||
    exp.meeting_point_name ||
    "Location shared after booking";
  const expert = exp.subtitle?.split(" led by ").at(1)?.trim() || "Local Host";

  return {
    id: exp.id,
    title: exp.title,
    location,
    expert,
    priceLabel,
    durationHours,
    maxGuests: exp.max_guests,
    category: category?.name || "Experience",
    coverMedia: coverByExperienceId[exp.id],
  };
}

export type ExperienceCardData = {
  id: string;
  title: string;
  location: string;
  expert: string;
  priceLabel: string;
  durationHours: number | null;
  maxGuests?: number | null;
  category: string;
  coverMedia?: ExperienceMediaItem;
};
```

with:

```ts
export function mapExperienceToCardData(
  exp: {
    id: string;
    title: string;
    subtitle: string | null;
    duration_minutes: number | null;
    max_guests: number | null;
    price_amount: number | null;
    currency: string;
    meeting_point_name: string | null;
    categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
  },
  locationByExperienceId: Record<string, string>,
  coverByExperienceId: Record<string, ExperienceMediaItem | undefined>,
  pickCategory: (categories: typeof exp.categories) => { name: string; slug: string } | null,
  reviewStatsByExperienceId: Record<string, { average: number | null; count: number }> = {},
): ExperienceCardData {
  const category = pickCategory(exp.categories);
  const durationHours = exp.duration_minutes
    ? Math.max(1, Math.round(exp.duration_minutes / 60))
    : null;
  const priceLabel =
    exp.price_amount && Number(exp.price_amount) > 0
      ? formatDisplayMoney(Number(exp.price_amount), exp.currency)
      : "Price on request";
  const location =
    locationByExperienceId[exp.id] ||
    exp.meeting_point_name ||
    "Location shared after booking";
  const expert = exp.subtitle?.split(" led by ").at(1)?.trim() || "Local Host";
  const stats = reviewStatsByExperienceId[exp.id];

  return {
    id: exp.id,
    title: exp.title,
    location,
    expert,
    priceLabel,
    durationHours,
    maxGuests: exp.max_guests,
    category: category?.name || "Experience",
    coverMedia: coverByExperienceId[exp.id],
    rating: stats?.average ?? null,
    reviewCount: stats?.count ?? 0,
  };
}

export type ExperienceCardData = {
  id: string;
  title: string;
  location: string;
  expert: string;
  priceLabel: string;
  durationHours: number | null;
  maxGuests?: number | null;
  category: string;
  coverMedia?: ExperienceMediaItem;
  rating: number | null;
  reviewCount: number;
};
```

Then add the rating line in the card JSX. Replace:

```tsx
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {experience.location}
        </p>
```

with:

```tsx
        {experience.reviewCount > 0 && experience.rating !== null ? (
          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-foreground">
            <Star className="size-3.5 fill-orange-400 text-orange-400" aria-hidden />
            {experience.rating.toFixed(1)}
            <span className="font-normal text-muted-foreground">({experience.reviewCount})</span>
          </p>
        ) : null}

        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {experience.location}
        </p>
```

- [ ] **Step 4: Pass `reviewStatsByExperienceId` at every call site**

In `app/(landing)/components/sections/FeaturedExperiences.tsx`, replace:

```ts
  const cards = useMemo(
    () =>
      experiences.map((exp) =>
        mapExperienceToCardData(
          exp,
          locationByExperienceId,
          coverByExperienceId,
          pickExperienceCategory,
        ),
      ),
    [coverByExperienceId, experiences, locationByExperienceId],
  );
```

with:

```ts
  const reviewStatsByExperienceId = initialData.reviewStatsByExperienceId;

  const cards = useMemo(
    () =>
      experiences.map((exp) =>
        mapExperienceToCardData(
          exp,
          locationByExperienceId,
          coverByExperienceId,
          pickExperienceCategory,
          reviewStatsByExperienceId,
        ),
      ),
    [coverByExperienceId, experiences, locationByExperienceId, reviewStatsByExperienceId],
  );
```

In `app/(landing)/components/sections/ExperiencesSection.tsx`, replace:

```ts
  const experiences = initialData.experiences;
  const coverByExperienceId = initialData.coverByExperienceId;
  const locationByExperienceId = initialData.locationByExperienceId;
```

with:

```ts
  const experiences = initialData.experiences;
  const coverByExperienceId = initialData.coverByExperienceId;
  const locationByExperienceId = initialData.locationByExperienceId;
  const reviewStatsByExperienceId = initialData.reviewStatsByExperienceId;
```

and replace:

```ts
        return {
          ...mapExperienceToCardData(
            exp,
            locationByExperienceId,
            coverByExperienceId,
            pickExperienceCategory,
          ),
          categorySlug: category?.slug ?? null,
          isLatest,
        };
      }),
    [coverByExperienceId, currentTimestamp, experiences, locationByExperienceId],
  );
```

with:

```ts
        return {
          ...mapExperienceToCardData(
            exp,
            locationByExperienceId,
            coverByExperienceId,
            pickExperienceCategory,
            reviewStatsByExperienceId,
          ),
          categorySlug: category?.slug ?? null,
          isLatest,
        };
      }),
    [coverByExperienceId, currentTimestamp, experiences, locationByExperienceId, reviewStatsByExperienceId],
  );
```

In `app/(landing)/components/sections/FeaturedExperiencesShowcase.tsx`, replace:

```ts
    const card = mapExperienceToCardData(
      exp,
      initialData.locationByExperienceId,
      initialData.coverByExperienceId,
      pickExperienceCategory,
    );
```

with:

```ts
    const card = mapExperienceToCardData(
      exp,
      initialData.locationByExperienceId,
      initialData.coverByExperienceId,
      pickExperienceCategory,
      initialData.reviewStatsByExperienceId,
    );
```

- [ ] **Step 5: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```
Expected: no new errors.

- [ ] **Step 6: Manual verification**

`npm run dev`, visit the homepage and `/experiences`. Confirm cards for experiences with real reviews show `★ 4.x (N)`; cards with zero reviews show no rating line at all (not "0.0" or "New"); numbers match `get_experience_review_stats` for a couple of spot-checked experiences.

- [ ] **Step 7: Commit**

```bash
git add lib/queries/experiences.ts lib/queries/experiences-server.ts \
  "app/(landing)/components/sections/ExperienceCard.tsx" \
  "app/(landing)/components/sections/FeaturedExperiences.tsx" \
  "app/(landing)/components/sections/ExperiencesSection.tsx" \
  "app/(landing)/components/sections/FeaturedExperiencesShowcase.tsx"
git commit -m "$(cat <<'EOF'
Show real ratings on experience cards, sourced from bulk review stats

ExperienceCard had no rating UI at all before; it now shows a
star+average+count line only when the experience has real published
reviews, backed by a single batched get_experience_review_stats_bulk
call per listing page instead of one query per card.
EOF
)"
```

---

## Task 10: Admin reviews page — moderation extensions

**Files:**
- Modify: `lib/admin/types.ts`
- Modify: `lib/admin/api.ts`
- Modify: `app/(admin)/admin/reviews/page.tsx`

**Interfaces:**
- Consumes: extended `admin_list_reviews` RPC, new `admin_set_review_status` RPC (Task 1/2), `StarRating` (Task 3).

- [ ] **Step 1: Extend `ReviewRow`**

In `lib/admin/types.ts`, replace:

```ts
export type ReviewRow = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  experience_title: string | null;
  reviewer_name: string | null;
};
```

with:

```ts
export type ReviewRow = {
  id: string;
  booking_id: string;
  rating: number;
  review_text: string | null;
  status: string;
  created_at: string;
  experience_title: string | null;
  host_name: string | null;
  reviewer_name: string | null;
};
```

- [ ] **Step 2: Pass the status filter and add the hide/unhide action**

In `lib/admin/api.ts`, replace:

```ts
export function useAdminReviews(params: ListParams) {
  return useQuery({
    queryKey: ["admin", "reviews", params],
    queryFn: () =>
      rpc<ListResult<ReviewRow>>("admin_list_reviews", {
        p_search: params.search?.trim() || null,
        p_rating: params.rating ?? null,
        p_limit: ADMIN_PAGE_SIZE,
        p_offset: (params.page ?? 0) * ADMIN_PAGE_SIZE,
      }),
    placeholderData: (prev) => prev ?? (EMPTY_LIST as ListResult<ReviewRow>),
  });
}
```

with:

```ts
export function useAdminReviews(params: ListParams) {
  return useQuery({
    queryKey: ["admin", "reviews", params],
    queryFn: () =>
      rpc<ListResult<ReviewRow>>("admin_list_reviews", {
        p_search: params.search?.trim() || null,
        p_rating: params.rating ?? null,
        p_limit: ADMIN_PAGE_SIZE,
        p_offset: (params.page ?? 0) * ADMIN_PAGE_SIZE,
        p_status: params.status ?? null,
      }),
    placeholderData: (prev) => prev ?? (EMPTY_LIST as ListResult<ReviewRow>),
  });
}
```

Replace:

```ts
  deleteReview: (reviewId: string) => ({
    fn: "admin_delete_review",
    args: { p_review_id: reviewId },
  }),
```

with:

```ts
  deleteReview: (reviewId: string) => ({
    fn: "admin_delete_review",
    args: { p_review_id: reviewId },
  }),
  setReviewStatus: (reviewId: string, status: "published" | "hidden") => ({
    fn: "admin_set_review_status",
    args: { p_review_id: reviewId, p_status: status },
  }),
```

- [ ] **Step 3: Update the admin reviews page**

Replace the entire contents of `app/(admin)/admin/reviews/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff, Star, Trash2 } from "lucide-react";
import {
  ADMIN_PAGE_SIZE,
  adminActions,
  useAdminMutation,
  useAdminReviews,
} from "@/lib/admin/api";
import type { ReviewRow } from "@/lib/admin/types";
import { DataTable, type Column } from "@/components/admin/ui/DataTable";
import {
  EmptyState,
  FilterChips,
  Pagination,
  SearchInput,
  useDebouncedValue,
} from "@/components/admin/ui/primitives";
import { ActionMenu } from "@/components/admin/ui/ActionMenu";
import { formatDate } from "@/components/admin/ui/format";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/lib/utils";

const RATING_FILTERS = [
  { value: null, label: "All" },
  { value: "5", label: "5★" },
  { value: "4", label: "4★" },
  { value: "3", label: "3★" },
  { value: "2", label: "2★" },
  { value: "1", label: "1★" },
];

const STATUS_FILTERS = [
  { value: null, label: "All" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
];

export default function AdminReviewsPage() {
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const debounced = useDebouncedValue(search);

  const { data, isFetching } = useAdminReviews({
    search: debounced,
    rating: rating ? Number(rating) : null,
    status,
    page,
  });
  const mutation = useAdminMutation();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const columns: Column<ReviewRow>[] = [
    {
      key: "experience",
      header: "Experience",
      render: (r) => (
        <div className="min-w-0 max-w-xs">
          <p className="truncate font-medium">{r.experience_title ?? "—"}</p>
          <p className="truncate text-xs text-muted-foreground">
            by {r.reviewer_name ?? "Anonymous"} · hosted by {r.host_name ?? "—"}
          </p>
        </div>
      ),
    },
    { key: "rating", header: "Rating", render: (r) => <StarRating rating={r.rating} size="sm" /> },
    {
      key: "text",
      header: "Review",
      render: (r) => (
        <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">
          {r.review_text || <span className="italic">No comment</span>}
        </p>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
            r.status === "hidden"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700",
          )}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "booking",
      header: "Booking",
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.booking_id.slice(0, 8)}</span>,
    },
    {
      key: "date",
      header: "Date",
      render: (r) => <span className="text-muted-foreground">{formatDate(r.created_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <ActionMenu
          items={[
            r.status === "hidden"
              ? {
                  label: "Publish review",
                  icon: Eye,
                  onClick: () => mutation.mutate(adminActions.setReviewStatus(r.id, "published")),
                }
              : {
                  label: "Hide review",
                  icon: EyeOff,
                  onClick: () => mutation.mutate(adminActions.setReviewStatus(r.id, "hidden")),
                },
            {
              label: "Delete review",
              icon: Trash2,
              danger: true,
              onClick: () => {
                if (typeof window !== "undefined" && window.confirm("Delete this review? This cannot be undone.")) {
                  mutation.mutate(adminActions.deleteReview(r.id));
                }
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      loading={isFetching && rows.length === 0}
      getRowKey={(r) => r.id}
      empty={<EmptyState icon={Star} title="No reviews found" description="Try a different search or filter." />}
      toolbar={
        <>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search reviews…" />
          <FilterChips options={RATING_FILTERS} value={rating} onChange={(v) => { setRating(v); setPage(0); }} />
          <FilterChips options={STATUS_FILTERS} value={status} onChange={(v) => { setStatus(v); setPage(0); }} />
        </>
      }
      footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}
    />
  );
}
```

- [ ] **Step 4: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```
Expected: no new errors. Confirm `ActionMenu`'s `items` prop type accepts the array shape used above (it already does, since the existing "Delete review" item uses the same `{ label, icon, danger?, onClick }` shape).

- [ ] **Step 5: Manual verification**

`npm run dev`, sign in as an admin, visit `/admin/reviews`. Confirm: booking id, host name, and status column all render; the Hide action flips a review's status (and it drops out of the experience detail page's list/aggregate — cross-check with Task 6's page); Unhide restores it; Delete still hard-deletes with the existing confirm dialog; the status filter chips correctly narrow the list.

- [ ] **Step 6: Commit**

```bash
git add lib/admin/types.ts lib/admin/api.ts "app/(admin)/admin/reviews/page.tsx"
git commit -m "$(cat <<'EOF'
Extend admin reviews moderation with hide/unhide, booking, and host visibility

Admins can now see the booking and host behind each review and toggle
published/hidden status instead of only hard-deleting. Reuses the
shared StarRating display component.
EOF
)"
```

---

## Task 11: Homepage testimonials — real featured reviews

**Files:**
- Modify: `app/(landing)/components/sections/TestimonialsSection.tsx`
- Delete: `app/(landing)/lib/customer-reviews.ts`

**Interfaces:**
- Consumes: `getFeaturedReviews` (Task 3).

- [ ] **Step 1: Confirm `customer-reviews.ts` has no other consumers**

```bash
grep -rln "customer-reviews" app --include="*.tsx" --include="*.ts" | grep -v node_modules
```
Expected: only `app/(landing)/components/sections/TestimonialsSection.tsx`. If anything else appears, stop and re-scope this task instead of deleting the file.

- [ ] **Step 2: Replace `TestimonialsSection.tsx`**

Replace the entire contents of `app/(landing)/components/sections/TestimonialsSection.tsx`:

```tsx
"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getFeaturedReviews, type FeaturedReview } from "@/lib/reviews/api";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ROTATE_MS = 5000;
const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop";

const orange = {
  solid: "#1A8F4A",
  dark: "#157A3F",
  light: "#E8F6EE",
} as const;

const ARC_POSITIONS = {
  prev: { top: "16%", left: "27%" },
  active: { top: "50%", left: "48%" },
  next: { top: "84%", left: "27%" },
} as const;

type Slot = keyof typeof ARC_POSITIONS;

type DisplayReview = {
  id: string;
  name: string;
  rating: number;
  quote: string;
  avatar: string;
  experience: string;
};

function toDisplayReview(review: FeaturedReview): DisplayReview {
  const avatar = review.reviewer_avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(review.reviewer_avatar_path).data.publicUrl
    : FALLBACK_AVATAR;
  return {
    id: review.id,
    name: review.reviewer_name || "Traveler",
    rating: review.rating,
    quote: review.review_text || "A memorable, host-led experience on Gozuru.",
    avatar,
    experience: review.experience_title || "Experience",
  };
}

function ReviewerItem({
  review,
  slot,
  onSelect,
}: {
  review: DisplayReview;
  slot: Slot;
  onSelect: () => void;
}) {
  const isActive = slot === "active";
  const position = ARC_POSITIONS[slot];

  return (
    <motion.button
      key={review.id}
      type="button"
      onClick={onSelect}
      initial={false}
      animate={{
        top: position.top,
        left: position.left,
        opacity: isActive ? 1 : 0.62,
        scale: isActive ? 1 : 0.94,
      }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      style={{ position: "absolute" }}
      className={cn(
        "flex my-3 -translate-y-1/2 items-center gap-3 text-left",
        isActive ? "z-10 cursor-default" : "z-0 cursor-pointer hover:opacity-90",
      )}
      aria-current={isActive ? "true" : undefined}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full ring-2 ring-white/80",
          isActive ? "size-[88px]" : "size-[96px]",
        )}
      >
        <Image src={review.avatar} alt={review.name} fill sizes="78px" unoptimized className="object-cover bg-black" />
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-[#2B2F33] transition-all dark:text-foreground",
            isActive ? "text-[1.05rem] font-bold leading-tight" : "text-sm font-medium",
          )}
        >
          {review.name}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-[#6B7280] dark:text-muted-foreground">
          <Star className="size-3 fill-[#1A8F4A] text-[#1A8F4A]" aria-hidden />
          <span>
            {review.rating.toFixed(1)} · {review.experience}
          </span>
        </p>
      </div>
    </motion.button>
  );
}

function TestimonialsHeader() {
  return (
    <div className="mb-10 lg:mb-12">
      <div className="mb-3 h-[3px] w-11 rounded-full" style={{ backgroundColor: orange.solid }} aria-hidden />
      <h2 className="text-4xl font-bold tracking-tight text-[#1F2937] dark:text-foreground sm:text-[2.25rem]">
        Traveler stories
      </h2>
      <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
        Real feedback from travelers who booked host-led experiences on Gozuru.
      </p>
    </div>
  );
}

export function TestimonialsSection() {
  const [reviews, setReviews] = useState<DisplayReview[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    void getFeaturedReviews(5).then((rows) => {
      if (!mounted) return;
      setReviews(rows.map(toDisplayReview));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const count = reviews?.length ?? 0;

  const getReview = useCallback(
    (offset: number) => (reviews && count > 0 ? reviews[(activeIndex + offset + count) % count] : null),
    [activeIndex, count, reviews],
  );

  useEffect(() => {
    if (count < 3) return;
    const timer = setInterval(() => {
      setActiveIndex((index) => (index + 1) % count);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [count]);

  if (reviews === null || count === 0) return null;

  const activeReview = getReview(0);
  if (!activeReview) return null;

  const selectOffset = (offset: number) => {
    setActiveIndex((index) => (index + offset + count) % count);
  };

  if (count < 3) {
    return (
      <div className="relative overflow-hidden border-b border-gray-100 font-[family-name:var(--font-outfit)] lg:p-20 lg:pl-42">
        <div
          className="pointer-events-none absolute -left-2 top-1 size-[min(480px,82%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500"
          aria-hidden
        />
        <div className="relative px-8 py-10 sm:px-10 sm:py-12 lg:px-44 lg:py-14">
          <TestimonialsHeader />
          <div className="max-w-xl">
            <ReviewerItem review={activeReview} slot="active" onSelect={() => undefined} />
            <blockquote className="mt-8 text-[1.05rem] leading-[1.75] text-[#374151] dark:text-foreground sm:text-lg">
              &ldquo;{activeReview.quote}&rdquo;
            </blockquote>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden border-b border-gray-100 font-[family-name:var(--font-outfit)] lg:p-20 lg:pl-42">
      <div
        className="pointer-events-none absolute -left-2 top-1 size-[min(480px,82%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500"
        aria-hidden
      />

      <div className="relative px-8 py-10 sm:px-10 sm:py-12 lg:px-44 lg:py-14">
        <TestimonialsHeader />

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-14 xl:gap-20">
          <div className="relative mx-auto h-[260px] w-full max-w-[320px] lg:mx-0 lg:h-[280px] lg:max-w-none">
            <svg
              className="pointer-events-none absolute inset-0 ml-10 h-full w-full text-[#C9D2DC]"
              viewBox="0 0 320 280"
              fill="none"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <path d="M 54 35 A 100 100 0 0 1 54 245" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>

            <ReviewerItem review={getReview(-1)!} slot="prev" onSelect={() => selectOffset(-1)} />
            <ReviewerItem review={getReview(0)!} slot="active" onSelect={() => undefined} />
            <ReviewerItem review={getReview(1)!} slot="next" onSelect={() => selectOffset(1)} />
          </div>

          <div className="flex min-h-[200px] flex-col justify-center lg:min-h-[240px] lg:pl-2">
            <span className="select-none text-[5.5rem] leading-none text-[#D5DCE4] dark:text-zinc-700 sm:text-[6.5rem]" aria-hidden>
              &ldquo;
            </span>

            <AnimatePresence mode="wait">
              <motion.blockquote
                key={activeReview.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="-mt-8 max-w-xl text-[1.05rem] leading-[1.75] text-[#374151] dark:text-foreground sm:text-lg"
              >
                <span className="float-left mr-2 mt-0.5 text-[3.25rem] font-semibold leading-none text-[#1F2937]">
                  {activeReview.quote.charAt(0)}
                </span>
                {activeReview.quote.slice(1)}
              </motion.blockquote>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Delete the now-unused fake data file**

```bash
git rm "app/(landing)/lib/customer-reviews.ts"
```

- [ ] **Step 4: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```
Expected: no new errors, no dangling import of `customer-reviews`.

- [ ] **Step 5: Manual verification**

`npm run dev`, visit the homepage. If the live database has 3+ published reviews with `rating >= 4` and text, confirm the full arc carousel renders with real names/quotes/ratings (cross-check against `get_featured_reviews` output). If it has 1–2, confirm the simplified single-quote layout renders. If it has 0, confirm the section renders nothing (no layout gap, no fake content).

- [ ] **Step 6: Commit**

```bash
git add "app/(landing)/components/sections/TestimonialsSection.tsx"
git commit -m "$(cat <<'EOF'
Replace fake homepage testimonials with real featured reviews

TestimonialsSection now renders get_featured_reviews data instead of
five fabricated names/quotes/ratings, with an honest reduced layout for
1-2 reviews and no section at all when there are none yet.
EOF
)"
```

---

## Final verification pass (after all tasks)

- [ ] Run the full build to catch anything the incremental typechecks missed:

```bash
npm run build
```
Expected: build succeeds with no type or lint errors.

- [ ] Re-run the migration verification script once more to confirm nothing drifted:

```bash
psql "$DATABASE_URL" -f scripts/verify-reviews-system.sql
```

- [ ] Manually re-test the full user journey end to end in the browser (`npm run dev`): sign in as a traveler with a completed booking → leave a review from `/account/applied?view=sent` → see it appear on the experience detail page with the correct aggregate → edit it → see the aggregate update → sign in as admin → hide it → confirm it disappears from the experience page and its aggregate → unhide it → confirm it reappears. Test the same flow at a mobile viewport width.
- [ ] Confirm existing, unrelated booking functionality still works: create a new booking end to end (cart → checkout → confirmation), and confirm the "Incoming" applications tab is unaffected.

## Remaining limitations (carried from the design spec)

- No cron/scheduled job flips `bookings.status` to `'completed'` — eligibility and reputation stats are computed live from `experience_availability.ends_at` instead.
- No time-limited edit window for reviews.
- No email/push notification for "you can now review" — the prompt lives at `/account/applied?view=sent` per the existing lack of notification infrastructure.
- `app/(landing)/lib/agents.ts` (`LOCAL_EXPERTS`) and `app/(landing)/lib/data.ts` (`experts[]`) still contain fake rating data but are not wired into any real page — left as-is, confirmed unused by the real `/experts` pipeline.
- The investor-pitch "Expert satisfaction score" in `InvestmentSection.tsx`/`investments.ts` is untouched — unrelated to the booking/review system and has no real data source.
