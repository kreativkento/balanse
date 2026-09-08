-- Rename public.feedback → public.feedback_system and add ticket_level.
-- Run after 023_feedback.sql (and 024 / 025 if those were applied).
-- Safe to re-run.

do $$
begin
  if to_regclass('public.feedback') is not null
     and to_regclass('public.feedback_system') is null then
    alter table public.feedback rename to feedback_system;
  end if;
end $$;

alter table public.feedback_system
  add column if not exists ticket_level smallint not null default 1;

comment on column public.feedback_system.ticket_level is
  'Ticket level. New submissions always start at 1.';

create index if not exists feedback_system_ticket_level_idx
  on public.feedback_system (ticket_level);

-- Re-bind insert policy so new rows must start at ticket_level = 1.
drop policy if exists "Feedback insert own" on public.feedback_system;
create policy "Feedback insert own"
  on public.feedback_system
  for insert
  to authenticated
  with check (
    account_id = public.current_account_id()
    and status = 'unresolved'::public.feedback_status
    and priority is null
    and ticket_level = 1
  );

grant select, insert, update, delete on table public.feedback_system to authenticated;
