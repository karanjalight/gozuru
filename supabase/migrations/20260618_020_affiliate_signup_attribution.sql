-- Attribute affiliate referrals at signup from user metadata and sync phone to profile.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral_code text;
  v_affiliate_user_id uuid;
begin
  insert into public.profiles (user_id, email, first_name, last_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '')
  )
  on conflict (user_id) do update set
    email = excluded.email,
    first_name = coalesce(nullif(excluded.first_name, ''), public.profiles.first_name),
    last_name = coalesce(nullif(excluded.last_name, ''), public.profiles.last_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'traveler')
  on conflict do nothing;

  v_referral_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));
  if length(v_referral_code) > 0 then
    select ap.user_id
    into v_affiliate_user_id
    from public.affiliate_profiles ap
    where ap.referral_code = v_referral_code;

    if found and v_affiliate_user_id <> new.id then
      insert into public.affiliate_referrals (affiliate_user_id, referred_user_id)
      values (v_affiliate_user_id, new.id)
      on conflict (referred_user_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;
