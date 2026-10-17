-- Allow staff to withdraw their own pending portal requests (slot or cancellation).

create or replace function public.withdraw_portal_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester uuid := public.current_account_id();
  v_row public.portal_requests;
begin
  if v_requester is null then
    raise exception 'Not authenticated.';
  end if;

  if p_request_id is null then
    raise exception 'Request id is required.';
  end if;

  select * into v_row
  from public.portal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found.';
  end if;

  if v_row.requester_account_id <> v_requester then
    raise exception 'You can only withdraw your own requests.';
  end if;

  if v_row.status <> 'pending'::public.portal_request_status then
    raise exception 'Only pending requests can be withdrawn.';
  end if;

  delete from public.portal_requests where id = p_request_id;
end;
$$;

comment on function public.withdraw_portal_request(uuid) is
  'Staff withdraws a pending slot or cancellation portal request they submitted.';

grant execute on function public.withdraw_portal_request(uuid) to authenticated;
