-- Ticket loop: comments for involved users, in-app notifications.
-- Email is sent by the send-feedback-comment-email edge function.
-- Safe to re-run.

create table if not exists public.feedback_ticket_participants (
  ticket_id uuid not null references public.feedback_system (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (ticket_id, account_id)
);

create index if not exists feedback_ticket_participants_account_idx
  on public.feedback_ticket_participants (account_id);

create table if not exists public.feedback_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.feedback_system (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete restrict,
  body text not null
    check (char_length(btrim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists feedback_comments_ticket_created_idx
  on public.feedback_comments (ticket_id, created_at);

create table if not exists public.account_notifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  kind text not null default 'feedback_comment',
  title text not null,
  body text not null,
  href text not null,
  ticket_id uuid references public.feedback_system (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists account_notifications_account_unread_idx
  on public.account_notifications (account_id, created_at desc)
  where read_at is null;

create index if not exists account_notifications_account_created_idx
  on public.account_notifications (account_id, created_at desc);

comment on table public.feedback_comments is
  'Comments on feedback_system tickets. Involved users (submitter + handlers + commenters) may post.';

comment on table public.account_notifications is
  'In-app notifications. Currently used for ticket-loop comments.';

insert into public.feedback_ticket_participants (ticket_id, account_id)
select id, account_id
from public.feedback_system
on conflict do nothing;

create or replace function public.feedback_portal_href(
  p_role public.user_role,
  p_ticket_id uuid
)
returns text
language sql
immutable
as $$
  select case p_role
    when 'user'::public.user_role then '/feedback?ticket=' || p_ticket_id::text
    when 'coach'::public.user_role then '/staff-feedback?ticket=' || p_ticket_id::text
    when 'frontdesk'::public.user_role then '/frontdesk-feedback?ticket=' || p_ticket_id::text
    when 'marketing'::public.user_role then '/marketing-feedback?ticket=' || p_ticket_id::text
    when 'admin'::public.user_role then '/admin-feedback?ticket=' || p_ticket_id::text
    when 'dev'::public.user_role then '/development/feedback?ticket=' || p_ticket_id::text
    else '/feedback?ticket=' || p_ticket_id::text
  end;
$$;

create or replace function public.feedback_account_display_name(p_account_id uuid)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(btrim(s.name), ''),
    nullif(btrim(c.name), ''),
    a.email,
    'Studio user'
  )
  from public.accounts a
  left join public.profiles_staff s on s.account_id = a.id
  left join public.profiles_client c on c.account_id = a.id
  where a.id = p_account_id;
$$;

create or replace function public.feedback_ensure_participant(
  p_ticket_id uuid,
  p_account_id uuid default public.current_account_id()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_account_id is null then
    return;
  end if;
  insert into public.feedback_ticket_participants (ticket_id, account_id)
  values (p_ticket_id, p_account_id)
  on conflict (ticket_id, account_id) do nothing;
end;
$$;

create or replace function public.can_access_feedback_ticket(p_ticket_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.feedback_system;
  v_role public.user_role := public.current_user_role();
  v_account uuid := public.current_account_id();
begin
  if v_account is null then
    return false;
  end if;

  select * into v_row
  from public.feedback_system
  where id = p_ticket_id;

  if not found then
    return false;
  end if;

  if v_row.account_id = v_account then
    return true;
  end if;

  if exists (
    select 1
    from public.feedback_ticket_participants p
    where p.ticket_id = p_ticket_id
      and p.account_id = v_account
  ) then
    return true;
  end if;

  if v_role = 'frontdesk'::public.user_role and v_row.ticket_level in (0, 1) then
    return true;
  end if;

  if v_role = 'admin'::public.user_role and v_row.ticket_level in (2, 3) then
    return true;
  end if;

  if v_role = 'dev'::public.user_role and v_row.ticket_level = 4 then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.tg_feedback_ensure_submitter_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.feedback_ensure_participant(new.id, new.account_id);
  if public.current_account_id() is not null then
    perform public.feedback_ensure_participant(new.id, public.current_account_id());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_feedback_ensure_participant on public.feedback_system;
create trigger trg_feedback_ensure_participant
  after insert or update on public.feedback_system
  for each row
  execute function public.tg_feedback_ensure_submitter_participant();

create or replace function public.add_feedback_comment(
  p_ticket_id uuid,
  p_body text
)
returns table (
  id uuid,
  ticket_id uuid,
  account_id uuid,
  body text,
  created_at timestamptz,
  author_name text,
  author_role public.user_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid := public.current_account_id();
  v_role public.user_role := public.current_user_role();
  v_body text := btrim(p_body);
  v_ticket public.feedback_system;
  v_comment public.feedback_comments;
  v_author text;
  v_other record;
begin
  if v_account is null then
    raise exception 'You must be signed in to comment.';
  end if;
  if v_body is null or char_length(v_body) = 0 then
    raise exception 'Comment cannot be empty.';
  end if;
  if char_length(v_body) > 2000 then
    raise exception 'Comment must be 2000 characters or fewer.';
  end if;
  if not public.can_access_feedback_ticket(p_ticket_id) then
    raise exception 'You cannot comment on this ticket.';
  end if;

  select * into v_ticket
  from public.feedback_system
  where id = p_ticket_id;

  if not found then
    raise exception 'Ticket not found.';
  end if;

  insert into public.feedback_comments (ticket_id, account_id, body)
  values (p_ticket_id, v_account, v_body)
  returning * into v_comment;

  perform public.feedback_ensure_participant(p_ticket_id, v_account);

  update public.feedback_ticket_participants
  set last_read_at = now()
  where ticket_id = p_ticket_id
    and account_id = v_account;

  v_author := public.feedback_account_display_name(v_account);

  for v_other in
    select p.account_id, a.role
    from public.feedback_ticket_participants p
    join public.accounts a on a.id = p.account_id
    where p.ticket_id = p_ticket_id
      and p.account_id is distinct from v_account
  loop
    insert into public.account_notifications (
      account_id, kind, title, body, href, ticket_id
    ) values (
      v_other.account_id,
      'feedback_comment',
      'New comment on ticket ' || coalesce(nullif(btrim(v_ticket.uid), ''), left(v_ticket.id::text, 8)),
      v_author || ' commented: ' || left(v_body, 180),
      public.feedback_portal_href(v_other.role, p_ticket_id),
      p_ticket_id
    );
  end loop;

  return query
  select
    v_comment.id,
    v_comment.ticket_id,
    v_comment.account_id,
    v_comment.body,
    v_comment.created_at,
    v_author,
    v_role;
end;
$$;

create or replace function public.list_feedback_comments(p_ticket_id uuid)
returns table (
  id uuid,
  ticket_id uuid,
  account_id uuid,
  body text,
  created_at timestamptz,
  author_name text,
  author_role public.user_role
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_access_feedback_ticket(p_ticket_id) then
    raise exception 'You cannot view comments on this ticket.';
  end if;

  return query
  select
    c.id,
    c.ticket_id,
    c.account_id,
    c.body,
    c.created_at,
    public.feedback_account_display_name(c.account_id),
    a.role
  from public.feedback_comments c
  join public.accounts a on a.id = c.account_id
  where c.ticket_id = p_ticket_id
  order by c.created_at asc;
end;
$$;

create or replace function public.mark_feedback_ticket_read(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid := public.current_account_id();
begin
  if v_account is null then
    return;
  end if;
  if not public.can_access_feedback_ticket(p_ticket_id) then
    return;
  end if;

  perform public.feedback_ensure_participant(p_ticket_id, v_account);

  update public.feedback_ticket_participants
  set last_read_at = now()
  where ticket_id = p_ticket_id
    and account_id = v_account;

  update public.account_notifications
  set read_at = now()
  where account_id = v_account
    and ticket_id = p_ticket_id
    and read_at is null;
end;
$$;

create or replace function public.mark_account_notification_read(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid := public.current_account_id();
begin
  if v_account is null then
    return;
  end if;

  update public.account_notifications
  set read_at = now()
  where id = p_id
    and account_id = v_account
    and read_at is null;
end;
$$;

create or replace function public.mark_all_account_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid := public.current_account_id();
begin
  if v_account is null then
    return;
  end if;

  update public.account_notifications
  set read_at = now()
  where account_id = v_account
    and read_at is null;
end;
$$;

alter table public.feedback_ticket_participants enable row level security;
alter table public.feedback_comments enable row level security;
alter table public.account_notifications enable row level security;

drop policy if exists feedback_participants_select_own on public.feedback_ticket_participants;
drop policy if exists feedback_comments_select_access on public.feedback_comments;
drop policy if exists account_notifications_select_own on public.account_notifications;
drop policy if exists account_notifications_update_own on public.account_notifications;

create policy feedback_participants_select_own
  on public.feedback_ticket_participants
  for select
  to authenticated
  using (
    account_id = public.current_account_id()
    or public.can_access_feedback_ticket(ticket_id)
  );

create policy feedback_comments_select_access
  on public.feedback_comments
  for select
  to authenticated
  using (public.can_access_feedback_ticket(ticket_id));

create policy account_notifications_select_own
  on public.account_notifications
  for select
  to authenticated
  using (account_id = public.current_account_id());

create policy account_notifications_update_own
  on public.account_notifications
  for update
  to authenticated
  using (account_id = public.current_account_id())
  with check (account_id = public.current_account_id());

-- Involved users keep select on tickets they already handled, even after the queue moves on.
drop policy if exists "Feedback select participant" on public.feedback_system;
create policy "Feedback select participant"
  on public.feedback_system
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.feedback_ticket_participants p
      where p.ticket_id = feedback_system.id
        and p.account_id = public.current_account_id()
    )
  );

grant select on table public.feedback_ticket_participants to authenticated;
grant select on table public.feedback_comments to authenticated;
grant select, update on table public.account_notifications to authenticated;

grant execute on function public.feedback_portal_href(public.user_role, uuid) to authenticated;
grant execute on function public.feedback_account_display_name(uuid) to authenticated;
grant execute on function public.feedback_ensure_participant(uuid, uuid) to authenticated;
grant execute on function public.can_access_feedback_ticket(uuid) to authenticated;
grant execute on function public.add_feedback_comment(uuid, text) to authenticated;
grant execute on function public.list_feedback_comments(uuid) to authenticated;
grant execute on function public.mark_feedback_ticket_read(uuid) to authenticated;
grant execute on function public.mark_account_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_account_notifications_read() to authenticated;
