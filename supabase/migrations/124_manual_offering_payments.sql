-- Manual desk payments can target a pricing catalog offering (not only a class).

alter table public.class_payments_escrow
  alter column class_id drop not null;

alter table public.class_payments_escrow
  add column if not exists pricing_offering_id uuid
    references public.pricing_offerings (id) on delete restrict;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'class_payments_escrow_class_or_offering_chk'
  ) then
    alter table public.class_payments_escrow
      add constraint class_payments_escrow_class_or_offering_chk
      check (
        (class_id is not null and pricing_offering_id is null)
        or (class_id is null and pricing_offering_id is not null)
      );
  end if;
end $$;

create index if not exists class_payments_escrow_offering_idx
  on public.class_payments_escrow (pricing_offering_id);

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_create_class_payment'
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

create function public.admin_create_class_payment(
  p_account_id uuid,
  p_class_id uuid,
  p_payment_channel_id uuid,
  p_amount_paid numeric,
  p_payment_reference text default '',
  p_member_notes text default '',
  p_request_physical_receipt boolean default false,
  p_proof_storage_path text default '',
  p_auto_approve boolean default false,
  p_proof_original_filename text default '',
  p_pricing_offering_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := public.current_account_id();
  v_class public.classes%rowtype;
  v_offering public.pricing_offerings%rowtype;
  v_channel public.payment_channels%rowtype;
  v_account public.accounts%rowtype;
  v_payment_id uuid;
  v_uid text;
  v_enrolled integer;
  v_limit integer;
  v_notes text;
  v_refundable timestamptz;
  v_final_id uuid;
  v_is_offering boolean := p_pricing_offering_id is not null;
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  if v_reviewer is null then
    raise exception 'Not authenticated.';
  end if;

  if p_amount_paid is null or p_amount_paid <= 0 then
    raise exception 'Invalid payment amount.';
  end if;

  if v_is_offering and p_class_id is not null then
    raise exception 'Choose a class or a pricing service, not both.';
  end if;

  if not v_is_offering and p_class_id is null then
    raise exception 'Select a class or a pricing service.';
  end if;

  select * into v_account from public.accounts where id = p_account_id;
  if not found then
    raise exception 'Student account not found.';
  end if;

  if v_account.role <> 'user'::public.user_role then
    raise exception 'Selected account is not a client.';
  end if;

  select * into v_channel
  from public.payment_channels
  where id = p_payment_channel_id;

  if not found or v_channel.is_active is distinct from true then
    raise exception 'Invalid or inactive payment channel.';
  end if;

  if v_is_offering then
    select * into v_offering from public.pricing_offerings where id = p_pricing_offering_id;
    if not found or v_offering.is_active is distinct from true then
      raise exception 'Pricing service not found or inactive.';
    end if;
  else
    select * into v_class from public.classes where id = p_class_id for update;
    if not found then
      raise exception 'Class not found.';
    end if;

    if exists (
      select 1 from public.class_students cs
      where cs.class_id = p_class_id and cs.account_id = p_account_id
    ) then
      raise exception 'Student is already enrolled in this class.';
    end if;

    if exists (
      select 1 from public.class_payments_escrow cp
      where cp.class_id = p_class_id
        and cp.account_id = p_account_id
        and cp.status = 'pending'
    ) then
      raise exception 'This student already has a pending payment for this class.';
    end if;

    select count(*)::integer into v_enrolled from public.class_students where class_id = p_class_id;
    v_limit := v_class.class_limit;
    if v_limit is not null and v_limit > 0 and v_enrolled >= v_limit then
      raise exception 'Class is full.';
    end if;
  end if;

  v_uid := public.next_payment_uid(now());
  v_notes := coalesce(p_member_notes, '');
  if v_notes <> '' then
    v_notes := '[Manual entry] ' || v_notes;
  else
    v_notes := '[Manual entry]';
  end if;
  if v_is_offering then
    v_notes := v_notes || ' · ' || v_offering.title;
  end if;

  if v_is_offering then
    v_refundable := case when p_auto_approve then now() else null end;
  else
    v_refundable := public.payment_refundable_until(v_class.starts_at);
  end if;

  insert into public.class_payments_escrow (
    uid,
    class_id,
    pricing_offering_id,
    account_id,
    status,
    verified,
    escrow_state,
    refundable_until,
    payment_channel_id,
    payment_method_label,
    payment_reference,
    proof_storage_path,
    proof_original_filename,
    member_notes,
    unit_price,
    amount_paid,
    total_amount_due,
    amount_tendered,
    change_amount,
    class_starts_at,
    class_ends_at,
    request_physical_receipt,
    review_note,
    reviewed_by,
    reviewed_at
  )
  values (
    v_uid,
    case when v_is_offering then null else p_class_id end,
    case when v_is_offering then p_pricing_offering_id else null end,
    p_account_id,
    case when p_auto_approve then 'approved'::public.class_payment_status else 'pending'::public.class_payment_status end,
    coalesce(p_auto_approve, false),
    case
      when not p_auto_approve then 'pending_review'::public.payment_escrow_state
      when v_is_offering then 'finalized'::public.payment_escrow_state
      else 'in_escrow'::public.payment_escrow_state
    end,
    case when p_auto_approve then v_refundable else null end,
    p_payment_channel_id,
    v_channel.label,
    coalesce(p_payment_reference, ''),
    coalesce(btrim(p_proof_storage_path), ''),
    left(coalesce(btrim(p_proof_original_filename), ''), 255),
    v_notes,
    p_amount_paid,
    p_amount_paid,
    p_amount_paid,
    p_amount_paid,
    0,
    case when v_is_offering then null else v_class.starts_at end,
    case when v_is_offering then null else v_class.ends_at end,
    coalesce(p_request_physical_receipt, false),
    case when p_auto_approve then 'Verified manually by admin.' else '' end,
    case when p_auto_approve then v_reviewer else null end,
    case when p_auto_approve then now() else null end
  )
  returning id into v_payment_id;

  if v_is_offering then
    return jsonb_build_object(
      'payment_id', v_payment_id,
      'uid', v_uid,
      'status', case when p_auto_approve then 'approved' else 'pending' end,
      'final_transaction_id', null
    );
  end if;

  if p_auto_approve then
    insert into public.class_students (class_id, account_id, enrolled_by, wants_physical_receipt)
    values (
      p_class_id,
      p_account_id,
      v_reviewer,
      coalesce(p_request_physical_receipt, false)
    )
    on conflict (class_id, account_id) do update
      set wants_physical_receipt = excluded.wants_physical_receipt;

    delete from public.class_waitlist
    where class_id = p_class_id and account_id = p_account_id;

    v_final_id := null;
    if v_refundable is not null and now() >= v_refundable then
      begin
        v_final_id := public._finalize_escrow_payment_impl(v_payment_id);
      exception
        when others then
          null;
      end;
    end if;
  else
    insert into public.class_waitlist (class_id, account_id, payment_id)
    values (p_class_id, p_account_id, v_payment_id)
    on conflict (class_id, account_id) do update
      set payment_id = excluded.payment_id,
          joined_at = now();
  end if;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'uid', v_uid,
    'status', case when p_auto_approve then 'approved' else 'pending' end,
    'final_transaction_id', v_final_id
  );
