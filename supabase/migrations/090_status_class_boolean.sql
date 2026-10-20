-- status_class: enum → boolean (open = true; pending/closed = false).

-- Policy "Classes select published public" references status_class; drop before type change.
drop policy if exists "Classes select published public" on public.classes;

alter table public.classes
  alter column status_class drop default;

alter table public.classes
  alter column status_class type boolean
  using (status_class::text = 'open');

alter table public.classes
  alter column status_class set default false,
  alter column status_class set not null;

comment on column public.classes.status_class is
  'When true, the class is open for enrollment; when false, pending or closed.';

-- Drop RPC signatures that used class_open_status (recreated below with boolean).
drop function if exists public.admin_create_class(
  timestamptz,
  timestamptz,
  integer,
  public.class_open_status,
  public.class_block_status,
  text,
  text,
  uuid,
  uuid[],
  uuid[]
);

drop function if exists public.admin_update_class(
  uuid,
  timestamptz,
  timestamptz,
  integer,
  public.class_open_status,
  public.class_block_status,
  text,
  text,
  uuid,
  uuid[],
  uuid[]
);

create or replace function public.admin_create_class(
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_class_limit integer default null,
  p_status_class boolean default false,
  p_status_block public.class_block_status default 'vacant',
  p_name text default '',
  p_description text default '',
  p_discipline_id uuid default null,
  p_coach_account_ids uuid[] default '{}',
  p_student_account_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_account_id();
  v_class_id uuid;
  v_students uuid[];
  v_coaches uuid[];
begin
  if not public.is_admin_or_dev() then
    raise exception 'Only admin or dev can create classes.';
  end if;

  if v_actor is null then
    raise exception 'No authenticated account.';
  end if;

  if p_class_limit is not null and p_class_limit < 1 then
    raise exception 'Class limit must be at least 1.';
  end if;

  if p_discipline_id is not null
    and not exists (select 1 from public.disciplines d where d.id = p_discipline_id) then
    raise exception 'Discipline not found.';
  end if;

  v_coaches := coalesce(p_coach_account_ids, '{}');
  if cardinality(v_coaches) > 0 then
    perform public.assert_accounts_are_coaches(v_coaches);
  end if;

  v_students := coalesce(p_student_account_ids, '{}');
  if cardinality(v_students) > 0 then
    perform public.assert_accounts_are_users(v_students);
  end if;

  if cardinality(v_students) > 0 and p_class_limit is null then
    raise exception 'Class limit is required when students are enrolled.';
  end if;

  if p_class_limit is not null and cardinality(v_students) > p_class_limit then
    raise exception 'Cannot enroll % students; class limit is %.', cardinality(v_students), p_class_limit;
  end if;

  perform public.assert_class_schedule_no_overlap(p_starts_at, p_ends_at, null);

  insert into public.classes (
    name,
    description,
    discipline_id,
    starts_at,
    ends_at,
    class_limit,
    status_class,
    status_block,
    created_by,
    updated_at
  )
  values (
    coalesce(trim(p_name), ''),
    coalesce(p_description, ''),
    p_discipline_id,
    p_starts_at,
    p_ends_at,
    p_class_limit,
    coalesce(p_status_class, false),
    coalesce(p_status_block, 'vacant'::public.class_block_status),
    v_actor,
    null
  )
  returning id into v_class_id;

  if cardinality(v_coaches) > 0 then
    insert into public.class_coaches (class_id, account_id, assigned_by, coach_confirmation)
    select distinct v_class_id, coach_id, v_actor, false
    from unnest(v_coaches) as coach_id;
  end if;

  if cardinality(v_students) > 0 then
    insert into public.class_students (class_id, account_id, enrolled_by)
    select distinct v_class_id, user_id, v_actor
    from unnest(v_students) as user_id;
  end if;

  return v_class_id;
end;
$$;

create or replace function public.admin_update_class(
  p_class_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_class_limit integer default null,
  p_status_class boolean default false,
  p_status_block public.class_block_status default 'vacant',
  p_name text default '',
  p_description text default '',
  p_discipline_id uuid default null,
  p_coach_account_ids uuid[] default '{}',
  p_student_account_ids uuid[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_account_id();
  v_students uuid[];
  v_coaches uuid[];
  v_existing_count integer;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Only admin or dev can update classes.';
  end if;

  if not exists (select 1 from public.classes c where c.id = p_class_id) then
    raise exception 'Class not found.';
  end if;

  if p_class_limit is not null and p_class_limit < 1 then
    raise exception 'Class limit must be at least 1.';
  end if;

  if p_discipline_id is not null
    and not exists (select 1 from public.disciplines d where d.id = p_discipline_id) then
    raise exception 'Discipline not found.';
  end if;

  v_coaches := coalesce(p_coach_account_ids, '{}');
  if cardinality(v_coaches) > 0 then
    perform public.assert_accounts_are_coaches(v_coaches);
  end if;

  if p_student_account_ids is null then
    select count(*)::integer into v_existing_count
    from public.class_students
    where class_id = p_class_id;

    if p_class_limit is not null and v_existing_count > p_class_limit then
      raise exception 'Class limit (%) is below current enrollment count (%).', p_class_limit, v_existing_count;
    end if;

    if v_existing_count > 0 and p_class_limit is null then
      raise exception 'Class limit is required when students are enrolled.';
    end if;
  else
    v_students := p_student_account_ids;
    perform public.assert_accounts_are_users(v_students);

    if cardinality(v_students) > 0 and p_class_limit is null then
      raise exception 'Class limit is required when students are enrolled.';
    end if;

    if p_class_limit is not null and cardinality(v_students) > p_class_limit then
      raise exception 'Cannot enroll % students; class limit is %.', cardinality(v_students), p_class_limit;
    end if;
  end if;

  perform public.assert_class_schedule_no_overlap(p_starts_at, p_ends_at, p_class_id);

  update public.classes
  set
    name = coalesce(trim(p_name), ''),
    description = coalesce(p_description, ''),
    discipline_id = p_discipline_id,
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    class_limit = p_class_limit,
    status_class = coalesce(p_status_class, false),
    status_block = p_status_block
  where id = p_class_id;

  delete from public.class_coaches where class_id = p_class_id;

  if cardinality(v_coaches) > 0 then
    insert into public.class_coaches (class_id, account_id, assigned_by, coach_confirmation)
    select distinct p_class_id, coach_id, v_actor, false
    from unnest(v_coaches) as coach_id;
  end if;

  if p_student_account_ids is not null then
    delete from public.class_students where class_id = p_class_id;

    if cardinality(v_students) > 0 then
      insert into public.class_students (class_id, account_id, enrolled_by)
      select distinct p_class_id, user_id, v_actor
      from unnest(v_students) as user_id;
    end if;
  end if;
end;
$$;

grant execute on function public.admin_create_class(
  timestamptz,
  timestamptz,
  integer,
  boolean,
  public.class_block_status,
  text,
  text,
  uuid,
  uuid[],
  uuid[]
) to authenticated;

grant execute on function public.admin_update_class(
  uuid,
  timestamptz,
  timestamptz,
  integer,
  boolean,
  public.class_block_status,
  text,
  text,
  uuid,
  uuid[],
  uuid[]
) to authenticated;

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
    status_class = false,
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

create or replace function public.apply_approved_cancellation_request(
  p_request public.portal_requests
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid := p_request.target_class_id;
  v_requester uuid := p_request.requester_account_id;
  v_coach_count integer;
  v_student_count integer;
begin
  if v_class_id is null then
    raise exception 'Missing target class.';
  end if;

  delete from public.class_coaches
  where class_id = v_class_id
    and account_id = v_requester;

  select count(*) into v_coach_count from public.class_coaches where class_id = v_class_id;
  select count(*) into v_student_count from public.class_students where class_id = v_class_id;

  if v_coach_count = 0 and v_student_count = 0 then
    update public.classes
    set
      name = '',
      description = '',
      discipline_id = null,
      status_class = false,
      status_block = 'vacant'::public.class_block_status,
      updated_at = now()
    where id = v_class_id;
  end if;

  return v_class_id;
end;
$$;

create or replace function public.revert_approved_slot_request(
  p_request public.portal_requests
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid := coalesce(p_request.result_class_id, p_request.target_class_id);
begin
  if v_class_id is null then
    return;
  end if;

  delete from public.class_coaches where class_id = v_class_id;
  delete from public.class_students where class_id = v_class_id;

  update public.classes
  set
    name = '',
    description = '',
    discipline_id = null,
    status_class = false,
    status_block = 'vacant'::public.class_block_status,
    updated_at = now()
  where id = v_class_id;
end;
$$;

-- Enrollment guard (body from 087; status_class check only).
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

create policy "Classes select published public"
  on public.classes
  for select
  to anon, authenticated
  using (status_class is true);

create or replace function public.rls_class_is_published(p_class_id uuid)
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
      and c.status_class is true
  );
$$;

grant execute on function public.rls_class_is_published(uuid) to anon, authenticated;

drop type if exists public.class_open_status;
