-- Gozuru initial production schema for Supabase
-- Includes:
-- - Auth-connected user profiles
-- - Host profiles
-- - Experiences, media, availability, bookings, payments
-- - RLS policies for authenticated/public access
-- - Storage buckets and object policies

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('traveler', 'host', 'admin');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'host_verification_status') then
    create type public.host_verification_status as enum ('not_started', 'pending', 'approved', 'rejected');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'experience_status') then
    create type public.experience_status as enum ('draft', 'submitted', 'in_review', 'approved', 'published', 'unpublished', 'rejected', 'archived');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum ('requested', 'confirmed', 'completed', 'cancelled_by_guest', 'cancelled_by_host', 'refunded', 'no_show');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'currency_code') then
    create type public.currency_code as enum ('USD', 'EUR', 'GBP', 'KES', 'CAD');
  end if;
end
$$;

-- ------------------------------------------------------------
-- Utility functions
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;    
$$;

-- ------------------------------------------------------------
-- User and role model
-- ------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  first_name text,
  last_name text,
  display_name text generated always as (
    nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
  ) stored,
  avatar_path text,
  phone text,
  bio text,
  country_code text,
  city text,
  locale text default 'en',
  timezone text default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index if not exists idx_user_roles_role on public.user_roles(role);

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  );
$$;

