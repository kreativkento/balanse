-- Optional preferred name for members.
-- Run after 033_profiles_client_phone_valid.sql.

alter table public.profiles_client
  add column if not exists nickname text not null default '';

comment on column public.profiles_client.nickname is
  'Optional preferred name or nickname shown on the member profile.';
