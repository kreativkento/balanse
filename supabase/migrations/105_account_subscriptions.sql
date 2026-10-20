-- Member subscription enrollments (links account to a subscription package for a period).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_subscription_status') then
    create type public.account_subscription_status as enum ('active', 'expired', 'cancelled');
  end if;
end
$$;

create table if not exists public.account_subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  subscription_package_id uuid not null references public.subscription_packages (id) on delete restrict,
  status public.account_subscription_status not null default 'active',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint account_subscriptions_period check (ends_at > starts_at)
);

comment on table public.account_subscriptions is
  'A member''s purchased or assigned subscription period tied to a catalog package.';

create index if not exists account_subscriptions_account_starts_idx
  on public.account_subscriptions (account_id, starts_at desc);

create index if not exists account_subscriptions_account_active_idx
  on public.account_subscriptions (account_id, status)
  where status = 'active'::public.account_subscription_status;

alter table public.account_subscriptions enable row level security;

drop policy if exists account_subscriptions_select_admin on public.account_subscriptions;
drop policy if exists account_subscriptions_insert_admin on public.account_subscriptions;
drop policy if exists account_subscriptions_update_admin on public.account_subscriptions;
drop policy if exists account_subscriptions_delete_admin on public.account_subscriptions;
drop policy if exists account_subscriptions_select_own on public.account_subscriptions;

create policy account_subscriptions_select_admin
  on public.account_subscriptions for select to authenticated
  using (public.is_admin_or_dev());

create policy account_subscriptions_insert_admin
  on public.account_subscriptions for insert to authenticated
  with check (public.is_admin_or_dev());

create policy account_subscriptions_update_admin
  on public.account_subscriptions for update to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy account_subscriptions_delete_admin
  on public.account_subscriptions for delete to authenticated
  using (public.is_admin_or_dev());

create policy account_subscriptions_select_own
  on public.account_subscriptions for select to authenticated
  using (
    account_id = public.current_account_id()
    and public.current_user_role() = 'user'::public.user_role
  );
