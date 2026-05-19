-- Deleting a host profile cascades to their catalog and booking-side records.
-- Requires bookings.experience_id ON DELETE CASCADE (20260519_015).

alter table public.experiences
  drop constraint if exists experiences_host_user_id_fkey;

alter table public.experiences
  add constraint experiences_host_user_id_fkey
  foreign key (host_user_id)
  references public.host_profiles(user_id)
  on delete cascade;

alter table public.bookings
  drop constraint if exists bookings_host_user_id_fkey;

alter table public.bookings
  add constraint bookings_host_user_id_fkey
  foreign key (host_user_id)
  references public.host_profiles(user_id)
  on delete cascade;

alter table public.payments
  drop constraint if exists payments_payee_user_id_fkey;

alter table public.payments
  add constraint payments_payee_user_id_fkey
  foreign key (payee_user_id)
  references public.host_profiles(user_id)
  on delete cascade;
