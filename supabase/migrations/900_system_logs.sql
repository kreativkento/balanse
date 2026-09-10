-- BALANSÉ system logs — unified CUD audit trail
-- Run in Supabase Dashboard → SQL Editor (or via Supabase CLI migrations)
--
-- Numbered 900+ to keep operational audit migrations clearly separated from
-- domain schema (001–037).
--
-- Table:
--   public.log_system  — append-only create / update / delete history
--
-- Source tables (AFTER INSERT OR UPDATE OR DELETE triggers):
--   accounts, profiles_client, profiles_staff, disciplines, coach_disciplines,
--   classes, class_students, class_coaches, bulletin_posts, feedback_system
--
-- Design rules:
--   • One table, filtered by table_name (dev portal System Logs pages)
--   • Append-only from clients (SELECT for is_dev(); no UPDATE/DELETE policies)
--   • Triggers auto-write; security definer bypasses RLS
--   • PHI: profiles_client health_declaration is redacted in stored snapshots
--   • Actor email/role are snapshotted so history survives account deletes
--   • Join-table rows use a composite record_id (uuid:uuid)

-- ---------------------------------------------------------------------------
-- 1. Shared enums (log_action is also used by 901_tickets.sql)
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.log_action as enum (
    'insert',
    'update',
    'delete',
    'login',
    'logout',
    'login_failed',
    'password_reset',
    'status_change',
    'approve',
    'reject',
    'refund',
    'assign',
    'unassign',
    'enroll',
    'unenroll',
    'view',
    'export',
    'error',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Shared helpers (also used by 901_tickets.sql)
-- ---------------------------------------------------------------------------

create or replace function public.log_actor_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'account_id', a.id,
        'email', a.email,
        'role', a.role
      )
      from public.accounts a
      where a.auth_user_id = auth.uid()
    ),
    jsonb_build_object(
      'account_id', null,
      'email', null,
      'role', null,
      'note', case when auth.uid() is null then 'sql_editor_or_service' else 'unknown_actor' end
    )
  );
$$;

create or replace function public.jsonb_object_diff(old_data jsonb, new_data jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (
      select jsonb_object_agg(key, jsonb_build_object('from', old_data -> key, 'to', new_data -> key))
      from (
        select key
        from jsonb_object_keys(coalesce(old_data, '{}'::jsonb)) as key
        union
        select key
        from jsonb_object_keys(coalesce(new_data, '{}'::jsonb)) as key
      ) keys
      where old_data -> key is distinct from new_data -> key
    ),
    '{}'::jsonb
  );
$$;

