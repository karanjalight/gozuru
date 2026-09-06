-- Auto-generate a stable, human-friendly slug for host_profiles rows so
-- expert detail pages can live at /experts/<slug> instead of /hosts/<uuid>.
-- Slugs are assigned once (on whichever insert/update first leaves the
-- column NULL) and never regenerated afterward, so a published URL never
-- changes just because the host edits their name later.

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
  v_email text;
  v_base text;
  v_candidate text;
  v_suffix int := 1;
begin
  select p.display_name, p.email
  into v_display_name, v_email
  from public.profiles p
  where p.user_id = p_user_id;

  v_base := coalesce(
    public.slugify(v_display_name),
    public.slugify(split_part(coalesce(v_email, ''), '@', 1)),
    'host'
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

-- Backfill existing rows (runs through the same generator, not the trigger).
update public.host_profiles
set slug = public.generate_unique_host_slug(user_id)
where slug is null;

alter table public.host_profiles alter column slug set not null;
alter table public.host_profiles add constraint host_profiles_slug_key unique (slug);
