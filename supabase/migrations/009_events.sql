-- BALANSÉ events / classes
-- Run in Supabase Dashboard → SQL Editor after 001_profiles.sql and 008_disciplines.sql.
--
-- Model (Google Classroom style):
--   events              → class/event shell (name, discipline tag, date, capacity, status)
--   event_coaches       → assigned coaches (at least one required)
--   event_enrollments   → enrolled students (many, capped by class_limit)
--
-- Only admin/dev may create, update, or delete events and manage coaches/enrollments.

-- ---------------------------------------------------------------------------
-- 1. Status enum
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.event_status as enum (
    'draft',
    'published',
    'cancelled',
    'completed'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Events table
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  discipline_id uuid not null references public.disciplines (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz,
  class_limit integer not null default 1,
  status public.event_status not null default 'draft',
  created_by uuid not null references public.accounts (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_name_nonempty check (char_length(trim(name)) > 0),
  constraint events_class_limit_positive check (class_limit > 0),
  constraint events_ends_after_starts check (ends_at is null or ends_at >= starts_at)
);

comment on table public.events is
  'Studio class/event. Discipline is a tag from public.disciplines. created_by is the admin account that created it.';

comment on column public.events.discipline_id is
  'Discipline tag (FK). Prefer this stable id over storing the discipline name.';

comment on column public.events.class_limit is
  'Maximum number of enrolled students for this event.';

comment on column public.events.status is
  'Lifecycle: draft → published → completed | cancelled.';

comment on column public.events.created_by is
  'Account id of the admin/dev who created the event.';

alter table public.events add column if not exists description text not null default '';
alter table public.events add column if not exists ends_at timestamptz;
alter table public.events add column if not exists class_limit integer not null default 1;
alter table public.events add column if not exists status public.event_status not null default 'draft';
alter table public.events add column if not exists created_by uuid references public.accounts (id) on delete restrict;
alter table public.events add column if not exists created_at timestamptz not null default now();
alter table public.events add column if not exists updated_at timestamptz not null default now();

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_status_idx on public.events (status);
create index if not exists events_discipline_id_idx on public.events (discipline_id);
create index if not exists events_created_by_idx on public.events (created_by);

create or replace function public.touch_event_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists events_touch_updated_at on public.events;

create trigger events_touch_updated_at
  before update on public.events
  for each row
  execute function public.touch_event_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Assigned coaches (many) — at least one required via RPC
-- ---------------------------------------------------------------------------

create table if not exists public.event_coaches (
  event_id uuid not null references public.events (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.accounts (id) on delete set null,
  primary key (event_id, account_id)
);

comment on table public.event_coaches is
  'Coaches assigned to an event. Admin must assign at least one.';

create index if not exists event_coaches_account_id_idx on public.event_coaches (account_id);

-- ---------------------------------------------------------------------------
-- 4. Student enrollments (many, capped by class_limit)
-- ---------------------------------------------------------------------------

create table if not exists public.event_enrollments (
  event_id uuid not null references public.events (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  enrolled_by uuid references public.accounts (id) on delete set null,
  primary key (event_id, account_id)
);

comment on table public.event_enrollments is
  'Students enrolled in an event. Count must not exceed events.class_limit.';

create index if not exists event_enrollments_account_id_idx on public.event_enrollments (account_id);

-- ---------------------------------------------------------------------------
-- 5. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.event_enrollment_count(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.event_enrollments where event_id = p_event_id;
$$;

create or replace function public.event_has_coach(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.event_coaches where event_id = p_event_id
  );
$$;

create or replace function public.assert_accounts_are_coaches(p_account_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_account_ids is null or cardinality(p_account_ids) = 0 then
    raise exception 'At least one coach must be assigned.';
  end if;

  if exists (
    select 1
    from unnest(p_account_ids) as t(id)
    left join public.accounts a
      on a.id = t.id
     and a.role = 'coach'::public.user_role
    where a.id is null
  ) then
    raise exception 'Every assigned coach must be an account with role coach.';
  end if;
end;
$$;

create or replace function public.assert_accounts_are_users(p_account_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_account_ids is null then
    return;
  end if;

  if exists (
    select 1
    from unnest(p_account_ids) as t(id)
    left join public.accounts a on a.id = t.id and a.role = 'user'::public.user_role
    where a.id is null
  ) then
    raise exception 'Every enrollment must be an account with role user.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Admin RPCs (create / update / delete + roster sync)
-- ---------------------------------------------------------------------------

create or replace function public.admin_create_event(
  p_name text,
  p_discipline_id uuid,
  p_starts_at timestamptz,
  p_class_limit integer,
  p_coach_account_ids uuid[],
  p_status public.event_status default 'draft',
  p_description text default '',
  p_ends_at timestamptz default null,
  p_enroll_account_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_account_id();
  v_event_id uuid;
  v_enroll uuid[];
begin
  if not public.is_admin_or_dev() then
    raise exception 'Only admin or dev can create events.';
  end if;

  if v_actor is null then
    raise exception 'No authenticated account.';
  end if;

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Event name is required.';
  end if;

  if p_class_limit is null or p_class_limit < 1 then
    raise exception 'Class limit must be at least 1.';
  end if;

  if not exists (select 1 from public.disciplines d where d.id = p_discipline_id) then
    raise exception 'Discipline not found.';
  end if;

  perform public.assert_accounts_are_coaches(p_coach_account_ids);

  v_enroll := coalesce(p_enroll_account_ids, '{}');
  perform public.assert_accounts_are_users(v_enroll);

  if cardinality(v_enroll) > p_class_limit then
    raise exception 'Cannot enroll % students; class limit is %.', cardinality(v_enroll), p_class_limit;
  end if;

  insert into public.events (
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
    coalesce(p_status, 'draft'::public.event_status),
    v_actor
  )
  returning id into v_event_id;

  insert into public.event_coaches (event_id, account_id, assigned_by)
  select distinct v_event_id, coach_id, v_actor
  from unnest(p_coach_account_ids) as coach_id;

  if cardinality(v_enroll) > 0 then
    insert into public.event_enrollments (event_id, account_id, enrolled_by)
    select distinct v_event_id, user_id, v_actor
    from unnest(v_enroll) as user_id;
  end if;

  return v_event_id;
end;
$$;

create or replace function public.admin_update_event(
  p_event_id uuid,
  p_name text,
  p_discipline_id uuid,
  p_starts_at timestamptz,
  p_class_limit integer,
  p_coach_account_ids uuid[],
  p_status public.event_status,
  p_description text default '',
  p_ends_at timestamptz default null,
  p_enroll_account_ids uuid[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_account_id();
  v_enroll uuid[];
  v_existing_count integer;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Only admin or dev can update events.';
  end if;

  if not exists (select 1 from public.events e where e.id = p_event_id) then
    raise exception 'Event not found.';
  end if;

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Event name is required.';
  end if;

  if p_class_limit is null or p_class_limit < 1 then
    raise exception 'Class limit must be at least 1.';
  end if;

  if not exists (select 1 from public.disciplines d where d.id = p_discipline_id) then
    raise exception 'Discipline not found.';
  end if;

  perform public.assert_accounts_are_coaches(p_coach_account_ids);

  if p_enroll_account_ids is null then
    select count(*)::integer into v_existing_count
    from public.event_enrollments
    where event_id = p_event_id;

    if v_existing_count > p_class_limit then
      raise exception 'Class limit (%) is below current enrollment count (%).', p_class_limit, v_existing_count;
    end if;
  else
    v_enroll := p_enroll_account_ids;
    perform public.assert_accounts_are_users(v_enroll);

    if cardinality(v_enroll) > p_class_limit then
      raise exception 'Cannot enroll % students; class limit is %.', cardinality(v_enroll), p_class_limit;
    end if;
  end if;

  update public.events
  set
    name = trim(p_name),
    description = coalesce(p_description, ''),
    discipline_id = p_discipline_id,
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    class_limit = p_class_limit,
    status = p_status
  where id = p_event_id;

  delete from public.event_coaches where event_id = p_event_id;

  insert into public.event_coaches (event_id, account_id, assigned_by)
  select distinct p_event_id, coach_id, v_actor
  from unnest(p_coach_account_ids) as coach_id;

  if p_enroll_account_ids is not null then
    delete from public.event_enrollments where event_id = p_event_id;

    if cardinality(v_enroll) > 0 then
      insert into public.event_enrollments (event_id, account_id, enrolled_by)
      select distinct p_event_id, user_id, v_actor
      from unnest(v_enroll) as user_id;
    end if;
  end if;
end;
$$;

create or replace function public.admin_delete_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_or_dev() then
    raise exception 'Only admin or dev can delete events.';
  end if;

  delete from public.events where id = p_event_id;

  if not found then
    raise exception 'Event not found.';
  end if;
end;
$$;

revoke all on function public.admin_create_event(
  text, uuid, timestamptz, integer, uuid[], public.event_status, text, timestamptz, uuid[]
) from public;

revoke all on function public.admin_update_event(
  uuid, text, uuid, timestamptz, integer, uuid[], public.event_status, text, timestamptz, uuid[]
) from public;

revoke all on function public.admin_delete_event(uuid) from public;

grant execute on function public.admin_create_event(
  text, uuid, timestamptz, integer, uuid[], public.event_status, text, timestamptz, uuid[]
) to authenticated;

grant execute on function public.admin_update_event(
  uuid, text, uuid, timestamptz, integer, uuid[], public.event_status, text, timestamptz, uuid[]
) to authenticated;

grant execute on function public.admin_delete_event(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.event_coaches enable row level security;
alter table public.event_enrollments enable row level security;

drop policy if exists "Events select published public" on public.events;
drop policy if exists "Events select admin coach enrolled" on public.events;
drop policy if exists "Events insert admin dev" on public.events;
drop policy if exists "Events update admin dev" on public.events;
drop policy if exists "Events delete admin dev" on public.events;

create policy "Events select published public"
  on public.events
  for select
  to anon, authenticated
  using (status = 'published'::public.event_status);

create policy "Events select admin coach enrolled"
  on public.events
  for select
  to authenticated
  using (
    public.is_admin_or_dev()
    or exists (
      select 1 from public.event_coaches ec
      where ec.event_id = events.id
        and ec.account_id = public.current_account_id()
    )
    or exists (
      select 1 from public.event_enrollments ee
      where ee.event_id = events.id
        and ee.account_id = public.current_account_id()
    )
  );

-- Direct table writes for admin/dev (RPCs also work via security definer)
create policy "Events insert admin dev"
  on public.events
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy "Events update admin dev"
  on public.events
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy "Events delete admin dev"
  on public.events
  for delete
  to authenticated
  using (public.is_admin_or_dev());

drop policy if exists "Event coaches select related" on public.event_coaches;
drop policy if exists "Event coaches write admin dev" on public.event_coaches;
drop policy if exists "Event coaches update admin dev" on public.event_coaches;
drop policy if exists "Event coaches delete admin dev" on public.event_coaches;

create policy "Event coaches select related"
  on public.event_coaches
  for select
  to authenticated
  using (
    public.is_admin_or_dev()
    or account_id = public.current_account_id()
    or exists (
      select 1 from public.events e
      where e.id = event_coaches.event_id
        and e.status = 'published'::public.event_status
    )
    or exists (
      select 1 from public.event_enrollments ee
      where ee.event_id = event_coaches.event_id
        and ee.account_id = public.current_account_id()
    )
  );

create policy "Event coaches write admin dev"
  on public.event_coaches
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy "Event coaches update admin dev"
  on public.event_coaches
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy "Event coaches delete admin dev"
  on public.event_coaches
  for delete
  to authenticated
  using (public.is_admin_or_dev());

drop policy if exists "Event enrollments select related" on public.event_enrollments;
drop policy if exists "Event enrollments write admin dev" on public.event_enrollments;
drop policy if exists "Event enrollments update admin dev" on public.event_enrollments;
drop policy if exists "Event enrollments delete admin dev" on public.event_enrollments;

create policy "Event enrollments select related"
  on public.event_enrollments
  for select
  to authenticated
  using (
    public.is_admin_or_dev()
    or account_id = public.current_account_id()
    or exists (
      select 1 from public.event_coaches ec
      where ec.event_id = event_enrollments.event_id
        and ec.account_id = public.current_account_id()
    )
  );

create policy "Event enrollments write admin dev"
  on public.event_enrollments
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy "Event enrollments update admin dev"
  on public.event_enrollments
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy "Event enrollments delete admin dev"
  on public.event_enrollments
  for delete
  to authenticated
  using (public.is_admin_or_dev());
