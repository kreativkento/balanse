-- BALANSÉ tickets + ticket logs
-- Escalation: level 1 → admin queue; level 2 → developer queue
--
-- Ticket fields:
--   title, description, type, priority, creator, level, image (optional)

do $$
begin
  create type public.ticket_type as enum (
    'bug',
    'feature',
    'support',
    'incident',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ticket_priority as enum (
    'low',
    'medium',
    'high',
    'critical'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ticket_status as enum (
    'open',
    'in_progress',
    'resolved',
    'closed'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- tickets
-- ---------------------------------------------------------------------------

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text not null default '',
  type public.ticket_type not null default 'other',
  priority public.ticket_priority not null default 'medium',

  -- Escalation: 1 = admin-facing, 2 = developer-facing
  level smallint not null default 1
    check (level in (1, 2)),

  image_url text,
  status public.ticket_status not null default 'open',

  creator_account_id uuid not null references public.accounts (id) on delete restrict,
  creator_email text not null default '',

  assignee_account_id uuid references public.accounts (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tickets is
  'Support / engineering tickets. level 1 is shown to admins; level 2 is escalated to developers.';

comment on column public.tickets.level is
  'Escalation level: 1 = admin queue, 2 = developer queue.';

comment on column public.tickets.image_url is
  'Optional attachment / screenshot URL.';

create index if not exists tickets_level_idx on public.tickets (level);
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_priority_idx on public.tickets (priority);
create index if not exists tickets_creator_idx on public.tickets (creator_account_id);
create index if not exists tickets_created_at_idx on public.tickets (created_at desc);

create or replace function public.tg_tickets_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_tickets_updated_at on public.tickets;
create trigger trg_tickets_updated_at
  before update on public.tickets
  for each row
  execute function public.tg_tickets_set_updated_at();

-- ---------------------------------------------------------------------------
-- ticket_logs (append-only history of ticket changes)
-- ---------------------------------------------------------------------------

create table if not exists public.ticket_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),

  action public.log_action not null,
  ticket_id uuid references public.tickets (id) on delete set null,

  -- Snapshot of ticket fields for troubleshooting
  title text,
  description text,
  type public.ticket_type,
  priority public.ticket_priority,
  level smallint,
  image_url text,
  status public.ticket_status,
  creator_account_id uuid,
  creator_email text,

  actor_account_id uuid references public.accounts (id) on delete set null,
  actor_email text,
  actor_role public.user_role,

  before_data jsonb,
  after_data jsonb,
  changed_fields jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'trigger'
);

comment on table public.ticket_logs is
  'Append-only ticket change history (title, description, type, priority, creator, level, image).';

create index if not exists ticket_logs_occurred_at_idx on public.ticket_logs (occurred_at desc);
create index if not exists ticket_logs_ticket_id_idx on public.ticket_logs (ticket_id);
create index if not exists ticket_logs_level_idx on public.ticket_logs (level);

create or replace function public.tg_log_ticket_changes()
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
  v_ticket_id uuid;
  v_title text;
  v_description text;
  v_type public.ticket_type;
  v_priority public.ticket_priority;
  v_level smallint;
  v_image_url text;
  v_status public.ticket_status;
  v_creator_id uuid;
  v_creator_email text;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_before := null;
    v_after := to_jsonb(new);
    v_ticket_id := new.id;
    v_title := new.title;
    v_description := new.description;
    v_type := new.type;
    v_priority := new.priority;
    v_level := new.level;
    v_image_url := new.image_url;
    v_status := new.status;
    v_creator_id := new.creator_account_id;
    v_creator_email := new.creator_email;
  elsif tg_op = 'UPDATE' then
    v_action := case
      when old.level is distinct from new.level then 'status_change'
      when old.status is distinct from new.status then 'status_change'
      else 'update'
    end;
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_ticket_id := new.id;
    v_title := new.title;
    v_description := new.description;
    v_type := new.type;
    v_priority := new.priority;
    v_level := new.level;
    v_image_url := new.image_url;
    v_status := new.status;
    v_creator_id := new.creator_account_id;
    v_creator_email := new.creator_email;
  else
    v_action := 'delete';
    v_before := to_jsonb(old);
    v_after := null;
    v_ticket_id := old.id;
    v_title := old.title;
    v_description := old.description;
    v_type := old.type;
    v_priority := old.priority;
    v_level := old.level;
    v_image_url := old.image_url;
    v_status := old.status;
    v_creator_id := old.creator_account_id;
    v_creator_email := old.creator_email;
  end if;

  insert into public.ticket_logs (
    action,
    ticket_id,
    title,
    description,
    type,
    priority,
    level,
    image_url,
    status,
    creator_account_id,
    creator_email,
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
    v_ticket_id,
    v_title,
    v_description,
    v_type,
    v_priority,
    v_level,
    v_image_url,
    v_status,
    v_creator_id,
    v_creator_email,
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

drop trigger if exists trg_ticket_logs on public.tickets;
create trigger trg_ticket_logs
  after insert or update or delete on public.tickets
  for each row
  execute function public.tg_log_ticket_changes();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.tickets enable row level security;
alter table public.ticket_logs enable row level security;

drop policy if exists "Tickets select admin level1" on public.tickets;
drop policy if exists "Tickets select dev all" on public.tickets;
drop policy if exists "Tickets insert admin_dev" on public.tickets;
drop policy if exists "Tickets update admin_dev" on public.tickets;
drop policy if exists "Tickets delete admin_dev" on public.tickets;

-- Admins see level 1 (and may escalate); they do not see developer-only level 2 by default.
create policy "Tickets select admin level1"
  on public.tickets
  for select
  to authenticated
  using (
    public.is_admin()
    and level = 1
  );

-- Developers see all levels (admin queue + escalated).
create policy "Tickets select dev all"
  on public.tickets
  for select
  to authenticated
  using (public.is_dev());

create policy "Tickets insert admin_dev"
  on public.tickets
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy "Tickets update admin_dev"
  on public.tickets
  for update
  to authenticated
  using (
    public.is_dev()
    or (public.is_admin() and level = 1)
  )
  with check (
    public.is_dev()
    or (public.is_admin() and level in (1, 2))
  );

create policy "Tickets delete admin_dev"
  on public.tickets
  for delete
  to authenticated
  using (public.is_admin_or_dev());

drop policy if exists "Ticket logs select admin level1" on public.ticket_logs;
drop policy if exists "Ticket logs select dev" on public.ticket_logs;

create policy "Ticket logs select admin level1"
  on public.ticket_logs
  for select
  to authenticated
  using (
    public.is_admin()
    and coalesce(level, 1) = 1
  );

create policy "Ticket logs select dev"
  on public.ticket_logs
  for select
  to authenticated
  using (public.is_dev());

-- No client UPDATE/DELETE on ticket_logs (append-only via trigger).
