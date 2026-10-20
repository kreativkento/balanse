-- Submitters may set priority once on insert; post-submit changes use feedback_set_priority (inbox roles).

drop policy if exists "Feedback insert own" on public.feedback_system;

create policy "Feedback insert own"
  on public.feedback_system
  for insert
  to authenticated
  with check (
    account_id = public.current_account_id()
    and status = 'unresolved'::public.feedback_status
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

comment on column public.feedback_system.priority is
  'Set by submitter on create; inbox staff (front desk, admin, dev) may update via feedback_set_priority.';
