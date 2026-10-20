-- Staff submit at ticket_level 2 (coach, marketing, frontdesk).
-- Members stay at 0. Admin/dev stay at 3.
-- Own delete: members at 0; coach/marketing/frontdesk at 2.
-- Front desk inbox: select levels 0–1.

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
      (
        public.current_user_role() = 'user'::public.user_role
        and ticket_level = 0
      )
      or (
        public.current_user_role() in (
          'coach'::public.user_role,
          'marketing'::public.user_role,
          'frontdesk'::public.user_role
        )
        and ticket_level = 2
      )
      or (
        public.current_user_role() in (
          'admin'::public.user_role,
          'dev'::public.user_role
        )
        and ticket_level = 3
      )
    )
  );

drop policy if exists "Feedback delete own level zero" on public.feedback_system;
drop policy if exists "Feedback delete own unresolved" on public.feedback_system;

create policy "Feedback delete own eligible level"
  on public.feedback_system
  for delete
  to authenticated
  using (
    account_id = public.current_account_id()
    and (
      (
        public.current_user_role() = 'user'::public.user_role
        and ticket_level = 0
      )
      or (
        public.current_user_role() in (
          'coach'::public.user_role,
          'marketing'::public.user_role,
          'frontdesk'::public.user_role
        )
        and ticket_level = 2
      )
    )
  );

drop policy if exists "Feedback select frontdesk queue" on public.feedback_system;

create policy "Feedback select frontdesk queue"
  on public.feedback_system
  for select
  to authenticated
  using (
    public.current_user_role() = 'frontdesk'::public.user_role
    and ticket_level in (0, 1)
  );

drop policy if exists "feedback_attachments_select_frontdesk_queue" on storage.objects;

create policy "feedback_attachments_select_frontdesk_queue"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and public.current_user_role() = 'frontdesk'::public.user_role
    and exists (
      select 1
      from public.feedback_system f
      where f.id::text = (storage.foldername(name))[2]
        and f.ticket_level in (0, 1)
    )
  );

grant select, insert, update, delete on table public.feedback_system to authenticated;
