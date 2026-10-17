-- Coach portal: enrolled + waitlisted rosters for assigned classes.
-- Coaches can read class_students / class_waitlist rows, but not member accounts/profiles — use SECURITY DEFINER.

create or replace function public.coach_class_enrolled_students(p_class_id uuid)
returns table (
  account_id uuid,
  auth_user_id uuid,
  name text,
  email text,
  photo text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id as account_id,
    a.auth_user_id,
    coalesce(
      nullif(trim(pc.name), ''),
      nullif(trim(concat_ws(' ', pc.first_name, pc.middle_initial, pc.last_name)), ''),
      a.email
    ) as name,
    a.email,
    coalesce(pc.photo, '') as photo
  from public.class_students cs
  join public.accounts a on a.id = cs.account_id
  left join public.profiles_client pc on pc.account_id = a.id
  where cs.class_id = p_class_id
    and (
      public.is_admin_or_dev()
      or public.rls_current_user_is_class_coach(p_class_id)
    )
  order by lower(
    coalesce(
      nullif(trim(pc.name), ''),
      nullif(trim(concat_ws(' ', pc.first_name, pc.middle_initial, pc.last_name)), ''),
      a.email
    )
  );
$$;

comment on function public.coach_class_enrolled_students(uuid) is
  'Enrolled members for a class session; callable by assigned coaches and admin/dev.';

revoke all on function public.coach_class_enrolled_students(uuid) from public;
grant execute on function public.coach_class_enrolled_students(uuid) to authenticated;

create or replace function public.coach_class_waitlisted_students(p_class_id uuid)
returns table (
  account_id uuid,
  auth_user_id uuid,
  name text,
  email text,
  photo text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id as account_id,
    a.auth_user_id,
    coalesce(
      nullif(trim(pc.name), ''),
      nullif(trim(concat_ws(' ', pc.first_name, pc.middle_initial, pc.last_name)), ''),
      a.email
    ) as name,
    a.email,
    coalesce(pc.photo, '') as photo
  from public.class_waitlist cw
  join public.accounts a on a.id = cw.account_id
  left join public.profiles_client pc on pc.account_id = a.id
  where cw.class_id = p_class_id
    and (
      public.is_admin_or_dev()
      or public.rls_current_user_is_class_coach(p_class_id)
    )
  order by cw.joined_at asc;
$$;

comment on function public.coach_class_waitlisted_students(uuid) is
  'Waitlisted members (payment pending) for a class; callable by assigned coaches and admin/dev.';

revoke all on function public.coach_class_waitlisted_students(uuid) from public;
grant execute on function public.coach_class_waitlisted_students(uuid) to authenticated;
