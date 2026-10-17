-- Admin system feedback inbox: ticket_level = 1 (was 2).

drop policy if exists "Feedback select admin queue" on public.feedback_system;

create policy "Feedback select admin queue"
  on public.feedback_system
  for select
  to authenticated
  using (
    public.is_admin()
    and ticket_level = 1
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
        and f.ticket_level = 1
    )
  );

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
  elsif public.is_admin() and v_row.ticket_level = 1 then
    update public.feedback_system
    set ticket_level = 2
    where id = p_id
    returning * into v_row;
  else
    raise exception 'You cannot escalate this ticket from its current level.';
  end if;

  return v_row;
end;
$$;

grant execute on function public.feedback_escalate_ticket(uuid) to authenticated;
