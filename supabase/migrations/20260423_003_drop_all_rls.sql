-- WARNING:
-- This migration disables Row Level Security and drops all RLS policies
-- in app schemas. Use only if you explicitly want unrestricted access.

do $$
declare
  rec record;
begin
  -- Drop all existing policies in public and storage schemas.
  for rec in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname in ('public', 'storage')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      rec.policyname,
      rec.schemaname,
      rec.tablename
    );
  end loop;

  -- Disable RLS so policy checks are not enforced.
  for rec in
    select n.nspname as schemaname, c.relname as tablename
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and n.nspname in ('public', 'storage')
      and c.relrowsecurity = true
  loop
    execute format(
      'alter table %I.%I disable row level security',
      rec.schemaname,
      rec.tablename
    );
  end loop;
end
$$;

