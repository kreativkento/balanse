-- Apply admin manage policies on an existing BALANSÉ database.
-- Run this in Supabase SQL Editor if you already applied an older 001_profiles.sql.

-- Helper functions
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

-- Allow admins to change roles between user and coach
create or replace function public.protect_account_role()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.role is distinct from new.role then
    if public.is_dev() then
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

-- Replace old RLS policies
drop policy if exists "Accounts select own or dev all" on public.accounts;
drop policy if exists "Accounts update dev all" on public.accounts;
drop policy if exists "Accounts insert dev all" on public.accounts;
drop policy if exists "Accounts delete dev all" on public.accounts;
drop policy if exists "Profiles select own or dev all" on public.profiles;
drop policy if exists "Profiles update own or dev all" on public.profiles;
drop policy if exists "Profiles insert dev all" on public.profiles;
drop policy if exists "Profiles delete dev all" on public.profiles;

drop policy if exists "Accounts select own admin dev" on public.accounts;
drop policy if exists "Accounts insert admin dev managed roles" on public.accounts;
drop policy if exists "Accounts update own admin dev managed" on public.accounts;
drop policy if exists "Accounts delete admin dev managed" on public.accounts;
drop policy if exists "Profiles select own admin dev managed" on public.profiles;
drop policy if exists "Profiles insert admin dev managed" on public.profiles;
drop policy if exists "Profiles update own admin dev managed" on public.profiles;
drop policy if exists "Profiles delete admin dev managed" on public.profiles;

create policy "Accounts select own admin dev"
  on public.accounts for select to authenticated
  using (
    public.is_dev()
    or auth_user_id = auth.uid()
    or (public.is_admin() and public.is_managed_account_role(role))
  );

create policy "Accounts insert admin dev managed roles"
  on public.accounts for insert to authenticated
  with check (
    public.is_dev()
    or (public.is_admin() and public.is_managed_account_role(role))
  );

create policy "Accounts update own admin dev managed"
  on public.accounts for update to authenticated
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
  on public.accounts for delete to authenticated
  using (
    public.is_dev()
    or (public.is_admin() and public.is_managed_account_role(role))
  );

create policy "Profiles select own admin dev managed"
  on public.profiles for select to authenticated
  using (
    public.is_dev()
    or account_id = public.current_account_id()
    or (public.is_admin() and public.account_is_managed(account_id))
  );

create policy "Profiles insert admin dev managed"
  on public.profiles for insert to authenticated
  with check (
    public.is_dev()
    or (public.is_admin() and public.account_is_managed(account_id))
  );

create policy "Profiles update own admin dev managed"
  on public.profiles for update to authenticated
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
  on public.profiles for delete to authenticated
  using (
    public.is_dev()
    or (public.is_admin() and public.account_is_managed(account_id))
  );

-- Admin delete RPC
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
