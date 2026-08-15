-- Rename profiles_student → profiles_client, drop cell_number, add nationality.
-- Run AFTER 011_split_profiles_and_ops_roles.sql (and 011a).
--
-- Changes:
--   • public.profiles_student → public.profiles_client
--   • Merge cell_number into phone (when phone empty), then drop cell_number
--   • Add nationality text column for client profile setup

-- ---------------------------------------------------------------------------
-- 1. Rename table (supports either profiles_student or leftover profiles)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles_student'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles_client'
  ) then
    alter table public.profiles_student rename to profiles_client;
  elsif exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles_client'
  ) then
    alter table public.profiles rename to profiles_client;
  end if;
end $$;

comment on table public.profiles_client is
  'Client (member) profile exclusive to accounts.role = user. Used by profile setup and member portal.';

-- ---------------------------------------------------------------------------
-- 2. Phone + nationality columns
-- ---------------------------------------------------------------------------

-- Prefer existing phone; fill from cell_number when phone is blank
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles_client'
      and column_name = 'cell_number'
  ) then
    update public.profiles_client
    set phone = nullif(trim(cell_number), '')
    where coalesce(trim(phone), '') = ''
      and coalesce(trim(cell_number), '') <> '';
  end if;
end $$;

alter table public.profiles_client drop column if exists cell_number;
alter table public.profiles_client add column if not exists nationality text not null default '';

comment on column public.profiles_client.phone is
  'Primary phone number collected during client profile setup.';

comment on column public.profiles_client.nationality is
  'Client nationality (country name) selected during profile setup.';

-- ---------------------------------------------------------------------------
-- 3. Rename updated_at trigger helper / trigger
-- ---------------------------------------------------------------------------

create or replace function public.touch_profile_client_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_student_touch_updated_at on public.profiles_client;
drop trigger if exists profiles_client_touch_updated_at on public.profiles_client;
drop trigger if exists profiles_touch_updated_at on public.profiles_client;

create trigger profiles_client_touch_updated_at
  before update on public.profiles_client
  for each row
  execute function public.touch_profile_client_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Signup / repair → profiles_client
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_first_name text;
  v_last_name text;
  v_middle_initial text;
  v_name text;
begin
  v_first_name := coalesce(new.raw_user_meta_data->>'first_name', '');
  v_last_name := coalesce(new.raw_user_meta_data->>'last_name', '');
  v_middle_initial := coalesce(new.raw_user_meta_data->>'middle_initial', '');

  v_name := trim(both from concat_ws(
    ' ',
    nullif(v_first_name, ''),
    case when v_middle_initial <> '' then v_middle_initial || '.' else null end,
    nullif(v_last_name, '')
  ));

  if v_name = '' then
    v_name := split_part(new.email, '@', 1);
  end if;

  insert into public.accounts (auth_user_id, email, role)
  values (new.id, new.email, 'user')
  returning id into v_account_id;

  insert into public.profiles_client (
    account_id,
    first_name,
    last_name,
    middle_initial,
    name
  )
  values (
    v_account_id,
    v_first_name,
    v_last_name,
    v_middle_initial,
    v_name
  );

  return new;
end;
$$;

create or replace function public.repair_orphaned_user_account()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_auth_email text;
  v_meta jsonb;
  v_account_id uuid;
  v_first_name text;
  v_last_name text;
  v_middle_initial text;
  v_name text;
begin
  if v_auth_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id
  into v_account_id
  from public.accounts
  where auth_user_id = v_auth_user_id;

  if v_account_id is not null then
    return v_account_id;
  end if;

  select email, raw_user_meta_data
  into v_auth_email, v_meta
  from auth.users
  where id = v_auth_user_id;

  if v_auth_email is null then
    raise exception 'Auth user not found';
  end if;

  if exists (
    select 1
    from public.accounts
    where email = v_auth_email
  ) then
    raise exception 'Email already linked to another account';
  end if;

  v_first_name := coalesce(v_meta->>'first_name', '');
  v_last_name := coalesce(v_meta->>'last_name', '');
  v_middle_initial := coalesce(v_meta->>'middle_initial', '');

  v_name := trim(both from concat_ws(
    ' ',
    nullif(v_first_name, ''),
    case when v_middle_initial <> '' then v_middle_initial || '.' else null end,
    nullif(v_last_name, '')
  ));

  if v_name = '' then
    v_name := split_part(v_auth_email, '@', 1);
  end if;

  insert into public.accounts (auth_user_id, email, role)
  values (v_auth_user_id, v_auth_email, 'user')
  returning id into v_account_id;

  insert into public.profiles_client (
    account_id,
    first_name,
    last_name,
    middle_initial,
    name
  )
  values (
    v_account_id,
    v_first_name,
    v_last_name,
    v_middle_initial,
    v_name
  );

  return v_account_id;
end;
$$;

revoke all on function public.repair_orphaned_user_account() from public;
grant execute on function public.repair_orphaned_user_account() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Staff create: remove client profile after promote
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 6. RLS policies on profiles_client
-- ---------------------------------------------------------------------------

alter table public.profiles_client enable row level security;

drop policy if exists "Student profiles select own admin ops" on public.profiles_client;
drop policy if exists "Student profiles insert admin ops" on public.profiles_client;
drop policy if exists "Student profiles update own admin ops" on public.profiles_client;
drop policy if exists "Student profiles delete admin ops" on public.profiles_client;
drop policy if exists "Client profiles select own admin ops" on public.profiles_client;
drop policy if exists "Client profiles insert admin ops" on public.profiles_client;
drop policy if exists "Client profiles update own admin ops" on public.profiles_client;
drop policy if exists "Client profiles delete admin ops" on public.profiles_client;
drop policy if exists "Profiles select own admin dev managed" on public.profiles_client;
drop policy if exists "Profiles insert admin dev managed" on public.profiles_client;
drop policy if exists "Profiles update own admin dev managed" on public.profiles_client;
drop policy if exists "Profiles delete admin dev managed" on public.profiles_client;

create policy "Client profiles select own admin ops"
  on public.profiles_client
  for select
  to authenticated
  using (
    public.is_dev()
    or account_id = public.current_account_id()
    or (public.is_admin() and public.account_is_managed(account_id))
  );

create policy "Client profiles insert admin ops"
  on public.profiles_client
  for insert
  to authenticated
  with check (
    public.is_dev()
    or (public.is_admin() and public.account_is_managed(account_id))
  );

create policy "Client profiles update own admin ops"
  on public.profiles_client
  for update
  to authenticated
  using (
    public.is_dev()
    or account_id = public.current_account_id()
    or (public.is_admin() and public.account_is_managed(account_id))
  )
  with check (
    public.is_dev()
    or account_id = public.current_account_id()
    or (public.is_admin() and public.account_is_managed(account_id))
  );

create policy "Client profiles delete admin ops"
  on public.profiles_client
  for delete
  to authenticated
  using (
    public.is_dev()
    or (public.is_admin() and public.account_is_managed(account_id))
  );

-- ---------------------------------------------------------------------------
-- 7. System log trigger retarget (if 900 installed)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profile_logs'
  ) then
    drop trigger if exists trg_profile_logs on public.profiles_client;
    drop trigger if exists trg_profile_logs on public.profiles_student;
    create trigger trg_profile_logs
      after insert or update or delete on public.profiles_client
      for each row
      execute function public.tg_log_profile_changes();

    comment on table public.profile_logs is
      'Append-only audit of profiles_client and profiles_staff changes. medical_history is redacted when present.';
  end if;
exception
  when undefined_function then
    null;
end $$;
