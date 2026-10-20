-- Revenue recognition: live cancel window, cash intent vs official receipt number,
-- credit restore on approved cancellation, late cancel forfeits and locks drop-in.

-- ---------------------------------------------------------------------------
-- 1) Cash intent (checkout) vs official receipt number (locked / cleared only)
-- ---------------------------------------------------------------------------

alter table public.class_payments_escrow
  add column if not exists payment_intent_reference text not null default '',
  add column if not exists cash_refund_disbursed_at timestamptz;

alter table public.subscription_package_payments_escrow
  add column if not exists payment_intent_reference text not null default '';

alter table public.final_transactions
  add column if not exists official_receipt_number text;

alter table public.subscription_package_final_transactions
  add column if not exists official_receipt_number text;

create unique index if not exists final_transactions_official_receipt_number_uidx
  on public.final_transactions (official_receipt_number)
  where official_receipt_number is not null and official_receipt_number <> '';

create unique index if not exists subscription_package_final_or_number_uidx
  on public.subscription_package_final_transactions (official_receipt_number)
  where official_receipt_number is not null and official_receipt_number <> '';

create sequence if not exists public.official_receipt_number_seq;

create or replace function public.next_official_receipt_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return 'OR-' || lpad(nextval('public.official_receipt_number_seq')::text, 6, '0');
end;
$$;

revoke all on function public.next_official_receipt_number() from public;

create or replace function public.assign_official_receipt_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.official_receipt_number is null or btrim(new.official_receipt_number) = '' then
    new.official_receipt_number := public.next_official_receipt_number();
  end if;
  return new;
end;
$$;

drop trigger if exists final_transactions_assign_or_number on public.final_transactions;
create trigger final_transactions_assign_or_number
  before insert on public.final_transactions
  for each row
  execute function public.assign_official_receipt_number();

drop trigger if exists subscription_final_assign_or_number on public.subscription_package_final_transactions;
create trigger subscription_final_assign_or_number
  before insert on public.subscription_package_final_transactions
  for each row
  execute function public.assign_official_receipt_number();

create or replace function public.assign_payment_intent_reference()
returns trigger
language plpgsql
as $$
begin
  if new.payment_intent_reference is null or btrim(new.payment_intent_reference) = '' then
    new.payment_intent_reference := 'PI-' || coalesce(nullif(btrim(new.uid), ''), new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists class_payments_escrow_assign_intent on public.class_payments_escrow;
create trigger class_payments_escrow_assign_intent
  before insert on public.class_payments_escrow
  for each row
  execute function public.assign_payment_intent_reference();

drop trigger if exists subscription_escrow_assign_intent on public.subscription_package_payments_escrow;
create trigger subscription_escrow_assign_intent
  before insert on public.subscription_package_payments_escrow
  for each row
  execute function public.assign_payment_intent_reference();

update public.class_payments_escrow
set payment_intent_reference = 'PI-' || uid
where btrim(payment_intent_reference) = '';

update public.subscription_package_payments_escrow
set payment_intent_reference = 'PI-' || uid
where btrim(payment_intent_reference) = '';

-- Number receipts already cleared, in issue order. Held / refunded rows stay unnumbered.
do $$
declare
  v_row record;
begin
  for v_row in
    select id from public.final_transactions
    where official_receipt_number is null or btrim(official_receipt_number) = ''
    order by finalized_at, created_at
  loop
    update public.final_transactions
    set official_receipt_number = public.next_official_receipt_number()
    where id = v_row.id;
  end loop;

  for v_row in
    select id from public.subscription_package_final_transactions
    where official_receipt_number is null or btrim(official_receipt_number) = ''
    order by finalized_at, created_at
  loop
    update public.subscription_package_final_transactions
    set official_receipt_number = public.next_official_receipt_number()
    where id = v_row.id;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2) Credit lot consumptions (restore original expiry on approved cancel)
-- ---------------------------------------------------------------------------

create table if not exists public.account_credit_lot_consumptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  lot_id uuid not null references public.account_credit_lots (id) on delete restrict,
  quantity integer not null check (quantity >= 1),
  expires_at_snapshot timestamptz,
  restored_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists account_credit_lot_consumptions_class_account_idx
  on public.account_credit_lot_consumptions (class_id, account_id);

alter table public.account_credit_lot_consumptions enable row level security;

drop policy if exists account_credit_lot_consumptions_select_admin on public.account_credit_lot_consumptions;
drop policy if exists account_credit_lot_consumptions_select_own on public.account_credit_lot_consumptions;

