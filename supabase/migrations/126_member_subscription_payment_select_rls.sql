-- Align member subscription payment reads with class_payments_escrow (own account only).

drop policy if exists subscription_package_payments_escrow_select_own
  on public.subscription_package_payments_escrow;

create policy subscription_package_payments_escrow_select_own
  on public.subscription_package_payments_escrow for select to authenticated
  using (account_id = public.current_account_id());

drop policy if exists subscription_package_final_transactions_select_own
  on public.subscription_package_final_transactions;

create policy subscription_package_final_transactions_select_own
  on public.subscription_package_final_transactions for select to authenticated
  using (account_id = public.current_account_id());
