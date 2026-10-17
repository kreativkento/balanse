-- Approved staff slot requests reserve the block as occupied (not active).

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

comment on function public.apply_approved_slot_request(public.portal_requests) is
  'On slot request approval: fill class from payload, set status_block to occupied, assign coaches.';