create policy account_credit_lot_consumptions_select_admin
  on public.account_credit_lot_consumptions for select to authenticated
  using (public.is_admin_or_dev());

create policy account_credit_lot_consumptions_select_own
  on public.account_credit_lot_consumptions for select to authenticated
  using (account_id = public.current_account_id());

-- ---------------------------------------------------------------------------
-- 3) Lock uses live studio_policy_settings.cancel_window_hours
-- ---------------------------------------------------------------------------

create or replace function public._finalize_escrow_payment_impl(p_escrow_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e public.class_payments_escrow%rowtype;
  v_final_id uuid;
  v_block boolean;
  v_or record;
  v_deadline timestamptz;
begin
  select * into v_e from public.class_payments_escrow where id = p_escrow_id for update;
  if not found then
    raise exception 'Escrow payment not found.';
  end if;

  if v_e.escrow_state = 'finalized' and v_e.final_transaction_id is not null then
    return v_e.final_transaction_id;
  end if;

  if v_e.status <> 'approved' or v_e.verified is distinct from true then
    raise exception 'Only approved verified payments can be finalized.';
  end if;

  if v_e.escrow_state = 'refunded' then
    raise exception 'Refunded payments cannot be finalized.';
  end if;

  v_deadline := coalesce(
    public.payment_refundable_until(v_e.class_starts_at),
    v_e.refundable_until
  );
  if v_deadline is not null and now() < v_deadline then
    raise exception 'Cancellation window has not ended yet.';
  end if;

  select exists (
    select 1
    from public.portal_requests pr
    where pr.request_type in (
      'cancellation_request'::public.portal_request_type,
      'member_enrollment_cancellation'::public.portal_request_type
    )
      and pr.requester_account_id = v_e.account_id
      and coalesce(pr.target_class_id, pr.result_class_id) = v_e.class_id
      and pr.status = 'pending'
  ) into v_block;

  if v_block then
    raise exception 'Pending cancellation request — resolve before finalizing.';
  end if;

  select * into v_or
  from public.build_or_fields_for_class_payment(
    v_e.class_id,
    v_e.account_id,
    v_e.amount_paid,
    v_e.unit_price
  );

  insert into public.final_transactions (
    escrow_payment_id, uid, class_id, account_id, payment_channel_id,
    payment_method_label, payment_reference, currency, quantity, unit_price,
    amount_paid, total_amount_due, amount_tendered, change_amount,
    vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales,
    seller_business_name, seller_address, seller_tin,
    buyer_name, buyer_email, buyer_address, service_description,
    class_starts_at, class_ends_at, request_physical_receipt,
    receipt_html, email_receipt_sent, receipt_printed, receipt_issued_at, finalized_at
  )
  values (
    v_e.id, v_e.uid, v_e.class_id, v_e.account_id, v_e.payment_channel_id,
    v_e.payment_method_label, v_e.payment_reference, v_e.currency, v_e.quantity, v_e.unit_price,
    v_e.amount_paid, v_e.total_amount_due, v_e.amount_tendered, v_e.change_amount,
    v_or.vatable_sales, v_or.vat_amount, v_or.vat_exempt_sales, v_or.zero_rated_sales,
    v_or.seller_business_name, v_or.seller_address, v_or.seller_tin,
    v_or.buyer_name, v_or.buyer_email, v_or.buyer_address, v_or.service_description,
    v_e.class_starts_at, v_e.class_ends_at, v_e.request_physical_receipt,
    '', false, false, now(), now()
  )
  on conflict (escrow_payment_id) do update
    set updated_at = now()
  returning id into v_final_id;

  update public.class_payments_escrow
  set
    escrow_state = 'finalized',
    final_transaction_id = v_final_id,
    finalized_at = now(),
    refundable_until = v_deadline
  where id = p_escrow_id;

  return v_final_id;
end;
$$;

revoke all on function public._finalize_escrow_payment_impl(uuid) from public;

create or replace function public._finalize_due_escrow_payments_impl()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select e.id
    from public.class_payments_escrow e
    where e.escrow_state = 'in_escrow'
      and e.status = 'approved'
      and e.verified is true
      and e.final_transaction_id is null
      and public.payment_refundable_until(e.class_starts_at) is not null
      and now() >= public.payment_refundable_until(e.class_starts_at)
      and not exists (
        select 1
        from public.portal_requests pr
        where pr.request_type in (
          'cancellation_request'::public.portal_request_type,
          'member_enrollment_cancellation'::public.portal_request_type
        )
          and pr.requester_account_id = e.account_id
          and coalesce(pr.target_class_id, pr.result_class_id) = e.class_id
          and pr.status = 'pending'
      )
  loop
    begin
      perform public._finalize_escrow_payment_impl(v_row.id);
      v_count := v_count + 1;
    exception
      when others then
        raise notice 'finalize_escrow_payment % skipped: %', v_row.id, sqlerrm;
    end;
  end loop;

  return v_count;
end;
$$;

revoke all on function public._finalize_due_escrow_payments_impl() from public;

-- ---------------------------------------------------------------------------
-- 4) Record which lots a credit enrollment consumed
-- ---------------------------------------------------------------------------

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
    return jsonb_build_object('enrolled', true, 'already_processed', true, 'class_id', p_class_id);
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
    select l.id, l.quantity_remaining, l.expires_at
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

    insert into public.account_credit_lot_consumptions (
      account_id, class_id, lot_id, quantity, expires_at_snapshot
    )
    values (v_account_id, p_class_id, v_lot.id, v_take, v_lot.expires_at);

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
    account_id, delta, balance_after, kind, reason, class_id, created_by, idempotency_key
  )
  values (
    v_account_id, -1, v_balance, 'spend'::public.credit_transaction_kind,
    v_reason, p_class_id, v_account_id, v_idempotency
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

create or replace function public._restore_enrollment_credit(
  p_class_id uuid,
  p_account_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idempotency text := 'restore-credit:' || p_class_id::text || ':' || p_account_id::text;
  v_spend text := 'enroll-credit:' || p_class_id::text || ':' || p_account_id::text;
  v_row record;
  v_restored integer := 0;
  v_balance integer;
  v_expires timestamptz;
begin
  if exists (
    select 1 from public.account_credit_transactions t where t.idempotency_key = v_idempotency
  ) then
    return jsonb_build_object('restored', true, 'already_processed', true);
  end if;

  if not exists (
    select 1 from public.account_credit_transactions t where t.idempotency_key = v_spend
  ) then
    return jsonb_build_object('restored', false, 'reason', 'no_credit_spend');
  end if;

  perform public.ensure_account_credit_wallet(p_account_id);

  for v_row in
    select c.id, c.lot_id, c.quantity, c.expires_at_snapshot
    from public.account_credit_lot_consumptions c
    where c.class_id = p_class_id
      and c.account_id = p_account_id
      and c.restored_at is null
    for update
  loop
    update public.account_credit_lots
    set quantity_remaining = least(quantity_initial, quantity_remaining + v_row.quantity)
    where id = v_row.lot_id;

    update public.account_credit_lot_consumptions
    set restored_at = now()
    where id = v_row.id;

    v_restored := v_restored + v_row.quantity;
  end loop;

  if v_restored = 0 then
    select l.expires_at into v_expires
    from public.account_credit_lots l
    where l.account_id = p_account_id
      and l.source_type = 'subscription'::public.credit_source_type
    order by l.created_at desc
    limit 1;

    insert into public.account_credit_lots (
      account_id, quantity_initial, quantity_remaining, expires_at,
      source_type, source_id, idempotency_key
    )
    values (
      p_account_id, 1, 1, v_expires,
      'class_cancellation'::public.credit_source_type,
      p_class_id,
      v_idempotency
    );
    v_restored := 1;
  end if;

  select available_balance into v_balance
  from public.account_credit_wallets
  where account_id = p_account_id
  for update;

  v_balance := coalesce(v_balance, 0) + v_restored;

  update public.account_credit_wallets
  set available_balance = v_balance
  where account_id = p_account_id;

  insert into public.account_credit_transactions (
    account_id, delta, balance_after, kind, reason, class_id, idempotency_key
  )
  values (
    p_account_id,
    v_restored,
    v_balance,
    'reversal'::public.credit_transaction_kind,
    coalesce(nullif(btrim(p_note), ''), 'Credit restored: enrollment cancellation approved.'),
    p_class_id,
    v_idempotency
  );

  return jsonb_build_object('restored', true, 'credits', v_restored);
end;
$$;

revoke all on function public._restore_enrollment_credit(uuid, uuid, text) from public;

-- ---------------------------------------------------------------------------
-- 5) Approved cancellation: early refund / credit restore, late forfeit
-- ---------------------------------------------------------------------------

create or replace function public.refund_member_class_escrow_if_eligible(
  p_class_id uuid,
  p_account_id uuid,
  p_cancellation_requested_at timestamptz default now(),
  p_review_note text default 'Refunded: member cancellation approved.'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_escrow public.class_payments_escrow%rowtype;
  v_class_start timestamptz;
  v_deadline timestamptz;
  v_within boolean;
  v_note text;
  v_credit jsonb;
begin
  select starts_at into v_class_start from public.classes where id = p_class_id;

  select * into v_escrow
  from public.class_payments_escrow e
  where e.class_id = p_class_id
    and e.account_id = p_account_id
    and e.escrow_state = 'in_escrow'
    and e.status = 'approved'
    and e.verified is true
    and e.final_transaction_id is null
  order by e.reviewed_at desc nulls last, e.created_at desc
  limit 1
  for update;

  v_deadline := public.payment_refundable_until(coalesce(v_escrow.class_starts_at, v_class_start));
  v_within := v_deadline is null or p_cancellation_requested_at <= v_deadline;
  v_note := coalesce(nullif(btrim(p_review_note), ''), 'Member cancellation approved.');

  if v_escrow.id is not null and v_within then
    perform public._mark_escrow_payment_refunded(v_escrow.id, p_cancellation_requested_at, v_note);
    delete from public.class_students
    where class_id = p_class_id and account_id = p_account_id;
    return jsonb_build_object(
      'outcome', 'cash_refund_approved',
      'manual_payout', true,
      'refunded', true,
      'escrow_payment_id', v_escrow.id,
      'within_window', true
    );
  end if;

  if v_within then
    v_credit := public._restore_enrollment_credit(p_class_id, p_account_id, v_note);
    if coalesce((v_credit->>'restored')::boolean, false) then
      delete from public.class_students
      where class_id = p_class_id and account_id = p_account_id;
      return v_credit || jsonb_build_object(
        'outcome', 'credit_restored',
        'within_window', true,
        'refunded', false
      );
    end if;
  end if;

  delete from public.class_students
  where class_id = p_class_id and account_id = p_account_id;

  return jsonb_build_object(
    'outcome', 'forfeited',
    'refunded', false,
    'within_window', v_within,
    'escrow_payment_id', v_escrow.id
  );
end;
$$;

revoke all on function public.refund_member_class_escrow_if_eligible(uuid, uuid, timestamptz, text) from public;

create or replace function public.submit_member_enrollment_cancellation(
  p_class_id uuid,
  p_requester_note text default ''
)
returns public.portal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester uuid := public.current_account_id();
  v_class public.classes%rowtype;
  v_row public.portal_requests;
begin
  if v_requester is null then
    raise exception 'Not authenticated.';
  end if;

  if not exists (
    select 1 from public.accounts a
    where a.id = v_requester and a.role = 'user'::public.user_role
  ) then
    raise exception 'Only member accounts can submit enrollment cancellations.';
  end if;

  if not exists (
    select 1 from public.class_students cs
    where cs.class_id = p_class_id and cs.account_id = v_requester
  ) then
    raise exception 'You are not enrolled in this class.';
  end if;

  select * into v_class from public.classes where id = p_class_id;
  if not found then
    raise exception 'Class not found.';
  end if;

  if exists (
    select 1 from public.portal_requests pr
    where pr.request_type = 'member_enrollment_cancellation'::public.portal_request_type
      and pr.requester_account_id = v_requester
      and pr.target_class_id = p_class_id
      and pr.status = 'pending'
  ) then
    raise exception 'You already have a pending cancellation request for this class.';
  end if;

  insert into public.portal_requests (
    request_type, status, requester_account_id, target_class_id, payload, requester_note
  )
  values (
    'member_enrollment_cancellation'::public.portal_request_type,
    'pending',
    v_requester,
    p_class_id,
    '{}'::jsonb,
    coalesce(trim(p_requester_note), '')
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.submit_member_enrollment_cancellation(uuid, text) from public;
grant execute on function public.submit_member_enrollment_cancellation(uuid, text) to authenticated;

create or replace function public.admin_mark_cash_refund_disbursed(
  p_escrow_payment_id uuid,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_or_dev() then
    raise exception 'Not authorized.';
  end if;

  update public.class_payments_escrow
  set
    cash_refund_disbursed_at = coalesce(cash_refund_disbursed_at, now()),
    review_note = trim(both from coalesce(review_note, '') || case
      when coalesce(btrim(p_note), '') = '' then ''
      else ' ' || btrim(p_note)
    end)
  where id = p_escrow_payment_id
    and escrow_state = 'refunded'::public.payment_escrow_state;

  if not found then
    raise exception 'Refunded escrow payment not found.';
  end if;

  return jsonb_build_object('disbursed', true, 'escrow_payment_id', p_escrow_payment_id);
end;
$$;

revoke all on function public.admin_mark_cash_refund_disbursed(uuid, text) from public;
grant execute on function public.admin_mark_cash_refund_disbursed(uuid, text) to authenticated;
