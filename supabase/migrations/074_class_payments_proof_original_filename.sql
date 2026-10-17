-- Original upload filename for payment proof (storage path uses a generated name).

alter table public.class_payments
  add column if not exists proof_original_filename text not null default '';

comment on column public.class_payments.proof_original_filename is
  'Member-facing filename of the uploaded proof file at submission time.';

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
  v_profile public.profiles_client%rowtype;
  v_seller public.studio_receipt_config%rowtype;
  v_channel public.payment_channels%rowtype;
  v_payment_id uuid;
  v_uid text;
  v_enrolled integer;
  v_limit integer;
  v_desc text;
  v_buyer_name text;
  v_buyer_address text;
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
    'occupied'::public.class_block_status
  ) then
    raise exception 'This class is not open for enrollment.';
  end if;

  if v_class.status_class = 'close'::public.class_open_status then
    raise exception 'This class is closed for enrollment.';
  end if;

  if exists (
    select 1 from public.class_students cs
    where cs.class_id = p_class_id and cs.account_id = v_account_id
  ) then
    raise exception 'You are already enrolled in this class.';
  end if;

  if exists (
    select 1 from public.class_payments cp
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

  select * into v_profile from public.profiles_client where account_id = v_account_id;
  select * into v_seller from public.studio_receipt_config where id = 1;

  v_buyer_name := coalesce(nullif(btrim(v_profile.name), ''), (
    select email from public.accounts where id = v_account_id
  ), 'Member');
  v_buyer_address := nullif(
    btrim(concat_ws(', ', nullif(v_profile.barangay, ''), nullif(v_profile.city, ''), nullif(v_profile.province, ''))),
    ''
  );

  v_desc := coalesce(nullif(btrim(v_class.name), ''), 'Studio class session');

  v_uid := public.next_payment_uid(now());

  insert into public.class_payments (
    uid,
    class_id,
    account_id,
    status,
    verified,
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
    seller_business_name,
    seller_address,
    seller_tin,
    buyer_name,
    buyer_email,
    buyer_address,
    service_description,
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
    coalesce(v_seller.business_name, ''),
    coalesce(v_seller.business_address, ''),
    coalesce(v_seller.tin, ''),
    v_buyer_name,
    (select email from public.accounts where id = v_account_id),
    coalesce(v_buyer_address, ''),
    v_desc,
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

revoke all on function public.submit_member_class_payment(uuid, uuid, text, text, numeric, text, boolean) from public;
revoke all on function public.submit_member_class_payment(uuid, uuid, text, text, numeric, text, boolean, text) from public;
grant execute on function public.submit_member_class_payment(uuid, uuid, text, text, numeric, text, boolean, text) to authenticated;

create or replace function public.admin_create_class_payment(
  p_account_id uuid,
  p_class_id uuid,
  p_payment_channel_id uuid,
  p_amount_paid numeric,
  p_payment_reference text default '',
  p_member_notes text default '',
  p_request_physical_receipt boolean default false,
  p_proof_storage_path text default '',
  p_proof_original_filename text default '',
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
  v_profile public.profiles_client%rowtype;
  v_seller public.studio_receipt_config%rowtype;
  v_channel public.payment_channels%rowtype;
  v_account public.accounts%rowtype;
  v_payment_id uuid;
  v_uid text;
  v_enrolled integer;
  v_limit integer;
  v_desc text;
  v_buyer_name text;
  v_buyer_address text;
  v_notes text;
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
    select 1 from public.class_payments cp
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

  select * into v_profile from public.profiles_client where account_id = p_account_id;

  select * into v_seller from public.studio_receipt_config where id = 1;

  v_buyer_name := coalesce(nullif(btrim(v_profile.name), ''), v_account.email, 'Member');
  v_buyer_address := nullif(
    btrim(concat_ws(', ', nullif(v_profile.barangay, ''), nullif(v_profile.city, ''), nullif(v_profile.province, ''))),
    ''
  );

  v_desc := coalesce(nullif(btrim(v_class.name), ''), 'Studio class session');
  v_uid := public.next_payment_uid(now());
  v_notes := coalesce(p_member_notes, '');
  if v_notes <> '' then
    v_notes := '[Manual entry] ' || v_notes;
  else
    v_notes := '[Manual entry]';
  end if;

  insert into public.class_payments (
    uid,
    class_id,
    account_id,
    status,
    verified,
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
    review_note,
    reviewed_by,
    reviewed_at,
    receipt_issued_at
  )
  values (
    v_uid,
    p_class_id,
    p_account_id,
    case when p_auto_approve then 'approved'::public.class_payment_status else 'pending'::public.class_payment_status end,
    coalesce(p_auto_approve, false),
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
    coalesce(v_seller.business_name, ''),
    coalesce(v_seller.business_address, ''),
    coalesce(v_seller.tin, ''),
    v_buyer_name,
    v_account.email,
    coalesce(v_buyer_address, ''),
    v_desc,
    v_class.starts_at,
    v_class.ends_at,
    coalesce(p_request_physical_receipt, false),
    case when p_auto_approve then 'Verified manually by admin.' else '' end,
    case when p_auto_approve then v_reviewer else null end,
    case when p_auto_approve then now() else null end,
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
    'status', case when p_auto_approve then 'approved' else 'pending' end
  );
end;
$$;

revoke all on function public.admin_create_class_payment(
  uuid, uuid, uuid, numeric, text, text, boolean, text, boolean
) from public;
revoke all on function public.admin_create_class_payment(
  uuid, uuid, uuid, numeric, text, text, boolean, text, text, boolean
) from public;
grant execute on function public.admin_create_class_payment(
  uuid, uuid, uuid, numeric, text, text, boolean, text, text, boolean
) to authenticated;
