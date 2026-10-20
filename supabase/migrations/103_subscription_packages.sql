-- Subscription packages (admin-managed catalog; members see active packages only).

create table if not exists public.subscription_packages (
  id uuid primary key default gen_random_uuid(),
  uid text not null,
  name text not null,
  description text not null default '',
  credits_granted integer not null check (credits_granted >= 1),
  credit_validity_days integer not null check (credit_validity_days >= 1),
  price_amount numeric(12, 2) not null check (price_amount >= 0),
  currency text not null default 'PHP',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_packages_uid_format check (uid ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,47}$'),
  constraint subscription_packages_uid_unique unique (uid)
);

comment on table public.subscription_packages is
  'Purchasable subscription / credit packs. Grants credits with validity in days when fulfilled (future member checkout).';

comment on column public.subscription_packages.uid is
  'Admin-defined unique reference (e.g. GOLD-MONTH, PACK-10).';

create index if not exists subscription_packages_active_sort_idx
  on public.subscription_packages (is_active, sort_order, name);

create or replace function public.touch_subscription_packages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists subscription_packages_touch_updated_at on public.subscription_packages;
create trigger subscription_packages_touch_updated_at
  before update on public.subscription_packages
  for each row
  execute function public.touch_subscription_packages_updated_at();

drop trigger if exists trg_log_system_subscription_packages on public.subscription_packages;
create trigger trg_log_system_subscription_packages
  after insert or update or delete on public.subscription_packages
  for each row
  execute function public.tg_write_log_system();

alter table public.subscription_packages enable row level security;

drop policy if exists subscription_packages_select_admin on public.subscription_packages;
drop policy if exists subscription_packages_insert_admin on public.subscription_packages;
drop policy if exists subscription_packages_update_admin on public.subscription_packages;
drop policy if exists subscription_packages_delete_admin on public.subscription_packages;
drop policy if exists subscription_packages_select_active_member on public.subscription_packages;

create policy subscription_packages_select_admin
  on public.subscription_packages
  for select
  to authenticated
  using (public.is_admin_or_dev());

create policy subscription_packages_insert_admin
  on public.subscription_packages
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy subscription_packages_update_admin
  on public.subscription_packages
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy subscription_packages_delete_admin
  on public.subscription_packages
  for delete
  to authenticated
  using (public.is_admin_or_dev());

create policy subscription_packages_select_active_member
  on public.subscription_packages
  for select
  to authenticated
  using (
    is_active = true
    and public.current_user_role() = 'user'::public.user_role
  );

insert into public.subscription_packages (
  uid,
  name,
  description,
  credits_granted,
  credit_validity_days,
  price_amount,
  sort_order,
  is_active
)
values
  (
    'SINGLE-CLASS',
    'Single Class Pass',
    'Pay per session, no monthly commitment.',
    1,
    30,
    360,
    10,
    true
  ),
  (
    'SILVER-MONTH',
    'Silver Membership',
    'Monthly plan · 12 session credits included.',
    12,
    30,
    3600,
    20,
    true
  ),
  (
    'GOLD-MONTH',
    'Gold Membership',
    'Monthly plan · 20 session credits included.',
    20,
    30,
    4800,
    30,
    true
  )
on conflict (uid) do nothing;
