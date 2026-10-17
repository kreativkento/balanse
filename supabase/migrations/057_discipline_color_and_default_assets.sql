-- Discipline calendar color + public default_assets bucket (suggested logos, covers, color swatches).
-- Safe to re-run.

alter table public.disciplines
  add column if not exists color_hex text not null default '';

alter table public.disciplines
  drop constraint if exists disciplines_color_hex_format;

alter table public.disciplines
  add constraint disciplines_color_hex_format
  check (color_hex = '' or color_hex ~ '^#[0-9A-Fa-f]{6}$');

comment on column public.disciplines.color_hex is
  'Optional #RRGGBB accent for calendar blocks and discipline chips.';

insert into storage.buckets (id, name, public)
values ('default_assets', 'default_assets', true)
on conflict (id) do nothing;

update storage.buckets
set public = true
where id = 'default_assets'
  and public is distinct from true;

drop policy if exists "default_assets_select_public" on storage.objects;
drop policy if exists "default_assets_insert_admin" on storage.objects;
drop policy if exists "default_assets_update_admin" on storage.objects;
drop policy if exists "default_assets_delete_admin" on storage.objects;

create policy "default_assets_select_public"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'default_assets');

create policy "default_assets_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'default_assets'
    and public.can_manage_discipline_images()
  );

create policy "default_assets_update_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'default_assets'
    and public.can_manage_discipline_images()
  )
  with check (
    bucket_id = 'default_assets'
    and public.can_manage_discipline_images()
  );

create policy "default_assets_delete_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'default_assets'
    and public.can_manage_discipline_images()
  );
