-- Member enrollment cancellation + OR snapshot at finalize + slim escrow BIR columns.
-- Requires 112_member_enrollment_cancel_enum.sql applied first.

-- ---------------------------------------------------------------------------
-- BIR / OR field builder (used at finalize)
-- ---------------------------------------------------------------------------

create or replace function public.build_or_fields_for_class_payment(
  p_class_id uuid,
  p_account_id uuid,
  p_amount_paid numeric,
  p_unit_price numeric default null
)
returns table (
  seller_business_name text,
  seller_address text,
  seller_tin text,
  buyer_name text,
  buyer_email text,
  buyer_address text,
  service_description text,
  vatable_sales numeric,
  vat_amount numeric,
  vat_exempt_sales numeric,
  zero_rated_sales numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_seller public.studio_receipt_config%rowtype;
  v_profile public.profiles_client%rowtype;
  v_class public.classes%rowtype;
  v_email text;
  v_buyer_name text;
  v_buyer_address text;
  v_desc text;
  v_unit numeric;
begin
  select * into v_seller from public.studio_receipt_config where id = 1;
  select * into v_profile from public.profiles_client where account_id = p_account_id;
  select * into v_class from public.classes where id = p_class_id;
  select email into v_email from public.accounts where id = p_account_id;

  v_buyer_name := coalesce(nullif(btrim(v_profile.name), ''), v_email, 'Member');
  v_buyer_address := nullif(
    btrim(concat_ws(', ', nullif(v_profile.barangay, ''), nullif(v_profile.city, ''), nullif(v_profile.province, ''))),
    ''
  );
  v_desc := coalesce(nullif(btrim(v_class.name), ''), 'Studio class session');
  v_unit := coalesce(p_unit_price, p_amount_paid);

  return query
  select
    coalesce(v_seller.business_name, '')::text,
    coalesce(v_seller.business_address, '')::text,
    coalesce(v_seller.tin, '')::text,
    v_buyer_name,
    coalesce(v_email, '')::text,
    coalesce(v_buyer_address, '')::text,
    v_desc,
    null::numeric,
    null::numeric,
    null::numeric,
    null::numeric;
end;
$$;

revoke all on function public.build_or_fields_for_class_payment(uuid, uuid, numeric, numeric) from public;

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

  if v_e.refundable_until is not null and now() < v_e.refundable_until then
    raise exception 'Refund window has not ended yet.';
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
    escrow_payment_id,
    uid,
    class_id,
    account_id,
    payment_channel_id,
    payment_method_label,
    payment_reference,
    currency,
    quantity,
    unit_price,
    amount_paid,
    total_amount_due,
    amount_tendered,
    change_amount,
    vatable_sales,
    vat_amount,
    vat_exempt_sales,
    zero_rated_sales,
    seller_business_name,
    seller_address,
    seller_tin,
    buyer_name,
    buyer_email,
    buyer_address,
    service_description,
    class_starts_at,
    class_ends_at,
    request_physical_receipt,
    receipt_html,
    email_receipt_sent,
    receipt_printed,
    receipt_issued_at,
    finalized_at
  )
  values (
    v_e.id,
    v_e.uid,
    v_e.class_id,
    v_e.account_id,
    v_e.payment_channel_id,
    v_e.payment_method_label,
    v_e.payment_reference,
    v_e.currency,
    v_e.quantity,
    v_e.unit_price,
    v_e.amount_paid,
    v_e.total_amount_due,
    v_e.amount_tendered,
    v_e.change_amount,
    v_or.vatable_sales,
    v_or.vat_amount,
    v_or.vat_exempt_sales,
    v_or.zero_rated_sales,
    v_or.seller_business_name,
    v_or.seller_address,
    v_or.seller_tin,
    v_or.buyer_name,
    v_or.buyer_email,
    v_or.buyer_address,
    v_or.service_description,
    v_e.class_starts_at,
    v_e.class_ends_at,
    v_e.request_physical_receipt,
    '',
    false,
    false,
    now(),
    now()
  )
  on conflict (escrow_payment_id) do update
    set updated_at = now()
  returning id into v_final_id;

  update public.class_payments_escrow
  set
    escrow_state = 'finalized',
    final_transaction_id = v_final_id,
    finalized_at = now()
  where id = p_escrow_id;

  return v_final_id;
end;
$$;

revoke all on function public._finalize_escrow_payment_impl(uuid) from public;

-- Batch finalize: include member cancellation pending checks
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
      and e.refundable_until is not null
      and now() >= e.refundable_until
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

-- ---------------------------------------------------------------------------
-- Member enrollment cancellation (refund-eligible window)
-- ---------------------------------------------------------------------------

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
  v_deadline timestamptz;
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

  v_deadline := public.payment_refundable_until(v_class.starts_at);
  if v_deadline is not null and now() > v_deadline then
    raise exception 'Cancellation is not allowed within the policy window before class start.';
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
    request_type,
    status,
    requester_account_id,
    target_class_id,
    payload,
    requester_note
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

