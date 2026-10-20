-- Admin credit desk: courtesy grants, expiry extensions, and lot adjustments with an audit reason.

do $$
declare
  v_name text;
begin
  select c.conname into v_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'account_credit_transactions'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%delta%'
    and pg_get_constraintdef(c.oid) ilike '%<>%';

  if v_name is not null then
    execute format('alter table public.account_credit_transactions drop constraint %I', v_name);
  end if;
end
$$;

alter table public.account_credit_transactions
  drop constraint if exists account_credit_transactions_delta_nonzero;

alter table public.account_credit_transactions
  add constraint account_credit_transactions_delta_nonzero
  check (delta <> 0 or kind = 'admin_adjust'::public.credit_transaction_kind);

create or replace function public.admin_grant_courtesy_credits(
  p_account_id uuid,
  p_quantity integer,
  p_expires_at timestamptz,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.current_account_id();
  v_balance integer;
  v_lot uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin_or_dev() then
    raise exception 'Not authorized.';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Grant at least 1 credit.';
  end if;
  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'Expiry must be in the future.';
  end if;
  if v_reason = '' then
    raise exception 'An audit reason is required.';
  end if;

  perform public.assert_accounts_are_users(array[p_account_id]);
  perform public.ensure_account_credit_wallet(p_account_id);

  insert into public.account_credit_lots (
    account_id, quantity_initial, quantity_remaining, expires_at, source_type, idempotency_key
  )
  values (
    p_account_id, p_quantity, p_quantity, p_expires_at,
    'admin'::public.credit_source_type,
    'courtesy:' || gen_random_uuid()::text
  )
  returning id into v_lot;

  select available_balance into v_balance
  from public.account_credit_wallets
  where account_id = p_account_id
  for update;

  v_balance := coalesce(v_balance, 0) + p_quantity;
  update public.account_credit_wallets
  set available_balance = v_balance
  where account_id = p_account_id;

  insert into public.account_credit_transactions (
    account_id, lot_id, delta, balance_after, kind, reason, created_by
  )
  values (
    p_account_id, v_lot, p_quantity, v_balance,
    'admin_adjust'::public.credit_transaction_kind,
    'Courtesy grant: ' || v_reason,
    v_admin
  );

  return jsonb_build_object('lot_id', v_lot, 'balance_after', v_balance);
end;
$$;

revoke all on function public.admin_grant_courtesy_credits(uuid, integer, timestamptz, text) from public;
grant execute on function public.admin_grant_courtesy_credits(uuid, integer, timestamptz, text) to authenticated;

create or replace function public.admin_extend_credit_lot(
  p_lot_id uuid,
  p_expires_at timestamptz,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.current_account_id();
  v_lot public.account_credit_lots%rowtype;
  v_balance integer;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin_or_dev() then
    raise exception 'Not authorized.';
  end if;
  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'New expiry must be in the future.';
  end if;
  if v_reason = '' then
    raise exception 'An audit reason is required.';
  end if;

  select * into v_lot from public.account_credit_lots where id = p_lot_id for update;
  if not found then
    raise exception 'Credit batch not found.';
  end if;
  if v_lot.quantity_remaining < 1 then
    raise exception 'This batch has no credits left to extend.';
  end if;
  if v_lot.expires_at is not null and p_expires_at <= v_lot.expires_at then
    raise exception 'New expiry must be later than the current expiry.';
  end if;

  update public.account_credit_lots
  set expires_at = p_expires_at
  where id = p_lot_id;

  select available_balance into v_balance
  from public.account_credit_wallets
  where account_id = v_lot.account_id;

  insert into public.account_credit_transactions (
    account_id, lot_id, delta, balance_after, kind, reason, created_by
  )
  values (
    v_lot.account_id, p_lot_id, 0, v_balance,
    'admin_adjust'::public.credit_transaction_kind,
    'Extend expiry to ' || to_char(p_expires_at at time zone 'Asia/Manila', 'YYYY-MM-DD') || ': ' || v_reason,
    v_admin
  );

  return jsonb_build_object('lot_id', p_lot_id, 'expires_at', p_expires_at);
end;
$$;

revoke all on function public.admin_extend_credit_lot(uuid, timestamptz, text) from public;
grant execute on function public.admin_extend_credit_lot(uuid, timestamptz, text) to authenticated;

create or replace function public.admin_adjust_credit_lot(
  p_lot_id uuid,
  p_delta integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.current_account_id();
  v_lot public.account_credit_lots%rowtype;
  v_balance integer;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin_or_dev() then
    raise exception 'Not authorized.';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'Adjustment cannot be zero.';
  end if;
  if v_reason = '' then
    raise exception 'An audit reason is required.';
  end if;

  select * into v_lot from public.account_credit_lots where id = p_lot_id for update;
  if not found then
    raise exception 'Credit batch not found.';
  end if;

  if p_delta < 0 and v_lot.quantity_remaining + p_delta < 0 then
    raise exception 'Cannot revoke more credits than remain in this batch.';
  end if;

  update public.account_credit_lots
  set
    quantity_remaining = quantity_remaining + p_delta,
    quantity_initial = case
      when p_delta > 0 then quantity_initial + p_delta
      else quantity_initial
    end
  where id = p_lot_id;

  perform public.ensure_account_credit_wallet(v_lot.account_id);
  select available_balance into v_balance
  from public.account_credit_wallets
  where account_id = v_lot.account_id
  for update;

  v_balance := coalesce(v_balance, 0) + p_delta;
  if v_balance < 0 then
    raise exception 'Wallet balance cannot go below zero.';
  end if;

  update public.account_credit_wallets
  set available_balance = v_balance
  where account_id = v_lot.account_id;

  insert into public.account_credit_transactions (
    account_id, lot_id, delta, balance_after, kind, reason, created_by
  )
  values (
    v_lot.account_id, p_lot_id, p_delta, v_balance,
    'admin_adjust'::public.credit_transaction_kind,
    case when p_delta < 0 then 'Revoke: ' else 'Adjust: ' end || v_reason,
    v_admin
  );

  return jsonb_build_object('lot_id', p_lot_id, 'balance_after', v_balance);
end;
$$;

revoke all on function public.admin_adjust_credit_lot(uuid, integer, text) from public;
grant execute on function public.admin_adjust_credit_lot(uuid, integer, text) to authenticated;
