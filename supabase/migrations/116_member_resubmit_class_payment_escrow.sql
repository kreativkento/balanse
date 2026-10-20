-- Member resubmit after admin rejects class enrollment payment.

create or replace function public.member_resubmit_class_payment_escrow(
  p_payment_id uuid,
  p_payment_channel_id uuid,
  p_payment_reference text,
  p_proof_storage_path text,
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
  v_payment public.class_payments_escrow%rowtype;
  v_class public.classes%rowtype;
  v_channel public.payment_channels%rowtype;
  v_enrolled integer;
begin
  if v_account_id is null then
    raise exception 'Not authenticated.';
  end if;

  if p_proof_storage_path is null or btrim(p_proof_storage_path) = '' then
    raise exception 'Payment proof is required.';
  end if;

  select * into v_payment
  from public.class_payments_escrow
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found.';
  end if;

  if v_payment.account_id <> v_account_id then
    raise exception 'Not authorized.';
  end if;

  if v_payment.status <> 'rejected' or v_payment.escrow_state <> 'rejected'::public.payment_escrow_state then
    raise exception 'Only returned payments can be resubmitted.';
  end if;

  select * into v_channel
  from public.payment_channels
  where id = p_payment_channel_id;

  if not found or v_channel.is_active is distinct from true then
    raise exception 'Invalid or inactive payment channel.';
  end if;

  select * into v_class from public.classes where id = v_payment.class_id for update;
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
    where cs.class_id = v_payment.class_id and cs.account_id = v_account_id
  ) then
    raise exception 'You are already enrolled in this class.';
  end if;

  if exists (
    select 1 from public.class_payments_escrow cp
    where cp.class_id = v_payment.class_id
      and cp.account_id = v_account_id
      and cp.status = 'pending'
      and cp.id <> p_payment_id
  ) then
    raise exception 'You already have a payment pending review for this class.';
  end if;

  select count(*)::integer into v_enrolled from public.class_students where class_id = v_payment.class_id;
  if v_class.class_limit is not null and v_class.class_limit > 0 and v_enrolled >= v_class.class_limit then
    raise exception 'This class is full.';
  end if;

  update public.class_payments_escrow
  set
    status = 'pending',
    verified = false,
    escrow_state = 'pending_review'::public.payment_escrow_state,
    payment_channel_id = p_payment_channel_id,
    payment_method_label = v_channel.label,
    payment_reference = coalesce(p_payment_reference, ''),
    proof_storage_path = btrim(p_proof_storage_path),
    proof_original_filename = left(coalesce(btrim(p_proof_original_filename), ''), 255),
    member_notes = coalesce(p_member_notes, ''),
    request_physical_receipt = coalesce(p_request_physical_receipt, false),
    review_note = '',
    reviewed_by = null,
    reviewed_at = null,
    final_transaction_id = null,
    finalized_at = null,
    refundable_until = null,
    updated_at = now()
  where id = p_payment_id;

  insert into public.class_waitlist (class_id, account_id, payment_id)
  values (v_payment.class_id, v_account_id, p_payment_id)
  on conflict (class_id, account_id) do update
    set payment_id = excluded.payment_id,
        joined_at = now();

  return jsonb_build_object(
    'payment_id', p_payment_id,
    'uid', v_payment.uid,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.member_resubmit_class_payment_escrow(uuid, uuid, text, text, text, boolean, text) from public;
grant execute on function public.member_resubmit_class_payment_escrow(uuid, uuid, text, text, text, boolean, text) to authenticated;
