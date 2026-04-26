-- Read-only RPC for public upcoming slots on published experiences.
-- Helps avoid client-side policy recursion errors on direct table reads.

create or replace function public.get_public_upcoming_slots(
  p_experience_id uuid,
  p_limit integer default 6
)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  price_amount numeric,
  currency public.currency_code,
  meeting_place_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_limit is null or p_limit < 1 then
    p_limit := 6;
  end if;

  return query
  select
    ea.id,
    ea.starts_at,
    ea.ends_at,
    ea.capacity,
    ea.price_amount,
    ea.currency,
    ea.meeting_place_name
  from public.experience_availability ea
  join public.experiences e on e.id = ea.experience_id
  where ea.experience_id = p_experience_id
    and ea.is_cancelled = false
    and ea.starts_at >= now()
    and e.status = 'published'
  order by ea.starts_at asc
  limit p_limit;
end;
$$;

grant execute on function public.get_public_upcoming_slots(uuid, integer) to anon, authenticated;
