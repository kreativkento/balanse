-- Precreate BALANSÉ dev account
-- Run in Supabase Dashboard → SQL Editor (after 001_profiles.sql)
--
-- Default login (change password after first sign-in):
--   Email:    dev@balanse.com
--   Password: BalanseDev2026!
--
-- dev role: full access to all portals and all accounts/profiles (RLS bypass).
-- Safe to re-run: skips creation if the email already exists and ensures role = dev.
-- Requires protect_account_role to allow SQL Editor updates (see 003_fix_role_promotion.sql).

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'dev@balanse.com';
  v_password text := '00000000';
  v_instance_id uuid;
begin
  if exists (select 1 from auth.users where email = v_email) then
    update public.accounts
    set role = 'dev'
    where email = v_email;

    raise notice 'Account already exists for %. Role set to dev.', v_email;
    return;
  end if;

  select id into v_instance_id from auth.instances limit 1;

  if v_instance_id is null then
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  end if;

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    v_user_id,
    v_instance_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(v_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    v_email,
    'email',
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    now(),
    now(),
    now()
  );

  -- on_auth_user_created trigger creates account + profile as role = user
  update public.accounts
  set role = 'dev'
  where email = v_email;

  raise notice 'Dev account created.';
  raise notice 'Email: %', v_email;
  raise notice 'Password: %', v_password;
end $$;
