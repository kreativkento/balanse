-- Coaches see only their own feedback rows (not the level 0–1 member queue).

drop policy if exists "Feedback select coach queue" on public.feedback_system;

drop policy if exists "feedback_attachments_select_coach_queue" on storage.objects;

-- Level 0 → 1 is front desk only (coaches no longer triage the member queue).
create or replace function public.feedback_open_ticket(p_id uuid)
returns public.feedback_system
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.feedback_system;
begin
  if public.current_user_role() <> 'frontdesk'::public.user_role then
    raise exception 'Only front desk can open feedback tickets.';
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
