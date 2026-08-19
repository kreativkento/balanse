-- Recreate public.accounts + public.profiles when auth.users exists but app rows were deleted manually.
-- Run in Supabase SQL Editor after 001_profiles.sql.

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

  return v_account_id;
end;
$$;

revoke all on function public.repair_orphaned_user_account() from public;
grant execute on function public.repair_orphaned_user_account() to authenticated;
