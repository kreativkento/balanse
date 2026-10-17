-- Persist member physical-receipt preference on enrollment (copied from class_payments on approve).

alter table public.class_students
  add column if not exists wants_physical_receipt boolean not null default false;

comment on column public.class_students.wants_physical_receipt is
  'Member requested a printed receipt at the studio when paying for this class.';

-- Backfill from approved payments where enrollment already exists.
update public.class_students cs
set wants_physical_receipt = true
from (
  select distinct on (cp.class_id, cp.account_id)
    cp.class_id,
    cp.account_id,
    cp.request_physical_receipt
  from public.class_payments cp
  where cp.status = 'approved'
    and cp.request_physical_receipt = true
  order by cp.class_id, cp.account_id, cp.reviewed_at desc nulls last, cp.created_at desc
) latest
where cs.class_id = latest.class_id
  and cs.account_id = latest.account_id;

create or replace function public.admin_review_class_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_review_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := public.current_account_id();
  v_payment public.class_payments%rowtype;
  v_class public.classes%rowtype;
  v_enrolled integer;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Not authorized.';
  end if;

  select * into v_payment from public.class_payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.';
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'Payment is already reviewed.';
  end if;

  if p_approve then
    select * into v_class from public.classes where id = v_payment.class_id for update;
    select count(*)::integer into v_enrolled from public.class_students where class_id = v_payment.class_id;
    if v_class.class_limit is not null and v_class.class_limit > 0 and v_enrolled >= v_class.class_limit then
      raise exception 'Class is full; cannot approve enrollment.';
    end if;

    update public.class_payments
    set
      status = 'approved',
      verified = true,
      review_note = coalesce(p_review_note, ''),
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      receipt_issued_at = coalesce(receipt_issued_at, now())
    where id = p_payment_id;

    insert into public.class_students (class_id, account_id, enrolled_by, wants_physical_receipt)
    values (
      v_payment.class_id,
      v_payment.account_id,
      v_reviewer,
      coalesce(v_payment.request_physical_receipt, false)
    )
    on conflict (class_id, account_id) do update
      set wants_physical_receipt = excluded.wants_physical_receipt;

    delete from public.class_waitlist
    where class_id = v_payment.class_id and account_id = v_payment.account_id;

    return jsonb_build_object('status', 'approved', 'verified', true);
  end if;

  update public.class_payments
  set
    status = 'rejected',
    verified = false,
    review_note = coalesce(p_review_note, ''),
    reviewed_by = v_reviewer,
    reviewed_at = now()
  where id = p_payment_id;

  delete from public.class_waitlist
  where class_id = v_payment.class_id and account_id = v_payment.account_id;

  return jsonb_build_object('status', 'rejected', 'verified', false);
end;
$$;

revoke all on function public.admin_review_class_payment(uuid, boolean, text) from public;
grant execute on function public.admin_review_class_payment(uuid, boolean, text) to authenticated;
