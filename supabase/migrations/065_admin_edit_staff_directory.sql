-- Allow admins to update coach, frontdesk, and marketing staff (accounts + profiles_staff).
-- Safe to re-run.

create or replace function public.is_staff_directory_admin_managed(target_role public.user_role)
returns boolean
language sql
immutable
as $$
  select target_role in (
    'coach'::public.user_role,
    'frontdesk'::public.user_role,
    'marketing'::public.user_role
  );
$$;

comment on function public.is_staff_directory_admin_managed(public.user_role) is
  'Staff roles an admin may edit from the staffing directory (not admin/dev).';

create or replace function public.account_is_staff_directory_admin_editable(p_account_id uuid)
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
      and public.is_staff_directory_admin_managed(a.role)
  );
$$;

comment on function public.account_is_staff_directory_admin_editable(uuid) is
  'True when the account is coach/frontdesk/marketing and editable by admins.';

-- Staff list visibility includes ops roles admins manage in the directory.
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
      and (
        a.role in (
          'coach'::public.user_role,
          'dev'::public.user_role,
          'admin'::public.user_role
        )
        or public.is_staff_directory_admin_managed(a.role)
      )
  );
$$;

create or replace function public.protect_account_role()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.role is distinct from new.role then
    if auth.uid() is null then
      null;
    elsif public.is_dev() then
      null;
    elsif public.is_admin()
      and public.is_managed_account_role(old.role)
      and public.is_managed_account_role(new.role) then
      null;
    elsif public.is_admin()
      and public.is_staff_directory_admin_managed(old.role)
      and public.is_staff_directory_admin_managed(new.role) then
      null;
    else
      new.role := old.role;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop policy if exists "Accounts update own admin dev managed" on public.accounts;

create policy "Accounts update own admin dev managed"
  on public.accounts
  for update
  to authenticated
  using (
    public.is_dev()
    or auth_user_id = auth.uid()
    or (public.is_admin() and public.is_managed_account_role(role))
    or (public.is_admin() and public.account_is_staff_directory_admin_editable(id))
  )
  with check (
    public.is_dev()
    or auth_user_id = auth.uid()
    or (public.is_admin() and public.is_managed_account_role(role))
    or (public.is_admin() and public.is_staff_directory_admin_managed(role))
  );

drop policy if exists "Staff profiles update own admin ops" on public.profiles_staff;

create policy "Staff profiles update own admin ops"
  on public.profiles_staff
  for update
  to authenticated
  using (
    public.is_dev()
    or account_id = public.current_account_id()
    or (public.is_admin() and public.account_is_managed(account_id))
    or (public.is_admin() and public.account_is_staff_list_visible(account_id))
    or (public.is_admin() and public.account_is_staff_directory_admin_editable(account_id))
  )
  with check (
    public.is_dev()
    or account_id = public.current_account_id()
    or (public.is_admin() and public.account_is_managed(account_id))
    or (public.is_admin() and public.account_is_staff_list_visible(account_id))
    or (public.is_admin() and public.account_is_staff_directory_admin_editable(account_id))
  );
