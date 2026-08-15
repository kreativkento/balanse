-- Precreate BALANSÉ admin account
-- Run in Supabase Dashboard → SQL Editor after:
--   001_profiles.sql, 011a_add_ops_roles.sql, 011_split_profiles_and_ops_roles.sql,
--   012_profiles_client_nationality.sql
--
-- Default login (change password after first sign-in):
--   Email:    admin@balanse.com
--   Password: BalanseAdmin2026!
--
-- Safe to re-run: ensures role = admin and a profiles_staff row exists
-- (required for AdminLoginPage after the client/staff profile split).

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_account_id uuid;
  v_email text := 'admin@balanse.com';
  v_password text := '00000000';
  v_instance_id uuid;
  v_name text;
begin
  -- Existing auth user: promote + ensure staff profile + reset known seed password
  if exists (select 1 from auth.users where email = v_email) then
    update auth.users
    set
      encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
    where email = v_email;

    update public.accounts
    set role = 'admin'
    where email = v_email
    returning id into v_account_id;

    if v_account_id is null then
      raise exception 'auth.users row exists for % but public.accounts is missing.', v_email;
    end if;

    -- Move leftover client profile (if any) into staff
    select coalesce(nullif(trim(name), ''), 'Admin')
    into v_name
    from public.profiles_client
    where account_id = v_account_id;

    if v_name is not null then
      insert into public.profiles_staff (account_id, name, display_name, staff_type)
      values (v_account_id, v_name, v_name, 'Administrator')
      on conflict (account_id) do update
      set
        name = excluded.name,
        display_name = excluded.display_name,
        staff_type = excluded.staff_type;

      delete from public.profiles_client where account_id = v_account_id;
    elsif not exists (
      select 1 from public.profiles_staff where account_id = v_account_id
    ) then
      insert into public.profiles_staff (account_id, name, display_name, staff_type)
      values (v_account_id, 'Admin', 'Admin', 'Administrator');
    end if;

    raise notice 'Account already exists for %. Role set to admin and profiles_staff ensured.', v_email;
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
    jsonb_build_object('first_name', 'Studio', 'last_name', 'Admin'),
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

  -- Trigger creates accounts + profiles_client as role = user
  select id into v_account_id from public.accounts where auth_user_id = v_user_id;

  if v_account_id is null then
    raise exception 'Failed to create public.accounts for admin.';
  end if;

  update public.accounts
  set role = 'admin'
  where id = v_account_id;

  delete from public.profiles_client where account_id = v_account_id;

  insert into public.profiles_staff (
    account_id,
    first_name,
    last_name,
    name,
    display_name,
    staff_type
  )
  values (
    v_account_id,
    'Studio',
    'Admin',
    'Studio Admin',
    'Studio Admin',
    'Administrator'
  )
  on conflict (account_id) do update
  set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    name = excluded.name,
    display_name = excluded.display_name,
    staff_type = excluded.staff_type;

  raise notice 'Admin account created.';
  raise notice 'Email: %', v_email;
  raise notice 'Password: %', v_password;
end $$;
