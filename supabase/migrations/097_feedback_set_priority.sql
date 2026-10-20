-- Inbox roles only after submit: front desk (0–1), admin (2–3), dev (4).

create or replace function public.feedback_set_priority(
  p_id uuid,
  p_priority public.feedback_priority
)
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

  if v_role = 'frontdesk'::public.user_role and v_row.ticket_level in (0, 1) then
    null;
  elsif v_role = 'admin'::public.user_role and v_row.ticket_level in (2, 3) then
    null;
  elsif v_role = 'dev'::public.user_role and v_row.ticket_level = 4 then
    null;
  else
    raise exception 'You cannot set priority on this ticket.';
  end if;

  update public.feedback_system
  set priority = p_priority
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.feedback_set_priority(uuid, public.feedback_priority) to authenticated;
