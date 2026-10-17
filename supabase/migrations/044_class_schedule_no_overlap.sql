-- Reject overlapping class time ranges on the shared studio calendar.

create or replace function public.assert_class_schedule_no_overlap(
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_class_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end timestamptz := coalesce(p_ends_at, p_starts_at + interval '1 hour');
begin
  if p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'End time must be after start time.';
  end if;

  if exists (
    select 1
    from public.classes c
    where (p_exclude_class_id is null or c.id <> p_exclude_class_id)
      and c.starts_at < v_end
      and coalesce(c.ends_at, c.starts_at + interval '1 hour') > p_starts_at
  ) then
    raise exception 'This time slot overlaps an existing class on the schedule.';
  end if;
end;
$$;

revoke all on function public.assert_class_schedule_no_overlap(timestamptz, timestamptz, uuid) from public;
grant execute on function public.assert_class_schedule_no_overlap(timestamptz, timestamptz, uuid) to authenticated;

create or replace function public.admin_create_class(
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_class_limit integer default 12,
  p_status_class public.class_open_status default 'close',
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

  if p_class_limit is null or p_class_limit < 1 then
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

  if cardinality(v_students) > p_class_limit then
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
    coalesce(p_status_class, 'close'::public.class_open_status),
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
  p_class_limit integer default 12,
  p_status_class public.class_open_status default 'close',
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

  if p_class_limit is null or p_class_limit < 1 then
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

    if v_existing_count > p_class_limit then
      raise exception 'Class limit (%) is below current enrollment count (%).', p_class_limit, v_existing_count;
    end if;
  else
    v_students := p_student_account_ids;
    perform public.assert_accounts_are_users(v_students);

    if cardinality(v_students) > p_class_limit then
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
    status_class = p_status_class,
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
