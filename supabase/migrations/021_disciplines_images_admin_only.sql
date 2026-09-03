-- disciplines_images: public website can view; only role = admin can change.
-- Safe to re-run. Run after 020_disciplines_images.sql.

create or replace function public.can_manage_discipline_images()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role = 'admin'::public.user_role
      from public.accounts
      where auth_user_id = auth.uid()
    ),
    false
  );
$$;

comment on function public.can_manage_discipline_images() is
  'True only for accounts.role = admin. Used by disciplines_images storage write policies.';

revoke all on function public.can_manage_discipline_images() from public;
grant execute on function public.can_manage_discipline_images() to authenticated;

insert into storage.buckets (id, name, public)
values ('disciplines_images', 'disciplines_images', true)
on conflict (id) do nothing;

update storage.buckets
set public = true
where id = 'disciplines_images'
  and public is distinct from true;

drop policy if exists "disciplines_images_select_public" on storage.objects;
drop policy if exists "disciplines_images_insert_admin" on storage.objects;
drop policy if exists "disciplines_images_update_admin" on storage.objects;
drop policy if exists "disciplines_images_delete_admin" on storage.objects;

create policy "disciplines_images_select_public"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'disciplines_images');

create policy "disciplines_images_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'disciplines_images'
    and public.can_manage_discipline_images()
  );

create policy "disciplines_images_update_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'disciplines_images'
    and public.can_manage_discipline_images()
  )
  with check (
    bucket_id = 'disciplines_images'
    and public.can_manage_discipline_images()
  );

create policy "disciplines_images_delete_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'disciplines_images'
    and public.can_manage_discipline_images()
  );
