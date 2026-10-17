-- Studio gallery posts (admin-managed, public featured slices).
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.gallery_tag as enum (
    'Studio',
    'Classes',
    'Events',
    'Community'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.gallery_media_kind as enum ('image', 'video');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.gallery_posts (
  id uuid primary key default gen_random_uuid(),

  caption text not null
    check (char_length(btrim(caption)) > 0 and char_length(caption) <= 500),

  tag public.gallery_tag not null default 'Studio',

  featured_in_gallery boolean not null default false,
  featured_in_home_studio boolean not null default false,

  masonry_tall boolean not null default false,

  created_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gallery_posts is
  'Gallery posts. Public site reads rows featured_in_gallery (studio page) or featured_in_home_studio with tag Studio (home).';

comment on column public.gallery_posts.featured_in_gallery is
  'When true, post may appear on the public studio gallery section.';

comment on column public.gallery_posts.featured_in_home_studio is
  'When true and tag is Studio, post may appear on the public home studio section.';

create table if not exists public.gallery_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gallery_posts (id) on delete cascade,
  sort_order integer not null check (sort_order >= 0),
  storage_path text not null,
  media_kind public.gallery_media_kind not null,
  created_at timestamptz not null default now(),
  unique (post_id, sort_order)
);

create index if not exists gallery_posts_created_at_idx
  on public.gallery_posts (created_at desc);

create index if not exists gallery_posts_tag_idx
  on public.gallery_posts (tag);

create index if not exists gallery_posts_featured_gallery_idx
  on public.gallery_posts (featured_in_gallery)
  where featured_in_gallery;

create index if not exists gallery_posts_featured_home_idx
  on public.gallery_posts (featured_in_home_studio)
  where featured_in_home_studio;

create index if not exists gallery_post_media_post_id_idx
  on public.gallery_post_media (post_id, sort_order);

-- ---------------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------------

create or replace function public.tg_gallery_posts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists gallery_posts_set_updated_at on public.gallery_posts;
create trigger gallery_posts_set_updated_at
  before update on public.gallery_posts
  for each row
  execute function public.tg_gallery_posts_set_updated_at();

create or replace function public.tg_gallery_posts_enforce_home_studio()
returns trigger
language plpgsql
as $$
begin
  if new.featured_in_home_studio and new.tag is distinct from 'Studio'::public.gallery_tag then
    new.featured_in_home_studio := false;
  end if;
  return new;
end;
$$;

drop trigger if exists gallery_posts_enforce_home_studio on public.gallery_posts;
create trigger gallery_posts_enforce_home_studio
  before insert or update on public.gallery_posts
  for each row
  execute function public.tg_gallery_posts_enforce_home_studio();

create or replace function public.gallery_post_is_public(p_post public.gallery_posts)
returns boolean
language sql
stable
as $$
  select
    p_post.featured_in_gallery
    or (
      p_post.featured_in_home_studio
      and p_post.tag = 'Studio'::public.gallery_tag
    );
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

alter table public.gallery_posts enable row level security;
alter table public.gallery_post_media enable row level security;

drop policy if exists "Gallery posts select public" on public.gallery_posts;
drop policy if exists "Gallery posts select managers" on public.gallery_posts;
drop policy if exists "Gallery posts insert managers" on public.gallery_posts;
drop policy if exists "Gallery posts update managers" on public.gallery_posts;
drop policy if exists "Gallery posts delete managers" on public.gallery_posts;

create policy "Gallery posts select public"
  on public.gallery_posts
  for select
  to anon, authenticated
  using (public.gallery_post_is_public(gallery_posts));

create policy "Gallery posts select managers"
  on public.gallery_posts
  for select
  to authenticated
  using (public.is_admin_or_dev());

create policy "Gallery posts insert managers"
  on public.gallery_posts
  for insert
  to authenticated
  with check (
    public.is_admin_or_dev()
    and (created_by is null or created_by = public.current_account_id())
  );

create policy "Gallery posts update managers"
  on public.gallery_posts
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy "Gallery posts delete managers"
  on public.gallery_posts
  for delete
  to authenticated
  using (public.is_admin_or_dev());

drop policy if exists "Gallery media select public" on public.gallery_post_media;
drop policy if exists "Gallery media select managers" on public.gallery_post_media;
drop policy if exists "Gallery media insert managers" on public.gallery_post_media;
drop policy if exists "Gallery media update managers" on public.gallery_post_media;
drop policy if exists "Gallery media delete managers" on public.gallery_post_media;

create policy "Gallery media select public"
  on public.gallery_post_media
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.gallery_posts p
      where p.id = gallery_post_media.post_id
        and public.gallery_post_is_public(p)
    )
  );

create policy "Gallery media select managers"
  on public.gallery_post_media
  for select
  to authenticated
  using (public.is_admin_or_dev());

create policy "Gallery media insert managers"
  on public.gallery_post_media
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy "Gallery media update managers"
  on public.gallery_post_media
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy "Gallery media delete managers"
  on public.gallery_post_media
  for delete
  to authenticated
  using (public.is_admin_or_dev());

-- ---------------------------------------------------------------------------
-- 5. Storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery_media',
  'gallery_media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gallery_media_select_public" on storage.objects;
drop policy if exists "gallery_media_insert_managers" on storage.objects;
drop policy if exists "gallery_media_update_managers" on storage.objects;
drop policy if exists "gallery_media_delete_managers" on storage.objects;

create policy "gallery_media_select_public"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'gallery_media');

create policy "gallery_media_insert_managers"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'gallery_media'
    and public.is_admin_or_dev()
  );

create policy "gallery_media_update_managers"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'gallery_media'
    and public.is_admin_or_dev()
  )
  with check (
    bucket_id = 'gallery_media'
    and public.is_admin_or_dev()
  );

create policy "gallery_media_delete_managers"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'gallery_media'
    and public.is_admin_or_dev()
  );
