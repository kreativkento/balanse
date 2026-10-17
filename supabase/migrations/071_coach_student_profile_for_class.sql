-- Assigned coaches (and admin/dev) may read profiles_client for enrolled or waitlisted students on that class.

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

  -- Full row exposure replaced in 072_coach_student_profile_limited_fields.sql.
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
      'age', case
        when v_profile.birthday is not null
        then extract(year from age(current_date, v_profile.birthday::date))::int
        else null
      end,
      'health_declaration', v_profile.health_declaration
    )
  );
end;
$$;

comment on function public.coach_student_profile_for_class(uuid, uuid) is
  'Coach-safe student profile for a class roster member (no contact, address, emergency, or birthday).';

revoke all on function public.coach_student_profile_for_class(uuid, uuid) from public;
grant execute on function public.coach_student_profile_for_class(uuid, uuid) to authenticated;
