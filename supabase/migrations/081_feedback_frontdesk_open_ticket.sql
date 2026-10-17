-- Front desk can move member tickets from level 0 → 1 (same as coach open).

create or replace function public.feedback_open_ticket(p_id uuid)
returns public.feedback_system
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.feedback_system;
  v_role public.user_role := public.current_user_role();
begin
  if v_role not in (
    'coach'::public.user_role,
    'frontdesk'::public.user_role
  ) then
    raise exception 'Only coaches and front desk can open feedback tickets.';
  end if;

  update public.feedback_system
  set ticket_level = 1
  where id = p_id
    and ticket_level = 0
  returning * into v_row;

  if not found then
    raise exception 'Ticket not found or not at level 0.';
  end if;

  return v_row;
end;
$$;

grant execute on function public.feedback_open_ticket(uuid) to authenticated;
