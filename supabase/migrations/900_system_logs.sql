-- BALANSÉ system logs schema (troubleshooting / audit trail)
-- Run in Supabase Dashboard → SQL Editor (or via Supabase CLI migrations)
--
-- Numbered 900+ to keep operational audit migrations clearly separated from
-- domain schema (001–009).
--
-- Tables in this file:
--   REQUIRED (dev portal System Logs nav)
--     • account_logs            — every change to public.accounts
--     • profile_logs            — every change to public.profiles
--     • transaction_logs        — payment / money movement trail (app-written until payments table exists)
--     • customer_support_logs   — support tickets, replies, status changes
--
--   RECOMMENDED for future troubleshooting (included now so writers can adopt early)
--     • auth_logs               — sign-in / sign-out / failed auth / password reset
--     • event_logs              — class/event create/update/status changes
--     • enrollment_logs         — enroll / unenroll / coach assign-remove
--     • access_logs             — sensitive page/RPC access (who viewed what)
--     • error_logs              — app / edge / RPC failures with stack context
--
-- Design rules:
--   • Append-only from clients (SELECT for is_dev(); no UPDATE/DELETE policies)
--   • Triggers auto-write account_logs + profile_logs
--   • PHI: profile medical_history is redacted in stored snapshots
--   • Actor email/role are snapshotted so history survives account deletes

-- ---------------------------------------------------------------------------
-- 1. Shared enums
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

do $$
begin
  create type public.support_log_channel as enum (
    'email',
    'chatbot',
    'ticket',
    'phone',
    'in_app',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.transaction_log_kind as enum (
    'payment_submit',
    'payment_approve',
    'payment_reject',
    'refund',
    'subscription_charge',
    'credit_adjust',
    'promo_apply',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Shared helpers
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
    else row_data
      || jsonb_build_object(
        'medical_history',
        case
          when coalesce(row_data->>'medical_history', '') = '' then ''
          else '[REDACTED]'
        end
      )
  end;
$$;

-- ---------------------------------------------------------------------------
-- 3. account_logs
-- ---------------------------------------------------------------------------

create table if not exists public.account_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),

  action public.log_action not null,
  account_id uuid references public.accounts (id) on delete set null,
  account_email text,
  account_role public.user_role,

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

comment on table public.account_logs is
  'Append-only audit of public.accounts changes (create, role/email updates, deletes).';

create index if not exists account_logs_occurred_at_idx on public.account_logs (occurred_at desc);
create index if not exists account_logs_account_id_idx on public.account_logs (account_id);
create index if not exists account_logs_actor_account_id_idx on public.account_logs (actor_account_id);
create index if not exists account_logs_action_idx on public.account_logs (action);

create or replace function public.tg_log_account_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor jsonb := public.log_actor_snapshot();
  v_action public.log_action;
  v_before jsonb;
  v_after jsonb;
  v_account_id uuid;
  v_email text;
  v_role public.user_role;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_before := null;
    v_after := to_jsonb(new);
    v_account_id := new.id;
    v_email := new.email;
    v_role := new.role;
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_account_id := new.id;
    v_email := new.email;
    v_role := new.role;
  else
    v_action := 'delete';
    v_before := to_jsonb(old);
    v_after := null;
    v_account_id := old.id;
    v_email := old.email;
    v_role := old.role;
  end if;

  insert into public.account_logs (
    action,
    account_id,
    account_email,
    account_role,
    actor_account_id,
    actor_email,
    actor_role,
    before_data,
    after_data,
    changed_fields,
    metadata,
    source
  ) values (
    v_action,
    v_account_id,
    v_email,
    v_role,
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

drop trigger if exists trg_account_logs on public.accounts;
create trigger trg_account_logs
  after insert or update or delete on public.accounts
  for each row
  execute function public.tg_log_account_changes();

-- ---------------------------------------------------------------------------
-- 4. profile_logs
-- ---------------------------------------------------------------------------

create table if not exists public.profile_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),

  action public.log_action not null,
  profile_id uuid references public.profiles (id) on delete set null,
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

comment on table public.profile_logs is
  'Append-only audit of public.profiles changes. medical_history is redacted in snapshots.';

create index if not exists profile_logs_occurred_at_idx on public.profile_logs (occurred_at desc);
create index if not exists profile_logs_profile_id_idx on public.profile_logs (profile_id);
create index if not exists profile_logs_account_id_idx on public.profile_logs (account_id);
create index if not exists profile_logs_actor_account_id_idx on public.profile_logs (actor_account_id);

create or replace function public.tg_log_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor jsonb := public.log_actor_snapshot();
  v_action public.log_action;
  v_before jsonb;
  v_after jsonb;
  v_profile_id uuid;
  v_account_id uuid;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_before := null;
    v_after := public.sanitize_profile_log_row(to_jsonb(new));
    v_profile_id := new.id;
    v_account_id := new.account_id;
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_before := public.sanitize_profile_log_row(to_jsonb(old));
    v_after := public.sanitize_profile_log_row(to_jsonb(new));
    v_profile_id := new.id;
    v_account_id := new.account_id;
  else
    v_action := 'delete';
    v_before := public.sanitize_profile_log_row(to_jsonb(old));
    v_after := null;
    v_profile_id := old.id;
    v_account_id := old.account_id;
  end if;

  insert into public.profile_logs (
    action,
    profile_id,
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
    v_action,
    v_profile_id,
    v_account_id,
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

drop trigger if exists trg_profile_logs on public.profiles;
create trigger trg_profile_logs
  after insert or update or delete on public.profiles
  for each row
  execute function public.tg_log_profile_changes();

-- ---------------------------------------------------------------------------
-- 5. transaction_logs (ready for payments / subscriptions)
-- ---------------------------------------------------------------------------

create table if not exists public.transaction_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),

  action public.log_action not null,
  kind public.transaction_log_kind not null default 'other',

  -- Soft references until payments/subscriptions tables land
  transaction_ref text,
  payment_id uuid,
  subscription_id uuid,
  account_id uuid references public.accounts (id) on delete set null,
  account_email text,

  amount_centavos integer,
  currency text not null default 'PHP',
  method text,
  status_from text,
  status_to text,
  external_ref text,

  actor_account_id uuid references public.accounts (id) on delete set null,
  actor_email text,
  actor_role public.user_role,

  before_data jsonb,
  after_data jsonb,
  changed_fields jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  source text not null default 'app',
  request_id text,
  ip_address inet,
  user_agent text
);

