-- Staff active/inactive flag (admin staffing directory + public coach directory).
-- Safe to re-run.

alter table public.profiles_staff
  add column if not exists is_active boolean;

update public.profiles_staff
set is_active = true
where is_active is null;

alter table public.profiles_staff
  alter column is_active set default true;

alter table public.profiles_staff
  alter column is_active set not null;

comment on column public.profiles_staff.is_active is
  'When false, staff is inactive (hidden from public coach directory; shown as inactive in admin).';

create index if not exists profiles_staff_is_active_idx on public.profiles_staff (is_active);

-- Active coaches only on the public site
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
    and p.is_active = true
  order by
    lower(coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.name), ''), 'coach'));
$$;

create or replace function public.coach_directory_images()
returns table (
  first_name text,
  photo text,
  cover_image text,
  auth_user_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    split_part(
      coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.name), ''), 'Coach'),
      ' ',
      1
    ) as first_name,
    coalesce(p.photo, '') as photo,
    coalesce(p.cover_image, '') as cover_image,
    a.auth_user_id
  from public.profiles_staff p
  join public.accounts a on a.id = p.account_id
  where a.role = 'coach'::public.user_role
    and p.is_active = true;
$$;
