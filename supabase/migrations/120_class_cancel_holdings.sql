-- Coach class-cancel holding roster: frontdesk notifies, admin confirms, per-student refunds.

create or replace function public.is_frontdesk()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select a.role = 'frontdesk'::public.user_role
      from public.accounts a
      where a.auth_user_id = auth.uid()
    ),
    false
  );
$$;

grant execute on function public.is_frontdesk() to authenticated;

create table if not exists public.class_cancel_holdings (
  id uuid primary key default gen_random_uuid(),
  portal_request_id uuid not null references public.portal_requests (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  notified_at timestamptz,
  notified_by uuid references public.accounts (id) on delete set null,
  notify_note text not null default '',
  outcome text not null default 'pending_review'
    constraint class_cancel_holdings_outcome_chk check (
      outcome in (
        'pending_review',
        'coach_replaced',
        'class_cancelled',
        'request_rejected',
        'request_withdrawn'
      )
    ),
  refund_status text not null default 'not_applicable'
    constraint class_cancel_holdings_refund_status_chk check (
      refund_status in ('not_applicable', 'pending', 'completed', 'skipped')
    ),
  refund_kind text not null default 'none'
    constraint class_cancel_holdings_refund_kind_chk check (
      refund_kind in ('none', 'credit', 'cash')
    ),
  refunded_at timestamptz,
  refunded_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portal_request_id, account_id)
);

create index if not exists class_cancel_holdings_request_idx
  on public.class_cancel_holdings (portal_request_id);

create index if not exists class_cancel_holdings_account_idx
  on public.class_cancel_holdings (account_id);

create index if not exists class_cancel_holdings_class_idx
  on public.class_cancel_holdings (class_id);

comment on table public.class_cancel_holdings is
  'Enrolled students snapshotted when a coach submits a class cancellation request.';

create or replace function public.touch_class_cancel_holdings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists class_cancel_holdings_touch_updated_at on public.class_cancel_holdings;
create trigger class_cancel_holdings_touch_updated_at
  before update on public.class_cancel_holdings
  for each row
  execute function public.touch_class_cancel_holdings_updated_at();

create or replace function public._class_cancel_refund_kind(p_class_id uuid, p_account_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.class_payments_escrow e
    where e.class_id = p_class_id
      and e.account_id = p_account_id
      and e.escrow_state = 'in_escrow'
      and e.status = 'approved'
      and e.verified is true
      and e.final_transaction_id is null
  ) then
    return 'cash';
  end if;

  if exists (
    select 1
    from public.account_credit_transactions t
    where t.account_id = p_account_id
      and t.idempotency_key = 'enroll-credit:' || p_class_id::text || ':' || p_account_id::text
  ) then
    return 'credit';
  end if;

  return 'none';
end;
$$;

revoke all on function public._class_cancel_refund_kind(uuid, uuid) from public;

create or replace function public.snapshot_class_cancel_holdings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.request_type is distinct from 'cancellation_request'::public.portal_request_type then
    return new;
  end if;
  if new.target_class_id is null then
    return new;
  end if;

  insert into public.class_cancel_holdings (portal_request_id, class_id, account_id, refund_kind)
  select
    new.id,
    new.target_class_id,
    cs.account_id,
    public._class_cancel_refund_kind(new.target_class_id, cs.account_id)
  from public.class_students cs
  where cs.class_id = new.target_class_id
  on conflict (portal_request_id, account_id) do nothing;

  return new;
end;
$$;

drop trigger if exists portal_requests_snapshot_cancel_holdings on public.portal_requests;
create trigger portal_requests_snapshot_cancel_holdings
  after insert on public.portal_requests
  for each row
  execute function public.snapshot_class_cancel_holdings();

alter table public.class_cancel_holdings enable row level security;

drop policy if exists class_cancel_holdings_select on public.class_cancel_holdings;
create policy class_cancel_holdings_select
  on public.class_cancel_holdings
  for select
  to authenticated
  using (
    public.is_admin_or_dev()
    or public.is_frontdesk()
    or account_id = public.current_account_id()
    or exists (
      select 1
      from public.portal_requests pr
      where pr.id = class_cancel_holdings.portal_request_id
        and pr.requester_account_id = public.current_account_id()
    )
  );

