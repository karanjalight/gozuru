# Expert Detail Slug URLs — Design

Status: Approved. Ready for implementation planning.

## 1. Problem and current state

The `/experts` list page links each card to `/hosts/<uuid>` (`app/(landing)/hosts/[hostId]/page.tsx`, param `hostId`), e.g. `/hosts/8f2a1c3e-...`. This is not user-friendly and doesn't match the list page's own `/experts` namespace. There is no `slug`/`username` column anywhere on `profiles` or `host_profiles` today.

This also intersects with an approved-but-unimplemented SEO design (`2026-08-10-seo-improvements-design.md`), which plans canonical URLs, sitemap entries, and JSON-LD specifically for `/hosts/[hostId]`. Since nothing from that spec is built yet (no `sitemap.xml`/`robots.ts` exist, confirmed), there is no indexed content to protect — this is the right time to change the URL shape before that work is built on top of the old one.

## 2. Scope

- Add a stable, auto-generated `slug` to `host_profiles`.
- Move the expert detail page from `/hosts/[hostId]` to `/experts/[slug]`.
- Keep `/hosts/<uuid>` working as a permanent redirect to the new URL.
- Update every internal link builder to use the slug.
- Update the SEO spec doc's path references so it matches the new URL shape when it's eventually implemented.

Non-goals: host-editable/custom slugs (auto-generated only, for now); any change to the `/hosts` "Become a Host" marketing page; any change to the experience detail page's own URL (`/experiences/[experienceId]`, out of scope, unaffected).

## 3. Data model — `host_profiles.slug`

New migration `supabase/migrations/20260906_023_host_profiles_slug.sql`:

- `public.slugify(text) returns text` — lowercase, non-alphanumeric runs → single hyphen, trim leading/trailing hyphens, cap length.
- `public.generate_unique_host_slug(p_user_id uuid) returns text` — base slug from that user's `profiles.display_name`; if null/empty, falls back to the email local-part (`profiles.email`, always present); if that's also empty, falls back to `host`. Appends `-2`, `-3`, … until no other `host_profiles` row has that slug.
- `host_profiles` gets a nullable `slug text` column with a unique constraint.
- A `BEFORE INSERT OR UPDATE` trigger fills `slug` via `generate_unique_host_slug` whenever it is `NULL`, and leaves an existing value untouched otherwise. This covers both current write paths (`AuthProvider.updateProfile`'s upsert and the bare `ensureHostProfileError` upsert in `app/account/experiences/create/page.tsx`) without duplicating generation logic in app code, and guarantees a slug — once assigned — never changes just because the host later edits their name. Stable URLs, no silent link rot.
- One-time backfill: `UPDATE host_profiles SET slug = generate_unique_host_slug(user_id) WHERE slug IS NULL;` then `ALTER COLUMN slug SET NOT NULL`.

## 4. Routing

- `app/(landing)/hosts/[hostId]/page.tsx` → `app/(landing)/experts/[slug]/page.tsx`. The existing client-side `useEffect` data flow is preserved; it gains one extra resolution step before its current queries: `host_profiles.select("user_id").eq("slug", slug).maybeSingle()` → then the existing experiences/profiles/social-links queries run exactly as today, keyed on that `user_id`.
- The old path, `app/(landing)/hosts/[hostId]/page.tsx`, becomes a thin server component: looks up the slug for the given `hostId` using the existing anon-key server-query pattern (`lib/queries/experts-server.ts`), then calls `permanentRedirect(`/experts/${slug}`)`. Calls `notFound()` if the id has no matching host.
- `/hosts` (the static marketing page) and the navbar's active-link matching are unaffected — both `/experts/` and `/hosts/` prefixes are already handled there.

## 5. Call sites to update

Each of these currently builds a `/hosts/${id}` link and needs its underlying query to also select `slug`, and its link builder to use `/experts/${slug}`:

- `lib/queries/experts.ts` — `profileHref` builder, `HostProfileRow` type
- `lib/queries/experts-server.ts` — add `slug` to the `host_profiles` select
- `app/(landing)/components/sections/AgentCard.tsx` and `app/(landing)/components/HeroExperts.tsx` — fallback href construction
- `app/(landing)/components/sections/ExperienceHostGrid.tsx` — `hrefs[...]` builder
- `app/(landing)/experiences/[experienceId]/page.tsx` — "View expert profile" link (~line 683); its host query needs `slug` added alongside the existing `host_profiles` columns

## 6. SEO spec doc update

`docs/superpowers/specs/2026-08-10-seo-improvements-design.md` currently plans canonical URLs/sitemap entries/JSON-LD for `/hosts/[hostId]`. Update its path references (§3.2 sitemap dynamic entries, §4.2 heading and path, §6 verification steps) to `/experts/[slug]`, and add a note that the old `/hosts/[hostId]` route is now a permanent-redirect stub rather than the canonical page.

## 7. Explicitly not touched

- Host-editable slugs — future enhancement, not this feature.
- `/experiences/[experienceId]` URL shape — unaffected.
- RLS policies on `host_profiles` — the new `slug` column follows the same read/write access as the rest of the table; no policy change needed since slug generation happens in a trigger (definer context), not via a new client-side write.

## 8. Verification plan

- `npm run build` succeeds (route move, new server-component redirect stub, and trigger-backed types all compile).
- Manually create/edit a host profile locally and confirm a `slug` appears in `host_profiles`.
- Visit an old `/hosts/<uuid>` URL and confirm it 301s to `/experts/<slug>`; visit a nonexistent uuid and confirm 404.
- Click through from `/experts` (grid card), the hero search dropdown, and an experience detail page's "View expert profile" link, confirming each lands on `/experts/<slug>`.
