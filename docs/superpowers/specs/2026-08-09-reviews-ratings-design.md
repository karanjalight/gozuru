# Reviews & Ratings System — Design

Status: Approved. Ready for implementation planning.

## 1. Problem and current state

Gozuru already has a `public.reviews` table (created in the very first migration) and a fully working **read** path on the experience detail page, plus a fully working **admin moderation** surface (`admin_list_reviews` / `admin_delete_review`). What's missing:

1. There is no way for a traveler to actually submit a review. No insert path exists anywhere in the app.
2. `bookings.status` is never set to `'completed'` by any code path in the repo — the only real signal that an experience has happened is `experience_availability.ends_at < now()` on the booking's slot. Any eligibility check must be computed from that, not trusted from the status enum.
3. RLS was dropped for every original table (`supabase/migrations/20260423_003_drop_all_rls.sql`) and never restored for `reviews`, `bookings`, `experiences`, etc. Every sensitive write in this app (bookings, checkout, affiliate, admin) is instead enforced by `security definer` RPC functions. A new review-write feature must follow that same pattern — a raw client-side `.insert()` would have no server-side enforcement of "reviewer must own a qualifying booking."
4. Real rating/review-count data is either absent (main `ExperienceCard`) or faked in the live data pipeline itself: `lib/queries/experts.ts` hardcodes `rating: 5, reviewCount: 0` for every host card; `HostProfilePortfolio.tsx` fabricates "Travelers hosted" (`experienceCount × 12`) and "Experiences delivered" (`experienceCount × 40`); the homepage `TestimonialsSection` shows five entirely fictional reviewers.

## 2. Review eligibility (source of truth)

A booking is reviewable when, computed live (no schema change to `bookings.status` needed or attempted):

```
bookings.guest_user_id = auth.uid()
AND bookings.status IN ('confirmed', 'completed')
AND experience_availability.ends_at IS NOT NULL
AND experience_availability.ends_at < now()
AND NOT EXISTS (SELECT 1 FROM reviews WHERE booking_id = bookings.id)
```

This expression lives in exactly one place — inside the `submit_review` RPC (enforcement) and mirrored in `get_account_applications` (so the UI can show the right CTA). It is **not** re-implemented client-side as a trust boundary; the client only uses it to decide what button to render.

Known limitation (documented, not fixed here): if `bookings.availability_id` is ever nulled out (`ON DELETE SET NULL` on slot deletion — not currently reachable via any existing RPC, since slots are only ever cancelled, never deleted), that booking becomes permanently unreviewable since there's no fallback date on `bookings` itself. Not addressed in this pass since no code path can trigger it today.

## 3. Database changes

One new migration, `supabase/migrations/20260809_022_reviews_system.sql`:

**`reviews` table alterations:**
- New enum `public.review_status` — `'published' | 'hidden'`.
- `reviews.status public.review_status not null default 'published'`.
- `check (review_text is null or char_length(review_text) <= 1000)` — DB-level backstop behind the UI's 500-char limit.
- `create index idx_reviews_experience_status on reviews(experience_id, status)`.
- `create index idx_reviews_reviewer on reviews(reviewer_user_id)`.
- Existing `unique(booking_id)` constraint is untouched — it already fully satisfies "prevent duplicate reviews for the same booking."

**RLS — re-enabled on `reviews` only** (not repo-wide; every other original table stays as-is, out of scope for this feature):
- `alter table public.reviews enable row level security;`
- One SELECT policy: `status = 'published' OR reviewer_user_id = auth.uid() OR public.is_admin()`.
- Deliberately **no** INSERT/UPDATE policy for regular users — all writes go through the RPCs below, which run `security definer` and bypass RLS (the same pattern already proven in this codebase for `booking_messages`, `checkout_sessions`, and the affiliate tables, all of which re-enabled RLS for themselves after the big drop and pair it with RPC-only writes).
- Rationale: without this, "hidden" is purely a client-side filter — anyone with the anon key could read hidden reviews or write directly to the table, bypassing eligibility checks entirely. This closes that gap without touching RLS anywhere else.

## 4. Backend RPCs

All `security definer`, `set search_path = public`, matching the existing convention in `20260629_021_admin_dashboard.sql` and the booking RPCs.

