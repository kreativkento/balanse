-- Allow admin_create_staff_account to create any staff role (not only coach).
-- Maps p_staff_type → accounts.role. Run after 015_coach_disciplines.sql.

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
  v_staff_type text := coalesce(nullif(trim(p_staff_type), ''), 'Coach');
  v_role public.user_role;
  v_type_key text := lower(trim(v_staff_type));
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

  v_role := case v_type_key
    when 'admin' then 'admin'::public.user_role
    when 'administrator' then 'admin'::public.user_role
    when 'dev' then 'dev'::public.user_role
    when 'frontdesk' then 'frontdesk'::public.user_role
    when 'front desk' then 'frontdesk'::public.user_role
    when 'marketing' then 'marketing'::public.user_role
    when 'coach' then 'coach'::public.user_role
    else 'coach'::public.user_role
  end;

  v_staff_type := case v_role
    when 'admin'::public.user_role then 'Admin'
    when 'dev'::public.user_role then 'Dev'
    when 'frontdesk'::public.user_role then 'Front Desk'
    when 'marketing'::public.user_role then 'Marketing'
    else 'Coach'
  end;

  v_first_name := split_part(v_name, ' ', 1);
  v_last_name := case
    when position(' ' in v_name) > 0 then substring(v_name from position(' ' in v_name) + 1)
    else ''
  end;

  if v_role = 'coach'::public.user_role
     and p_specialty is not null
     and p_specialty <> ''
     and p_specialty <> '—' then
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
  set role = v_role
  where id = v_account_id;

  delete from public.profiles_client where account_id = v_account_id;

  insert into public.profiles_staff (
    account_id,
    first_name,
    last_name,
    name,
    display_name,
    classes,
    experience,
    staff_type
  )
  values (
    v_account_id,
    coalesce(v_first_name, ''),
    coalesce(v_last_name, ''),
    coalesce(nullif(v_name, ''), v_email),
    coalesce(nullif(v_name, ''), v_email),
    v_classes,
    v_staff_type,
    v_staff_type
  )
  on conflict (account_id) do update
  set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    name = excluded.name,
    display_name = excluded.display_name,
    classes = excluded.classes,
    experience = excluded.experience,
    staff_type = excluded.staff_type;

  return v_account_id;
end;
$$;

revoke all on function public.admin_create_staff_account(text, text, text, text, text) from public;
grant execute on function public.admin_create_staff_account(text, text, text, text, text) to authenticated;

comment on function public.admin_create_staff_account(text, text, text, text, text) is
  'Create a staff account (coach/admin/dev/frontdesk/marketing). p_staff_type maps to accounts.role.';
