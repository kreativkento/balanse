-- Member credit wallets, lots, and immutable transaction ledger.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'credit_transaction_kind') then
    create type public.credit_transaction_kind as enum (
      'grant',
      'spend',
      'expire',
      'admin_adjust',
      'reversal'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'credit_source_type') then
    create type public.credit_source_type as enum (
      'subscription',
      'class_cancellation',
      'admin',
      'promotion',
      'class_enrollment'
    );
  end if;
end
$$;

create table if not exists public.account_credit_wallets (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  available_balance integer not null default 0 check (available_balance >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.account_credit_wallets is
  'One wallet per member account; balance cache updated when lots change.';

create table if not exists public.account_credit_lots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  quantity_initial integer not null check (quantity_initial >= 1),
  quantity_remaining integer not null check (quantity_remaining >= 0),
  expires_at timestamptz,
  source_type public.credit_source_type not null,
  source_id uuid,
  idempotency_key text,
  created_at timestamptz not null default now(),
  constraint account_credit_lots_remaining_lte_initial check (quantity_remaining <= quantity_initial)
);

create unique index if not exists account_credit_lots_idempotency_key_idx
  on public.account_credit_lots (idempotency_key)
  where idempotency_key is not null;

create index if not exists account_credit_lots_account_expires_idx
  on public.account_credit_lots (account_id, expires_at);

create table if not exists public.account_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  lot_id uuid references public.account_credit_lots (id) on delete set null,
  delta integer not null check (delta <> 0),
  balance_after integer check (balance_after is null or balance_after >= 0),
  kind public.credit_transaction_kind not null,
  reason text not null default '',
  class_id uuid references public.classes (id) on delete set null,
  subscription_package_id uuid references public.subscription_packages (id) on delete set null,
  created_by uuid references public.accounts (id) on delete set null,
  idempotency_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists account_credit_transactions_idempotency_key_idx
  on public.account_credit_transactions (idempotency_key)
  where idempotency_key is not null;

create index if not exists account_credit_transactions_account_created_idx
  on public.account_credit_transactions (account_id, created_at desc);

create index if not exists account_credit_transactions_created_at_idx
  on public.account_credit_transactions (created_at desc);

comment on table public.account_credit_transactions is
  'Append-only credit ledger: grants, spends, expirations, and admin adjustments.';

create or replace function public.touch_account_credit_wallets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists account_credit_wallets_touch_updated_at on public.account_credit_wallets;
create trigger account_credit_wallets_touch_updated_at
  before update on public.account_credit_wallets
  for each row
  execute function public.touch_account_credit_wallets_updated_at();

drop trigger if exists trg_log_system_account_credit_transactions on public.account_credit_transactions;
create trigger trg_log_system_account_credit_transactions
  after insert or update or delete on public.account_credit_transactions
  for each row
  execute function public.tg_write_log_system();

alter table public.account_credit_wallets enable row level security;
alter table public.account_credit_lots enable row level security;
alter table public.account_credit_transactions enable row level security;

-- Wallets
drop policy if exists account_credit_wallets_select_admin on public.account_credit_wallets;
drop policy if exists account_credit_wallets_select_own on public.account_credit_wallets;

create policy account_credit_wallets_select_admin
  on public.account_credit_wallets for select to authenticated
  using (public.is_admin_or_dev());

create policy account_credit_wallets_select_own
  on public.account_credit_wallets for select to authenticated
  using (account_id = public.current_account_id());

-- Lots
drop policy if exists account_credit_lots_select_admin on public.account_credit_lots;
drop policy if exists account_credit_lots_select_own on public.account_credit_lots;

create policy account_credit_lots_select_admin
  on public.account_credit_lots for select to authenticated
  using (public.is_admin_or_dev());

create policy account_credit_lots_select_own
  on public.account_credit_lots for select to authenticated
  using (account_id = public.current_account_id());

-- Transactions
drop policy if exists account_credit_transactions_select_admin on public.account_credit_transactions;
drop policy if exists account_credit_transactions_select_own on public.account_credit_transactions;

create policy account_credit_transactions_select_admin
  on public.account_credit_transactions for select to authenticated
  using (public.is_admin_or_dev());

create policy account_credit_transactions_select_own
  on public.account_credit_transactions for select to authenticated
  using (
    account_id = public.current_account_id()
    and public.current_user_role() = 'user'::public.user_role
  );
