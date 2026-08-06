-- Allow admins/devs to create staff login accounts from the admin portal.
-- Run in Supabase SQL Editor after 001_profiles.sql and 003_fix_role_promotion.sql.

create or replace function public.admin_create_staff_account(
  p_email text,
  p_password text,
  p_name text default '',
  p_specialty text default '',
  p_staff_type text default 'Coach'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := gen_random_uuid();
  v_account_id uuid;
  v_instance_id uuid;
  v_email text := lower(trim(p_email));
  v_name text := trim(p_name);
  v_first_name text;
  v_last_name text;
  v_classes text[];
begin
  if not public.is_admin_or_dev() then
    raise exception 'Access denied';
  end if;

  if v_email = '' then
    raise exception 'Email is required';
  end if;

  if length(trim(p_password)) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'ACCOUNT_EXISTS';
  end if;

  v_first_name := split_part(v_name, ' ', 1);
  v_last_name := case
    when position(' ' in v_name) > 0 then substring(v_name from position(' ' in v_name) + 1)
    else ''
  end;

  if p_specialty is not null and p_specialty <> '' and p_specialty <> '—' then
    v_classes := array[p_specialty];
  else
    v_classes := '{}';
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
    extensions.crypt(trim(p_password), extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'first_name', v_first_name,
      'last_name', v_last_name
    ),
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

  select id into v_account_id from public.accounts where auth_user_id = v_user_id;

  if v_account_id is null then
    raise exception 'Failed to create staff account record';
  end if;

  update public.accounts
  set role = 'coach'
  where id = v_account_id;

  update public.profiles
  set
    first_name = coalesce(v_first_name, ''),
    last_name = coalesce(v_last_name, ''),
    name = coalesce(nullif(v_name, ''), v_email),
    display_name = coalesce(nullif(v_name, ''), v_email),
    classes = v_classes,
    experience = coalesce(nullif(trim(p_staff_type), ''), 'Coach')
  where account_id = v_account_id;

  return v_account_id;
end;
$$;

revoke all on function public.admin_create_staff_account(text, text, text, text, text) from public;
grant execute on function public.admin_create_staff_account(text, text, text, text, text) to authenticated;
