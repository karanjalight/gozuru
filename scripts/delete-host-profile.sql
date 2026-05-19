-- Delete a host profile and dependent data.
--
-- Prerequisites (run once on the project):
--   supabase/migrations/20260519_015_bookings_experience_on_delete_cascade.sql
--   supabase/migrations/20260519_016_host_profiles_on_delete_cascade.sql
--
-- Usage: Supabase Dashboard → SQL Editor → paste and run.
-- Change the UUID below if needed.

do $$
declare
  v_host_id uuid := '63c4b3a3-c53a-40a7-99bf-c8c714f5b7c0';
  v_exists boolean;
begin
  select exists (
    select 1 from public.host_profiles where user_id = v_host_id
  ) into v_exists;

  if not v_exists then
    raise notice 'No host_profiles row for user_id %', v_host_id;
    return;
  end if;

  raise notice 'Deleting host % — experiences: %, bookings: %, payments: %',
    v_host_id,
    (select count(*) from public.experiences where host_user_id = v_host_id),
    (select count(*) from public.bookings where host_user_id = v_host_id),
    (select count(*) from public.payments where payee_user_id = v_host_id);

  delete from public.host_profiles where user_id = v_host_id;

  raise notice 'Host profile deleted.';
end $$;

-- Confirm gone
select user_id
from public.host_profiles
where user_id = '63c4b3a3-c53a-40a7-99bf-c8c714f5b7c0';
