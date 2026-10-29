-- Bulletin: only accounts.role = admin auto-approves or can keep approval.
-- Frontdesk / marketing / dev posts start pending and return to pending on content edits.

create or replace function public.is_studio_admin()
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

comment on function public.is_studio_admin() is
  'True only for accounts.role = admin. Frontdesk, marketing, and dev are not studio admins.';

create or replace function public.tg_bulletin_assign_uid_and_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  content_changed boolean;
begin
  if tg_op = 'INSERT' and (new.uid is null or btrim(new.uid) = '' or new.uid !~ '^B-[0-9]{9}$') then
    new.uid := public.bulletin_next_uid(coalesce(new.created_at, now()));
  end if;

  if tg_op = 'INSERT' then
    new.admin_approved := public.is_studio_admin();
    return new;
  end if;

  if public.is_studio_admin() then
    return new;
  end if;

  content_changed :=
    new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.category is distinct from old.category
    or new.visibility is distinct from old.visibility
    or new.pinned is distinct from old.pinned
    or new.posted_at is distinct from old.posted_at
    or new.active_until is distinct from old.active_until
    or new.image_path is distinct from old.image_path
    or new.attachment_path is distinct from old.attachment_path
    or new.attachment_name is distinct from old.attachment_name
    or new.attachment_mime is distinct from old.attachment_mime
    or new.admin_approved is distinct from old.admin_approved;

  -- Content edits and approval attempts by non-admins go pending.
  -- Automatic is_active expiry keeps the previous approval flag.
  if content_changed then
    new.admin_approved := false;
  else
    new.admin_approved := old.admin_approved;
  end if;

  return new;
end;
$$;

drop policy if exists "Bulletin update managers" on public.bulletin_posts;

create policy "Bulletin update managers"
  on public.bulletin_posts
  for update
  to authenticated
  using (public.can_manage_bulletin())
  with check (
    public.can_manage_bulletin()
    and (not admin_approved or public.is_studio_admin())
  );
