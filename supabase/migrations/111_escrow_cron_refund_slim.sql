-- Hourly escrow finalization (pg_cron), refund on approved cancellation, slim escrow columns.

-- ---------------------------------------------------------------------------
-- 1) Batch finalize (impl + cron; admin RPC wraps impl)
-- ---------------------------------------------------------------------------

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
        where pr.request_type = 'cancellation_request'
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

create or replace function public.finalize_due_escrow_payments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_or_dev() then
    raise exception 'Not authorized.';
  end if;
  return public._finalize_due_escrow_payments_impl();
end;
$$;

revoke all on function public.finalize_due_escrow_payments() from public;
grant execute on function public.finalize_due_escrow_payments() to authenticated;

create or replace function public.finalize_due_escrow_payments_cron()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._finalize_due_escrow_payments_impl();
end;
$$;

revoke all on function public.finalize_due_escrow_payments_cron() from public;
grant execute on function public.finalize_due_escrow_payments_cron() to service_role;

-- ---------------------------------------------------------------------------
-- 2) Refund escrow (cancellation window vs request time)
-- ---------------------------------------------------------------------------

create or replace function public._mark_escrow_payment_refunded(
  p_escrow_id uuid,
  p_cancellation_requested_at timestamptz,
  p_review_note_append text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e public.class_payments_escrow%rowtype;
  v_deadline timestamptz;
begin
  select * into v_e from public.class_payments_escrow where id = p_escrow_id for update;
  if not found then
    return;
  end if;

  if v_e.escrow_state = 'refunded' then
    return;
  end if;

  if v_e.escrow_state = 'finalized' or v_e.final_transaction_id is not null then
    raise exception 'Payment already finalized; cannot refund via escrow.';
  end if;

  if v_e.status <> 'approved' or v_e.verified is distinct from true then
    return;
  end if;

  v_deadline := coalesce(
    v_e.refundable_until,
    public.payment_refundable_until(v_e.class_starts_at)
  );

  if v_deadline is not null and p_cancellation_requested_at > v_deadline then
    raise exception 'Cancellation was after the refund deadline (%).', v_deadline;
  end if;

  update public.class_payments_escrow
  set
    escrow_state = 'refunded'::public.payment_escrow_state,
    review_note = trim(both from coalesce(review_note, '') || case
      when coalesce(p_review_note_append, '') = '' then ''
      else ' ' || p_review_note_append
    end)
  where id = p_escrow_id;
end;
$$;

revoke all on function public._mark_escrow_payment_refunded(uuid, timestamptz, text) from public;

create or replace function public.refund_escrow_payments_for_class(
  p_class_id uuid,
  p_cancellation_requested_at timestamptz,
  p_review_note text default 'Refunded: class cancellation approved.'
)
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
    where e.class_id = p_class_id
      and e.escrow_state = 'in_escrow'
      and e.status = 'approved'
      and e.verified is true
      and e.final_transaction_id is null
  loop
    begin
      perform public._mark_escrow_payment_refunded(
        v_row.id,
        p_cancellation_requested_at,
        p_review_note
      );
      v_count := v_count + 1;
    exception
      when others then
        raise notice 'refund escrow % skipped: %', v_row.id, sqlerrm;
    end;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.refund_escrow_payments_for_class(uuid, timestamptz, text) from public;

create or replace function public.admin_refund_class_payment_escrow(
  p_escrow_payment_id uuid,
  p_review_note text default '',
  p_cancellation_requested_at timestamptz default now()
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

  perform public._mark_escrow_payment_refunded(
    p_escrow_payment_id,
    p_cancellation_requested_at,
    coalesce(nullif(btrim(p_review_note), ''), 'Refunded by admin.')
  );

  delete from public.class_students cs
  using public.class_payments_escrow e
  where e.id = p_escrow_payment_id
    and cs.class_id = e.class_id
    and cs.account_id = e.account_id;

  return jsonb_build_object('status', 'refunded', 'escrow_payment_id', p_escrow_payment_id);
end;
$$;

revoke all on function public.admin_refund_class_payment_escrow(uuid, text, timestamptz) from public;
grant execute on function public.admin_refund_class_payment_escrow(uuid, text, timestamptz) to authenticated;

-- Member/class cancellation: refund one enrollment when request is within policy window.
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
  v_escrow_id uuid;
begin
  select e.id into v_escrow_id
  from public.class_payments_escrow e
  where e.class_id = p_class_id
    and e.account_id = p_account_id
    and e.escrow_state = 'in_escrow'
    and e.status = 'approved'
    and e.verified is true
    and e.final_transaction_id is null
  order by e.reviewed_at desc nulls last, e.created_at desc
  limit 1;

  if v_escrow_id is null then
    return jsonb_build_object('refunded', false, 'reason', 'no_eligible_escrow');
  end if;

  perform public._mark_escrow_payment_refunded(
    v_escrow_id,
    p_cancellation_requested_at,
    p_review_note
  );

  delete from public.class_students
  where class_id = p_class_id and account_id = p_account_id;

  return jsonb_build_object('refunded', true, 'escrow_payment_id', v_escrow_id);
end;
$$;

revoke all on function public.refund_member_class_escrow_if_eligible(uuid, uuid, timestamptz, text) from public;
grant execute on function public.refund_member_class_escrow_if_eligible(uuid, uuid, timestamptz, text) to authenticated;

-- Wire class-wide refund when staff cancellation cancels the entire class.
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
    if v_row.request_type = 'slot_request' then
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
        when v_row.request_type = 'cancellation_request' then v_payload
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

-- ---------------------------------------------------------------------------
-- 3) pg_cron: hourly finalize
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;

do $$
declare
  v_jobid bigint;
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    select jobid into v_jobid
    from cron.job
    where jobname = 'finalize_due_escrow_payments_hourly';

    if v_jobid is not null then
      perform cron.unschedule(v_jobid);
    end if;

    perform cron.schedule(
      'finalize_due_escrow_payments_hourly',
      '0 * * * *',
      $cron$select public.finalize_due_escrow_payments_cron();$cron$
    );
  else
    raise notice 'pg_cron namespace not available; skip scheduling finalize_due_escrow_payments_hourly';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 4) Slim escrow: receipt artifacts live on final_transactions only
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
    where pr.request_type = 'cancellation_request'
      and pr.requester_account_id = v_e.account_id
      and coalesce(pr.target_class_id, pr.result_class_id) = v_e.class_id
      and pr.status = 'pending'
  ) into v_block;

  if v_block then
    raise exception 'Pending cancellation request — resolve before finalizing.';
  end if;

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
    v_e.vatable_sales,
    v_e.vat_amount,
    v_e.vat_exempt_sales,
    v_e.zero_rated_sales,
    v_e.seller_business_name,
    v_e.seller_address,
    v_e.seller_tin,
    v_e.buyer_name,
    v_e.buyer_email,
    v_e.buyer_address,
    v_e.service_description,
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

alter table public.class_payments_escrow
  drop column if exists receipt_html,
  drop column if exists email_receipt_sent,
  drop column if exists receipt_printed,
  drop column if exists receipt_issued_at;
