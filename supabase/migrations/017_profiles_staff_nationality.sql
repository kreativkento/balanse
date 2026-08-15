-- Add nationality to profiles_staff (mirrors profiles_client).
-- Run after 016_admin_create_staff_roles.sql.

alter table public.profiles_staff
  add column if not exists nationality text not null default '';

comment on column public.profiles_staff.nationality is
  'Staff/coach nationality (same option set as profiles_client.nationality).';

-- Keep nationality when moving between client ↔ staff on role change
create or replace function public.sync_profiles_on_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_first text;
  v_last text;
  v_middle text;
  v_nationality text;
begin
  if tg_op <> 'UPDATE' or old.role is not distinct from new.role then
    return new;
  end if;

  -- user → staff/ops: move client → staff
  if old.role = 'user'::public.user_role and public.is_staff_role(new.role) then
    select
      first_name,
      last_name,
      middle_initial,
      coalesce(nullif(trim(name), ''), new.email),
      coalesce(nationality, '')
    into v_first, v_last, v_middle, v_name, v_nationality
    from public.profiles_client
    where account_id = new.id;

    if found then
      insert into public.profiles_staff (
        account_id, first_name, last_name, middle_initial, name, display_name, nationality, staff_type
      )
      values (
        new.id,
        coalesce(v_first, ''),
        coalesce(v_last, ''),
        coalesce(v_middle, ''),
        v_name,
        v_name,
        coalesce(v_nationality, ''),
        initcap(new.role::text)
      )
      on conflict (account_id) do update
      set
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        middle_initial = excluded.middle_initial,
        name = excluded.name,
        display_name = excluded.display_name,
        nationality = excluded.nationality;

      delete from public.profiles_client where account_id = new.id;
    end if;

  -- staff/ops → user: move staff → client
  elsif public.is_staff_role(old.role) and new.role = 'user'::public.user_role then
    select
      first_name,
      last_name,
      middle_initial,
      coalesce(nullif(trim(name), ''), new.email),
      coalesce(nationality, '')
    into v_first, v_last, v_middle, v_name, v_nationality
    from public.profiles_staff
    where account_id = new.id;

    if found then
      insert into public.profiles_client (
        account_id, first_name, last_name, middle_initial, name, nationality
      )
      values (
        new.id,
        coalesce(v_first, ''),
        coalesce(v_last, ''),
        coalesce(v_middle, ''),
        v_name,
        coalesce(v_nationality, '')
      )
      on conflict (account_id) do update
      set
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        middle_initial = excluded.middle_initial,
        name = excluded.name,
        nationality = excluded.nationality;

      delete from public.profiles_staff where account_id = new.id;
    end if;
  end if;

  return new;
end;
$$;
