-- Messaging between guests and hosts for active paid bookings.

create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  message_text text not null check (char_length(trim(message_text)) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_messages_booking_created
  on public.booking_messages(booking_id, created_at desc);
create index if not exists idx_booking_messages_sender_created
  on public.booking_messages(sender_user_id, created_at desc);

alter table public.booking_messages enable row level security;

drop policy if exists booking_messages_select_participants on public.booking_messages;
create policy booking_messages_select_participants
on public.booking_messages
for select
using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (
        b.guest_user_id = auth.uid()
        or b.host_user_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists booking_messages_insert_participants on public.booking_messages;
create policy booking_messages_insert_participants
on public.booking_messages
for insert
with check (
  exists (
    select 1
    from public.bookings b
    left join public.experience_availability ea on ea.id = b.availability_id
    where b.id = booking_id
      and (
        b.guest_user_id = auth.uid()
        or b.host_user_id = auth.uid()
        or public.is_admin()
      )
      and b.status in ('requested', 'confirmed')
      and (ea.id is null or (not ea.is_cancelled and ea.ends_at > now()))
  )
);

drop policy if exists booking_messages_update_read_state on public.booking_messages;
create policy booking_messages_update_read_state
on public.booking_messages
for update
using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (
        b.guest_user_id = auth.uid()
        or b.host_user_id = auth.uid()
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (
        b.guest_user_id = auth.uid()
        or b.host_user_id = auth.uid()
        or public.is_admin()
      )
  )
);

create or replace function public.get_account_message_threads(p_limit integer default 30)
returns table (
  booking_id uuid,
  experience_id uuid,
  experience_title text,
  slot_starts_at timestamptz,
  slot_ends_at timestamptz,
  counterpart_user_id uuid,
  counterpart_name text,
  counterpart_email text,
  counterpart_avatar_path text,
  last_message_id uuid,
  last_message_text text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  unread_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_limit integer;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 30), 100));

  return query
  with eligible_bookings as (
    select
      b.id as booking_id,
      b.experience_id,
      b.guest_user_id,
      b.host_user_id,
      case when b.guest_user_id = v_uid then b.host_user_id else b.guest_user_id end as counterpart_user_id
    from public.bookings b
    left join public.experience_availability ea on ea.id = b.availability_id
    where (b.guest_user_id = v_uid or b.host_user_id = v_uid)
      and b.status in ('requested', 'confirmed')
      and (ea.id is null or (not ea.is_cancelled and ea.ends_at > now()))
  ),
  threaded as (
    select
      eb.booking_id,
      eb.experience_id,
      eb.counterpart_user_id,
      lm.id as last_message_id,
      lm.message_text as last_message_text,
      lm.created_at as last_message_at,
      lm.sender_user_id as last_message_sender_id,
      (
        select count(*)
        from public.booking_messages bm_unread
        where bm_unread.booking_id = eb.booking_id
          and bm_unread.sender_user_id <> v_uid
          and bm_unread.read_at is null
      ) as unread_count
    from eligible_bookings eb
    left join lateral (
      select bm.id, bm.message_text, bm.created_at, bm.sender_user_id
      from public.booking_messages bm
      where bm.booking_id = eb.booking_id
      order by bm.created_at desc
      limit 1
    ) lm on true
  )
  select
    t.booking_id,
    e.id as experience_id,
    e.title as experience_title,
    ea.starts_at as slot_starts_at,
    ea.ends_at as slot_ends_at,
    t.counterpart_user_id,
    coalesce(nullif(trim(p.display_name), ''), p.email::text, 'User') as counterpart_name,
    p.email::text as counterpart_email,
    p.avatar_path as counterpart_avatar_path,
    t.last_message_id,
    t.last_message_text,
    t.last_message_at,
    t.last_message_sender_id,
    t.unread_count
  from threaded t
  join public.bookings b on b.id = t.booking_id
  left join public.experiences e on e.id = b.experience_id
  left join public.experience_availability ea on ea.id = b.availability_id
  left join public.profiles p on p.user_id = t.counterpart_user_id
  order by coalesce(t.last_message_at, b.booked_at) desc
  limit v_limit;
end;
$$;

grant execute on function public.get_account_message_threads(integer) to authenticated;

create or replace function public.send_booking_message(
  p_booking_id uuid,
  p_message_text text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_message_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  if p_booking_id is null then
    raise exception 'Booking is required.';
  end if;

  if p_message_text is null or char_length(trim(p_message_text)) = 0 then
    raise exception 'Message cannot be empty.';
  end if;

  insert into public.booking_messages (booking_id, sender_user_id, message_text)
  select
    b.id,
    v_uid,
    trim(p_message_text)
  from public.bookings b
  left join public.experience_availability ea on ea.id = b.availability_id
  where b.id = p_booking_id
    and (b.guest_user_id = v_uid or b.host_user_id = v_uid)
    and b.status in ('requested', 'confirmed')
    and (ea.id is null or (not ea.is_cancelled and ea.ends_at > now()))
  returning id into v_message_id;

  if v_message_id is null then
    raise exception 'This conversation is not available for messaging.';
  end if;

  return v_message_id;
end;
$$;

grant execute on function public.send_booking_message(uuid, text) to authenticated;

create or replace function public.mark_booking_messages_read(p_booking_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_count integer := 0;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  if p_booking_id is null then
    return 0;
  end if;

  with updated_rows as (
    update public.booking_messages bm
    set read_at = now()
    where bm.booking_id = p_booking_id
      and bm.sender_user_id <> v_uid
      and bm.read_at is null
      and exists (
        select 1
        from public.bookings b
        where b.id = bm.booking_id
          and (b.guest_user_id = v_uid or b.host_user_id = v_uid)
      )
    returning 1
  )
  select count(*)::integer into v_count from updated_rows;

  return v_count;
end;
$$;

grant execute on function public.mark_booking_messages_read(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'booking_messages'
  ) then
    alter publication supabase_realtime add table public.booking_messages;
  end if;
end;
$$;
