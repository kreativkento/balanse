-- Slot request approval must leave the calendar block as occupied (not active).
-- Idempotent with 055; adds an explicit guard in review_portal_request + backfill.

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
        status_block = 'occupied'::public.class_block_status,
        updated_at = now()
      where id = v_result
        and status_block is distinct from 'occupied'::public.class_block_status;
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

update public.classes c
set
  status_block = 'occupied'::public.class_block_status,
  updated_at = now()
where c.status_block = 'active'::public.class_block_status
  and exists (
    select 1
    from public.portal_requests pr
    where pr.status = 'approved'::public.portal_request_status
      and pr.request_type = 'slot_request'::public.portal_request_type
      and coalesce(pr.result_class_id, pr.target_class_id) = c.id
  );
