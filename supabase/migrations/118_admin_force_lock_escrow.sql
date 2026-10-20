-- Admin override: lock a held drop-in and issue an official receipt before the cancellation window.

create or replace function public.admin_force_lock_escrow_payment(p_escrow_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original timestamptz;
  v_final uuid;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Not authorized.';
  end if;

  select e.class_starts_at into v_original
  from public.class_payments_escrow e
  where e.id = p_escrow_id
  for update;

  if not found then
    raise exception 'Escrow payment not found.';
  end if;

  update public.class_payments_escrow
  set class_starts_at = now() - interval '1 minute'
  where id = p_escrow_id
    and escrow_state = 'in_escrow'::public.payment_escrow_state
    and status = 'approved'
    and verified is true
    and final_transaction_id is null;

  if not found then
    raise exception 'Only held drop-in payments can be force-locked.';
  end if;

  v_final := public._finalize_escrow_payment_impl(p_escrow_id);

  update public.class_payments_escrow
  set class_starts_at = v_original
  where id = p_escrow_id;

  update public.final_transactions
  set class_starts_at = v_original
  where id = v_final;

  return v_final;
end;
$$;

revoke all on function public.admin_force_lock_escrow_payment(uuid) from public;
grant execute on function public.admin_force_lock_escrow_payment(uuid) to authenticated;
