-- Rename events → classes (and related join tables / columns).
-- Run AFTER 009_events.sql (and any later migrations that depend on events).
--
-- Renames:
--   public.events            → public.classes
--   public.event_coaches     → public.class_coaches   (event_id → class_id)
--   public.event_enrollments → public.class_students  (event_id → class_id)
--   public.event_status      → public.class_status
--   admin_*_event RPCs       → admin_*_class

-- ---------------------------------------------------------------------------
-- 1. Rename enum
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'event_status'
  ) and not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'class_status'
  ) then
    alter type public.event_status rename to class_status;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Rename main table events → classes
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'events'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'classes'
  ) then
    alter table public.events rename to classes;
  end if;
end $$;

comment on table public.classes is
  'Studio class. Discipline is a tag from public.disciplines. created_by is the admin account that created it.';

-- Rename constraints / indexes if they still use events_* names
alter index if exists events_starts_at_idx rename to classes_starts_at_idx;
alter index if exists events_status_idx rename to classes_status_idx;
alter index if exists events_discipline_id_idx rename to classes_discipline_id_idx;
alter index if exists events_created_by_idx rename to classes_created_by_idx;

create or replace function public.touch_class_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists events_touch_updated_at on public.classes;
drop trigger if exists classes_touch_updated_at on public.classes;
create trigger classes_touch_updated_at
  before update on public.classes
  for each row
  execute function public.touch_class_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Rename event_coaches → class_coaches, event_id → class_id
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'event_coaches'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'class_coaches'
  ) then
    alter table public.event_coaches rename to class_coaches;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'class_coaches' and column_name = 'event_id'
  ) then
    alter table public.class_coaches rename column event_id to class_id;
  end if;
end $$;

comment on table public.class_coaches is
  'Coaches assigned to a class. Admin must assign at least one.';

alter index if exists event_coaches_account_id_idx rename to class_coaches_account_id_idx;
create index if not exists class_coaches_class_id_idx on public.class_coaches (class_id);

-- ---------------------------------------------------------------------------
-- 4. Rename event_enrollments → class_students, event_id → class_id
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'event_enrollments'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'class_students'
  ) then
    alter table public.event_enrollments rename to class_students;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'class_students' and column_name = 'event_id'
  ) then
    alter table public.class_students rename column event_id to class_id;
  end if;
end $$;

comment on table public.class_students is
  'Students enrolled in a class. Count must not exceed classes.class_limit.';

alter index if exists event_enrollments_account_id_idx rename to class_students_account_id_idx;
create index if not exists class_students_class_id_idx on public.class_students (class_id);

-- ---------------------------------------------------------------------------
-- 5. Log tables: point FKs at classes; rename event_id → class_id when present
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'event_logs' and column_name = 'event_id'
  ) then
    alter table public.event_logs rename column event_id to class_id;
  end if;
exception when others then null;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'enrollment_logs' and column_name = 'event_id'
  ) then
    alter table public.enrollment_logs rename column event_id to class_id;
  end if;
exception when others then null;
end $$;

-- Drop/recreate FKs to classes if needed (rename of referenced table usually updates automatically)

