-- Coaches: limited student profile + roster (no email, phone, address, emergency, or raw birthday).

create or replace function public.coach_student_profile_for_class(
  p_class_id uuid,
  p_account_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_on_roster boolean;
  v_account public.accounts%rowtype;
  v_profile public.profiles_client%rowtype;
  v_age int;
begin
  if p_class_id is null or p_account_id is null then
    raise exception 'Class and student are required.';
  end if;

  if not (
    public.is_admin_or_dev()
    or public.rls_current_user_is_class_coach(p_class_id)
  ) then
    raise exception 'Not authorized.';
  end if;

  select (
    exists (
      select 1 from public.class_students cs
      where cs.class_id = p_class_id and cs.account_id = p_account_id
    )
    or exists (
      select 1 from public.class_waitlist cw
      where cw.class_id = p_class_id and cw.account_id = p_account_id
    )
  ) into v_on_roster;

  if not v_on_roster and not public.is_admin_or_dev() then
    raise exception 'Student is not enrolled or waitlisted for this class.';
  end if;

  select * into v_account
  from public.accounts
  where id = p_account_id and role = 'user'::public.user_role;

  if not found then
    raise exception 'Student account not found.';
  end if;

  select * into v_profile
  from public.profiles_client
  where account_id = p_account_id;

  if not found then
    raise exception 'Student profile not found.';
  end if;

  v_age := null;
  if v_profile.birthday is not null then
    v_age := extract(year from age(current_date, v_profile.birthday::date))::int;
  end if;

  return jsonb_build_object(
    'account', jsonb_build_object(
      'id', v_account.id,
      'auth_user_id', v_account.auth_user_id,
      'created_at', v_account.created_at
    ),
    'profile', jsonb_build_object(
      'name', v_profile.name,
      'first_name', v_profile.first_name,
      'middle_initial', v_profile.middle_initial,
      'last_name', v_profile.last_name,
      'nickname', v_profile.nickname,
      'photo', v_profile.photo,
      'nationality', v_profile.nationality,
      'sex', v_profile.sex,
      'height', v_profile.height,
      'age', v_age,
      'health_declaration', v_profile.health_declaration
    )
  );
end;
$$;

comment on function public.coach_student_profile_for_class(uuid, uuid) is
  'Coach-safe student profile for a class roster member (no contact, address, emergency, or birthday).';

drop function if exists public.coach_class_enrolled_students(uuid);

create function public.coach_class_enrolled_students(p_class_id uuid)
returns table (
  account_id uuid,
  auth_user_id uuid,
  name text,
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
      'Member'
    ) as name,
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
      'Member'
    )
  );
$$;

comment on function public.coach_class_enrolled_students(uuid) is
  'Enrolled members for a class session; coach-safe (no email).';

revoke all on function public.coach_class_enrolled_students(uuid) from public;
grant execute on function public.coach_class_enrolled_students(uuid) to authenticated;

drop function if exists public.coach_class_waitlisted_students(uuid);

create function public.coach_class_waitlisted_students(p_class_id uuid)
returns table (
  account_id uuid,
  auth_user_id uuid,
  name text,
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
      'Member'
    ) as name,
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
  'Waitlisted members for a class; coach-safe (no email).';

revoke all on function public.coach_class_waitlisted_students(uuid) from public;
grant execute on function public.coach_class_waitlisted_students(uuid) to authenticated;
