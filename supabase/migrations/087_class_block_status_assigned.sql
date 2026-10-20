-- status_block enum: occupied → assigned, closed → completed, add cancelled.

alter type public.class_block_status rename value 'occupied' to 'assigned';
alter type public.class_block_status rename value 'closed' to 'completed';

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'class_block_status'
      and e.enumlabel = 'cancelled'
  ) then
    alter type public.class_block_status add value 'cancelled';
  end if;
end $$;

comment on column public.classes.status_block is
  'Calendar block state: vacant, assigned, active, completed, or cancelled.';

-- Functions that referenced the old enum label (updated for clarity after rename).

create or replace function public.close_started_class_blocks()
returns void
language sql
security definer
set search_path = public
as $$
  update public.classes
  set
    status_block = 'completed'::public.class_block_status,
    updated_at = now()
  where status_block in (
    'active'::public.class_block_status,
    'assigned'::public.class_block_status
  )
  and starts_at <= now();
$$;

comment on function public.close_started_class_blocks() is
  'Sets status_block to completed for active/assigned classes whose starts_at is in the past.';

create or replace function public.apply_approved_slot_request(
  p_request public.portal_requests
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.classes;
  v_actor uuid := public.current_account_id();
  v_name text;
  v_description text;
  v_discipline uuid;
  v_limit integer;
  v_coaches uuid[];
  v_elem jsonb;
begin
  select * into v_class from public.classes where id = p_request.target_class_id;
  if not found then
    raise exception 'Target class not found.';
  end if;

  if v_class.status_block <> 'vacant'::public.class_block_status then
    raise exception 'Target block is no longer vacant.';
  end if;

  v_name := trim(p_request.payload->>'name');
  v_description := coalesce(p_request.payload->>'description', '');
  v_discipline := (p_request.payload->>'discipline_id')::uuid;
  v_limit := (p_request.payload->>'class_limit')::integer;

  v_coaches := '{}';
  for v_elem in select * from jsonb_array_elements(p_request.payload->'coach_account_ids')
  loop
    v_coaches := array_append(v_coaches, (v_elem #>> '{}')::uuid);
  end loop;

  perform public.assert_accounts_are_coaches(v_coaches);
  perform public.assert_class_schedule_no_overlap(v_class.starts_at, v_class.ends_at, v_class.id);

  update public.classes
  set
    name = v_name,
    description = v_description,
    discipline_id = v_discipline,
    class_limit = v_limit,
    status_class = 'pending'::public.class_open_status,
    status_block = 'assigned'::public.class_block_status,
    updated_at = now()
  where id = v_class.id;

  delete from public.class_coaches where class_id = v_class.id;

  if cardinality(v_coaches) > 0 then
    insert into public.class_coaches (class_id, account_id, assigned_by, coach_confirmation)
    select distinct v_class.id, coach_id, v_actor, true
    from unnest(v_coaches) as coach_id;
  end if;

  return v_class.id;
end;
$$;

create or replace function public.review_portal_request(
  p_request_id uuid,
  p_status public.portal_request_status,
  p_review_note text default ''
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
      v_result := public.apply_approved_cancellation_request(v_row);
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
    'assigned'::public.class_block_status
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

-- Member schedule RLS: completed only here (cancelled enum label is new — see 088).

drop policy if exists "Classes select active or closed block authenticated" on public.classes;

create policy "Classes select active or closed block authenticated"
  on public.classes
  for select
  to authenticated
  using (
    status_block in (
      'active'::public.class_block_status,
      'completed'::public.class_block_status
    )
  );

create or replace function public.rls_class_is_active_block(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and c.status_block in (
        'active'::public.class_block_status,
        'completed'::public.class_block_status
      )
  );
$$;

grant execute on function public.rls_class_is_active_block(uuid) to anon, authenticated;
