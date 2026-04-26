-- Fix RLS recursion: user_roles policies call is_admin(), and is_admin()
-- previously queried user_roles under RLS, causing stack depth overflow.

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

