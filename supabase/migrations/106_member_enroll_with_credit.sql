-- Enroll in a class using 1 session credit (no class_payments row).

create or replace function public.ensure_account_credit_wallet(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.account_credit_wallets (account_id, available_balance)
  values (p_account_id, 0)
  on conflict (account_id) do nothing;
end;
$$;

create or replace function public.member_enroll_class_with_credit(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid := public.current_account_id();
  v_class public.classes%rowtype;
  v_enrolled integer;
  v_limit integer;
  v_balance integer;
  v_need integer := 1;
  v_lot record;
  v_take integer;
  v_class_label text;
  v_idempotency text;
  v_reason text;
begin
  if v_account_id is null then
    raise exception 'Not authenticated.';
  end if;

  if public.current_user_role() is distinct from 'user'::public.user_role then
    raise exception 'Only members can enroll with credits.';
  end if;

  perform public.assert_accounts_are_users(array[v_account_id]);

  v_idempotency := 'enroll-credit:' || p_class_id::text || ':' || v_account_id::text;

  if exists (
    select 1 from public.account_credit_transactions t
    where t.idempotency_key = v_idempotency
  ) then
    return jsonb_build_object(
      'enrolled', true,
      'already_processed', true,
      'class_id', p_class_id
    );
  end if;

  select * into v_class from public.classes where id = p_class_id for update;
  if not found then
    raise exception 'Class not found.';
  end if;

  if v_class.status_block not in (
    'active'::public.class_block_status,
    'assigned'::public.class_block_status
  ) then
    raise exception 'This class is not open for enrollment.';
  end if;

  if coalesce(v_class.status_class, false) is not true then
    raise exception 'This class is closed for enrollment.';
  end if;

  if exists (
    select 1 from public.class_students cs
    where cs.class_id = p_class_id and cs.account_id = v_account_id
  ) then
    raise exception 'You are already enrolled in this class.';
  end if;

  if exists (
    select 1 from public.class_waitlist cw
    where cw.class_id = p_class_id and cw.account_id = v_account_id
  ) then
    raise exception 'You already have a payment pending review for this class.';
  end if;

  select count(*)::integer into v_enrolled from public.class_students where class_id = p_class_id;
  v_limit := v_class.class_limit;
  if v_limit is not null and v_limit > 0 and v_enrolled >= v_limit then
    raise exception 'This class is full.';
  end if;

  perform public.ensure_account_credit_wallet(v_account_id);

  select w.available_balance into v_balance
  from public.account_credit_wallets w
  where w.account_id = v_account_id
  for update;

  if coalesce(v_balance, 0) < v_need then
    raise exception 'Insufficient credits. You need at least 1 credit to enroll.';
  end if;

  for v_lot in
    select l.id, l.quantity_remaining
    from public.account_credit_lots l
    where l.account_id = v_account_id
      and l.quantity_remaining > 0
      and (l.expires_at is null or l.expires_at > now())
    order by l.expires_at nulls last, l.created_at asc
    for update
  loop
    exit when v_need <= 0;
    v_take := least(v_lot.quantity_remaining, v_need);
    update public.account_credit_lots
    set quantity_remaining = quantity_remaining - v_take
    where id = v_lot.id;
    v_need := v_need - v_take;
  end loop;

  if v_need > 0 then
    raise exception 'Insufficient credits. Your available lots may have expired.';
  end if;

  v_balance := v_balance - 1;
  update public.account_credit_wallets
  set available_balance = v_balance
  where account_id = v_account_id;

  v_class_label := coalesce(nullif(btrim(v_class.name), ''), 'Studio class');
  v_reason := v_class_label || ' — class enrollment (credit)';

  insert into public.account_credit_transactions (
    account_id,
    delta,
    balance_after,
    kind,
    reason,
    class_id,
    created_by,
    idempotency_key
  )
  values (
    v_account_id,
    -1,
    v_balance,
    'spend'::public.credit_transaction_kind,
    v_reason,
    p_class_id,
    v_account_id,
    v_idempotency
  );

  insert into public.class_students (class_id, account_id, enrolled_by)
  values (p_class_id, v_account_id, v_account_id);

  return jsonb_build_object(
    'enrolled', true,
    'class_id', p_class_id,
    'balance_after', v_balance,
    'credit_spent', 1
  );
end;
$$;

revoke all on function public.member_enroll_class_with_credit(uuid) from public;
grant execute on function public.member_enroll_class_with_credit(uuid) to authenticated;

comment on function public.member_enroll_class_with_credit(uuid) is
  'Spend 1 session credit and enroll immediately. Does not create class_payments.';
