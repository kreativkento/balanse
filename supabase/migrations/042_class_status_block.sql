-- status → status_class (open | close), add status_block (vacant | occupied | active | closed),
-- optional discipline/name for time-blocking slots, coach_confirmation on class_coaches.

do $$
begin
  create type public.class_open_status as enum ('open', 'close');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.class_block_status as enum ('vacant', 'occupied', 'active', 'closed');
exception
  when duplicate_object then null;
end $$;

alter table public.class_coaches
  add column if not exists coach_confirmation boolean not null default false;

comment on column public.class_coaches.coach_confirmation is
  'Coach has confirmed assignment to this class. Defaults to false.';

alter table public.classes
  drop constraint if exists events_name_nonempty;

alter table public.classes
  alter column discipline_id drop not null;

alter table public.classes
  add column if not exists status_block public.class_block_status;

alter table public.classes
  add column if not exists status_class public.class_open_status;

-- Migrate legacy class_status → status_class / status_block when old column exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'classes'
      and column_name = 'status'
  ) then
    update public.classes c
    set
      status_class = case
        when c.status::text in ('published', 'draft') then 'open'::public.class_open_status
        else 'close'::public.class_open_status
      end,
      status_block = case
        when c.status::text = 'cancelled' then 'closed'::public.class_block_status
        when c.status::text = 'completed' then 'closed'::public.class_block_status
        when exists (select 1 from public.class_students cs where cs.class_id = c.id)
          then 'occupied'::public.class_block_status
        when exists (select 1 from public.class_coaches cc where cc.class_id = c.id)
          then 'active'::public.class_block_status
        else 'vacant'::public.class_block_status
      end;

    -- RLS policy and helper still reference classes.status until recreated below.
    drop policy if exists "Classes select published public" on public.classes;

    create or replace function public.rls_class_is_published(p_class_id uuid)
    returns boolean
    language sql
    security definer
    set search_path = public
    stable
    as $rls$
      select exists (
        select 1
        from public.classes c
        where c.id = p_class_id
          and c.status_class = 'open'::public.class_open_status
      );
    $rls$;

    drop index if exists public.classes_status_idx;

    alter table public.classes drop column status;
  end if;
end $$;

update public.classes
set
  status_class = coalesce(status_class, 'close'::public.class_open_status),
  status_block = coalesce(status_block, 'vacant'::public.class_block_status);

alter table public.classes
  alter column status_class set not null,
  alter column status_class set default 'close'::public.class_open_status,
  alter column status_block set not null,
  alter column status_block set default 'vacant'::public.class_block_status;

drop index if exists classes_status_idx;
create index if not exists classes_status_class_idx on public.classes (status_class);
create index if not exists classes_status_block_idx on public.classes (status_block);

comment on column public.classes.status_class is
  'Whether the class is open or closed for booking (open | close).';

comment on column public.classes.status_block is
  'Calendar block state: vacant, occupied, active, or closed.';

-- Replace admin RPCs (drop old signatures using class_status).
drop function if exists public.admin_create_class(
  text, uuid, timestamptz, integer, uuid[], public.class_status, text, timestamptz, uuid[]
);
drop function if exists public.admin_update_class(
  uuid, text, uuid, timestamptz, integer, uuid[], public.class_status, text, timestamptz, uuid[]
);

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

  insert into public.classes (
    name,
    description,
    discipline_id,
    starts_at,
    ends_at,
    class_limit,
    status_class,
    status_block,
    created_by
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
    v_actor
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

revoke all on function public.admin_create_class(
  timestamptz, timestamptz, integer, public.class_open_status, public.class_block_status,
  text, text, uuid, uuid[], uuid[]
) from public;
revoke all on function public.admin_update_class(
  uuid, timestamptz, timestamptz, integer, public.class_open_status, public.class_block_status,
  text, text, uuid, uuid[], uuid[]
) from public;

grant execute on function public.admin_create_class(
  timestamptz, timestamptz, integer, public.class_open_status, public.class_block_status,
  text, text, uuid, uuid[], uuid[]
) to authenticated;
grant execute on function public.admin_update_class(
  uuid, timestamptz, timestamptz, integer, public.class_open_status, public.class_block_status,
  text, text, uuid, uuid[], uuid[]
) to authenticated;

-- RLS: published → status_class open
drop policy if exists "Classes select published public" on public.classes;
create policy "Classes select published public"
  on public.classes
  for select
  to anon, authenticated
  using (status_class = 'open'::public.class_open_status);

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
      and c.status_class = 'open'::public.class_open_status
  );
$$;