-- ---------------------------------------------------------------------------
-- 6. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.class_student_count(p_class_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.class_students where class_id = p_class_id;
$$;

create or replace function public.class_has_coach(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.class_coaches where class_id = p_class_id
  );
$$;

drop function if exists public.event_enrollment_count(uuid);
drop function if exists public.event_has_coach(uuid);

-- ---------------------------------------------------------------------------
-- 7. Admin RPCs (create / update / delete)
-- ---------------------------------------------------------------------------

drop function if exists public.admin_create_event(
  text, uuid, timestamptz, integer, uuid[], public.class_status, text, timestamptz, uuid[]
);
drop function if exists public.admin_create_event(
  text, uuid, timestamptz, integer, uuid[], public.event_status, text, timestamptz, uuid[]
);
drop function if exists public.admin_update_event(
  uuid, text, uuid, timestamptz, integer, uuid[], public.class_status, text, timestamptz, uuid[]
);
drop function if exists public.admin_update_event(
  uuid, text, uuid, timestamptz, integer, uuid[], public.event_status, text, timestamptz, uuid[]
);
drop function if exists public.admin_delete_event(uuid);

create or replace function public.admin_create_class(
  p_name text,
  p_discipline_id uuid,
  p_starts_at timestamptz,
  p_class_limit integer,
  p_coach_account_ids uuid[],
  p_status public.class_status default 'draft',
  p_description text default '',
  p_ends_at timestamptz default null,
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
begin
  if not public.is_admin_or_dev() then
    raise exception 'Only admin or dev can create classes.';
  end if;

  if v_actor is null then
    raise exception 'No authenticated account.';
  end if;

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Class name is required.';
  end if;

  if p_class_limit is null or p_class_limit < 1 then
    raise exception 'Class limit must be at least 1.';
  end if;

  if not exists (select 1 from public.disciplines d where d.id = p_discipline_id) then
    raise exception 'Discipline not found.';
  end if;

  perform public.assert_accounts_are_coaches(p_coach_account_ids);

  v_students := coalesce(p_student_account_ids, '{}');
  perform public.assert_accounts_are_users(v_students);

  if cardinality(v_students) > p_class_limit then
    raise exception 'Cannot enroll % students; class limit is %.', cardinality(v_students), p_class_limit;
  end if;

  insert into public.classes (
    name,
    description,
    discipline_id,
    starts_at,
    ends_at,
    class_limit,
    status,
    created_by
  )
  values (
    trim(p_name),
    coalesce(p_description, ''),
    p_discipline_id,
    p_starts_at,
    p_ends_at,
    p_class_limit,
    coalesce(p_status, 'draft'::public.class_status),
    v_actor
  )
  returning id into v_class_id;

  insert into public.class_coaches (class_id, account_id, assigned_by)
  select distinct v_class_id, coach_id, v_actor
  from unnest(p_coach_account_ids) as coach_id;

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
  p_name text,
  p_discipline_id uuid,
  p_starts_at timestamptz,
  p_class_limit integer,
  p_coach_account_ids uuid[],
  p_status public.class_status,
  p_description text default '',
  p_ends_at timestamptz default null,
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
  v_existing_count integer;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Only admin or dev can update classes.';
  end if;

  if not exists (select 1 from public.classes c where c.id = p_class_id) then
    raise exception 'Class not found.';
  end if;

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Class name is required.';
  end if;

  if p_class_limit is null or p_class_limit < 1 then
    raise exception 'Class limit must be at least 1.';
  end if;

  if not exists (select 1 from public.disciplines d where d.id = p_discipline_id) then
    raise exception 'Discipline not found.';
  end if;

  perform public.assert_accounts_are_coaches(p_coach_account_ids);

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

  update public.classes
  set
    name = trim(p_name),
    description = coalesce(p_description, ''),
    discipline_id = p_discipline_id,
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    class_limit = p_class_limit,
    status = p_status
  where id = p_class_id;

  delete from public.class_coaches where class_id = p_class_id;

  insert into public.class_coaches (class_id, account_id, assigned_by)
  select distinct p_class_id, coach_id, v_actor
  from unnest(p_coach_account_ids) as coach_id;

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

create or replace function public.admin_delete_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_or_dev() then
    raise exception 'Only admin or dev can delete classes.';
  end if;

  delete from public.classes where id = p_class_id;

  if not found then
    raise exception 'Class not found.';
  end if;
end;
$$;

revoke all on function public.admin_create_class(
  text, uuid, timestamptz, integer, uuid[], public.class_status, text, timestamptz, uuid[]
) from public;
revoke all on function public.admin_update_class(
  uuid, text, uuid, timestamptz, integer, uuid[], public.class_status, text, timestamptz, uuid[]
) from public;
revoke all on function public.admin_delete_class(uuid) from public;

grant execute on function public.admin_create_class(
  text, uuid, timestamptz, integer, uuid[], public.class_status, text, timestamptz, uuid[]
) to authenticated;
grant execute on function public.admin_update_class(
  uuid, text, uuid, timestamptz, integer, uuid[], public.class_status, text, timestamptz, uuid[]
) to authenticated;
grant execute on function public.admin_delete_class(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. RLS (recreate on renamed tables)
-- ---------------------------------------------------------------------------

alter table public.classes enable row level security;
alter table public.class_coaches enable row level security;
alter table public.class_students enable row level security;

drop policy if exists "Events select published public" on public.classes;
drop policy if exists "Events select admin coach enrolled" on public.classes;
drop policy if exists "Events insert admin dev" on public.classes;
drop policy if exists "Events update admin dev" on public.classes;
drop policy if exists "Events delete admin dev" on public.classes;
drop policy if exists "Classes select published public" on public.classes;
drop policy if exists "Classes select admin coach enrolled" on public.classes;
drop policy if exists "Classes insert admin dev" on public.classes;
drop policy if exists "Classes update admin dev" on public.classes;
drop policy if exists "Classes delete admin dev" on public.classes;

create policy "Classes select published public"
  on public.classes
  for select
  to anon, authenticated
  using (status = 'published'::public.class_status);

create policy "Classes select admin coach enrolled"
  on public.classes
  for select
  to authenticated
  using (
    public.is_admin_or_dev()
    or exists (
      select 1 from public.class_coaches cc
      where cc.class_id = classes.id
        and cc.account_id = public.current_account_id()
    )
    or exists (
      select 1 from public.class_students cs
      where cs.class_id = classes.id
        and cs.account_id = public.current_account_id()
    )
  );

create policy "Classes insert admin dev"
  on public.classes
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy "Classes update admin dev"
  on public.classes
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy "Classes delete admin dev"
  on public.classes
  for delete
  to authenticated
  using (public.is_admin_or_dev());

drop policy if exists "Event coaches select related" on public.class_coaches;
drop policy if exists "Event coaches write admin dev" on public.class_coaches;
drop policy if exists "Event coaches update admin dev" on public.class_coaches;
drop policy if exists "Event coaches delete admin dev" on public.class_coaches;
drop policy if exists "Class coaches select related" on public.class_coaches;
drop policy if exists "Class coaches write admin dev" on public.class_coaches;
drop policy if exists "Class coaches update admin dev" on public.class_coaches;
drop policy if exists "Class coaches delete admin dev" on public.class_coaches;

create policy "Class coaches select related"
  on public.class_coaches
  for select
  to authenticated
  using (
    public.is_admin_or_dev()
    or account_id = public.current_account_id()
    or exists (
      select 1 from public.classes c
      where c.id = class_coaches.class_id
        and c.status = 'published'::public.class_status
    )
    or exists (
      select 1 from public.class_students cs
      where cs.class_id = class_coaches.class_id
        and cs.account_id = public.current_account_id()
    )
  );

create policy "Class coaches write admin dev"
  on public.class_coaches
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy "Class coaches update admin dev"
  on public.class_coaches
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy "Class coaches delete admin dev"
  on public.class_coaches
  for delete
  to authenticated
  using (public.is_admin_or_dev());

drop policy if exists "Event enrollments select related" on public.class_students;
drop policy if exists "Event enrollments write admin dev" on public.class_students;
drop policy if exists "Event enrollments update admin dev" on public.class_students;
drop policy if exists "Event enrollments delete admin dev" on public.class_students;
drop policy if exists "Class students select related" on public.class_students;
drop policy if exists "Class students write admin dev" on public.class_students;
drop policy if exists "Class students update admin dev" on public.class_students;
drop policy if exists "Class students delete admin dev" on public.class_students;

create policy "Class students select related"
  on public.class_students
  for select
  to authenticated
  using (
    public.is_admin_or_dev()
    or account_id = public.current_account_id()
    or exists (
      select 1 from public.class_coaches cc
      where cc.class_id = class_students.class_id
        and cc.account_id = public.current_account_id()
    )
  );

create policy "Class students write admin dev"
  on public.class_students
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy "Class students update admin dev"
  on public.class_students
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy "Class students delete admin dev"
  on public.class_students
  for delete
  to authenticated
  using (public.is_admin_or_dev());
