-- Unified staff portal requests (slot fill, class cancellation, extensible by type).
-- Run after 044_class_schedule_no_overlap.sql and 046_classes_staff_schedule_read.sql.

-- ---------------------------------------------------------------------------
-- 1. Enums + table
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'portal_request_type') then
    create type public.portal_request_type as enum (
      'slot_request',
      'cancellation_request'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_request_status') then
    create type public.portal_request_status as enum (
      'pending',
      'approved',
      'rejected'
    );
  end if;
end
$$;

create table if not exists public.portal_requests (
  id uuid primary key default gen_random_uuid(),
  request_type public.portal_request_type not null,
  status public.portal_request_status not null default 'pending',
  requester_account_id uuid not null references public.accounts (id) on delete cascade,
  target_class_id uuid references public.classes (id) on delete set null,
  result_class_id uuid references public.classes (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  requester_note text not null default '',
  review_note text not null default '',
  reviewed_by uuid references public.accounts (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_requests_payload_is_object_chk check (jsonb_typeof(payload) = 'object')
);

comment on table public.portal_requests is
  'Staff-initiated requests reviewed by admin. payload shape depends on request_type.';

create index if not exists portal_requests_status_idx
  on public.portal_requests (status);

create index if not exists portal_requests_type_idx
  on public.portal_requests (request_type);

create index if not exists portal_requests_requester_idx
  on public.portal_requests (requester_account_id);

create index if not exists portal_requests_target_class_idx
  on public.portal_requests (target_class_id)
  where target_class_id is not null;

create unique index if not exists portal_requests_one_pending_slot_per_class
  on public.portal_requests (target_class_id)
  where status = 'pending'
    and request_type = 'slot_request'
    and target_class_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_portal_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists portal_requests_touch_updated_at on public.portal_requests;
create trigger portal_requests_touch_updated_at
  before update on public.portal_requests
  for each row
  execute function public.touch_portal_requests_updated_at();

create or replace function public.validate_portal_request_payload(
  p_request_type public.portal_request_type,
  p_target_class_id uuid,
  p_payload jsonb
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_name text;
  v_discipline uuid;
  v_limit integer;
  v_coaches jsonb;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return false;
  end if;

  if p_request_type = 'slot_request' then
    if p_target_class_id is null then
      return false;
    end if;
    v_name := nullif(trim(p_payload->>'name'), '');
    if v_name is null then
      return false;
    end if;
    begin
      v_discipline := (p_payload->>'discipline_id')::uuid;
    exception when others then
      return false;
    end;
    if v_discipline is null then
      return false;
    end if;
    begin
      v_limit := (p_payload->>'class_limit')::integer;
    exception when others then
      return false;
    end;
    if v_limit is null or v_limit < 1 then
      return false;
    end if;
    v_coaches := p_payload->'coach_account_ids';
    if v_coaches is null or jsonb_typeof(v_coaches) <> 'array' or jsonb_array_length(v_coaches) < 1 then
      return false;
    end if;
    return true;
  end if;

  if p_request_type = 'cancellation_request' then
    if p_target_class_id is null then
      return false;
    end if;
    return true;
  end if;

  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Submit (staff)
-- ---------------------------------------------------------------------------

create or replace function public.submit_portal_request(
  p_request_type public.portal_request_type,
  p_target_class_id uuid,
  p_payload jsonb,
  p_requester_note text default ''
)
returns public.portal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester uuid := public.current_account_id();
  v_role public.user_role;
  v_class public.classes;
  v_row public.portal_requests;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_coaches uuid[];
  v_elem jsonb;
begin
  if v_requester is null then
    raise exception 'Not authenticated.';
  end if;

  select role into v_role from public.accounts where id = v_requester;
  if v_role is null or not public.is_staff_role(v_role) then
    raise exception 'Only staff accounts can submit portal requests.';
  end if;

  if not public.validate_portal_request_payload(p_request_type, p_target_class_id, v_payload) then
    raise exception 'Invalid request payload.';
  end if;

  select * into v_class from public.classes where id = p_target_class_id;
  if not found then
    raise exception 'Target class not found.';
  end if;

  if p_request_type = 'slot_request' then
    if v_class.status_block <> 'vacant'::public.class_block_status then
      raise exception 'Slot requests are only allowed for vacant blocks.';
    end if;

    v_coaches := '{}';
    for v_elem in select * from jsonb_array_elements(v_payload->'coach_account_ids')
    loop
      begin
        v_coaches := array_append(v_coaches, (v_elem #>> '{}')::uuid);
      exception when others then
        raise exception 'Invalid coach_account_ids in payload.';
      end;
    end loop;

    if not (v_requester = any (v_coaches)) then
      raise exception 'Requesting coach must be included in coach_account_ids.';
    end if;

    perform public.assert_accounts_are_coaches(v_coaches);
  elsif p_request_type = 'cancellation_request' then
    if v_class.status_block = 'vacant'::public.class_block_status then
      raise exception 'Cannot cancel a vacant block.';
    end if;
    if not exists (
      select 1 from public.class_coaches cc
      where cc.class_id = p_target_class_id
        and cc.account_id = v_requester
    ) then
      raise exception 'You are not assigned as coach on this class.';
    end if;
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
    p_request_type,
    'pending',
    v_requester,
    p_target_class_id,
    v_payload,
    coalesce(trim(p_requester_note), '')
  )
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.submit_portal_request(public.portal_request_type, uuid, jsonb, text) is
  'Staff submits a slot or cancellation request (pending until admin review).';

grant execute on function public.submit_portal_request(public.portal_request_type, uuid, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Review (admin / dev)
-- ---------------------------------------------------------------------------

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
  v_students uuid[];
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
    status_block = 'occupied'::public.class_block_status,
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
      status_class = 'close'::public.class_open_status,
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
    status_class = 'close'::public.class_open_status,
    status_block = 'vacant'::public.class_block_status,
    updated_at = now()
  where id = v_class_id;
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

grant execute on function public.review_portal_request(uuid, public.portal_request_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.portal_requests enable row level security;

drop policy if exists portal_requests_select on public.portal_requests;
create policy portal_requests_select
  on public.portal_requests
  for select
  to authenticated
  using (
    requester_account_id = public.current_account_id()
    or public.is_admin_or_dev()
  );

drop policy if exists portal_requests_insert on public.portal_requests;
create policy portal_requests_insert
  on public.portal_requests
  for insert
  to authenticated
  with check (
    requester_account_id = public.current_account_id()
    and exists (
      select 1 from public.accounts a
      where a.id = requester_account_id
        and public.is_staff_role(a.role)
    )
  );

-- Updates go through review_portal_request (security definer). No direct staff update policy.
