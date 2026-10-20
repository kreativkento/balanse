-- Studio-wide policy knobs (cancellation, booking, promos, payments).
-- Single row (id = 1) for admin UI and app/RPC references (e.g. cancellation window).

create table if not exists public.studio_policy_settings (
  id smallint primary key default 1 check (id = 1),
  cancel_window_hours integer not null default 24
    check (cancel_window_hours >= 0 and cancel_window_hours <= 168),
  loyalty_threshold integer not null default 12
    check (loyalty_threshold >= 1),
  referral_bonus integer not null default 100
    check (referral_bonus >= 0),
  session_expiry_days integer not null default 30
    check (session_expiry_days >= 1),
  max_bookings_per_day integer not null default 1
    check (max_bookings_per_day >= 1 and max_bookings_per_day <= 10),
  class_capacity_default integer not null default 12
    check (class_capacity_default >= 1 and class_capacity_default <= 100),
  payment_grace_period_hours integer not null default 48
    check (payment_grace_period_hours >= 0 and payment_grace_period_hours <= 168),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.accounts (id) on delete set null
);

comment on table public.studio_policy_settings is
  'Singleton studio policy values edited in Admin → Policies; referenced by booking/cancellation logic.';

insert into public.studio_policy_settings (id)
values (1)
on conflict (id) do nothing;

create or replace function public.touch_studio_policy_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists studio_policy_settings_touch_updated_at on public.studio_policy_settings;
create trigger studio_policy_settings_touch_updated_at
  before update on public.studio_policy_settings
  for each row
  execute function public.touch_studio_policy_settings_updated_at();

alter table public.studio_policy_settings enable row level security;

drop policy if exists studio_policy_settings_select_authenticated on public.studio_policy_settings;
create policy studio_policy_settings_select_authenticated
  on public.studio_policy_settings
  for select
  to authenticated
  using (true);

drop policy if exists studio_policy_settings_update_admin on public.studio_policy_settings;
create policy studio_policy_settings_update_admin
  on public.studio_policy_settings
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

-- Stable read for SQL/RPC callers (cancellation, credits expiry, etc.)
create or replace function public.get_studio_policy_settings()
returns public.studio_policy_settings
language sql
stable
security definer
set search_path = public
as $$
  select * from public.studio_policy_settings where id = 1;
$$;

revoke all on function public.get_studio_policy_settings() from public;
grant execute on function public.get_studio_policy_settings() to authenticated;
