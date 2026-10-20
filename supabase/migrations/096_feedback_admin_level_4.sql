-- Admin inbox: ticket_level 2–3. Receive 2→3, forward to dev 3→4. Dev inbox: level 4.

alter table public.feedback_system
  drop constraint if exists feedback_system_ticket_level_check;

alter table public.feedback_system
  add constraint feedback_system_ticket_level_check
  check (ticket_level >= 0 and ticket_level <= 4);

comment on column public.feedback_system.ticket_level is
  '0 member queue, 1 front desk opened, 2 admin inbox, 3 admin received, 4 dev inbox.';

drop policy if exists "Feedback select admin queue" on public.feedback_system;

create policy "Feedback select admin queue"
  on public.feedback_system
  for select
  to authenticated
  using (
    public.current_user_role() = 'admin'::public.user_role
    and ticket_level in (2, 3)
  );

drop policy if exists "feedback_attachments_select_admin_queue" on storage.objects;

create policy "feedback_attachments_select_admin_queue"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and public.current_user_role() = 'admin'::public.user_role
    and exists (
      select 1
      from public.feedback_system f
      where f.id::text = (storage.foldername(name))[2]
        and f.ticket_level in (2, 3)
    )
  );

drop policy if exists "Feedback select dev queue" on public.feedback_system;

create policy "Feedback select dev queue"
  on public.feedback_system
  for select
  to authenticated
  using (
    public.current_user_role() = 'dev'::public.user_role
    and ticket_level = 4
  );

drop policy if exists "feedback_attachments_select_dev_queue" on storage.objects;

create policy "feedback_attachments_select_dev_queue"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and public.current_user_role() = 'dev'::public.user_role
    and exists (
      select 1
      from public.feedback_system f
      where f.id::text = (storage.foldername(name))[2]
        and f.ticket_level = 4
    )
  );

create or replace function public.feedback_admin_receive_ticket(p_id uuid)
returns public.feedback_system
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.feedback_system;
begin
  if public.current_user_role() <> 'admin'::public.user_role then
    raise exception 'Only admins can receive feedback tickets.';
  end if;

  update public.feedback_system
  set ticket_level = 3
  where id = p_id
    and ticket_level = 2
  returning * into v_row;

  if not found then
    raise exception 'Ticket not found or not at level 2.';
  end if;

  return v_row;
end;
$$;

create or replace function public.feedback_forward_to_dev(p_id uuid)
returns public.feedback_system
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.feedback_system;
begin
  if public.current_user_role() <> 'admin'::public.user_role then
    raise exception 'Only admins can forward feedback to dev.';
  end if;

  update public.feedback_system
  set ticket_level = 4
  where id = p_id
    and ticket_level = 3
  returning * into v_row;

  if not found then
    raise exception 'Ticket not found or not at level 3.';
  end if;

  return v_row;
end;
$$;

grant execute on function public.feedback_admin_receive_ticket(uuid) to authenticated;
grant execute on function public.feedback_forward_to_dev(uuid) to authenticated;

grant select, insert, update, delete on table public.feedback_system to authenticated;
