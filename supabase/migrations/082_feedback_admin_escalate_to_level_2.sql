-- Admin inbox escalate (Pass to dev): ticket_level 1 → 2.

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
