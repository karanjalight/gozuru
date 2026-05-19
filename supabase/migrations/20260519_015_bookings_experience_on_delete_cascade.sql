-- When a host deletes an experience, remove dependent bookings automatically.
-- Payments, booking history, and messages already cascade from bookings.

alter table public.bookings
  drop constraint if exists bookings_experience_id_fkey;

alter table public.bookings
  add constraint bookings_experience_id_fkey
  foreign key (experience_id)
  references public.experiences(id)
  on delete cascade;
