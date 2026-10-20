-- Allow marketing staff to read/manage gallery_posts (same portal as bulletin).
-- Admin/dev retain access via can_manage_gallery().

create or replace function public.can_manage_gallery()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in (
      'admin'::public.user_role,
      'dev'::public.user_role,
      'marketing'::public.user_role
    ),
    false
  );
$$;

revoke all on function public.can_manage_gallery() from public;
grant execute on function public.can_manage_gallery() to authenticated;

drop policy if exists "Gallery posts select managers" on public.gallery_posts;
drop policy if exists "Gallery posts insert managers" on public.gallery_posts;
drop policy if exists "Gallery posts update managers" on public.gallery_posts;
drop policy if exists "Gallery posts delete managers" on public.gallery_posts;

create policy "Gallery posts select managers"
  on public.gallery_posts
  for select
  to authenticated
  using (public.can_manage_gallery());

create policy "Gallery posts insert managers"
  on public.gallery_posts
  for insert
  to authenticated
  with check (
    public.can_manage_gallery()
    and (created_by is null or created_by = public.current_account_id())
  );

create policy "Gallery posts update managers"
  on public.gallery_posts
  for update
  to authenticated
  using (public.can_manage_gallery())
  with check (public.can_manage_gallery());

create policy "Gallery posts delete managers"
  on public.gallery_posts
  for delete
  to authenticated
  using (public.can_manage_gallery());

drop policy if exists "Gallery media select managers" on public.gallery_post_media;
drop policy if exists "Gallery media insert managers" on public.gallery_post_media;
drop policy if exists "Gallery media update managers" on public.gallery_post_media;
drop policy if exists "Gallery media delete managers" on public.gallery_post_media;

create policy "Gallery media select managers"
  on public.gallery_post_media
  for select
  to authenticated
  using (public.can_manage_gallery());

create policy "Gallery media insert managers"
  on public.gallery_post_media
  for insert
  to authenticated
  with check (public.can_manage_gallery());

create policy "Gallery media update managers"
  on public.gallery_post_media
  for update
  to authenticated
  using (public.can_manage_gallery())
  with check (public.can_manage_gallery());

create policy "Gallery media delete managers"
  on public.gallery_post_media
  for delete
  to authenticated
  using (public.can_manage_gallery());