end;
$$;

revoke all on function public.admin_create_class_payment(
  uuid, uuid, uuid, numeric, text, text, boolean, text, boolean, text, uuid
) from public;
grant execute on function public.admin_create_class_payment(
  uuid, uuid, uuid, numeric, text, text, boolean, text, boolean, text, uuid
) to authenticated;

create or replace function public.admin_review_class_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_review_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := public.current_account_id();
  v_payment public.class_payments_escrow%rowtype;
  v_class public.classes%rowtype;
  v_enrolled integer;
  v_refundable timestamptz;
  v_final_id uuid;
  v_is_offering boolean;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Not authorized.';
  end if;

  select * into v_payment from public.class_payments_escrow where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.';
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'Payment is already reviewed.';
  end if;

  v_is_offering := v_payment.pricing_offering_id is not null and v_payment.class_id is null;

  if p_approve then
    if v_is_offering then
      update public.class_payments_escrow
      set
        status = 'approved',
        verified = true,
        escrow_state = 'finalized'::public.payment_escrow_state,
        refundable_until = now(),
        review_note = coalesce(p_review_note, ''),
        reviewed_by = v_reviewer,
        reviewed_at = now()
      where id = p_payment_id;

      return jsonb_build_object(
        'status', 'approved',
        'verified', true,
        'escrow_state', 'finalized',
        'refundable_until', now(),
        'final_transaction_id', v_payment.final_transaction_id
      );
    end if;

    select * into v_class from public.classes where id = v_payment.class_id for update;
    select count(*)::integer into v_enrolled from public.class_students where class_id = v_payment.class_id;
    if v_class.class_limit is not null and v_class.class_limit > 0 and v_enrolled >= v_class.class_limit then
      raise exception 'Class is full; cannot approve enrollment.';
    end if;

    v_refundable := public.payment_refundable_until(coalesce(v_payment.class_starts_at, v_class.starts_at));

    update public.class_payments_escrow
    set
      status = 'approved',
      verified = true,
      escrow_state = 'in_escrow'::public.payment_escrow_state,
      refundable_until = v_refundable,
      review_note = coalesce(p_review_note, ''),
      reviewed_by = v_reviewer,
      reviewed_at = now()
    where id = p_payment_id;

    insert into public.class_students (class_id, account_id, enrolled_by, wants_physical_receipt)
    values (
      v_payment.class_id,
      v_payment.account_id,
      v_reviewer,
      coalesce(v_payment.request_physical_receipt, false)
    )
    on conflict (class_id, account_id) do update
      set wants_physical_receipt = excluded.wants_physical_receipt;

    delete from public.class_waitlist
    where class_id = v_payment.class_id and account_id = v_payment.account_id;

    v_final_id := null;
    if v_refundable is not null and now() >= v_refundable then
      begin
        v_final_id := public._finalize_escrow_payment_impl(p_payment_id);
      exception
        when others then
          v_final_id := (
            select final_transaction_id from public.class_payments_escrow where id = p_payment_id
          );
      end;
    else
      v_final_id := v_payment.final_transaction_id;
    end if;

    return jsonb_build_object(
      'status', 'approved',
      'verified', true,
      'escrow_state', (select escrow_state from public.class_payments_escrow where id = p_payment_id),
      'refundable_until', v_refundable,
      'final_transaction_id', v_final_id
    );
  end if;

  update public.class_payments_escrow
  set
    status = 'rejected',
    verified = false,
    escrow_state = 'rejected'::public.payment_escrow_state,
    review_note = coalesce(p_review_note, ''),
    reviewed_by = v_reviewer,
    reviewed_at = now()
  where id = p_payment_id;

  if v_payment.class_id is not null then
    delete from public.class_waitlist
    where class_id = v_payment.class_id and account_id = v_payment.account_id;
  end if;

  return jsonb_build_object('status', 'rejected', 'verified', false);
end;
$$;
