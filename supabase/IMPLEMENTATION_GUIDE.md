# Gozuru Supabase Database Implementation Guide

## What this gives you

- A production-ready relational model aligned with your current UI.
- Supabase Auth integration via `auth.users` + automatic profile creation.
- Dedicated host profile model for experience givers.
- Experience lifecycle (draft -> review -> published).
- Availability, bookings, payments, payouts, reviews, and favorites.
- Storage buckets and path-based policies for avatars and experience media.

## Added migration

- `supabase/migrations/20260410_001_initial_gozuru_schema.sql`

## How to run it

1. In Supabase SQL Editor, run the migration file content.
2. Or if using Supabase CLI migrations, place this file in your migrations folder and run:
   - `supabase db push`

## Mapping to your existing pages

- `app/auth/signup/page.tsx`
  - Supabase Auth `signUp` creates `auth.users` row.
  - Trigger `handle_new_auth_user` auto-creates `public.profiles` row and default `traveler` role.
- `app/auth/login/page.tsx`
  - Use Supabase Auth `signInWithPassword`.
  - Session user id maps directly to `profiles.user_id`.
- `app/account/profile/page.tsx`
  - Read/write `public.profiles`.
  - If user becomes host, create role (`user_roles`) with `host`.
  - Trigger auto-creates `host_profiles`.
- `app/account/experiences/create/page.tsx`
  - Create/update `public.experiences`.
  - Save address in `public.experience_locations`.
  - Save links in `public.host_social_links`.
  - Save photos to `experience-media` bucket and metadata in `public.experience_media`.
- `app/account/experiences/page.tsx`
  - Query `public.experiences` by `host_user_id = auth.uid()`.
- `app/account/applied/page.tsx`
  - Replace mock rows with `public.bookings` where user is host or guest depending on UX intent.
- `app/account/payments/page.tsx`
  - Query `public.payments` filtered by `payer_user_id` or `payee_user_id`.

## Storage conventions used by policies

- Avatars: `avatars/{user_id}/avatar.ext`
- Experience media: `experience-media/{host_user_id}/{experience_id}/file.ext`
- Host verification docs: `host-verification/{user_id}/file.ext`

If you do not follow this folder convention, uploads will fail due to RLS policies.

## Recommended next implementation steps

1. Add Supabase client setup (`lib/supabase/client.ts`, `lib/supabase/server.ts`).
2. Replace `AuthProvider` mock with real session + auth methods.
3. Replace `mock-experiences` reads/writes with Supabase table operations.
4. Add backend actions/functions for secure booking + payment transitions.
5. Add admin tooling to move experience status from `submitted` to `published`.
