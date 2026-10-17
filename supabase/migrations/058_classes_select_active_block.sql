-- Members (and public) can read Active timeblocks on the class schedule calendar.
-- Complements "Classes select published public" (status_class = open).
-- Safe to re-run.

drop policy if exists "Classes select active block public" on public.classes;

create policy "Classes select active block public"
  on public.classes
  for select
  to anon, authenticated
  using (status_block = 'active'::public.class_block_status);

create or replace function public.rls_class_is_active_block(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and c.status_block = 'active'::public.class_block_status
  );
$$;

revoke all on function public.rls_class_is_active_block(uuid) from public;
grant execute on function public.rls_class_is_active_block(uuid) to anon, authenticated;

drop policy if exists "Class coaches select active block" on public.class_coaches;
create policy "Class coaches select active block"
  on public.class_coaches
  for select
  to anon, authenticated
  using (public.rls_class_is_active_block(class_coaches.class_id));

drop policy if exists "Class students select active block" on public.class_students;
create policy "Class students select active block"
  on public.class_students
  for select
  to anon, authenticated
  using (public.rls_class_is_active_block(class_students.class_id));
