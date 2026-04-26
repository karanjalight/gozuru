-- Relax public read restrictions that block landing experience detail pages.
-- This allows signed-up user identity (name/avatar) to render for hosts/reviewers.

-- ------------------------------------------------------------
-- profiles: allow public read
-- ------------------------------------------------------------
drop policy if exists profiles_select_self_or_admin on public.profiles;

create policy profiles_select_public
on public.profiles
for select
using (true);

-- ------------------------------------------------------------
-- host_profiles: allow public read for all hosts
-- ------------------------------------------------------------
drop policy if exists host_profiles_public_read_approved on public.host_profiles;

create policy host_profiles_public_read_public
on public.host_profiles
for select
using (true);

