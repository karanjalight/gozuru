-- Fetch incoming/sent applications without triggering deep RLS recursion on bookings reads.

create or replace function public.get_account_applications(
  p_view text default 'incoming',
  p_experience_id uuid default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  booked_at timestamptz,
  status public.booking_status,
  guests_count integer,
  availability_id uuid,
  host_note text,
  experience_id uuid,
  experience_title text,
  slot_starts_at timestamptz,
  slot_ends_at timestamptz
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

  v_limit := greatest(1, least(coalesce(p_limit, 50), 200));

  if coalesce(p_view, 'incoming') = 'sent' then
    return query
    select
      b.id,
      b.booked_at,
      b.status,
      b.guests_count,
      b.availability_id,
      b.host_note,
      e.id as experience_id,
      e.title as experience_title,
      ea.starts_at as slot_starts_at,
      ea.ends_at as slot_ends_at
    from public.bookings b
    left join public.experiences e on e.id = b.experience_id
    left join public.experience_availability ea on ea.id = b.availability_id
    where b.guest_user_id = v_uid
      and (p_experience_id is null or b.experience_id = p_experience_id)
    order by b.booked_at desc
    limit v_limit;
  else
    return query
    select
      b.id,
      b.booked_at,
      b.status,
      b.guests_count,
      b.availability_id,
      b.host_note,
      e.id as experience_id,
      e.title as experience_title,
      ea.starts_at as slot_starts_at,
      ea.ends_at as slot_ends_at
    from public.bookings b
    left join public.experiences e on e.id = b.experience_id
    left join public.experience_availability ea on ea.id = b.availability_id
    where b.host_user_id = v_uid
      and (p_experience_id is null or b.experience_id = p_experience_id)
    order by b.booked_at desc
    limit v_limit;
  end if;
end;
$$;

grant execute on function public.get_account_applications(text, uuid, integer) to authenticated;
