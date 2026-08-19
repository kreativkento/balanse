-- STEP 2 of 2 — split profiles + wire ops-role privileges
-- Prerequisites:
--   1. Run 011a_add_ops_roles.sql FIRST (must succeed/commit on its own)
--   2. Then run this file
--
-- Changes:
--   • is_admin() treats frontdesk + marketing like admin
--   • public.profiles → public.profiles_student  (role = user only)
--   • public.profiles_staff                   (coach/admin/dev/frontdesk/marketing)
--   • Signup creates student profiles only; staff create moves to profiles_staff

-- Guard: fail fast if STEP 1 was skipped
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typnamespace = 'public'::regnamespace
      and t.typname = 'user_role'
      and e.enumlabel = 'frontdesk'
  ) or not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typnamespace = 'public'::regnamespace
      and t.typname = 'user_role'
      and e.enumlabel = 'marketing'
  ) then
    raise exception
      'Missing frontdesk/marketing on user_role. Run 011a_add_ops_roles.sql first, then re-run this file.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Privilege helpers (uses committed frontdesk / marketing values)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role in (
        'admin'::public.user_role,
        'frontdesk'::public.user_role,
        'marketing'::public.user_role
      )
      from public.accounts
      where auth_user_id = auth.uid()
    ),
    false
  );
$$;

comment on function public.is_admin() is
  'True for admin, frontdesk, and marketing (ops roles with admin privileges).';

create or replace function public.is_staff_role(target_role public.user_role)
returns boolean
language sql
immutable
as $$
  select target_role in (
    'coach'::public.user_role,
    'admin'::public.user_role,
    'dev'::public.user_role,
    'frontdesk'::public.user_role,
    'marketing'::public.user_role
  );
$$;

create or replace function public.account_is_staff_list_visible(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts a
    where a.id = p_account_id
      and public.is_staff_role(a.role)
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Rename profiles → profiles_student (if not already)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles_student'
  ) then
    alter table public.profiles rename to profiles_student;
  end if;
end $$;

-- Drop FK from profile_logs so staff profile ids can also be logged without FK violations
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'profile_logs'
      and constraint_name = 'profile_logs_profile_id_fkey'
  ) then
    alter table public.profile_logs drop constraint profile_logs_profile_id_fkey;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Create profiles_staff
-- ---------------------------------------------------------------------------

