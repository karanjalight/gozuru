-- Ensure availability meeting place column exists for slot flows.

alter table public.experience_availability
  add column if not exists meeting_place_name text;

create index if not exists idx_experience_availability_meeting_place_name
  on public.experience_availability(meeting_place_name);