comment on table public.transaction_logs is
  'Append-only money-movement trail. Write from payment/subscription services when those tables exist.';

create index if not exists transaction_logs_occurred_at_idx on public.transaction_logs (occurred_at desc);
create index if not exists transaction_logs_account_id_idx on public.transaction_logs (account_id);
create index if not exists transaction_logs_payment_id_idx on public.transaction_logs (payment_id);
create index if not exists transaction_logs_kind_idx on public.transaction_logs (kind);
create index if not exists transaction_logs_external_ref_idx on public.transaction_logs (external_ref);

-- ---------------------------------------------------------------------------
-- 6. customer_support_logs
-- ---------------------------------------------------------------------------

create table if not exists public.customer_support_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),

  action public.log_action not null,
  channel public.support_log_channel not null default 'other',

  ticket_id uuid,
  ticket_ref text,
  subject text,
  status_from text,
  status_to text,

  requester_account_id uuid references public.accounts (id) on delete set null,
  requester_email text,
  assignee_account_id uuid references public.accounts (id) on delete set null,

  actor_account_id uuid references public.accounts (id) on delete set null,
  actor_email text,
  actor_role public.user_role,

  message_preview text,
  before_data jsonb,
  after_data jsonb,
  changed_fields jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  source text not null default 'app',
  request_id text,
  ip_address inet,
  user_agent text
);

comment on table public.customer_support_logs is
  'Append-only support activity (ticket open/reply/status, chatbot handoff, email).';

create index if not exists customer_support_logs_occurred_at_idx on public.customer_support_logs (occurred_at desc);
create index if not exists customer_support_logs_ticket_id_idx on public.customer_support_logs (ticket_id);
create index if not exists customer_support_logs_requester_idx on public.customer_support_logs (requester_account_id);
create index if not exists customer_support_logs_channel_idx on public.customer_support_logs (channel);

-- ---------------------------------------------------------------------------
-- 7. Recommended companion log tables (troubleshooting)
-- ---------------------------------------------------------------------------

create table if not exists public.auth_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  action public.log_action not null,
  account_id uuid references public.accounts (id) on delete set null,
  email text,
  success boolean not null default true,
  failure_reason text,
  actor_account_id uuid references public.accounts (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'app',
  request_id text,
  ip_address inet,
  user_agent text
);

