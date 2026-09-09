-- Feedback escalation levels 0–3:
--   0 = with staff (unopened) — member can delete
--   1 = staff opened — member cannot delete
--   2 = with admin
--   3 = with dev (staff/admin submissions start here)
-- Run after 026_feedback_system_ticket_level.sql. Safe to re-run.

alter table public.feedback_system
  alter column ticket_level set default 0;

alter table public.feedback_system
  drop constraint if exists feedback_system_ticket_level_check;

alter table public.feedback_system
  add constraint feedback_system_ticket_level_check
  check (ticket_level >= 0 and ticket_level <= 3);

comment on column public.feedback_system.ticket_level is
  'Escalation level: 0 staff unopened, 1 staff opened, 2 admin, 3 dev. Members submit at 0; staff/admin submit at 3.';

-- ---------------------------------------------------------------------------
-- RLS: role-based insert levels
-- ---------------------------------------------------------------------------

drop policy if exists "Feedback insert own" on public.feedback_system;

create policy "Feedback insert own"
  on public.feedback_system
  for insert
  to authenticated
  with check (
    account_id = public.current_account_id()
    and status = 'unresolved'::public.feedback_status
    and priority is null
    and (
      (public.current_user_role() = 'user'::public.user_role and ticket_level = 0)
      or (
        public.current_user_role() in (
          'coach'::public.user_role,
          'admin'::public.user_role,
          'frontdesk'::public.user_role,
          'marketing'::public.user_role,
          'dev'::public.user_role
        )
        and ticket_level = 3
      )
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: delete only at level 0 (member, own ticket)
-- ---------------------------------------------------------------------------

drop policy if exists "Feedback delete own unresolved" on public.feedback_system;

create policy "Feedback delete own level zero"
  on public.feedback_system
  for delete
  to authenticated
  using (
    account_id = public.current_account_id()
    and ticket_level = 0
  );

-- ---------------------------------------------------------------------------
-- RLS: coach inbox (levels 0–1)
-- ---------------------------------------------------------------------------

drop policy if exists "Feedback select coach queue" on public.feedback_system;

create policy "Feedback select coach queue"
  on public.feedback_system
  for select
  to authenticated
  using (
    public.current_user_role() = 'coach'::public.user_role
    and ticket_level in (0, 1)
  );

-- ---------------------------------------------------------------------------
-- Storage: coaches can read attachments on their queue tickets
-- ---------------------------------------------------------------------------

drop policy if exists "feedback_attachments_select_coach_queue" on storage.objects;

create policy "feedback_attachments_select_coach_queue"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and public.current_user_role() = 'coach'::public.user_role
    and exists (
      select 1
      from public.feedback_system f
      where f.id::text = (storage.foldername(name))[2]
        and f.ticket_level in (0, 1)
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: open (0 → 1) and escalate (1 → 2 coach, 2 → 3 admin)
-- ---------------------------------------------------------------------------

create or replace function public.feedback_open_ticket(p_id uuid)
returns public.feedback_system
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.feedback_system;
begin
  if public.current_user_role() <> 'coach'::public.user_role then
    raise exception 'Only coaches can open feedback tickets.';
  end if;

  update public.feedback_system
  set ticket_level = 1
  where id = p_id
    and ticket_level = 0
  returning * into v_row;

  if not found then
    raise exception 'Ticket not found or not at level 0.';
  end if;

  return v_row;
end;
$$;

create or replace function public.feedback_escalate_ticket(p_id uuid)
returns public.feedback_system
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.feedback_system;
  v_role public.user_role := public.current_user_role();
begin
  select *
  into v_row
  from public.feedback_system
  where id = p_id
  for update;

  if not found then
    raise exception 'Ticket not found.';
  end if;

  if v_role = 'coach'::public.user_role and v_row.ticket_level = 1 then
    update public.feedback_system
    set ticket_level = 2
    where id = p_id
    returning * into v_row;
  elsif public.is_admin() and v_row.ticket_level = 2 then
    update public.feedback_system
    set ticket_level = 3
    where id = p_id
    returning * into v_row;
  else
    raise exception 'You cannot escalate this ticket from its current level.';
  end if;

  return v_row;
end;
$$;

grant execute on function public.feedback_open_ticket(uuid) to authenticated;
grant execute on function public.feedback_escalate_ticket(uuid) to authenticated;

grant select, insert, update, delete on table public.feedback_system to authenticated;
