-- Flip currency column defaults from USD to KES, matching the host listing
-- form's KES-only lock (app/account/experiences/create/page.tsx). The
-- currency_code enum still permits all five codes (USD/EUR/GBP/KES/CAD) —
-- this migration only changes what a new row defaults to when currency
-- isn't explicitly provided; it does not add a CHECK constraint and does
-- not touch existing rows.

alter table public.experiences alter column currency set default 'KES';
alter table public.bookings alter column currency set default 'KES';
alter table public.payments alter column currency set default 'KES';
alter table public.payouts alter column currency set default 'KES';
