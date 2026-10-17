-- Re-apply feedback insert RLS so member submissions (ticket_level 0) succeed.
-- Safe if 035_feedback_escalation_levels.sql already ran.

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
          'admin'::public.user_role,
          'frontdesk'::public.user_role,
          'marketing'::public.user_role,
          'dev'::public.user_role
        )
        and ticket_level = 3
      )
    )
  );

grant select, insert, update, delete on table public.feedback_system to authenticated;
