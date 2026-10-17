-- Staff/coaches: read full studio class schedule (same rows as admin calendar).
-- Run after 041_fix_classes_rls_recursion.sql and 042_class_status_block.sql.

create or replace function public.rls_current_user_is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.accounts a
    where a.id = public.current_account_id()
      and public.is_staff_role(a.role)
  );
$$;

revoke all on function public.rls_current_user_is_staff() from public;
grant execute on function public.rls_current_user_is_staff() to authenticated;

drop policy if exists "Classes select staff schedule" on public.classes;
create policy "Classes select staff schedule"
  on public.classes
  for select
  to authenticated
  using (public.rls_current_user_is_staff());

drop policy if exists "Class coaches select staff schedule" on public.class_coaches;
create policy "Class coaches select staff schedule"
  on public.class_coaches
  for select
  to authenticated
  using (public.rls_current_user_is_staff());

drop policy if exists "Class students select staff schedule" on public.class_students;
create policy "Class students select staff schedule"
  on public.class_students
  for select
  to authenticated
  using (public.rls_current_user_is_staff());
