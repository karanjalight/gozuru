-- Auto-generate a stable, human-friendly slug for host_profiles rows so
-- expert detail pages can live at /experts/<slug> instead of /hosts/<uuid>.
-- Slugs are assigned once (on whichever insert/update first leaves the
-- column NULL) and never regenerated afterward, so a published URL never
-- changes just because the host edits their name later.
--
-- DEPLOY ORDER: this migration must be applied to every database (local
-- dev and live) BEFORE the corresponding app code ships. Without the
-- `slug` column, every host_profiles select that lists it fails, which
-- empties /experts, the homepage expert sections, and 404s every legacy
-- /hosts/<uuid> link (see docs/superpowers/plans/2026-09-06-expert-slug-urls.md).

alter table public.host_profiles add column if not exists slug text;

create or replace function public.slugify(p_input text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from regexp_replace(lower(coalesce(p_input, '')), '[^a-z0-9]+', '-', 'g')),
    ''
  );
$$;

create or replace function public.generate_unique_host_slug(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_base text;
  v_candidate text;
  v_suffix int := 1;
begin
  select p.display_name
  into v_display_name
  from public.profiles p
  where p.user_id = p_user_id;

  v_base := coalesce(
    public.slugify(v_display_name),
    'host-' || left(replace(p_user_id::text, '-', ''), 8)
  );
  v_base := left(v_base, 60);
  v_candidate := v_base;

  while exists (
    select 1 from public.host_profiles h
    where h.slug = v_candidate and h.user_id <> p_user_id
  ) loop
    v_suffix := v_suffix + 1;
    v_candidate := left(v_base, 60) || '-' || v_suffix;
  end loop;

  return v_candidate;
end;
$$;

create or replace function public.host_profiles_set_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.slug is null then
    new.slug := public.generate_unique_host_slug(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_host_profiles_set_slug on public.host_profiles;
create trigger trg_host_profiles_set_slug
before insert or update on public.host_profiles
for each row execute function public.host_profiles_set_slug();

-- Backfill existing rows one at a time (not a single bulk UPDATE): within
-- one UPDATE statement, generate_unique_host_slug's uniqueness check can't
-- see slugs the same statement is in the middle of assigning to other
-- rows (they aren't visible until the statement commits), so two hosts
-- who'd generate the same base slug would both get it, then the unique
-- constraint below would fail. A row-by-row loop makes each assignment
-- visible to the next iteration's uniqueness check.
do $$
declare
  r record;
begin
  for r in select user_id from public.host_profiles where slug is null loop
    update public.host_profiles
    set slug = public.generate_unique_host_slug(r.user_id)
    where user_id = r.user_id;
  end loop;
end $$;

alter table public.host_profiles alter column slug set not null;

alter table public.host_profiles drop constraint if exists host_profiles_slug_key;
alter table public.host_profiles add constraint host_profiles_slug_key unique (slug);
