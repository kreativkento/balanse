-- Reset BALANSÉ auth schema before re-running 001_profiles.sql
-- Use this if a previous migration attempt failed partway (e.g. "type user_role already exists").
-- Safe to run on a fresh project (no-op if nothing exists yet).
--
-- Order matters: policies must be dropped before functions they reference.

-- 1. Triggers
drop trigger if exists on_auth_user_created on auth.users;

drop trigger if exists accounts_protect_role on public.accounts;
drop trigger if exists profiles_protect_role on public.profiles;
drop trigger if exists profiles_touch_updated_at on public.profiles;

-- 2. RLS policies (before functions — policies depend on helper functions)
drop policy if exists "Accounts select own admin dev" on public.accounts;
drop policy if exists "Accounts insert admin dev managed roles" on public.accounts;
drop policy if exists "Accounts update own admin dev managed" on public.accounts;
drop policy if exists "Accounts delete admin dev managed" on public.accounts;
drop policy if exists "Accounts select own or dev all" on public.accounts;
drop policy if exists "Accounts update dev all" on public.accounts;
drop policy if exists "Accounts insert dev all" on public.accounts;
drop policy if exists "Accounts delete dev all" on public.accounts;
drop policy if exists "Users can read own profile" on public.accounts;
drop policy if exists "Users can view own profile" on public.accounts;

drop policy if exists "Profiles select own admin dev managed" on public.profiles;
drop policy if exists "Profiles insert admin dev managed" on public.profiles;
drop policy if exists "Profiles update own admin dev managed" on public.profiles;
drop policy if exists "Profiles delete admin dev managed" on public.profiles;
drop policy if exists "Profiles select own or dev all" on public.profiles;
drop policy if exists "Profiles update own or dev all" on public.profiles;
drop policy if exists "Profiles insert dev all" on public.profiles;
drop policy if exists "Profiles delete dev all" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- 3. Functions
drop function if exists public.admin_delete_managed_account(uuid) cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.protect_account_role() cascade;
drop function if exists public.touch_profile_updated_at() cascade;
drop function if exists public.account_is_managed(uuid) cascade;
drop function if exists public.is_managed_account_role(public.user_role) cascade;
drop function if exists public.is_admin_or_dev() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.is_dev() cascade;
drop function if exists public.current_user_role() cascade;
drop function if exists public.current_account_id() cascade;

-- 4. Tables and enum
drop table if exists public.profiles cascade;
drop table if exists public.accounts cascade;

drop type if exists public.user_role cascade;