| Function | Purpose | Grant |
|---|---|---|
| `submit_review(p_booking_id uuid, p_rating int, p_review_text text)` | Validates eligibility (§2) server-side, inserts with `reviewer_user_id := auth.uid()` (never client-supplied), `status := 'published'`. Raises a clear error for: not authenticated, booking not found, not your booking, not yet eligible, already reviewed. | `authenticated` |
| `update_review(p_review_id uuid, p_rating int, p_review_text text)` | Owner-or-admin only. Updates in place, bumps `updated_at`. Never creates a second row. | `authenticated` |
| `get_experience_review_stats(p_experience_id uuid)` | Returns `{average, count, distribution: {1..5}}` from one aggregate query, `status='published'` only. | `anon, authenticated` |
| `get_experience_review_stats_bulk(p_experience_ids uuid[])` | Same, batched — used by listing/card pages to avoid N+1. | `anon, authenticated` |
| `get_host_reputation_stats(p_host_user_id uuid)` | `{average_rating, review_count, completed_bookings_count, travelers_hosted_count}` from real `reviews`/`bookings`/`experience_availability` joins. | `anon, authenticated` |
| `get_host_reputation_stats_bulk(p_host_user_ids uuid[])` | Same, batched — used by the `/experts` grid. | `anon, authenticated` |
| `get_featured_reviews(p_limit int default 5)` | Recent, high-rated (`rating >= 4`), `published` reviews platform-wide, with reviewer name/avatar + experience title, for the homepage. Returns fewer than `p_limit` if that's all that exists — no padding, no fabrication. | `anon, authenticated` |
| `get_account_applications(...)` (existing, extended) | Adds `is_review_eligible`, `has_review`, `review_id`, `review_rating` columns, computed per §2 (only meaningful on the `'sent'` view; naturally `false`/`null` on `'incoming'` since `guest_user_id ≠ auth.uid()` there). Requires `drop function` + recreate since the return shape changes. | `authenticated` (unchanged) |
| `admin_list_reviews(...)` (existing, extended) | Adds `status`, `booking_id`, `host_name` to the returned rows and an optional `p_status` filter param, appended after existing params to preserve compatibility. | `anon, authenticated` (unchanged) |
| `admin_set_review_status(p_review_id uuid, p_status text)` | Hide/unhide. `assert_admin()` gated, matches `admin_set_host_verification`'s shape. | `anon, authenticated` |
| `admin_overview()` (existing, extended) | `avgRating`/`reviewsTotal` filtered to `status='published'` — matches what travelers see (§8 single-source-of-truth requirement). | unchanged |

`admin_delete_review` is kept as-is for permanent hard delete, alongside the new hide/unhide.

## 5. Frontend changes

**New shared components:**
- `components/ui/star-rating.tsx` — `StarRating` (display) and `StarRatingInput` (interactive, for the form). Replaces every ad-hoc `<Star>` loop in the codebase (experience page, admin table, offer card each currently hand-roll their own in inconsistent colors — orange in most public pages, amber in admin). Standardizes on orange, the color already used almost everywhere.
- `components/ui/textarea.tsx` — hand-styled to match `Input`'s pattern (no base-ui textarea primitive exists in this repo).
- `components/reviews/ReviewFormModal.tsx` — create/edit review. Same `createPortal` fixed-overlay pattern as the existing `ExperienceTicketModal`. Star input, textarea with a 500-char counter, submit button with loading/success/error states.

