-- BALANSÉ accounts + profiles schema for Supabase Auth
-- Run this in Supabase Dashboard → SQL Editor (or via Supabase CLI migrations)
--
-- Architecture:
--   auth.users      → email + password (managed by Supabase Auth)
--   public.accounts → login identity (email) + role, linked to auth.users
--   public.profiles → system-generated profile id, profile fields, linked to accounts
--
-- Safe to run on:
--   • a fresh Supabase project
--   • an existing project that already has accounts + profiles tables
--
-- If you need a full wipe first, run 000_reset_balanse_auth.sql, then this file.

-- ---------------------------------------------------------------------------
-- 1. Role enum, accounts table, profiles table
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

do $$
begin
  create type public.user_role as enum ('user', 'coach', 'admin', 'dev');
exception
  when duplicate_object then null;
end $$;

alter type public.user_role add value if not exists 'dev';

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.accounts is
  'Login account record. Email is stored here; password is managed securely by Supabase Auth (auth.users).';

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.accounts (id) on delete cascade,

  -- Signup / user profile fields
  first_name text not null default '',
  last_name text not null default '',
  middle_initial text not null default '',
  name text not null default '',
  birthday date,
  sex text not null default '',
  phone text not null default '',
  cell_number text not null default '',
  address text not null default '',
  weight text not null default '',
  height text not null default '',
  medical_history text not null default '',
  health_declaration_signed boolean not null default false,
  terms_accepted boolean not null default false,
  share_availability boolean not null default false,
  profile_complete boolean not null default false,

  -- Staff coach profile fields
  display_name text not null default '',
  photo text not null default '',
  bio text not null default '',
  experience text not null default '',
  classes text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Profile data linked to an account. Each profile has its own system-generated UUID.';

create index if not exists accounts_auth_user_id_idx on public.accounts (auth_user_id);
create index if not exists accounts_email_idx on public.accounts (email);
create index if not exists accounts_role_idx on public.accounts (role);
create index if not exists profiles_account_id_idx on public.profiles (account_id);

-- ---------------------------------------------------------------------------
-- 2. Helper functions for RLS
-- ---------------------------------------------------------------------------

create or replace function public.current_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.accounts
  where auth_user_id = auth.uid();
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.accounts
  where auth_user_id = auth.uid();
$$;

create or replace function public.is_dev()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'dev'::public.user_role from public.accounts where auth_user_id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin'::public.user_role from public.accounts where auth_user_id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin_or_dev()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_dev() or public.is_admin();
$$;

create or replace function public.is_managed_account_role(target_role public.user_role)
returns boolean
language sql
immutable
as $$
  select target_role in ('user'::public.user_role, 'coach'::public.user_role);
$$;