-- Extend review_portal_request (member branch + keep coach logic from 111)
create or replace function public.review_portal_request(
  p_request_id uuid,
  p_status public.portal_request_status,
  p_review_note text default '',
  p_replacement_coach_account_id uuid default null,
  p_cancel_entire_class boolean default false
)
returns public.portal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := public.current_account_id();
  v_row public.portal_requests;
  v_prev public.portal_request_status;
  v_result uuid;
  v_payload jsonb := '{}'::jsonb;
  v_refund_count integer;
  v_refund jsonb;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Only admin or dev can review portal requests.';
  end if;

  if v_reviewer is null then
    raise exception 'Not authenticated.';
  end if;

  select * into v_row from public.portal_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found.';
  end if;

  v_prev := v_row.status;

  if v_prev = 'cancelled'::public.portal_request_status then
    raise exception 'Cancelled requests cannot be reviewed.';
  end if;

  if p_status = v_prev then
    return v_row;
  end if;

  if p_status = 'pending' and v_prev in ('approved', 'rejected') then
    if v_prev = 'approved' then
      if v_row.request_type = 'slot_request' then
        perform public.revert_approved_slot_request(v_row);
      end if;
    end if;
    update public.portal_requests
    set
      status = 'pending',
      review_note = coalesce(trim(p_review_note), review_note),
      reviewed_by = null,
      reviewed_at = null,
      result_class_id = null,
      updated_at = now()
    where id = p_request_id
    returning * into v_row;
    return v_row;
  end if;

  if v_prev <> 'pending' then
    raise exception 'Only pending requests can be approved or rejected.';
  end if;

  if p_status = 'approved' then
    if v_row.request_type = 'member_enrollment_cancellation' then
      if v_row.target_class_id is null then
        raise exception 'Missing target class.';
      end if;
      v_refund := public.refund_member_class_escrow_if_eligible(
        v_row.target_class_id,
        v_row.requester_account_id,
        v_row.created_at,
        coalesce(nullif(btrim(p_review_note), ''), 'Refunded: member cancellation approved.')
      );
      v_result := v_row.target_class_id;
      v_payload := coalesce(v_row.payload, '{}'::jsonb) || jsonb_build_object('escrow_refund', v_refund);
    elsif v_row.request_type = 'slot_request' then
      v_result := public.apply_approved_slot_request(v_row);
      update public.classes
      set
        status_block = 'assigned'::public.class_block_status,
        updated_at = now()
      where id = v_result
        and status_block is distinct from 'assigned'::public.class_block_status;
    elsif v_row.request_type = 'cancellation_request' then
      v_result := public.apply_approved_cancellation_request(
        v_row,
        p_replacement_coach_account_id,
        coalesce(p_cancel_entire_class, false)
      );
      v_payload := coalesce(v_row.payload, '{}'::jsonb)
        || jsonb_build_object(
          'replacement_coach_account_id', p_replacement_coach_account_id,
          'cancel_entire_class', coalesce(p_cancel_entire_class, false)
        );

      if coalesce(p_cancel_entire_class, false) and v_result is not null then
        v_refund_count := public.refund_escrow_payments_for_class(
          v_result,
          v_row.created_at,
          'Refunded: entire class cancelled (portal request).'
        );
        v_payload := v_payload || jsonb_build_object('escrow_refunds_processed', v_refund_count);
      end if;
    else
      raise exception 'Unsupported request type.';
    end if;

    update public.portal_requests
    set
      status = 'approved',
      review_note = coalesce(trim(p_review_note), ''),
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      result_class_id = v_result,
      payload = case
        when v_row.request_type in (
          'cancellation_request'::public.portal_request_type,
          'member_enrollment_cancellation'::public.portal_request_type
        ) then v_payload
        else payload
      end,
      updated_at = now()
    where id = p_request_id
    returning * into v_row;

    return v_row;
  end if;

  if p_status = 'rejected' then
    update public.portal_requests
    set
      status = 'rejected',
      review_note = coalesce(trim(p_review_note), ''),
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      updated_at = now()
    where id = p_request_id
    returning * into v_row;
    return v_row;
  end if;

  raise exception 'Invalid review status transition.';
end;
$$;

grant execute on function public.review_portal_request(
  uuid,
  public.portal_request_status,
  text,
  uuid,
  boolean
) to authenticated;

