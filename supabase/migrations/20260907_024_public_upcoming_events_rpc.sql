-- Read-only RPC powering the public "Upcoming experiences" showcase on the
-- experiences page. Returns one row per published experience — its soonest
-- non-cancelled future slot — ordered by that slot's start time. Security
-- definer avoids the RLS recursion issues noted on get_public_upcoming_slots.

create or replace function public.get_public_upcoming_events(
  p_limit integer default 3
)
returns table (
  experience_id uuid,
  title text,
  description text,
  subtitle text,
  category_name text,
  category_slug text,
  meeting_point_name text,
  max_guests integer,
  next_starts_at timestamptz,
  next_ends_at timestamptz,
  slot_capacity integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_limit is null or p_limit < 1 then
    p_limit := 3;
  end if;

  return query
  select
    next_slot.experience_id,
    e.title,
    e.description,
    e.subtitle,
    c.name as category_name,
    c.slug as category_slug,
    e.meeting_point_name,
    e.max_guests,
    next_slot.starts_at as next_starts_at,
    next_slot.ends_at as next_ends_at,
    next_slot.capacity as slot_capacity
  from (
    select distinct on (ea.experience_id)
      ea.experience_id,
      ea.starts_at,
      ea.ends_at,
      ea.capacity
    from public.experience_availability ea
    join public.experiences e on e.id = ea.experience_id
    where ea.is_cancelled = false
      and ea.starts_at >= now()
      and e.status = 'published'
    order by ea.experience_id, ea.starts_at asc
  ) next_slot
  join public.experiences e on e.id = next_slot.experience_id
  left join public.categories c on c.id = e.category_id
  order by next_slot.starts_at asc
  limit p_limit;
end;
$$;

grant execute on function public.get_public_upcoming_events(integer) to anon, authenticated;