create table if not exists public.profiles_staff (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.accounts (id) on delete cascade,

  first_name text not null default '',
  last_name text not null default '',
  middle_initial text not null default '',
  name text not null default '',
  phone text not null default '',

  display_name text not null default '',
  photo text not null default '',
  bio text not null default '',
  experience text not null default '',
  classes text[] not null default '{}',
  staff_type text not null default 'Coach',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles_staff is
  'Staff/ops profile (coach, admin, dev, frontdesk, marketing). One row per staff account.';

comment on table public.profiles_student is
  'Student profile exclusive to accounts.role = user. One row per student account.';

create index if not exists profiles_staff_account_id_idx on public.profiles_staff (account_id);

-- ---------------------------------------------------------------------------
-- 4. Migrate existing non-user profiles into profiles_staff
-- ---------------------------------------------------------------------------

insert into public.profiles_staff (
  id,
  account_id,
  first_name,
  last_name,
  middle_initial,
  name,
  phone,
  display_name,
  photo,
  bio,
  experience,
  classes,
  staff_type,
  created_at,
  updated_at
)
select
  p.id,
  p.account_id,
  p.first_name,
  p.last_name,
  p.middle_initial,
  p.name,
  coalesce(p.phone, ''),
  coalesce(nullif(p.display_name, ''), p.name),
  coalesce(p.photo, ''),
  coalesce(p.bio, ''),
  coalesce(p.experience, ''),
  coalesce(p.classes, '{}'),
  case
    when coalesce(p.experience, '') = 'Administrator' then 'Administrator'
    else 'Coach'
  end,
  p.created_at,
  p.updated_at
from public.profiles_student p
join public.accounts a on a.id = p.account_id
where public.is_staff_role(a.role)
on conflict (account_id) do nothing;

-- Remove student rows for staff accounts (student table is user-only)
delete from public.profiles_student p
using public.accounts a
where p.account_id = a.id
  and public.is_staff_role(a.role);

-- ---------------------------------------------------------------------------
-- 5. Strip staff-only columns from profiles_student
-- ---------------------------------------------------------------------------

alter table public.profiles_student drop column if exists display_name;
alter table public.profiles_student drop column if exists photo;
alter table public.profiles_student drop column if exists bio;
alter table public.profiles_student drop column if exists experience;
alter table public.profiles_student drop column if exists classes;

-- ---------------------------------------------------------------------------
-- 6. updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_profile_student_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.touch_profile_staff_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles_student;
drop trigger if exists profiles_student_touch_updated_at on public.profiles_student;
create trigger profiles_student_touch_updated_at
  before update on public.profiles_student
  for each row
  execute function public.touch_profile_student_updated_at();

drop trigger if exists profiles_staff_touch_updated_at on public.profiles_staff;
create trigger profiles_staff_touch_updated_at
  before update on public.profiles_staff
  for each row
  execute function public.touch_profile_staff_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Signup / repair → student profile only
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

  insert into public.profiles_student (
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

  insert into public.profiles_student (
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
-- 8. Admin create staff → promote + move to profiles_staff
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

  -- Move out of student profiles into staff profiles
  delete from public.profiles_student where account_id = v_account_id;

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
-- 9. RLS for profiles_student + profiles_staff
-- ---------------------------------------------------------------------------

alter table public.profiles_student enable row level security;
alter table public.profiles_staff enable row level security;

-- Drop old/new policy names on both tables
drop policy if exists "Profiles select own admin dev managed" on public.profiles_student;
drop policy if exists "Profiles insert admin dev managed" on public.profiles_student;
drop policy if exists "Profiles update own admin dev managed" on public.profiles_student;
drop policy if exists "Profiles delete admin dev managed" on public.profiles_student;
drop policy if exists "Student profiles select own admin ops" on public.profiles_student;
drop policy if exists "Student profiles insert admin ops" on public.profiles_student;
drop policy if exists "Student profiles update own admin ops" on public.profiles_student;
drop policy if exists "Student profiles delete admin ops" on public.profiles_student;

drop policy if exists "Staff profiles select own admin ops" on public.profiles_staff;
drop policy if exists "Staff profiles insert admin ops" on public.profiles_staff;
drop policy if exists "Staff profiles update own admin ops" on public.profiles_staff;
drop policy if exists "Staff profiles delete admin ops" on public.profiles_staff;

create policy "Student profiles select own admin ops"
  on public.profiles_student
  for select
  to authenticated
  using (
    public.is_dev()
    or account_id = public.current_account_id()
    or (public.is_admin() and public.account_is_managed(account_id))
  );

create policy "Student profiles insert admin ops"
  on public.profiles_student
  for insert
  to authenticated
  with check (
    public.is_dev()
    or (public.is_admin() and public.account_is_managed(account_id))
  );

create policy "Student profiles update own admin ops"
  on public.profiles_student
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

create policy "Student profiles delete admin ops"
  on public.profiles_student
  for delete
  to authenticated
  using (
    public.is_dev()
    or (public.is_admin() and public.account_is_managed(account_id))
  );

create policy "Staff profiles select own admin ops"
  on public.profiles_staff
  for select
  to authenticated
  using (
    public.is_dev()
    or account_id = public.current_account_id()
    or (public.is_admin() and public.account_is_staff_list_visible(account_id))
    or (public.is_admin() and public.account_is_managed(account_id))
  );

create policy "Staff profiles insert admin ops"
  on public.profiles_staff
  for insert
  to authenticated
  with check (
    public.is_dev()
    or (public.is_admin() and (
      public.account_is_managed(account_id)
      or public.account_is_staff_list_visible(account_id)
    ))
  );

create policy "Staff profiles update own admin ops"
  on public.profiles_staff
  for update
  to authenticated
  using (
    public.is_dev()
    or account_id = public.current_account_id()
    or (public.is_admin() and (
      public.account_is_managed(account_id)
      or public.account_is_staff_list_visible(account_id)
    ))
  )
  with check (
    public.is_dev()
    or account_id = public.current_account_id()
    or (public.is_admin() and (
      public.account_is_managed(account_id)
      or public.account_is_staff_list_visible(account_id)
    ))
  );

create policy "Staff profiles delete admin ops"
  on public.profiles_staff
  for delete
  to authenticated
  using (
    public.is_dev()
    or (public.is_admin() and (
      public.account_is_managed(account_id)
      or public.account_is_staff_list_visible(account_id)
    ))
  );

-- Refresh accounts select so ops roles can see the full staff directory
drop policy if exists "Accounts select own admin dev" on public.accounts;

create policy "Accounts select own admin dev"
  on public.accounts
  for select
  to authenticated
  using (
    public.is_dev()
    or auth_user_id = auth.uid()
    or (public.is_admin() and public.is_staff_role(role))
    or (public.is_admin() and public.is_managed_account_role(role))
  );

-- ---------------------------------------------------------------------------
-- 10. System log triggers (if 900 is installed)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profile_logs'
  ) then
    drop trigger if exists trg_profile_logs on public.profiles_student;
    drop trigger if exists trg_profile_logs on public.profiles;
    create trigger trg_profile_logs
      after insert or update or delete on public.profiles_student
      for each row
      execute function public.tg_log_profile_changes();

    drop trigger if exists trg_profile_staff_logs on public.profiles_staff;
    create trigger trg_profile_staff_logs
      after insert or update or delete on public.profiles_staff
      for each row
      execute function public.tg_log_profile_changes();

    comment on table public.profile_logs is
      'Append-only audit of profiles_student and profiles_staff changes. medical_history is redacted when present.';
  end if;
exception
  when undefined_function then
    null;
end $$;

-- ---------------------------------------------------------------------------
-- 11. Promote helpers (optional examples)
-- ---------------------------------------------------------------------------
-- update public.accounts set role = 'frontdesk' where email = 'front@example.com';
-- update public.accounts set role = 'marketing' where email = 'marketing@example.com';
--
-- After promoting a user → ops/staff role, move their profile:
--   1) insert into profiles_staff (...) from profiles_student
--   2) delete from profiles_student where account_id = ...