-- Slim payment RPCs (no BIR snapshots on escrow)
create or replace function public.submit_member_class_payment(
  p_class_id uuid,
  p_payment_channel_id uuid,
  p_payment_reference text,
  p_proof_storage_path text,
  p_amount_paid numeric,
  p_member_notes text default '',
  p_request_physical_receipt boolean default false,
  p_proof_original_filename text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid := public.current_account_id();
  v_class public.classes%rowtype;
  v_channel public.payment_channels%rowtype;
  v_payment_id uuid;
  v_uid text;
  v_enrolled integer;
  v_limit integer;
begin
  if v_account_id is null then
    raise exception 'Not authenticated.';
  end if;

  if p_proof_storage_path is null or btrim(p_proof_storage_path) = '' then
    raise exception 'Payment proof is required.';
  end if;

  if p_amount_paid is null or p_amount_paid <= 0 then
    raise exception 'Invalid payment amount.';
  end if;

  select * into v_channel
  from public.payment_channels
  where id = p_payment_channel_id;

  if not found or v_channel.is_active is distinct from true then
    raise exception 'Invalid or inactive payment channel.';
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
    select 1 from public.class_payments_escrow cp
    where cp.class_id = p_class_id
      and cp.account_id = v_account_id
      and cp.status = 'pending'
  ) then
    raise exception 'You already have a payment pending review for this class.';
  end if;

  select count(*)::integer into v_enrolled from public.class_students where class_id = p_class_id;
  v_limit := v_class.class_limit;
  if v_limit is not null and v_limit > 0 and v_enrolled >= v_limit then
    raise exception 'This class is full.';
  end if;

  v_uid := public.next_payment_uid(now());

  insert into public.class_payments_escrow (
    uid,
    class_id,
    account_id,
    status,
    verified,
    escrow_state,
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
    request_physical_receipt
  )
  values (
    v_uid,
    p_class_id,
    v_account_id,
    'pending',
    false,
    'pending_review'::public.payment_escrow_state,
    p_payment_channel_id,
    v_channel.label,
    coalesce(p_payment_reference, ''),
    btrim(p_proof_storage_path),
    left(coalesce(btrim(p_proof_original_filename), ''), 255),
    coalesce(p_member_notes, ''),
    p_amount_paid,
    p_amount_paid,
    p_amount_paid,
    p_amount_paid,
    0,
    v_class.starts_at,
    v_class.ends_at,
    coalesce(p_request_physical_receipt, false)
  )
  returning id into v_payment_id;

  insert into public.class_waitlist (class_id, account_id, payment_id)
  values (p_class_id, v_account_id, v_payment_id)
  on conflict (class_id, account_id) do update
    set payment_id = excluded.payment_id,
        joined_at = now();

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'uid', v_uid,
    'status', 'pending'
  );
end;
$$;

create or replace function public.admin_create_class_payment(
  p_account_id uuid,
  p_class_id uuid,
  p_payment_channel_id uuid,
  p_amount_paid numeric,
  p_payment_reference text default '',
  p_member_notes text default '',
  p_request_physical_receipt boolean default false,
  p_proof_storage_path text default '',
  p_auto_approve boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := public.current_account_id();
  v_class public.classes%rowtype;
  v_channel public.payment_channels%rowtype;
  v_account public.accounts%rowtype;
  v_payment_id uuid;
  v_uid text;
  v_enrolled integer;
  v_limit integer;
  v_notes text;
  v_refundable timestamptz;
  v_final_id uuid;
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

  v_uid := public.next_payment_uid(now());
  v_notes := coalesce(p_member_notes, '');
  if v_notes <> '' then
    v_notes := '[Manual entry] ' || v_notes;
  else
    v_notes := '[Manual entry]';
  end if;

  v_refundable := public.payment_refundable_until(v_class.starts_at);

  insert into public.class_payments_escrow (
    uid,
    class_id,
    account_id,
    status,
    verified,
    escrow_state,
    refundable_until,
    payment_channel_id,
    payment_method_label,
    payment_reference,
    proof_storage_path,
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
    p_class_id,
    p_account_id,
    case when p_auto_approve then 'approved'::public.class_payment_status else 'pending'::public.class_payment_status end,
    coalesce(p_auto_approve, false),
    case
      when p_auto_approve then 'in_escrow'::public.payment_escrow_state
      else 'pending_review'::public.payment_escrow_state
    end,
    case when p_auto_approve then v_refundable else null end,
    p_payment_channel_id,
    v_channel.label,
    coalesce(p_payment_reference, ''),
    coalesce(btrim(p_proof_storage_path), ''),
    v_notes,
    p_amount_paid,
    p_amount_paid,
    p_amount_paid,
    p_amount_paid,
    0,
    v_class.starts_at,
    v_class.ends_at,
    coalesce(p_request_physical_receipt, false),
    case when p_auto_approve then 'Verified manually by admin.' else '' end,
    case when p_auto_approve then v_reviewer else null end,
    case when p_auto_approve then now() else null end
  )
  returning id into v_payment_id;

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

alter table public.class_payments_escrow
  drop column if exists vatable_sales,
  drop column if exists vat_amount,
  drop column if exists vat_exempt_sales,
  drop column if exists zero_rated_sales,
  drop column if exists seller_business_name,
  drop column if exists seller_address,
  drop column if exists seller_tin,
  drop column if exists buyer_name,
  drop column if exists buyer_email,
  drop column if exists buyer_address,
  drop column if exists service_description;
