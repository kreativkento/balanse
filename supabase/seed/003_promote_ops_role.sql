-- Promote an existing login to frontdesk or marketing (admin-equivalent privileges).
-- Run AFTER 011_split_profiles_and_ops_roles.sql.
-- Edit v_email and v_role below, then run in Supabase SQL Editor.

do $$
declare
  v_email text := 'ops@example.com';           -- change me
  v_role public.user_role := 'frontdesk';      -- or 'marketing'
  v_account_id uuid;
  v_name text;
begin
  if v_role not in ('frontdesk'::public.user_role, 'marketing'::public.user_role) then
    raise exception 'v_role must be frontdesk or marketing';
  end if;

  select id into v_account_id
  from public.accounts
  where email = lower(trim(v_email));

  if v_account_id is null then
    raise exception 'Account not found for %', v_email;
  end if;

  update public.accounts
  set role = v_role
  where id = v_account_id;

  -- Prefer copying from client profile if present, else keep existing staff row
  select coalesce(nullif(name, ''), split_part(v_email, '@', 1))
  into v_name
  from public.profiles_client
  where account_id = v_account_id;

  if v_name is not null then
    insert into public.profiles_staff (account_id, name, display_name, staff_type)
    values (v_account_id, v_name, v_name, initcap(v_role::text))
    on conflict (account_id) do update
    set
      name = excluded.name,
      display_name = excluded.display_name,
      staff_type = excluded.staff_type;

    delete from public.profiles_client where account_id = v_account_id;
  elsif not exists (
    select 1 from public.profiles_staff where account_id = v_account_id
  ) then
    insert into public.profiles_staff (account_id, name, display_name, staff_type)
    values (
      v_account_id,
      split_part(v_email, '@', 1),
      split_part(v_email, '@', 1),
      initcap(v_role::text)
    );
  end if;
end $$;
