-- When a class is cancelled, members who paid drop-in with a locked receipt (finalized escrow)
-- get a credit refund queued for admin (holding roster). Completing the holding refund grants wallet credits.

create or replace function public._class_cancel_refund_kind(p_class_id uuid, p_account_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.class_payments_escrow e
    where e.class_id = p_class_id
      and e.account_id = p_account_id
      and e.escrow_state = 'in_escrow'
      and e.status = 'approved'
      and e.verified is true
      and e.final_transaction_id is null
  ) then
    return 'cash';
  end if;

  if exists (
    select 1
    from public.account_credit_transactions t
    where t.account_id = p_account_id
      and t.idempotency_key = 'enroll-credit:' || p_class_id::text || ':' || p_account_id::text
  ) then
    return 'credit';
  end if;

  if exists (
    select 1
    from public.class_payments_escrow e
    where e.class_id = p_class_id
      and e.account_id = p_account_id
      and e.escrow_state = 'finalized'::public.payment_escrow_state
      and e.status = 'approved'
      and e.verified is true
      and e.final_transaction_id is not null
  ) then
    return 'credit';
  end if;

  return 'none';
end;
$$;

create or replace function public._grant_class_cancel_compensation_credit(
  p_class_id uuid,
  p_account_id uuid,
  p_holding_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idempotency text := 'cancel-compensation:' || p_holding_id::text;
  v_escrow public.class_payments_escrow%rowtype;
  v_policy public.studio_policy_settings;
  v_expires timestamptz;
  v_balance integer;
  v_quantity integer := 1;
  v_lot uuid;
  v_reason text;
  v_class_label text;
begin
  if exists (
    select 1 from public.account_credit_transactions t where t.idempotency_key = v_idempotency
  ) then
    return jsonb_build_object('restored', true, 'already_processed', true, 'compensation', true);
  end if;

  select * into v_escrow
  from public.class_payments_escrow e
  where e.class_id = p_class_id
    and e.account_id = p_account_id
    and e.escrow_state = 'finalized'::public.payment_escrow_state
    and e.status = 'approved'
    and e.verified is true
    and e.final_transaction_id is not null
  order by e.finalized_at desc nulls last, e.reviewed_at desc nulls last, e.created_at desc
  limit 1
  for update;

  if v_escrow.id is null then
    return jsonb_build_object('restored', false, 'reason', 'no_finalized_payment');
  end if;

  v_policy := public.get_studio_policy_settings();
  v_expires := now() + (
    greatest(coalesce(v_policy.session_expiry_days, 30), 1) || ' days'
  )::interval;

  select coalesce(nullif(btrim(c.name), ''), 'Studio class') into v_class_label
  from public.classes c
  where c.id = p_class_id;

  v_reason := coalesce(
    nullif(btrim(p_note), ''),
  format('Class cancellation credit refund: %s (drop-in OR %s already issued).', v_class_label, coalesce(v_escrow.uid, v_escrow.id::text))
  );

  perform public.ensure_account_credit_wallet(p_account_id);

  insert into public.account_credit_lots (
    account_id,
    quantity_initial,
    quantity_remaining,
    expires_at,
    source_type,
    source_id,
    idempotency_key
  )
  values (
    p_account_id,
    v_quantity,
    v_quantity,
    v_expires,
    'class_cancellation'::public.credit_source_type,
    p_class_id,
    v_idempotency
  )
  returning id into v_lot;

  select available_balance into v_balance
  from public.account_credit_wallets
  where account_id = p_account_id
  for update;

  v_balance := coalesce(v_balance, 0) + v_quantity;

  update public.account_credit_wallets
  set available_balance = v_balance
  where account_id = p_account_id;

  insert into public.account_credit_transactions (
    account_id,
    lot_id,
    delta,
    balance_after,
    kind,
    reason,
    class_id,
    idempotency_key
  )
  values (
    p_account_id,
    v_lot,
    v_quantity,
    v_balance,
    'grant'::public.credit_transaction_kind,
    v_reason,
    p_class_id,
    v_idempotency
  );

  update public.class_payments_escrow
  set review_note = trim(both from coalesce(review_note, '') || case
    when review_note is null or btrim(review_note) = '' then v_reason
    else ' ' || v_reason
  end)
  where id = v_escrow.id;

  return jsonb_build_object(
    'restored', true,
    'compensation', true,
    'credits', v_quantity,
    'lot_id', v_lot,
    'balance_after', v_balance,
    'escrow_payment_id', v_escrow.id
  );
end;
$$;

revoke all on function public._grant_class_cancel_compensation_credit(uuid, uuid, uuid, text) from public;

create or replace function public.mark_class_cancel_holding_refunded(p_holding_id uuid)
returns public.class_cancel_holdings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_account_id();
  v_row public.class_cancel_holdings;
  v_kind text;
  v_escrow uuid;
  v_credit jsonb;
  v_compensated boolean := false;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Only admin or dev can complete holding refunds.';
  end if;
  if v_actor is null then
    raise exception 'Not authenticated.';
  end if;

  select * into v_row from public.class_cancel_holdings where id = p_holding_id for update;
  if not found then
    raise exception 'Holding row not found.';
  end if;

  if v_row.outcome is distinct from 'class_cancelled' then
    raise exception 'Refunds are only for cancelled classes.';
  end if;

  if v_row.refund_status = 'completed' then
    return v_row;
  end if;

  if v_row.refund_status is distinct from 'pending' then
    raise exception 'This student is not awaiting a refund.';
  end if;

  v_kind := coalesce(nullif(v_row.refund_kind, 'none'), public._class_cancel_refund_kind(v_row.class_id, v_row.account_id));

  if v_kind = 'cash' then
    select e.id into v_escrow
    from public.class_payments_escrow e
    where e.class_id = v_row.class_id
      and e.account_id = v_row.account_id
      and e.escrow_state = 'in_escrow'
      and e.status = 'approved'
      and e.verified is true
      and e.final_transaction_id is null
    order by e.reviewed_at desc nulls last, e.created_at desc
    limit 1
    for update;

    if v_escrow is not null then
      perform public._mark_escrow_payment_refunded(
        v_escrow,
        now(),
        'Refunded: class cancelled (holding roster).'
      );
    end if;
  elsif v_kind = 'credit' then
    v_credit := public._restore_enrollment_credit(
      v_row.class_id,
      v_row.account_id,
      'Credit restored: class cancelled (holding roster).'
    );
    if coalesce((v_credit->>'restored')::boolean, false) then
      null;
    elsif coalesce(v_credit->>'reason', '') = 'no_credit_spend' then
      v_credit := public._grant_class_cancel_compensation_credit(
        v_row.class_id,
        v_row.account_id,
        v_row.id,
        'Credit refund approved: class cancelled (drop-in with official receipt).'
      );
      if not coalesce((v_credit->>'restored')::boolean, false) then
        raise exception 'Could not grant cancellation credit for this member.';
      end if;
      v_compensated := coalesce((v_credit->>'compensation')::boolean, false);
    else
      raise exception 'Could not restore session credit for this member.';
    end if;
  end if;

  delete from public.class_students
  where class_id = v_row.class_id and account_id = v_row.account_id;

  update public.class_cancel_holdings
  set
    refund_status = 'completed',
    refund_kind = case when v_compensated then 'credit' else v_kind end,
    refunded_at = now(),
    refunded_by = v_actor
  where id = p_holding_id
  returning * into v_row;

  return v_row;
end;
$$;