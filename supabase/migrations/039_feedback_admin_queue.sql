-- Admin inbox: tickets at ticket_level = 2.
-- Mirrors the coach queue policy (levels 0–1) from 035_feedback_escalation_levels.sql.
-- Safe to re-run.

drop policy if exists "Feedback select admin queue" on public.feedback_system;

create policy "Feedback select admin queue"
  on public.feedback_system
  for select
  to authenticated
  using (
    public.is_admin()
    and ticket_level = 2
  );

drop policy if exists "feedback_attachments_select_admin_queue" on storage.objects;

create policy "feedback_attachments_select_admin_queue"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and public.is_admin()
    and exists (
      select 1
      from public.feedback_system f
      where f.id::text = (storage.foldername(name))[2]
        and f.ticket_level = 2
    )
  );

grant select, insert, update, delete on table public.feedback_system to authenticated;
