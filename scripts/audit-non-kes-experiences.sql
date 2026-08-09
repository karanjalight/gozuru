-- Audit: find published experiences priced in a currency other than KES.
--
-- Context: the host listing form previously allowed USD/EUR/GBP/CAD/KES,
-- but every public page always displays a raw "Ksh" prefix regardless of
-- the stored currency — producing misleading prices (e.g. a $85 listing
-- shown publicly as "Ksh 85"). The form now only creates KES listings
-- (see docs/superpowers/plans/2026-08-09-phase1-homepage-experiences.md,
-- Task 3). This query finds any pre-existing rows that still need a
-- manual decision (re-price in KES, or mark as draft until fixed).
--
-- Usage: Supabase Dashboard → SQL Editor → paste and run.

select
  e.id,
  e.title,
  e.status,
  e.price_amount,
  e.currency,
  e.host_user_id,
  e.created_at
from public.experiences e
where e.currency is distinct from 'KES'
order by e.created_at desc;

-- Same check on per-slot price overrides, if any exist:
select
  a.id as availability_id,
  a.experience_id,
  e.title,
  a.price_amount,
  a.currency,
  a.starts_at
from public.experience_availability a
join public.experiences e on e.id = a.experience_id
where a.currency is distinct from 'KES'
order by a.starts_at desc;
