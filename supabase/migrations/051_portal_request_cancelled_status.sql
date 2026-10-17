-- Add cancelled status for staff-withdrawn portal requests (retain row for staff + admin history).

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'portal_request_status'
      and e.enumlabel = 'cancelled'
  ) then
    alter type public.portal_request_status add value 'cancelled';
  end if;
end
$$;

-- 050 defined returns void; must drop before changing return type to portal_requests.
drop function if exists public.withdraw_portal_request(uuid);

create function public.withdraw_portal_request(p_request_id uuid)
returns public.portal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester uuid := public.current_account_id();
  v_row public.portal_requests;
begin
  if v_requester is null then
    raise exception 'Not authenticated.';
  end if;

  if p_request_id is null then
    raise exception 'Request id is required.';
  end if;

  select * into v_row
  from public.portal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found.';
  end if;

  if v_row.requester_account_id <> v_requester then
    raise exception 'You can only withdraw your own requests.';
  end if;

  if v_row.status <> 'pending'::public.portal_request_status then
    raise exception 'Only pending requests can be withdrawn.';
  end if;

  update public.portal_requests
  set
    status = 'cancelled'::public.portal_request_status,
    updated_at = now()
  where id = p_request_id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.withdraw_portal_request(uuid) is
  'Staff cancels a pending portal request (status → cancelled). Row kept for audit and admin/staff lists.';

grant execute on function public.withdraw_portal_request(uuid) to authenticated;

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
