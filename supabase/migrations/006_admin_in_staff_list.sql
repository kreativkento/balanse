-- Include admin accounts in the staff directory (read-only for other admins).
-- Run after 005 if you already applied the dev-only staff list migration.

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
      and a.role in (
        'coach'::public.user_role,
        'dev'::public.user_role,
        'admin'::public.user_role
      )
  );
$$;

drop policy if exists "Accounts select own admin dev" on public.accounts;

create policy "Accounts select own admin dev"
  on public.accounts
  for select
  to authenticated
  using (
    public.is_dev()
    or auth_user_id = auth.uid()
    or (public.is_admin() and role in (
      'coach'::public.user_role,
      'dev'::public.user_role,
      'admin'::public.user_role
    ))
    or (public.is_admin() and public.is_managed_account_role(role))
  );

drop policy if exists "Profiles select own admin dev managed" on public.profiles;

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