comment on table public.auth_logs is
  'Auth events: login, logout, failed login, password reset. Ideal for lockout / takeover troubleshooting.';

create index if not exists auth_logs_occurred_at_idx on public.auth_logs (occurred_at desc);
create index if not exists auth_logs_email_idx on public.auth_logs (email);
create index if not exists auth_logs_action_idx on public.auth_logs (action);

create table if not exists public.event_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  action public.log_action not null,
  event_id uuid references public.events (id) on delete set null,
  event_name text,
  discipline_id uuid,
  status_from text,
  status_to text,
  actor_account_id uuid references public.accounts (id) on delete set null,
  actor_email text,
  actor_role public.user_role,
  before_data jsonb,
  after_data jsonb,
  changed_fields jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'app',
  request_id text,
  ip_address inet,
  user_agent text
);

comment on table public.event_logs is
  'Class/event lifecycle changes for schedule troubleshooting.';

create index if not exists event_logs_occurred_at_idx on public.event_logs (occurred_at desc);
create index if not exists event_logs_event_id_idx on public.event_logs (event_id);

create table if not exists public.enrollment_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  action public.log_action not null,
  event_id uuid references public.events (id) on delete set null,
  student_account_id uuid references public.accounts (id) on delete set null,
  coach_account_id uuid references public.accounts (id) on delete set null,
  actor_account_id uuid references public.accounts (id) on delete set null,
  actor_email text,
  actor_role public.user_role,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'app',
  request_id text,
  ip_address inet,
  user_agent text
);

comment on table public.enrollment_logs is
  'Student enroll/unenroll and coach assign/unassign against events.';

create index if not exists enrollment_logs_occurred_at_idx on public.enrollment_logs (occurred_at desc);
create index if not exists enrollment_logs_event_id_idx on public.enrollment_logs (event_id);
create index if not exists enrollment_logs_student_idx on public.enrollment_logs (student_account_id);

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  action public.log_action not null default 'view',
  resource_type text not null,
  resource_id text,
  resource_label text,
  actor_account_id uuid references public.accounts (id) on delete set null,
  actor_email text,
  actor_role public.user_role,
  route text,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'app',
  request_id text,
  ip_address inet,
  user_agent text
);

comment on table public.access_logs is
  'Who opened sensitive admin/dev resources (payments, medical profiles, exports).';

create index if not exists access_logs_occurred_at_idx on public.access_logs (occurred_at desc);
create index if not exists access_logs_resource_idx on public.access_logs (resource_type, resource_id);
create index if not exists access_logs_actor_idx on public.access_logs (actor_account_id);

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  action public.log_action not null default 'error',
  severity text not null default 'error', -- debug|info|warn|error|fatal
  code text,
  message text not null,
  stack text,
  route text,
  rpc_name text,
  actor_account_id uuid references public.accounts (id) on delete set null,
  actor_email text,
  actor_role public.user_role,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'app',
  request_id text,
  ip_address inet,
  user_agent text
);

comment on table public.error_logs is
  'Captured application / RPC / edge failures for post-incident debugging.';

create index if not exists error_logs_occurred_at_idx on public.error_logs (occurred_at desc);
create index if not exists error_logs_severity_idx on public.error_logs (severity);
create index if not exists error_logs_code_idx on public.error_logs (code);

-- ---------------------------------------------------------------------------
-- 8. RLS — append-only; readable by dev only
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'account_logs',
    'profile_logs',
    'transaction_logs',
    'customer_support_logs',
    'auth_logs',
    'event_logs',
    'enrollment_logs',
    'access_logs',
    'error_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_dev', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_dev())',
      t || '_select_dev', t
    );

    -- App-level writers (service / security definer triggers bypass RLS).
    -- Allow authenticated inserts only for non-trigger tables so services can write;
    -- still restricted to admin/dev for operational safety.
    if t in (
      'transaction_logs',
      'customer_support_logs',
      'auth_logs',
      'event_logs',
      'enrollment_logs',
      'access_logs',
      'error_logs'
    ) then
      execute format('drop policy if exists %I on public.%I', t || '_insert_admin_dev', t);
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (public.is_admin_or_dev())',
        t || '_insert_admin_dev', t
      );
    end if;
  end loop;
end $$;

-- Triggers run as security definer and bypass RLS for account_logs / profile_logs inserts.
-- No UPDATE or DELETE policies on any log table (immutable history).
