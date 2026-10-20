-- Cancellation approval: >=2 weeks = remove coach immediately; <2 weeks = replacement coach or cancel class.

drop function if exists public.review_portal_request(uuid, public.portal_request_status, text);

create or replace function public.apply_approved_cancellation_request(
  p_request public.portal_requests,
  p_replacement_coach_account_id uuid default null,
  p_cancel_entire_class boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid := p_request.target_class_id;
  v_requester uuid := p_request.requester_account_id;
  v_actor uuid := public.current_account_id();
  v_class public.classes%rowtype;
  v_coach_count integer;
  v_student_count integer;
  v_short_notice boolean;
begin
  if v_class_id is null then
    raise exception 'Missing target class.';
  end if;

  select * into v_class from public.classes where id = v_class_id;
  if not found then
    raise exception 'Target class not found.';
  end if;

  v_short_notice := v_class.starts_at < (now() + interval '14 days');

  if v_short_notice
    and not coalesce(p_cancel_entire_class, false)
    and p_replacement_coach_account_id is null then
    raise exception 'Within 2 weeks of class start: assign a replacement coach or cancel the entire class.';
  end if;

  if coalesce(p_cancel_entire_class, false) and p_replacement_coach_account_id is not null then
    raise exception 'Choose either a replacement coach or cancel the entire class, not both.';
  end if;

  delete from public.class_coaches
  where class_id = v_class_id
    and account_id = v_requester;

  if coalesce(p_cancel_entire_class, false) then
    update public.classes
    set
      status_block = 'cancelled'::public.class_block_status,
      status_class = false,
      updated_at = now()
    where id = v_class_id;
    return v_class_id;
  end if;

  if p_replacement_coach_account_id is not null then
    if p_replacement_coach_account_id = v_requester then
      raise exception 'Replacement coach cannot be the requesting coach.';
    end if;
    perform public.assert_accounts_are_coaches(array[p_replacement_coach_account_id]);
    if not exists (
      select 1 from public.class_coaches
      where class_id = v_class_id and account_id = p_replacement_coach_account_id
    ) then
      insert into public.class_coaches (class_id, account_id, assigned_by, coach_confirmation)
      values (v_class_id, p_replacement_coach_account_id, v_actor, true);
    end if;
  end if;

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
