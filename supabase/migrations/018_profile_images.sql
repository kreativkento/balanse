-- Profile + cover images in the existing `profile_images` storage bucket.
-- Used by all account types (client and staff/ops).
--
-- Run after 017_profiles_staff_nationality.sql.
-- The `profile_images` bucket is expected to already exist; this file
-- is a no-op if it does, and creates it if missing.

-- ---------------------------------------------------------------------------
-- 1. Profile columns
-- ---------------------------------------------------------------------------

alter table public.profiles_client
  add column if not exists photo text not null default '',
  add column if not exists cover_image text not null default '';

alter table public.profiles_staff
  add column if not exists cover_image text not null default '';

comment on column public.profiles_client.photo is
  'Public URL of the client profile photo in the profile_images bucket.';
comment on column public.profiles_client.cover_image is
  'Public URL of the client cover image in the profile_images bucket.';
comment on column public.profiles_staff.photo is
  'Public URL of the staff profile photo in the profile_images bucket.';
comment on column public.profiles_staff.cover_image is
  'Public URL of the staff cover image in the profile_images bucket.';

-- ---------------------------------------------------------------------------
-- 2. Copy images when an account moves between client ↔ staff
-- ---------------------------------------------------------------------------

create or replace function public.sync_profiles_on_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_first text;
  v_last text;
  v_middle text;
  v_nationality text;
  v_photo text;
  v_cover text;
begin
  if tg_op <> 'UPDATE' or old.role is not distinct from new.role then
    return new;
  end if;

  -- user → staff/ops: move client → staff
  if old.role = 'user'::public.user_role and public.is_staff_role(new.role) then
    select
      first_name,
      last_name,
      middle_initial,
      coalesce(nullif(trim(name), ''), new.email),
      coalesce(nationality, ''),
      coalesce(photo, ''),
      coalesce(cover_image, '')
    into v_first, v_last, v_middle, v_name, v_nationality, v_photo, v_cover
    from public.profiles_client
    where account_id = new.id;

    if found then
      insert into public.profiles_staff (
        account_id, first_name, last_name, middle_initial, name, display_name,
        nationality, photo, cover_image, staff_type
      )
      values (
        new.id,
        coalesce(v_first, ''),
        coalesce(v_last, ''),
        coalesce(v_middle, ''),
        v_name,
        v_name,
        coalesce(v_nationality, ''),
        coalesce(v_photo, ''),
        coalesce(v_cover, ''),
        initcap(new.role::text)
      )
      on conflict (account_id) do update
      set
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        middle_initial = excluded.middle_initial,
        name = excluded.name,
        display_name = excluded.display_name,
        nationality = excluded.nationality,
        photo = excluded.photo,
        cover_image = excluded.cover_image;

      delete from public.profiles_client where account_id = new.id;
    end if;

  -- staff/ops → user: move staff → client
  elsif public.is_staff_role(old.role) and new.role = 'user'::public.user_role then
    select
      first_name,
      last_name,
      middle_initial,
      coalesce(nullif(trim(name), ''), new.email),
      coalesce(nationality, ''),
      coalesce(photo, ''),
      coalesce(cover_image, '')
    into v_first, v_last, v_middle, v_name, v_nationality, v_photo, v_cover
    from public.profiles_staff
    where account_id = new.id;

    if found then
      insert into public.profiles_client (
        account_id, first_name, last_name, middle_initial, name,
        nationality, photo, cover_image
      )
      values (
        new.id,
        coalesce(v_first, ''),
        coalesce(v_last, ''),
        coalesce(v_middle, ''),
        v_name,
        coalesce(v_nationality, ''),
        coalesce(v_photo, ''),
        coalesce(v_cover, '')
      )
      on conflict (account_id) do update
      set
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        middle_initial = excluded.middle_initial,
        name = excluded.name,
        nationality = excluded.nationality,
        photo = excluded.photo,
        cover_image = excluded.cover_image;

      delete from public.profiles_staff where account_id = new.id;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Storage bucket (reuse existing profile_images)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('profile_images', 'profile_images', true)
on conflict (id) do nothing;

-- Profile/cover URLs are rendered in the app, so the bucket must be public.
update storage.buckets
set public = true
where id = 'profile_images'
  and public is distinct from true;

-- ---------------------------------------------------------------------------
-- 4. Storage RLS — own folder `{auth_user_id}/photo|cover.*`, admins manage all
-- ---------------------------------------------------------------------------

drop policy if exists "profile_images_select_public" on storage.objects;
drop policy if exists "profile_images_insert_own_or_admin" on storage.objects;
drop policy if exists "profile_images_update_own_or_admin" on storage.objects;
drop policy if exists "profile_images_delete_own_or_admin" on storage.objects;

create policy "profile_images_select_public"
  on storage.objects
  for select
  using (bucket_id = 'profile_images');

create policy "profile_images_insert_own_or_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile_images'
    and (
      public.is_dev()
      or public.is_admin()
      or name like (auth.uid()::text || '/%')
    )
  );

create policy "profile_images_update_own_or_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile_images'
    and (
      public.is_dev()
      or public.is_admin()
      or name like (auth.uid()::text || '/%')
    )
  )
  with check (
    bucket_id = 'profile_images'
    and (
      public.is_dev()
      or public.is_admin()
      or name like (auth.uid()::text || '/%')
    )
  );

create policy "profile_images_delete_own_or_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile_images'
    and (
      public.is_dev()
      or public.is_admin()
      or name like (auth.uid()::text || '/%')
    )
  );