create table if not exists public.host_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  headline text,
  expertise text,
  years_experience integer check (years_experience is null or years_experience >= 0),
  career_highlight text,
  highlight_story text,
  verification_status public.host_verification_status not null default 'not_started',
  verification_notes text,
  payout_account_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.host_social_links (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.host_profiles(user_id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now(),
  unique (host_user_id, url)
);

create index if not exists idx_host_social_links_host on public.host_social_links(host_user_id);

-- ------------------------------------------------------------
-- Experience catalog model (Airbnb Experiences inspired)
-- ------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.experience_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null unique
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.host_profiles(user_id) on delete restrict,
  title text not null check (char_length(title) between 5 and 120),
  subtitle text,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  status public.experience_status not null default 'draft',
  meeting_point_name text,
  is_online boolean not null default false,
  max_guests integer not null default 1 check (max_guests > 0 and max_guests <= 50),
  min_age integer check (min_age is null or (min_age >= 0 and min_age <= 120)),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  price_amount numeric(10,2) check (price_amount is null or price_amount >= 0),
  currency public.currency_code not null default 'USD',
  includes text[] not null default '{}'::text[],
  requirements text[] not null default '{}'::text[],
  cancellation_policy text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_experiences_host on public.experiences(host_user_id);
create index if not exists idx_experiences_status on public.experiences(status);
create index if not exists idx_experiences_category on public.experiences(category_id);
create index if not exists idx_experiences_created_at on public.experiences(created_at desc);

create table if not exists public.experience_tag_map (
  experience_id uuid not null references public.experiences(id) on delete cascade,
  tag_id uuid not null references public.experience_tags(id) on delete cascade,
  primary key (experience_id, tag_id)
);

create table if not exists public.experience_locations (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null unique references public.experiences(id) on delete cascade,
  country_region text,
  street_address text,
  apt_suite text,
  city text,
  state_territory text,
  postal_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experience_media (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  storage_path text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  alt_text text,
  created_at timestamptz not null default now(),
  unique (experience_id, storage_path)
);

create index if not exists idx_experience_media_experience on public.experience_media(experience_id);

create table if not exists public.experience_availability (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  price_amount numeric(10,2),
  currency public.currency_code,
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_experience_availability_experience on public.experience_availability(experience_id);
create index if not exists idx_experience_availability_starts_at on public.experience_availability(starts_at);

-- ------------------------------------------------------------
-- Booking + payment model
-- ------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete restrict,
  availability_id uuid references public.experience_availability(id) on delete set null,
  guest_user_id uuid not null references auth.users(id) on delete restrict,
  host_user_id uuid not null references public.host_profiles(user_id) on delete restrict,
  status public.booking_status not null default 'requested',
  guests_count integer not null default 1 check (guests_count > 0 and guests_count <= 20),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  currency public.currency_code not null default 'USD',
  guest_note text,
  host_note text,
  booked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bookings_guest on public.bookings(guest_user_id, booked_at desc);
create index if not exists idx_bookings_host on public.bookings(host_user_id, booked_at desc);
create index if not exists idx_bookings_experience on public.bookings(experience_id);
create index if not exists idx_bookings_status on public.bookings(status);

create table if not exists public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  status public.booking_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_status_history_booking on public.booking_status_history(booking_id, created_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  payer_user_id uuid not null references auth.users(id) on delete restrict,
  payee_user_id uuid not null references public.host_profiles(user_id) on delete restrict,
  amount numeric(10,2) not null check (amount >= 0),
  currency public.currency_code not null default 'USD',
  provider text,
  provider_payment_id text,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_payer on public.payments(payer_user_id, created_at desc);
create index if not exists idx_payments_payee on public.payments(payee_user_id, created_at desc);
create index if not exists idx_payments_status on public.payments(status);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.host_profiles(user_id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  currency public.currency_code not null default 'USD',
  provider text,
  provider_payout_id text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_payouts_host on public.payouts(host_user_id, created_at desc);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  experience_id uuid not null references public.experiences(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reviews_experience on public.reviews(experience_id, created_at desc);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  experience_id uuid not null references public.experiences(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, experience_id)
);

-- ------------------------------------------------------------
-- Trigger functions linked to auth.users
-- ------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (user_id) do update set
    email = excluded.email,
    first_name = coalesce(nullif(excluded.first_name, ''), public.profiles.first_name),
    last_name = coalesce(nullif(excluded.last_name, ''), public.profiles.last_name),
    updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'traveler')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.ensure_host_profile_from_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'host' then
    insert into public.host_profiles (user_id)
    values (new.user_id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_user_role_inserted on public.user_roles;
create trigger on_user_role_inserted
after insert on public.user_roles
for each row execute function public.ensure_host_profile_from_role();

-- Keep host_profiles in sync when users were hosts before this migration.
insert into public.host_profiles (user_id)
select ur.user_id
from public.user_roles ur
where ur.role = 'host'
on conflict (user_id) do nothing;

-- ------------------------------------------------------------
-- Updated_at triggers
-- ------------------------------------------------------------
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_host_profiles_updated_at on public.host_profiles;
create trigger trg_host_profiles_updated_at
before update on public.host_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_experiences_updated_at on public.experiences;
create trigger trg_experiences_updated_at
before update on public.experiences
for each row execute function public.set_updated_at();

drop trigger if exists trg_experience_locations_updated_at on public.experience_locations;
create trigger trg_experience_locations_updated_at
before update on public.experience_locations
for each row execute function public.set_updated_at();

drop trigger if exists trg_experience_availability_updated_at on public.experience_availability;
create trigger trg_experience_availability_updated_at
before update on public.experience_availability
for each row execute function public.set_updated_at();

drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.host_profiles enable row level security;
alter table public.host_social_links enable row level security;
alter table public.categories enable row level security;
alter table public.experience_tags enable row level security;
alter table public.experiences enable row level security;
alter table public.experience_tag_map enable row level security;
alter table public.experience_locations enable row level security;
alter table public.experience_media enable row level security;
alter table public.experience_availability enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.payouts enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;

-- profiles
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles
for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- user_roles
drop policy if exists user_roles_select_self_or_admin on public.user_roles;
create policy user_roles_select_self_or_admin
on public.user_roles
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists user_roles_manage_admin on public.user_roles;
create policy user_roles_manage_admin
on public.user_roles
for all
using (public.is_admin())
with check (public.is_admin());

-- host profiles and links
drop policy if exists host_profiles_public_read_approved on public.host_profiles;
create policy host_profiles_public_read_approved
on public.host_profiles
for select
using (
  verification_status = 'approved'
  or auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists host_profiles_owner_update on public.host_profiles;
create policy host_profiles_owner_update
on public.host_profiles
for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists host_profiles_owner_insert on public.host_profiles;
create policy host_profiles_owner_insert
on public.host_profiles
for insert
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists host_social_links_owner_read_write on public.host_social_links;
create policy host_social_links_owner_read_write
on public.host_social_links
for all
using (auth.uid() = host_user_id or public.is_admin())
with check (auth.uid() = host_user_id or public.is_admin());

-- taxonomy
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read
on public.categories
for select
using (true);

drop policy if exists categories_admin_manage on public.categories;
create policy categories_admin_manage
on public.categories
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists tags_public_read on public.experience_tags;
create policy tags_public_read
on public.experience_tags
for select
using (true);

drop policy if exists tags_admin_manage on public.experience_tags;
create policy tags_admin_manage
on public.experience_tags
for all
using (public.is_admin())
with check (public.is_admin());

-- experiences and related tables
drop policy if exists experiences_public_read_published on public.experiences;
create policy experiences_public_read_published
on public.experiences
for select
using (
  status = 'published'
  or auth.uid() = host_user_id
  or public.is_admin()
);

drop policy if exists experiences_host_create on public.experiences;
create policy experiences_host_create
on public.experiences
for insert
with check (auth.uid() = host_user_id or public.is_admin());

drop policy if exists experiences_host_update on public.experiences;
create policy experiences_host_update
on public.experiences
for update
using (auth.uid() = host_user_id or public.is_admin())
with check (auth.uid() = host_user_id or public.is_admin());

drop policy if exists experiences_host_delete on public.experiences;
create policy experiences_host_delete
on public.experiences
for delete
using (auth.uid() = host_user_id or public.is_admin());

drop policy if exists experience_tag_map_read on public.experience_tag_map;
create policy experience_tag_map_read
on public.experience_tag_map
for select
using (
  exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and (e.status = 'published' or e.host_user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists experience_tag_map_host_manage on public.experience_tag_map;
create policy experience_tag_map_host_manage
on public.experience_tag_map
for all
using (
  exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and (e.host_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and (e.host_user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists experience_locations_read on public.experience_locations;
create policy experience_locations_read
on public.experience_locations
for select
using (
  exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and (e.status = 'published' or e.host_user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists experience_locations_host_manage on public.experience_locations;
create policy experience_locations_host_manage
on public.experience_locations
for all
using (
  exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and (e.host_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and (e.host_user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists experience_media_read on public.experience_media;
create policy experience_media_read
on public.experience_media
for select
using (
  exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and (e.status = 'published' or e.host_user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists experience_media_host_manage on public.experience_media;
create policy experience_media_host_manage
on public.experience_media
for all
using (
  exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and (e.host_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and (e.host_user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists experience_availability_read on public.experience_availability;
create policy experience_availability_read
on public.experience_availability
for select
using (
  exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and (e.status = 'published' or e.host_user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists experience_availability_host_manage on public.experience_availability;
create policy experience_availability_host_manage
on public.experience_availability
for all
using (
  exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and (e.host_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and (e.host_user_id = auth.uid() or public.is_admin())
  )
);

-- bookings and status history
drop policy if exists bookings_guest_or_host_read on public.bookings;
create policy bookings_guest_or_host_read
on public.bookings
for select
using (
  auth.uid() = guest_user_id
  or auth.uid() = host_user_id
  or public.is_admin()
);

drop policy if exists bookings_guest_create on public.bookings;
create policy bookings_guest_create
on public.bookings
for insert
with check (
  auth.uid() = guest_user_id
  and exists (
    select 1
    from public.experiences e
    where e.id = experience_id
      and e.status = 'published'
  )
);

drop policy if exists bookings_guest_or_host_update on public.bookings;
create policy bookings_guest_or_host_update
on public.bookings
for update
using (
  auth.uid() = guest_user_id
  or auth.uid() = host_user_id
  or public.is_admin()
)
with check (
  auth.uid() = guest_user_id
  or auth.uid() = host_user_id
  or public.is_admin()
);

drop policy if exists booking_status_history_viewable_by_parties on public.booking_status_history;
create policy booking_status_history_viewable_by_parties
on public.booking_status_history
for select
using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (b.guest_user_id = auth.uid() or b.host_user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists booking_status_history_writable_by_parties on public.booking_status_history;
create policy booking_status_history_writable_by_parties
on public.booking_status_history
for insert
with check (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (b.guest_user_id = auth.uid() or b.host_user_id = auth.uid() or public.is_admin())
  )
);

-- payments and payouts
drop policy if exists payments_read_payer_or_payee on public.payments;
create policy payments_read_payer_or_payee
on public.payments
for select
using (
  auth.uid() = payer_user_id
  or auth.uid() = payee_user_id
  or public.is_admin()
);

-- Payment writes should happen via backend/service role.
drop policy if exists payments_admin_manage on public.payments;
create policy payments_admin_manage
on public.payments
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists payouts_read_host_or_admin on public.payouts;
create policy payouts_read_host_or_admin
on public.payouts
for select
using (auth.uid() = host_user_id or public.is_admin());

drop policy if exists payouts_admin_manage on public.payouts;
create policy payouts_admin_manage
on public.payouts
for all
using (public.is_admin())
with check (public.is_admin());

-- reviews
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read
on public.reviews
for select
using (true);

drop policy if exists reviews_guest_create on public.reviews;
create policy reviews_guest_create
on public.reviews
for insert
with check (
  auth.uid() = reviewer_user_id
  and exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.guest_user_id = auth.uid()
      and b.status in ('confirmed', 'completed')
  )
);

drop policy if exists reviews_owner_update on public.reviews;
create policy reviews_owner_update
on public.reviews
for update
using (auth.uid() = reviewer_user_id or public.is_admin())
with check (auth.uid() = reviewer_user_id or public.is_admin());

-- favorites
drop policy if exists favorites_owner_all on public.favorites;
create policy favorites_owner_all
on public.favorites
for all
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- ------------------------------------------------------------
-- Storage buckets and policies
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('experience-media', 'experience-media', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
  ('host-verification', 'host-verification', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

-- Avatars: users can manage only their own folder: {uid}/avatar.ext
drop policy if exists avatar_objects_public_read on storage.objects;
create policy avatar_objects_public_read
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists avatar_objects_owner_write on storage.objects;
create policy avatar_objects_owner_write
on storage.objects
for all
using (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- Experience media: host folder path: {host_uid}/{experience_id}/file.ext
drop policy if exists experience_media_public_read on storage.objects;
create policy experience_media_public_read
on storage.objects
for select
using (bucket_id = 'experience-media');

drop policy if exists experience_media_host_write on storage.objects;
create policy experience_media_host_write
on storage.objects
for all
using (
  bucket_id = 'experience-media'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'experience-media'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- Host verification docs: private, only host owner and admins.
drop policy if exists host_verification_owner_read on storage.objects;
create policy host_verification_owner_read
on storage.objects
for select
using (
  bucket_id = 'host-verification'
  and (
    auth.uid()::text = split_part(name, '/', 1)
    or public.is_admin()
  )
);

drop policy if exists host_verification_owner_write on storage.objects;
create policy host_verification_owner_write
on storage.objects
for all
using (
  bucket_id = 'host-verification'
  and (
    auth.uid()::text = split_part(name, '/', 1)
    or public.is_admin()
  )
)
with check (
  bucket_id = 'host-verification'
  and (
    auth.uid()::text = split_part(name, '/', 1)
    or public.is_admin()
  )
);

-- ------------------------------------------------------------
-- Seed core taxonomy
-- ------------------------------------------------------------
insert into public.categories (slug, name, sort_order)
values
  ('history-culture', 'History & Culture', 10),
  ('food-drink', 'Food & Drink', 20),
  ('nature-outdoors', 'Nature & Outdoors', 30),
  ('art-design', 'Art & Design', 40),
  ('fitness-wellness', 'Fitness & Wellness', 50),
  ('water-sports', 'Water Sports', 60),
  ('flying-experiences', 'Flying Experiences', 70),
  ('animal-experiences', 'Animal Experiences', 80)
on conflict (slug) do nothing;

insert into public.experience_tags (slug, label)
values
  ('small-group', 'Small Group'),
  ('family-friendly', 'Family Friendly'),
  ('outdoor', 'Outdoor'),
  ('beginner-friendly', 'Beginner Friendly'),
  ('local-favorites', 'Local Favorites')
on conflict (slug) do nothing;