**Modified pages:**
- `app/account/applied/page.tsx` (Sent tab) — the sole review entry point. "Leave a review" on eligible completed bookings without one yet; "Edit your review" + their given rating on ones already reviewed.
- `app/(landing)/experiences/[experienceId]/page.tsx` — average/count sourced from `get_experience_review_stats` instead of being recomputed client-side from whichever 6 rows happen to be fetched; review list query adds `.eq("status", "published")`; stars rendered via the shared component.
- `lib/queries/experts.ts` (`mapHostToLocalExpert`) and `app/(landing)/components/sections/ExperienceHostGrid.tsx` — hardcoded `rating: 5, reviewCount: 0` replaced with real bulk stats.
- `app/(landing)/components/HostProfilePortfolio.tsx` — "Travelers hosted" / "Experiences delivered" become real numbers from `get_host_reputation_stats`; the unconditional "Top-rated sessions" tile is replaced with the real rating + review count (shown only once reviews exist).
- `app/(landing)/components/sections/ExperienceCard.tsx` — currently has no rating UI at all; add one, shown only when `reviewCount > 0` (no fake "New" badge — just omitted when there's nothing to show).
- `app/(landing)/hosts/[hostId]/page.tsx` (`portfolioExperiences` construction) — wires real per-experience stats into `ExperienceOfferCard`'s already-existing but never-populated `rating`/`reviewCount` props.
- `app/(admin)/admin/reviews/page.tsx` — adds booking/host columns and a Hide/Unhide action next to the existing Delete; reuses the shared star component.
- `app/(landing)/components/sections/TestimonialsSection.tsx` — replaced with real data from `get_featured_reviews`; section renders an honest reduced/empty treatment if fewer than 3 real reviews exist platform-wide (no fabricated names/quotes).

## 6. Existing fake/placeholder review data — inventory and disposition

| File | Current value | What it represents | Replacement |
|---|---|---|---|
| `lib/queries/experts.ts:128-129` | `rating: 5, reviewCount: 0` | Hardcoded stub fed into every real `/experts` card | Real values from `get_host_reputation_stats_bulk` |
| `app/(landing)/components/sections/ExperienceHostGrid.tsx:143-144` | `rating: 5, reviewCount: 0` | Same stub, different grid | Same fix |
| `app/(landing)/components/HostProfilePortfolio.tsx` (`clientsStat`/`projectsStat`) | `experiences.length * 12` / `* 40` | Fabricated "Travelers hosted" / "Experiences delivered" | Real `travelers_hosted_count` / `completed_bookings_count` from `get_host_reputation_stats` |
| `app/(landing)/components/HostProfilePortfolio.tsx:304` | Static `"Top-rated sessions"` tile | Unconditional claim, no data behind it | Real average rating + review count tile, shown only once reviews exist |
| `app/(landing)/lib/customer-reviews.ts` + `TestimonialsSection.tsx` | 5 fabricated names/quotes/ratings (4.9–5.0) | Homepage social proof | Real reviews via `get_featured_reviews`; honest reduced state if too few exist |
| `app/(landing)/lib/agents.ts` (`LOCAL_EXPERTS`) | Fake ratings 4.8–4.9, `reviewCount: 142` | Appears to be dead/unused legacy data (real `/experts` page uses `lib/queries/experts.ts`, not this array) | No action — confirm dead during implementation; do not wire it up further, do not delete as part of this feature (unrelated cleanup) |
| `app/(landing)/lib/data.ts` (`experts[]`) | Fake ratings 4.95–4.99 | Types/demo data referenced by `ExpertCard.tsx` prop shape, but real call sites pass real data | No action — same reasoning |
| `app/(landing)/lib/sample-experiences.ts`, `sample-events.ts` | Fake ratings, `ratingCount: 142`, fake reviewer names (`"Sarah T."`, `"Amina H."`, etc.) | Power the `/sample-experiences/[slug]` and `/sample-events/[slug]` demo routes | No action needed — already isolated by dedicated "Sample" routes and file names; satisfies the "clearly labeled seed/demo data" requirement as-is |
| `app/(landing)/lib/investments.ts`, `InvestmentSection.tsx` | `"Expert satisfaction score" = 4.9`, satisfaction percentages 96–99% | Investor-pitch marketing copy, not tied to bookings/reviews at all | Out of scope — no underlying data model exists for this (would require a separate investor-feedback feature); flagged here for visibility, not fixed in this pass |

## 7. Security checklist (requirement #15)

- Reviewer ID: always `auth.uid()` inside `submit_review`, never a client parameter — cannot be spoofed.
- Booking ownership: `submit_review` checks `bookings.guest_user_id = auth.uid()` server-side before insert.
- Completion requirement: checked server-side via §2's expression, not trusted from the client.
- Duplicate prevention: checked twice — a friendly pre-check in `submit_review`, backed by the `unique(booking_id)` constraint as the hard guarantee.
- Edit/delete of others' reviews: `update_review` checks `reviewer_user_id = auth.uid() OR is_admin()`; direct client `UPDATE`/`INSERT` on `reviews` has no RLS policy at all, so it's rejected outright regardless of what the RPC checks.
- Admin actions: `admin_set_review_status` and `admin_delete_review` both call `assert_admin()`, matching every other admin RPC.

## 8. Non-goals / explicit limitations

- No cron/scheduled job is introduced to flip `bookings.status` to `'completed'` — eligibility is computed live instead (§2). This is a deliberate minimal-footprint choice; introducing a scheduler is a separate concern from reviews.
- No time-limited edit window — a traveler can edit their review at any time (owner-only, still one row per booking).
- No email/push notification for "you can now review" — no notification infrastructure exists in this app beyond one welcome-email template; per the brief, the prompt lives at the existing post-booking location (`/account/applied?view=sent`) instead of new infra.
- `app/(landing)/lib/agents.ts` / `data.ts` fake expert arrays are left in place (appear unused by real pages) — confirmed during implementation, not deleted, since removing dead code is unrelated cleanup outside this feature's scope.
- Investor-pitch "satisfaction score" content is left untouched (§6) — no real data source exists for it and it's unrelated to the booking/review system.