create or replace function public.account_is_managed(p_account_id uuid)
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
      and public.is_managed_account_role(a.role)
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
      and a.role in ('coach'::public.user_role, 'dev'::public.user_role, 'admin'::public.user_role)
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Auto-create account + profile on auth signup (always role = user)
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

  insert into public.profiles (
    account_id,
    first_name,
    last_name,
    middle_initial,
    name,
    display_name
  )
  values (
    v_account_id,
    v_first_name,
    v_last_name,
    v_middle_initial,
    v_name,
    v_name
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Prevent clients from changing account role
-- ---------------------------------------------------------------------------

create or replace function public.protect_account_role()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.role is distinct from new.role then
    -- SQL Editor / migrations run without a JWT (auth.uid() is null)
    if auth.uid() is null then
      null;
    elsif public.is_dev() then
      null;
    elsif public.is_admin()
      and public.is_managed_account_role(old.role)
      and public.is_managed_account_role(new.role) then
      null;
    else
      new.role := old.role;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists accounts_protect_role on public.accounts;

create trigger accounts_protect_role
  before update on public.accounts
  for each row
  execute function public.protect_account_role();

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row
  execute function public.touch_profile_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.accounts enable row level security;
alter table public.profiles enable row level security;

-- Drop legacy policy names (from earlier migration attempts)
drop policy if exists "Accounts select own or dev all" on public.accounts;
drop policy if exists "Accounts update dev all" on public.accounts;
drop policy if exists "Accounts insert dev all" on public.accounts;
drop policy if exists "Accounts delete dev all" on public.accounts;
drop policy if exists "Profiles select own or dev all" on public.profiles;
drop policy if exists "Profiles update own or dev all" on public.profiles;
drop policy if exists "Profiles insert dev all" on public.profiles;
drop policy if exists "Profiles delete dev all" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- Drop current policy names so this script is safe to re-run
drop policy if exists "Accounts select own admin dev" on public.accounts;
drop policy if exists "Accounts insert admin dev managed roles" on public.accounts;
drop policy if exists "Accounts update own admin dev managed" on public.accounts;
drop policy if exists "Accounts delete admin dev managed" on public.accounts;
drop policy if exists "Profiles select own admin dev managed" on public.profiles;
drop policy if exists "Profiles insert admin dev managed" on public.profiles;
drop policy if exists "Profiles update own admin dev managed" on public.profiles;
drop policy if exists "Profiles delete admin dev managed" on public.profiles;

-- Accounts: own row, admin/dev manage user + staff, dev full access
create policy "Accounts select own admin dev"
  on public.accounts
  for select
  to authenticated
  using (
    public.is_dev()
    or auth_user_id = auth.uid()
    or (public.is_admin() and role in ('coach'::public.user_role, 'dev'::public.user_role, 'admin'::public.user_role))
    or (public.is_admin() and public.is_managed_account_role(role))
  );

create policy "Accounts insert admin dev managed roles"
  on public.accounts
  for insert
  to authenticated
  with check (
    public.is_dev()
    or (public.is_admin() and public.is_managed_account_role(role))
  );

create policy "Accounts update own admin dev managed"
  on public.accounts
  for update
  to authenticated
  using (
    public.is_dev()
    or auth_user_id = auth.uid()
    or (public.is_admin() and public.is_managed_account_role(role))
  )
  with check (
    public.is_dev()
    or auth_user_id = auth.uid()
    or (public.is_admin() and public.is_managed_account_role(role))
  );

create policy "Accounts delete admin dev managed"
  on public.accounts
  for delete
  to authenticated
  using (
    public.is_dev()
    or (public.is_admin() and public.is_managed_account_role(role))
  );

-- Profiles: own profile, admin/dev manage user + staff profiles, dev full access
create policy "Profiles select own admin dev managed"
  on public.profiles
  for select
  to authenticated
  using (
    public.is_dev()
    or account_id = public.current_account_id()
    or (public.is_admin() and public.account_is_managed(account_id))
    or (public.is_admin() and public.account_is_staff_list_visible(account_id))
  );

create policy "Profiles insert admin dev managed"
  on public.profiles
  for insert
  to authenticated
  with check (
    public.is_dev()
    or (public.is_admin() and public.account_is_managed(account_id))
  );

create policy "Profiles update own admin dev managed"
  on public.profiles
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

create policy "Profiles delete admin dev managed"
  on public.profiles
  for delete
  to authenticated
  using (
    public.is_dev()
    or (public.is_admin() and public.account_is_managed(account_id))
  );

-- ---------------------------------------------------------------------------
-- 6. Admin RPC: delete managed user/staff (removes auth login + account + profile)
-- ---------------------------------------------------------------------------

create or replace function public.admin_delete_managed_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_auth_user_id uuid;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Access denied';
  end if;

  select role, auth_user_id
  into v_role, v_auth_user_id
  from public.accounts
  where id = p_account_id;

  if v_role is null then
    raise exception 'Account not found';
  end if;

  if not public.is_dev() and not public.is_managed_account_role(v_role) then
    raise exception 'Admins can only delete user and coach accounts';
  end if;

  delete from auth.users where id = v_auth_user_id;
end;
$$;

revoke all on function public.admin_delete_managed_account(uuid) from public;
grant execute on function public.admin_delete_managed_account(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Staff, admin, and dev accounts (no public signup)
-- ---------------------------------------------------------------------------
-- 1. Supabase Dashboard → Authentication → Users → Add user (email + password)
-- 2. Then promote the account role in SQL Editor (replace emails):
--
--   update public.accounts set role = 'coach' where email = 'coach@example.com';
--   update public.accounts set role = 'admin' where email = 'admin@example.com';
--   update public.accounts set role = 'dev'   where email = 'dev@example.com';
--
-- dev role: full read/write/delete on all accounts and profiles (RLS bypass via is_dev()).
-- admin role: create, read, update, and delete user + coach accounts and profiles.
--   To create login credentials: Authentication → Users → Add user (trigger creates account + profile),
--   then use the admin portal to set role/profile fields or promote user → coach.
--
-- Recommended Auth settings (Dashboard → Authentication → Providers → Email):
--   - Disable "Confirm email" during development so signup/login works immediately
--   - Enable leaked password protection in production
