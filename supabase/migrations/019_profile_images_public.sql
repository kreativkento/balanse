-- Harden profile_images storage policies and expose coach images to every visitor.
-- Safe to re-run. Run after 018_profile_images.sql.

-- ---------------------------------------------------------------------------
-- 1. Storage RLS — own folder via storage.foldername, plus admin/dev manage all
-- ---------------------------------------------------------------------------

drop policy if exists "profile_images_select_public" on storage.objects;
drop policy if exists "profile_images_insert_own_or_admin" on storage.objects;
drop policy if exists "profile_images_update_own_or_admin" on storage.objects;
drop policy if exists "profile_images_delete_own_or_admin" on storage.objects;
drop policy if exists "profile_images_insert_own" on storage.objects;
drop policy if exists "profile_images_update_own" on storage.objects;
drop policy if exists "profile_images_delete_own" on storage.objects;
drop policy if exists "profile_images_insert_admin" on storage.objects;
drop policy if exists "profile_images_update_admin" on storage.objects;
drop policy if exists "profile_images_delete_admin" on storage.objects;

create policy "profile_images_select_public"
  on storage.objects
  for select
  using (bucket_id = 'profile_images');

create policy "profile_images_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile_images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_images_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile_images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile_images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_images_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile_images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_images_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile_images'
    and (public.is_dev() or public.is_admin())
  );

create policy "profile_images_update_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile_images'
    and (public.is_dev() or public.is_admin())
  )
  with check (
    bucket_id = 'profile_images'
    and (public.is_dev() or public.is_admin())
  );

create policy "profile_images_delete_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile_images'
    and (public.is_dev() or public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- 2. Public coach images (no emails) so /coaches can show stored bucket files
-- ---------------------------------------------------------------------------

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
  where a.role = 'coach'::public.user_role;
$$;

comment on function public.coach_directory_images() is
  'Public coach photo/cover URLs from profiles_staff + profile_images. No emails.';

revoke all on function public.coach_directory_images() from public;
grant execute on function public.coach_directory_images() to anon, authenticated;
