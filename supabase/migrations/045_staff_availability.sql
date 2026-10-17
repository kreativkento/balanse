-- Staff availability (per date, set from Staff Portal; readable by ops/admin).
-- Run after 011_split_profiles_and_ops_roles.sql (is_staff_role, is_admin).

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table if not exists public.staff_availability (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  availability_date date not null,
  day_off boolean not null default false,
  note text not null default '',
  periods jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_availability_account_date_uniq unique (account_id, availability_date),
  constraint staff_availability_periods_is_array_chk check (jsonb_typeof(periods) = 'array'),
  constraint staff_availability_day_off_periods_chk check (
    (day_off and periods = '[]'::jsonb)
    or (not day_off and jsonb_array_length(periods) > 0)
  )
);

comment on table public.staff_availability is
  'Staff/coach availability by calendar date. Periods are [{ "start": "HH:MM", "end": "HH:MM" }] in 24h local studio time.';

comment on column public.staff_availability.periods is
  'Non-empty when day_off is false. Empty array when day_off is true.';

create index if not exists staff_availability_account_id_idx
  on public.staff_availability (account_id);

create index if not exists staff_availability_date_idx
  on public.staff_availability (availability_date);

-- ---------------------------------------------------------------------------
-- 2. Validation helpers
-- ---------------------------------------------------------------------------

create or replace function public.validate_staff_availability_periods(
  p_day_off boolean,
  p_periods jsonb
)
returns boolean
language plpgsql
immutable
as $$
declare
  elem jsonb;
  v_start text;
  v_end text;
begin
  if p_periods is null or jsonb_typeof(p_periods) <> 'array' then
    return false;
  end if;

  if p_day_off then
    return jsonb_array_length(p_periods) = 0;
  end if;

  if jsonb_array_length(p_periods) = 0 then
    return false;
  end if;

  for elem in select * from jsonb_array_elements(p_periods)
  loop
    v_start := elem->>'start';
    v_end := elem->>'end';
    if v_start is null or v_end is null then
      return false;
    end if;
    if v_start !~ '^\d{2}:\d{2}$' or v_end !~ '^\d{2}:\d{2}$' then
      return false;
    end if;
    if v_start < '09:00' or v_end > '21:00' then
      return false;
    end if;
    if v_start >= v_end then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.enforce_staff_availability_account_staff()
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
    raise exception 'staff_availability.account_id % has no matching account.', new.account_id;
  end if;

  if not public.is_staff_role(v_role) then
    raise exception
      'staff_availability is for staff accounts only. Account % has role %.',
      new.account_id, v_role;
  end if;

  if not public.validate_staff_availability_periods(new.day_off, new.periods) then
    raise exception 'Invalid availability periods for day_off=%.', new.day_off;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_staff_availability_account_staff on public.staff_availability;
create trigger trg_enforce_staff_availability_account_staff
  before insert or update on public.staff_availability
  for each row
  execute function public.enforce_staff_availability_account_staff();

create or replace function public.touch_staff_availability_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists staff_availability_touch_updated_at on public.staff_availability;
create trigger staff_availability_touch_updated_at
  before update on public.staff_availability
  for each row
  execute function public.touch_staff_availability_updated_at();

-- ---------------------------------------------------------------------------
-- 3. RPC: upsert / delete (always scoped to current account)
-- ---------------------------------------------------------------------------

create or replace function public.upsert_staff_availability(
  p_availability_date date,
  p_day_off boolean,
  p_note text default '',
  p_periods jsonb default '[]'::jsonb
)
returns public.staff_availability
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid := public.current_account_id();
  v_role public.user_role;
  v_row public.staff_availability;
begin
  if v_account is null then
    raise exception 'Not authenticated.';
  end if;

  select role into v_role from public.accounts where id = v_account;
  if v_role is null or not public.is_staff_role(v_role) then
    raise exception 'Only staff accounts can set availability.';
  end if;

  if not public.validate_staff_availability_periods(p_day_off, p_periods) then
    raise exception 'Invalid availability periods.';
  end if;

  insert into public.staff_availability (
    account_id,
    availability_date,
    day_off,
    note,
    periods
  )
  values (
    v_account,
    p_availability_date,
    coalesce(p_day_off, false),
    coalesce(trim(p_note), ''),
    coalesce(p_periods, '[]'::jsonb)
  )
  on conflict (account_id, availability_date) do update
  set
    day_off = excluded.day_off,
    note = excluded.note,
    periods = excluded.periods,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.upsert_staff_availability(date, boolean, text, jsonb) is
  'Create or replace availability for the signed-in staff account on a given date.';

create or replace function public.delete_staff_availability(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid := public.current_account_id();
begin
  if v_account is null then
    raise exception 'Not authenticated.';
  end if;

  delete from public.staff_availability
  where id = p_id
    and account_id = v_account;

  if not found then
    raise exception 'Availability entry not found or not owned by you.';
  end if;
end;
$$;

grant execute on function public.upsert_staff_availability(date, boolean, text, jsonb) to authenticated;
grant execute on function public.delete_staff_availability(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.staff_availability enable row level security;

drop policy if exists staff_availability_select on public.staff_availability;
create policy staff_availability_select
  on public.staff_availability
  for select
  to authenticated
  using (
    account_id = public.current_account_id()
    or public.is_admin_or_dev()
  );

drop policy if exists staff_availability_insert on public.staff_availability;
create policy staff_availability_insert
  on public.staff_availability
  for insert
  to authenticated
  with check (
    account_id = public.current_account_id()
    and exists (
      select 1 from public.accounts a
      where a.id = account_id
        and public.is_staff_role(a.role)
    )
  );

drop policy if exists staff_availability_update on public.staff_availability;
create policy staff_availability_update
  on public.staff_availability
  for update
  to authenticated
  using (account_id = public.current_account_id())
  with check (account_id = public.current_account_id());

drop policy if exists staff_availability_delete on public.staff_availability;
create policy staff_availability_delete
  on public.staff_availability
  for delete
  to authenticated
  using (account_id = public.current_account_id());
