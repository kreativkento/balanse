-- Public coach directory for /coaches (profiles + discipline tags, no emails).
-- Run after 015_coach_disciplines.sql and 019_profile_images_public.sql.

create or replace function public.coach_directory()
returns table (
  account_id uuid,
  auth_user_id uuid,
  display_name text,
  name text,
  staff_type text,
  bio text,
  experience text,
  nationality text,
  photo text,
  cover_image text,
  legacy_classes text[],
  discipline_names text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.account_id,
    a.auth_user_id,
    coalesce(p.display_name, '') as display_name,
    coalesce(p.name, '') as name,
    coalesce(nullif(trim(p.staff_type), ''), 'Coach') as staff_type,
    coalesce(p.bio, '') as bio,
    coalesce(p.experience, '') as experience,
    coalesce(p.nationality, '') as nationality,
    coalesce(p.photo, '') as photo,
    coalesce(p.cover_image, '') as cover_image,
    coalesce(p.classes, '{}'::text[]) as legacy_classes,
    coalesce(
      (
        select array_agg(d.name order by d.name)
        from public.coach_disciplines cd
        join public.disciplines d on d.id = cd.discipline_id
        where cd.account_id = p.account_id
          and coalesce(d.is_active, true)
      ),
      '{}'::text[]
    ) as discipline_names
  from public.profiles_staff p
  join public.accounts a on a.id = p.account_id
  where a.role = 'coach'::public.user_role
  order by
    lower(coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.name), ''), 'coach'));
$$;

comment on function public.coach_directory() is
  'Public coach profiles for /coaches. Includes bio, experience, nationality, images, and discipline names. No emails.';

revoke all on function public.coach_directory() from public;
grant execute on function public.coach_directory() to anon, authenticated;
