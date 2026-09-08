-- Location + emergency contact on profiles_client.
-- Run after 012_profiles_client_nationality.sql.
--
-- Changes:
--   • Drop free-text address
--   • Add nullable province, city, barangay
--   • Add nullable emergency contact name / number / relationship
--
-- New columns stay nullable so incomplete member profiles can omit them.

alter table public.profiles_client
  add column if not exists province text,
  add column if not exists city text,
  add column if not exists barangay text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_number text,
  add column if not exists emergency_contact_relationship text;

-- Keep leftover free-text address in city when city is still empty
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles_client'
      and column_name = 'address'
  ) then
    update public.profiles_client
    set city = nullif(trim(address), '')
    where city is null
      and coalesce(trim(address), '') <> '';
  end if;
end $$;

alter table public.profiles_client drop column if exists address;

comment on column public.profiles_client.province is
  'Client home province. Nullable until the member fills it in.';

comment on column public.profiles_client.city is
  'Client home city / municipality. Nullable until the member fills it in.';

comment on column public.profiles_client.barangay is
  'Optional client barangay.';

comment on column public.profiles_client.emergency_contact_name is
  'Person to notify in an emergency during class. Nullable until set.';

comment on column public.profiles_client.emergency_contact_number is
  'Emergency contact phone number. Nullable until set.';

comment on column public.profiles_client.emergency_contact_relationship is
  'Relationship of the emergency contact to the member. Nullable until set.';
