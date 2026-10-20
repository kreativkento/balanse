-- Admin returns member-submitted tickets from admin queue (2–3) to front desk (1).

create or replace function public.feedback_deescalate_to_frontdesk(p_id uuid)
returns public.feedback_system
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.feedback_system;
  v_creator_role public.user_role;
begin
  if public.current_user_role() <> 'admin'::public.user_role then
    raise exception 'Only admin can de-escalate tickets.';
  end if;

  select *
  into v_row
  from public.feedback_system
  where id = p_id
  for update;

  if not found then
    raise exception 'Ticket not found.';
  end if;

  if v_row.ticket_level not in (2, 3) then
    raise exception 'Ticket is not in the admin queue.';
  end if;

  select a.role
  into v_creator_role
  from public.accounts a
  where a.id = v_row.account_id;

  if v_creator_role is distinct from 'user'::public.user_role then
    raise exception 'Only member-submitted tickets can be de-escalated to front desk.';
  end if;

  update public.feedback_system
  set ticket_level = 1
  where id = p_id
    and ticket_level in (2, 3)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.feedback_deescalate_to_frontdesk(uuid) to authenticated;
