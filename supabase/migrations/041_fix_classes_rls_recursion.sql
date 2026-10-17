-- Break RLS recursion: classes ↔ class_coaches ↔ class_students policies
-- referenced each other via EXISTS subqueries.

create or replace function public.rls_class_is_published(p_class_id uuid)
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
      and c.status = 'published'::public.class_status
  );
$$;

create or replace function public.rls_current_user_is_class_coach(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.class_coaches cc
    where cc.class_id = p_class_id
      and cc.account_id = public.current_account_id()
  );
$$;

create or replace function public.rls_current_user_is_class_student(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.class_students cs
    where cs.class_id = p_class_id
      and cs.account_id = public.current_account_id()
  );
$$;

revoke all on function public.rls_class_is_published(uuid) from public;
revoke all on function public.rls_current_user_is_class_coach(uuid) from public;
revoke all on function public.rls_current_user_is_class_student(uuid) from public;

grant execute on function public.rls_class_is_published(uuid) to authenticated, anon;
grant execute on function public.rls_current_user_is_class_coach(uuid) to authenticated;
grant execute on function public.rls_current_user_is_class_student(uuid) to authenticated;

-- classes
drop policy if exists "Classes select admin coach enrolled" on public.classes;

create policy "Classes select admin coach enrolled"
  on public.classes
  for select
  to authenticated
  using (
    public.is_admin_or_dev()
    or public.rls_current_user_is_class_coach(classes.id)
    or public.rls_current_user_is_class_student(classes.id)
  );

-- class_coaches
drop policy if exists "Class coaches select related" on public.class_coaches;

create policy "Class coaches select related"
  on public.class_coaches
  for select
  to authenticated
  using (
    public.is_admin_or_dev()
    or account_id = public.current_account_id()
    or public.rls_class_is_published(class_coaches.class_id)
    or public.rls_current_user_is_class_student(class_coaches.class_id)
  );

-- class_students
drop policy if exists "Class students select related" on public.class_students;

create policy "Class students select related"
  on public.class_students
  for select
  to authenticated
  using (
    public.is_admin_or_dev()
    or account_id = public.current_account_id()
    or public.rls_current_user_is_class_coach(class_students.class_id)
  );
