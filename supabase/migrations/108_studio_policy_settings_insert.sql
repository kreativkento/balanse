-- Allow admin upsert when seed row was never inserted (e.g. partial deploy).

drop policy if exists studio_policy_settings_insert_admin on public.studio_policy_settings;
create policy studio_policy_settings_insert_admin
  on public.studio_policy_settings
  for insert
  to authenticated
  with check (public.is_admin_or_dev());
