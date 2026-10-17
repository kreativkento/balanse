-- Staff/coach delete: clear FK blockers, then profiles + account + auth user.
-- Safe to re-run.

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

  if to_regclass('public.feedback_system') is not null then
    delete from public.feedback_system where account_id = p_account_id;
  end if;

  if to_regclass('public.tickets') is not null then
    delete from public.tickets where creator_account_id = p_account_id;
  end if;

  if to_regclass('public.coach_disciplines') is not null then
    delete from public.coach_disciplines where account_id = p_account_id;
  end if;

  if to_regclass('public.portal_requests') is not null then
    delete from public.portal_requests where requester_account_id = p_account_id;
  end if;

  -- classes.created_by is ON DELETE RESTRICT
  if to_regclass('public.classes') is not null then
    delete from public.classes where created_by = p_account_id;
  end if;

  delete from public.profiles_client where account_id = p_account_id;
  delete from public.profiles_staff where account_id = p_account_id;

  delete from public.accounts where id = p_account_id;

  if v_auth_user_id is not null then
    delete from auth.users where id = v_auth_user_id;
  end if;
end;
$$;

comment on function public.admin_delete_managed_account(uuid) is
  'Admin/dev: deletes client or coach account, profiles_staff/client, coach schedule links, and auth.users.';

revoke all on function public.admin_delete_managed_account(uuid) from public;
grant execute on function public.admin_delete_managed_account(uuid) to authenticated;
