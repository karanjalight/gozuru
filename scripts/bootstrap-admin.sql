-- =============================================================================
-- Bootstrap the first Gozuru admin.
-- Run this in the Supabase SQL editor (it executes as the postgres role, which
-- bypasses RLS — so it avoids the user_roles recursion the API hits).
--
-- Context: the seed script created the auth user admin@gozuru.com and it can
-- already log in. This script (1) repairs is_admin() so it stops recursing,
-- and (2) grants that user the admin role. After running it, log in and you'll
-- be routed to /admin.
--
-- For the dashboard DATA (KPIs, charts, lists) you must ALSO apply
-- supabase/migrations/20260629_021_admin_dashboard.sql in the SQL editor.
-- =============================================================================

-- 1. Repair is_admin() — SECURITY DEFINER so it bypasses RLS on user_roles
--    (this is migration 20260424_009; your live DB appears to predate it).
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  );
end;
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- 2. Make sure the account is confirmed (so it can log in).
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'admin@gozuru.com';

-- 3. Grant the admin role.
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where email = 'admin@gozuru.com'
on conflict (user_id, role) do nothing;

-- 4. Verify (should return one row with role = admin).
select u.email, ur.role
from public.user_roles ur
join auth.users u on u.id = ur.user_id
where u.email = 'admin@gozuru.com';