-- Strip / mask sensitive profile fields before persisting snapshots.
create or replace function public.sanitize_profile_log_row(row_data jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when row_data is null then null
    else (
      row_data
      - 'health_declaration_signed'
      - 'share_availability'
      - 'profile_complete'
      - 'medical_history'
    ) || jsonb_build_object(
      'health_declaration',
      case
        when coalesce(
          row_data->>'health_declaration',
          row_data->>'medical_history',
          ''
        ) = '' then ''
        else '[REDACTED]'
      end
    )
  end;
$$;

create or replace function public.sanitize_log_system_row(p_table text, p_row jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when p_row is null then null
    when p_table = 'profiles_client' then public.sanitize_profile_log_row(p_row)
    else p_row
  end;
$$;

create or replace function public.log_system_row_id(p_table text, p_row jsonb)
returns text
language sql
immutable
as $$
  select case p_table
    when 'coach_disciplines' then
      coalesce(p_row->>'account_id', '') || ':' || coalesce(p_row->>'discipline_id', '')
    when 'class_students' then
      coalesce(p_row->>'class_id', '') || ':' || coalesce(p_row->>'account_id', '')
    when 'class_coaches' then
      coalesce(p_row->>'class_id', '') || ':' || coalesce(p_row->>'account_id', '')
    else
      coalesce(p_row->>'id', '')
  end;
$$;

create or replace function public.log_system_row_account_id(p_table text, p_row jsonb)
returns uuid
language sql
immutable
as $$
  select case p_table
    when 'accounts' then nullif(p_row->>'id', '')::uuid
    when 'profiles_client' then nullif(p_row->>'account_id', '')::uuid
    when 'profiles_staff' then nullif(p_row->>'account_id', '')::uuid
    when 'feedback_system' then nullif(p_row->>'account_id', '')::uuid
    when 'coach_disciplines' then nullif(p_row->>'account_id', '')::uuid
    when 'class_students' then nullif(p_row->>'account_id', '')::uuid
    when 'class_coaches' then nullif(p_row->>'account_id', '')::uuid
    when 'classes' then nullif(p_row->>'created_by', '')::uuid
    when 'bulletin_posts' then nullif(p_row->>'created_by', '')::uuid
    else null
  end;
$$;

create or replace function public.log_system_row_label(p_table text, p_row jsonb)
returns text
language sql
immutable
as $$
  select nullif(btrim(case p_table
    when 'accounts' then coalesce(p_row->>'email', '')
    when 'profiles_client' then coalesce(
      nullif(p_row->>'name', ''),
      nullif(trim(concat_ws(' ', p_row->>'first_name', p_row->>'last_name')), ''),
      nullif(p_row->>'nickname', ''),
      p_row->>'account_id'
    )
    when 'profiles_staff' then coalesce(
      nullif(p_row->>'display_name', ''),
      nullif(p_row->>'name', ''),
      nullif(trim(concat_ws(' ', p_row->>'first_name', p_row->>'last_name')), ''),
      p_row->>'account_id'
    )
    when 'disciplines' then coalesce(p_row->>'name', p_row->>'slug', p_row->>'id')
    when 'coach_disciplines' then
      coalesce(p_row->>'account_id', '') || ' ↔ ' || coalesce(p_row->>'discipline_id', '')
    when 'classes' then coalesce(p_row->>'name', p_row->>'id')
    when 'class_students' then
      'student ' || coalesce(p_row->>'account_id', '') || ' → ' || coalesce(p_row->>'class_id', '')
    when 'class_coaches' then
      'coach ' || coalesce(p_row->>'account_id', '') || ' → ' || coalesce(p_row->>'class_id', '')
    when 'bulletin_posts' then coalesce(
      nullif(p_row->>'uid', ''),
      nullif(p_row->>'title', ''),
      p_row->>'id'
    )
    when 'feedback_system' then coalesce(p_row->>'title', p_row->>'id')
    else coalesce(p_row->>'id', p_row->>'name', p_row->>'title', '')
  end), '');
$$;

create or replace function public.log_system_action(
  p_table text,
  p_op text,
  p_old jsonb,
  p_new jsonb
)
returns public.log_action
language sql
immutable
as $$
  select case
    when p_op = 'INSERT' then
      case p_table
        when 'class_students' then 'enroll'::public.log_action
        when 'class_coaches' then 'assign'::public.log_action
        when 'coach_disciplines' then 'assign'::public.log_action
        else 'insert'::public.log_action
      end
    when p_op = 'DELETE' then
      case p_table
        when 'class_students' then 'unenroll'::public.log_action
        when 'class_coaches' then 'unassign'::public.log_action
        when 'coach_disciplines' then 'unassign'::public.log_action
        else 'delete'::public.log_action
      end
    when p_op = 'UPDATE' then
      case
        when p_table = 'bulletin_posts'
          and (p_old->>'admin_approved') is distinct from (p_new->>'admin_approved')
          and (p_new->>'admin_approved') = 'true'
          then 'approve'::public.log_action
        when p_table in ('feedback_system', 'classes', 'accounts')
          and (
            (p_old->>'status') is distinct from (p_new->>'status')
            or (p_old->>'role') is distinct from (p_new->>'role')
          )
          then 'status_change'::public.log_action
        else 'update'::public.log_action
      end
    else 'other'::public.log_action
  end;
$$;

-- ---------------------------------------------------------------------------
-- 3. log_system
-- ---------------------------------------------------------------------------

create table if not exists public.log_system (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),

  action public.log_action not null,
  table_name text not null,
  record_id text not null default '',
  record_label text,
  account_id uuid references public.accounts (id) on delete set null,

  actor_account_id uuid references public.accounts (id) on delete set null,
  actor_email text,
  actor_role public.user_role,

  before_data jsonb,
  after_data jsonb,
  changed_fields jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  source text not null default 'trigger',
  request_id text,
  ip_address inet,
  user_agent text
);

comment on table public.log_system is
  'Append-only CUD audit for accounts, profiles, disciplines, classes, bulletin, and feedback. Filter by table_name.';

comment on column public.log_system.table_name is
  'Source relation: accounts, profiles_client, profiles_staff, disciplines, coach_disciplines, classes, class_students, class_coaches, bulletin_posts, feedback_system.';

comment on column public.log_system.record_id is
  'Row id, or composite key (account_id:discipline_id / class_id:account_id) for join tables.';

comment on column public.log_system.record_label is
  'Human-readable snapshot (email, name, title, uid) so the row stays readable after deletes.';

comment on column public.log_system.account_id is
  'Related account when the source row has one (subject, enrollee, creator).';

create index if not exists log_system_occurred_at_idx on public.log_system (occurred_at desc);
create index if not exists log_system_table_name_idx on public.log_system (table_name);
create index if not exists log_system_action_idx on public.log_system (action);
create index if not exists log_system_account_id_idx on public.log_system (account_id);
create index if not exists log_system_actor_account_id_idx on public.log_system (actor_account_id);
create index if not exists log_system_table_record_idx on public.log_system (table_name, record_id);
create index if not exists log_system_table_occurred_idx on public.log_system (table_name, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 4. Generic CUD writer
-- ---------------------------------------------------------------------------

create or replace function public.tg_write_log_system()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor jsonb := public.log_actor_snapshot();
  v_table text := tg_table_name;
  v_before jsonb;
  v_after jsonb;
  v_row jsonb;
begin
  if tg_op = 'INSERT' then
    v_before := null;
    v_after := public.sanitize_log_system_row(v_table, to_jsonb(new));
    v_row := v_after;
  elsif tg_op = 'UPDATE' then
    v_before := public.sanitize_log_system_row(v_table, to_jsonb(old));
    v_after := public.sanitize_log_system_row(v_table, to_jsonb(new));
    v_row := v_after;
  else
    v_before := public.sanitize_log_system_row(v_table, to_jsonb(old));
    v_after := null;
    v_row := v_before;
  end if;

  insert into public.log_system (
    action,
    table_name,
    record_id,
    record_label,
    account_id,
    actor_account_id,
    actor_email,
    actor_role,
    before_data,
    after_data,
    changed_fields,
    metadata,
    source
  ) values (
    public.log_system_action(v_table, tg_op, v_before, v_after),
    v_table,
    public.log_system_row_id(v_table, v_row),
    public.log_system_row_label(v_table, v_row),
    public.log_system_row_account_id(v_table, v_row),
    nullif(v_actor->>'account_id', '')::uuid,
    v_actor->>'email',
    nullif(v_actor->>'role', '')::public.user_role,
    v_before,
    v_after,
    case
      when tg_op = 'UPDATE' then public.jsonb_object_diff(v_before, v_after)
      else '{}'::jsonb
    end,
    jsonb_build_object('op', tg_op),
    'trigger'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Attach triggers to current domain tables
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select * from (
      values
        ('accounts', 'trg_log_system_accounts'),
        ('profiles_client', 'trg_log_system_profiles_client'),
        ('profiles_staff', 'trg_log_system_profiles_staff'),
        ('disciplines', 'trg_log_system_disciplines'),
        ('coach_disciplines', 'trg_log_system_coach_disciplines'),
        ('classes', 'trg_log_system_classes'),
        ('class_students', 'trg_log_system_class_students'),
        ('class_coaches', 'trg_log_system_class_coaches'),
        ('bulletin_posts', 'trg_log_system_bulletin_posts'),
        ('feedback_system', 'trg_log_system_feedback_system')
    ) as t(table_name, trigger_name)
  loop
    if to_regclass('public.' || r.table_name) is null then
      continue;
    end if;

    execute format('drop trigger if exists %I on public.%I', r.trigger_name, r.table_name);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.tg_write_log_system()',
      r.trigger_name,
      r.table_name
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Retire unused draft log tables from earlier 900 versions
-- ---------------------------------------------------------------------------

do $$
begin
  drop trigger if exists trg_account_logs on public.accounts;
  if to_regclass('public.profiles') is not null then
    drop trigger if exists trg_profile_logs on public.profiles;
  end if;
  if to_regclass('public.profiles_student') is not null then
    drop trigger if exists trg_profile_logs on public.profiles_student;
  end if;
  if to_regclass('public.profiles_client') is not null then
    drop trigger if exists trg_profile_logs on public.profiles_client;
  end if;
  if to_regclass('public.profiles_staff') is not null then
    drop trigger if exists trg_profile_logs on public.profiles_staff;
    drop trigger if exists trg_profile_staff_logs on public.profiles_staff;
  end if;
end $$;

-- Copy any leftover draft rows, then drop the unused tables.
do $$
begin
  if to_regclass('public.account_logs') is not null then
    insert into public.log_system (
      id, occurred_at, action, table_name, record_id, record_label, account_id,
      actor_account_id, actor_email, actor_role, before_data, after_data,
      changed_fields, metadata, source, request_id, ip_address, user_agent
    )
    select
      id, occurred_at, action, 'accounts', coalesce(account_id::text, ''),
      account_email, account_id, actor_account_id, actor_email, actor_role,
      before_data, after_data, changed_fields, metadata, source, request_id,
      ip_address, user_agent
    from public.account_logs
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.profile_logs') is not null then
    insert into public.log_system (
      id, occurred_at, action, table_name, record_id, record_label, account_id,
      actor_account_id, actor_email, actor_role, before_data, after_data,
      changed_fields, metadata, source, request_id, ip_address, user_agent
    )
    select
      id, occurred_at, action, 'profiles_client', coalesce(profile_id::text, ''),
      profile_id::text, account_id, actor_account_id, actor_email, actor_role,
      before_data, after_data, changed_fields, metadata, source, request_id,
      ip_address, user_agent
    from public.profile_logs
    on conflict (id) do nothing;
  end if;
end $$;

drop function if exists public.tg_log_account_changes() cascade;
drop function if exists public.tg_log_profile_changes() cascade;

drop table if exists public.account_logs cascade;
drop table if exists public.profile_logs cascade;
drop table if exists public.transaction_logs cascade;
drop table if exists public.customer_support_logs cascade;
drop table if exists public.auth_logs cascade;
drop table if exists public.event_logs cascade;
drop table if exists public.enrollment_logs cascade;
drop table if exists public.access_logs cascade;
drop table if exists public.error_logs cascade;

-- ---------------------------------------------------------------------------
-- 7. RLS — append-only; readable by dev only
-- ---------------------------------------------------------------------------

alter table public.log_system enable row level security;

drop policy if exists log_system_select_dev on public.log_system;
create policy log_system_select_dev
  on public.log_system
  for select
  to authenticated
  using (public.is_dev());

-- App-level writers (future payments / auth). Triggers bypass RLS.
drop policy if exists log_system_insert_admin_dev on public.log_system;
create policy log_system_insert_admin_dev
  on public.log_system
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

-- No UPDATE or DELETE policies (immutable history).
