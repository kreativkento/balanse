-- Enforce profile table ↔ role exclusivity
-- Run after 012_profiles_client_nationality.sql
--
-- Rules:
--   public.profiles_client  → accounts.role = user ONLY
--   public.profiles_staff   → accounts.role IN (coach, admin, dev, frontdesk, marketing) ONLY
--
-- Note: profiles_student was renamed to profiles_client in 012.

-- ---------------------------------------------------------------------------
-- 1. Clarify helpers / comments
-- ---------------------------------------------------------------------------

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

comment on function public.is_staff_role(public.user_role) is
  'True for coach, admin, dev, frontdesk, marketing — roles that use profiles_staff.';

comment on table public.profiles_client is
  'Client/member profile. STRICTLY accounts.role = user only. Never used for staff/ops roles.';

comment on table public.profiles_staff is
  'Staff/ops profile. STRICTLY accounts.role in (coach, admin, dev, frontdesk, marketing). Never used for user.';

-- ---------------------------------------------------------------------------
-- 2. Cleanup any mismatched rows (best-effort)
-- ---------------------------------------------------------------------------

-- Staff/ops accounts must not keep a client profile
delete from public.profiles_client pc
using public.accounts a
where pc.account_id = a.id
  and public.is_staff_role(a.role);

-- User accounts must not keep a staff profile
delete from public.profiles_staff ps
using public.accounts a
where ps.account_id = a.id
  and a.role = 'user'::public.user_role;

-- ---------------------------------------------------------------------------
-- 3. Enforce on INSERT/UPDATE of profile rows
-- ---------------------------------------------------------------------------

create or replace function public.enforce_profiles_client_user_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  select role into v_role
  from public.accounts
  where id = new.account_id;

  if v_role is null then
    raise exception 'profiles_client.account_id % has no matching account.', new.account_id;
  end if;

  if v_role <> 'user'::public.user_role then
    raise exception
      'profiles_client is exclusive to role=user. Account % has role %.',
      new.account_id, v_role;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_profiles_staff_roles_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  select role into v_role
  from public.accounts
  where id = new.account_id;

  if v_role is null then
    raise exception 'profiles_staff.account_id % has no matching account.', new.account_id;
  end if;

  if not public.is_staff_role(v_role) then
    raise exception
      'profiles_staff is exclusive to coach/admin/dev/frontdesk/marketing. Account % has role %.',
      new.account_id, v_role;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_profiles_client_user_only on public.profiles_client;
create trigger trg_enforce_profiles_client_user_only
  before insert or update of account_id on public.profiles_client
  for each row
  execute function public.enforce_profiles_client_user_only();

drop trigger if exists trg_enforce_profiles_staff_roles_only on public.profiles_staff;
create trigger trg_enforce_profiles_staff_roles_only
  before insert or update of account_id on public.profiles_staff
  for each row
  execute function public.enforce_profiles_staff_roles_only();

-- ---------------------------------------------------------------------------
-- 4. When account.role changes, keep profile tables in sync
-- ---------------------------------------------------------------------------

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
begin
  if tg_op <> 'UPDATE' or old.role is not distinct from new.role then
    return new;
  end if;

  -- user → staff/ops: move client → staff
  if old.role = 'user'::public.user_role and public.is_staff_role(new.role) then
    select first_name, last_name, middle_initial, coalesce(nullif(trim(name), ''), new.email)
    into v_first, v_last, v_middle, v_name
    from public.profiles_client
    where account_id = new.id;

    if found then
      insert into public.profiles_staff (
        account_id, first_name, last_name, middle_initial, name, display_name, staff_type
      )
      values (
        new.id,
        coalesce(v_first, ''),
        coalesce(v_last, ''),
        coalesce(v_middle, ''),
        v_name,
        v_name,
        initcap(new.role::text)
      )
      on conflict (account_id) do update
      set
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        middle_initial = excluded.middle_initial,
        name = excluded.name,
        display_name = excluded.display_name;

      delete from public.profiles_client where account_id = new.id;
    end if;

  -- staff/ops → user: move staff → client
  elsif public.is_staff_role(old.role) and new.role = 'user'::public.user_role then
    select first_name, last_name, middle_initial, coalesce(nullif(trim(name), ''), new.email)
    into v_first, v_last, v_middle, v_name
    from public.profiles_staff
    where account_id = new.id;

    if found then
      insert into public.profiles_client (
        account_id, first_name, last_name, middle_initial, name
      )
      values (
        new.id,
        coalesce(v_first, ''),
        coalesce(v_last, ''),
        coalesce(v_middle, ''),
        v_name
      )
      on conflict (account_id) do update
      set
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        middle_initial = excluded.middle_initial,
        name = excluded.name;

      delete from public.profiles_staff where account_id = new.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_profiles_on_role_change on public.accounts;
create trigger trg_sync_profiles_on_role_change
  after update of role on public.accounts
  for each row
  execute function public.sync_profiles_on_role_change();