create or replace function public.can_access_class_cancel_holding_request(p_request_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_account_id();
begin
  if v_actor is null then
    return false;
  end if;
  if public.is_admin_or_dev() or public.is_frontdesk() then
    return true;
  end if;
  return exists (
    select 1
    from public.portal_requests pr
    where pr.id = p_request_id
      and pr.requester_account_id = v_actor
      and pr.request_type = 'cancellation_request'::public.portal_request_type
  );
end;
$$;

create or replace function public.list_class_cancel_holdings(p_request_id uuid)
returns table (
  id uuid,
  portal_request_id uuid,
  class_id uuid,
  account_id uuid,
  member_name text,
  member_email text,
  notified_at timestamptz,
  notify_note text,
  outcome text,
  refund_status text,
  refund_kind text,
  refunded_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_access_class_cancel_holding_request(p_request_id) then
    raise exception 'Not allowed to view this holding roster.';
  end if;

  return query
  select
    h.id,
    h.portal_request_id,
    h.class_id,
    h.account_id,
    coalesce(nullif(btrim(pc.name), ''), a.email, 'Member')::text,
    coalesce(a.email, '')::text,
    h.notified_at,
    h.notify_note,
    h.outcome,
    h.refund_status,
    h.refund_kind,
    h.refunded_at
  from public.class_cancel_holdings h
  join public.accounts a on a.id = h.account_id
  left join public.profiles_client pc on pc.account_id = h.account_id
  where h.portal_request_id = p_request_id
  order by coalesce(nullif(btrim(pc.name), ''), a.email);
end;
$$;

revoke all on function public.list_class_cancel_holdings(uuid) from public;
grant execute on function public.list_class_cancel_holdings(uuid) to authenticated;

create or replace function public.mark_class_cancel_holding_notified(
  p_holding_id uuid,
  p_notified boolean default true,
  p_notify_note text default ''
)
returns public.class_cancel_holdings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_account_id();
  v_row public.class_cancel_holdings;
begin
  if v_actor is null then
    raise exception 'Not authenticated.';
  end if;
  if not (public.is_admin_or_dev() or public.is_frontdesk()) then
    raise exception 'Only front desk or admin can mark students notified.';
  end if;

  select * into v_row from public.class_cancel_holdings where id = p_holding_id for update;
  if not found then
    raise exception 'Holding row not found.';
  end if;

  if v_row.outcome is distinct from 'pending_review' then
    raise exception 'Notifications are locked after admin review.';
  end if;

  if p_notified then
    update public.class_cancel_holdings
    set
      notified_at = coalesce(notified_at, now()),
      notified_by = v_actor,
      notify_note = coalesce(trim(p_notify_note), notify_note)
    where id = p_holding_id
    returning * into v_row;
  else
    update public.class_cancel_holdings
    set
      notified_at = null,
      notified_by = null,
      notify_note = coalesce(trim(p_notify_note), notify_note)
    where id = p_holding_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.mark_class_cancel_holding_notified(uuid, boolean, text) from public;
grant execute on function public.mark_class_cancel_holding_notified(uuid, boolean, text) to authenticated;

create or replace function public.mark_class_cancel_holdings_notified_all(
  p_request_id uuid,
  p_notify_note text default ''
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_account_id();
  v_count integer := 0;
begin
  if v_actor is null then
    raise exception 'Not authenticated.';
  end if;
  if not (public.is_admin_or_dev() or public.is_frontdesk()) then
    raise exception 'Only front desk or admin can mark students notified.';
  end if;

  update public.class_cancel_holdings
  set
    notified_at = coalesce(notified_at, now()),
    notified_by = v_actor,
    notify_note = case
      when nullif(btrim(p_notify_note), '') is null then notify_note
      else trim(p_notify_note)
    end
  where portal_request_id = p_request_id
    and outcome = 'pending_review'
    and notified_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_class_cancel_holdings_notified_all(uuid, text) from public;
grant execute on function public.mark_class_cancel_holdings_notified_all(uuid, text) to authenticated;

create or replace function public.count_class_cancel_requests_needing_notify()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not (public.is_admin_or_dev() or public.is_frontdesk()) then
    return 0;
  end if;

  select count(distinct h.portal_request_id)::integer into v_count
  from public.class_cancel_holdings h
  join public.portal_requests pr on pr.id = h.portal_request_id
  where pr.status = 'pending'::public.portal_request_status
    and pr.request_type = 'cancellation_request'::public.portal_request_type
    and h.outcome = 'pending_review'
    and h.notified_at is null;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.count_class_cancel_requests_needing_notify() from public;
grant execute on function public.count_class_cancel_requests_needing_notify() to authenticated;

create or replace function public.count_class_cancel_holdings_pending_refund()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not public.is_admin_or_dev() then
    return 0;
  end if;

  select count(*)::integer into v_count
  from public.class_cancel_holdings h
  where h.refund_status = 'pending';

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.count_class_cancel_holdings_pending_refund() from public;
grant execute on function public.count_class_cancel_holdings_pending_refund() to authenticated;

create or replace function public.stamp_class_cancel_holdings_on_review(
  p_request_id uuid,
  p_outcome text,
  p_cancel_entire_class boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.class_cancel_holdings%rowtype;
begin
  if p_outcome = 'class_cancelled' or coalesce(p_cancel_entire_class, false) then
    for v_row in
      select * from public.class_cancel_holdings
      where portal_request_id = p_request_id
      for update
    loop
      update public.class_cancel_holdings
      set
        outcome = 'class_cancelled',
        refund_kind = public._class_cancel_refund_kind(v_row.class_id, v_row.account_id),
        refund_status = case
          public._class_cancel_refund_kind(v_row.class_id, v_row.account_id)
          when 'none' then 'skipped'
          else 'pending'
        end
      where id = v_row.id;
    end loop;

    delete from public.class_waitlist
    where class_id in (
      select distinct class_id from public.class_cancel_holdings where portal_request_id = p_request_id
    );
    return;
  end if;

  update public.class_cancel_holdings
  set
    outcome = p_outcome,
    refund_status = 'not_applicable'
  where portal_request_id = p_request_id;
end;
$$;

revoke all on function public.stamp_class_cancel_holdings_on_review(uuid, text, boolean) from public;

create or replace function public.mark_class_cancel_holding_refunded(p_holding_id uuid)
returns public.class_cancel_holdings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_account_id();
  v_row public.class_cancel_holdings;
  v_kind text;
  v_escrow uuid;
  v_credit jsonb;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Only admin or dev can complete holding refunds.';
  end if;
  if v_actor is null then
    raise exception 'Not authenticated.';
  end if;

  select * into v_row from public.class_cancel_holdings where id = p_holding_id for update;
  if not found then
    raise exception 'Holding row not found.';
  end if;

  if v_row.outcome is distinct from 'class_cancelled' then
    raise exception 'Refunds are only for cancelled classes.';
  end if;

  if v_row.refund_status = 'completed' then
    return v_row;
  end if;

  if v_row.refund_status is distinct from 'pending' then
    raise exception 'This student is not awaiting a refund.';
  end if;

  v_kind := coalesce(nullif(v_row.refund_kind, 'none'), public._class_cancel_refund_kind(v_row.class_id, v_row.account_id));

  if v_kind = 'cash' then
    select e.id into v_escrow
    from public.class_payments_escrow e
    where e.class_id = v_row.class_id
      and e.account_id = v_row.account_id
      and e.escrow_state = 'in_escrow'
      and e.status = 'approved'
      and e.verified is true
      and e.final_transaction_id is null
    order by e.reviewed_at desc nulls last, e.created_at desc
    limit 1
    for update;

    if v_escrow is not null then
      perform public._mark_escrow_payment_refunded(
        v_escrow,
        now(),
        'Refunded: class cancelled (holding roster).'
      );
    end if;
  elsif v_kind = 'credit' then
    v_credit := public._restore_enrollment_credit(
      v_row.class_id,
      v_row.account_id,
      'Credit restored: class cancelled (holding roster).'
    );
    if not coalesce((v_credit->>'restored')::boolean, false) then
      raise exception 'Could not restore session credit for this member.';
    end if;
  end if;

  delete from public.class_students
  where class_id = v_row.class_id and account_id = v_row.account_id;

  update public.class_cancel_holdings
  set
    refund_status = 'completed',
    refund_kind = v_kind,
    refunded_at = now(),
    refunded_by = v_actor
  where id = p_holding_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.mark_class_cancel_holding_refunded(uuid) from public;
grant execute on function public.mark_class_cancel_holding_refunded(uuid) to authenticated;

-- Close holdings when the coach withdraws.
create or replace function public.withdraw_portal_request(p_request_id uuid)
returns public.portal_requests
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

  update public.portal_requests
  set
    status = 'cancelled'::public.portal_request_status,
    updated_at = now()
  where id = p_request_id
  returning * into v_row;

  if v_row.request_type = 'cancellation_request'::public.portal_request_type then
    update public.class_cancel_holdings
    set
      outcome = 'request_withdrawn',
      refund_status = 'not_applicable'
    where portal_request_id = p_request_id;
  end if;

  return v_row;
end;
$$;

grant execute on function public.withdraw_portal_request(uuid) to authenticated;

create or replace function public.review_portal_request(
  p_request_id uuid,
  p_status public.portal_request_status,
  p_review_note text default '',
  p_replacement_coach_account_id uuid default null,
  p_cancel_entire_class boolean default false
)
returns public.portal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := public.current_account_id();
  v_row public.portal_requests;
  v_prev public.portal_request_status;
  v_result uuid;
  v_payload jsonb := '{}'::jsonb;
  v_refund jsonb;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Only admin or dev can review portal requests.';
  end if;

  if v_reviewer is null then
    raise exception 'Not authenticated.';
  end if;

  select * into v_row from public.portal_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found.';
  end if;

  v_prev := v_row.status;

  if v_prev = 'cancelled'::public.portal_request_status then
    raise exception 'Cancelled requests cannot be reviewed.';
  end if;

  if p_status = v_prev then
    return v_row;
  end if;

  if p_status = 'pending' and v_prev in ('approved', 'rejected') then
    if v_prev = 'approved' then
      if v_row.request_type = 'slot_request' then
        perform public.revert_approved_slot_request(v_row);
      end if;
    end if;
    update public.portal_requests
    set
      status = 'pending',
      review_note = coalesce(trim(p_review_note), review_note),
      reviewed_by = null,
      reviewed_at = null,
      result_class_id = null,
      updated_at = now()
    where id = p_request_id
    returning * into v_row;
    return v_row;
  end if;

  if v_prev <> 'pending' then
    raise exception 'Only pending requests can be approved or rejected.';
  end if;

  if p_status = 'approved' then
    if v_row.request_type = 'member_enrollment_cancellation' then
      if v_row.target_class_id is null then
        raise exception 'Missing target class.';
      end if;
      v_refund := public.refund_member_class_escrow_if_eligible(
        v_row.target_class_id,
        v_row.requester_account_id,
        v_row.created_at,
        coalesce(nullif(btrim(p_review_note), ''), 'Refunded: member cancellation approved.')
      );
      v_result := v_row.target_class_id;
      v_payload := coalesce(v_row.payload, '{}'::jsonb) || jsonb_build_object('escrow_refund', v_refund);
    elsif v_row.request_type = 'slot_request' then
      v_result := public.apply_approved_slot_request(v_row);
      update public.classes
      set
        status_block = 'assigned'::public.class_block_status,
        updated_at = now()
      where id = v_result
        and status_block is distinct from 'assigned'::public.class_block_status;
    elsif v_row.request_type = 'cancellation_request' then
      v_result := public.apply_approved_cancellation_request(
        v_row,
        p_replacement_coach_account_id,
        coalesce(p_cancel_entire_class, false)
      );
      v_payload := coalesce(v_row.payload, '{}'::jsonb)
        || jsonb_build_object(
          'replacement_coach_account_id', p_replacement_coach_account_id,
          'cancel_entire_class', coalesce(p_cancel_entire_class, false)
        );

      if coalesce(p_cancel_entire_class, false) then
        perform public.stamp_class_cancel_holdings_on_review(p_request_id, 'class_cancelled', true);
      elsif p_replacement_coach_account_id is not null then
        perform public.stamp_class_cancel_holdings_on_review(p_request_id, 'coach_replaced', false);
      else
        perform public.stamp_class_cancel_holdings_on_review(p_request_id, 'coach_replaced', false);
      end if;
    else
      raise exception 'Unsupported request type.';
    end if;

    update public.portal_requests
    set
      status = 'approved',
      review_note = coalesce(trim(p_review_note), ''),
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      result_class_id = v_result,
      payload = case
        when v_row.request_type in (
          'cancellation_request'::public.portal_request_type,
          'member_enrollment_cancellation'::public.portal_request_type
        ) then v_payload
        else payload
      end,
      updated_at = now()
    where id = p_request_id
    returning * into v_row;

    return v_row;
  end if;

  if p_status = 'rejected' then
    if v_row.request_type = 'cancellation_request'::public.portal_request_type then
      perform public.stamp_class_cancel_holdings_on_review(p_request_id, 'request_rejected', false);
    end if;

    update public.portal_requests
    set
      status = 'rejected',
      review_note = coalesce(trim(p_review_note), ''),
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      updated_at = now()
    where id = p_request_id
    returning * into v_row;
    return v_row;
  end if;

  raise exception 'Invalid review status transition.';
end;
$$;

grant execute on function public.review_portal_request(
  uuid,
  public.portal_request_status,
  text,
  uuid,
  boolean
) to authenticated;
