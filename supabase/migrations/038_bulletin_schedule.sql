-- Bulletin scheduling + live status.
-- created_at = when the row was created
-- posted_at  = when the post goes live (future = scheduled)
-- active_until = when the post expires
-- is_active  = stored active/inactive flag; auto-cleared when active_until is reached
-- Safe to re-run.

alter table public.bulletin_posts
  add column if not exists posted_at timestamptz;

alter table public.bulletin_posts
  add column if not exists active_until timestamptz;

alter table public.bulletin_posts
  add column if not exists is_active boolean;

update public.bulletin_posts
set posted_at = created_at
where posted_at is null;

update public.bulletin_posts
set is_active = true
where is_active is null;

alter table public.bulletin_posts
  alter column posted_at set default now();

alter table public.bulletin_posts
  alter column posted_at set not null;

alter table public.bulletin_posts
  alter column is_active set default true;

alter table public.bulletin_posts
  alter column is_active set not null;

do $$
begin
  alter table public.bulletin_posts
    add constraint bulletin_posts_active_until_after_posted_chk
    check (active_until is null or active_until > posted_at);
exception
  when duplicate_object then null;
end $$;

comment on column public.bulletin_posts.posted_at is
  'When the post becomes live. Future values schedule the post.';

comment on column public.bulletin_posts.active_until is
  'When the post expires. Null means it stays live until is_active is turned off.';

comment on column public.bulletin_posts.is_active is
  'Stored active/inactive flag. Automatically set false when active_until is reached.';

create index if not exists bulletin_posts_posted_at_idx on public.bulletin_posts (posted_at desc);
create index if not exists bulletin_posts_active_until_idx on public.bulletin_posts (active_until);
create index if not exists bulletin_posts_is_active_idx on public.bulletin_posts (is_active);

create or replace function public.tg_bulletin_sync_is_active()
returns trigger
language plpgsql
as $$
begin
  if new.active_until is not null and new.active_until <= now() then
    new.is_active := false;
  end if;
  return new;
end;
$$;

drop trigger if exists bulletin_posts_sync_is_active on public.bulletin_posts;
create trigger bulletin_posts_sync_is_active
  before insert or update of posted_at, active_until, is_active
  on public.bulletin_posts
  for each row
  execute function public.tg_bulletin_sync_is_active();

update public.bulletin_posts
set is_active = false
where is_active = true
  and active_until is not null
  and active_until <= now();

-- A post is never published without admin approval.
-- Admin authors default to approved; everyone else starts pending.
create or replace function public.tg_bulletin_assign_uid_and_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and (new.uid is null or btrim(new.uid) = '' or new.uid !~ '^B-[0-9]{9}$') then
    new.uid := public.bulletin_next_uid(coalesce(new.created_at, now()));
  end if;

  if tg_op = 'INSERT' then
    new.admin_approved := public.is_admin();
  elsif not public.is_admin() then
    new.admin_approved := false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bulletin_uid_approval on public.bulletin_posts;
create trigger trg_bulletin_uid_approval
  before insert or update on public.bulletin_posts
  for each row
  execute function public.tg_bulletin_assign_uid_and_approval();

drop function if exists public.bulletin_is_active(boolean, timestamptz, timestamptz);

create or replace function public.bulletin_is_active(
  p_admin_approved boolean,
  p_is_active boolean,
  p_posted_at timestamptz,
  p_active_until timestamptz
)
returns boolean
language sql
stable
as $$
  select p_admin_approved
    and p_is_active
    and p_posted_at <= now()
    and (p_active_until is null or p_active_until > now());
$$;

revoke all on function public.bulletin_is_active(boolean, boolean, timestamptz, timestamptz) from public;
grant execute on function public.bulletin_is_active(boolean, boolean, timestamptz, timestamptz) to anon, authenticated;

drop policy if exists "Bulletin select public" on public.bulletin_posts;
drop policy if exists "Bulletin select audience" on public.bulletin_posts;

create policy "Bulletin select public"
  on public.bulletin_posts
  for select
  to anon, authenticated
  using (
    is_public
    and admin_approved
    and public.bulletin_is_active(admin_approved, is_active, posted_at, active_until)
  );

create policy "Bulletin select audience"
  on public.bulletin_posts
  for select
  to authenticated
  using (
    public.can_read_bulletin_visibility(visibility)
    and public.bulletin_is_active(admin_approved, is_active, posted_at, active_until)
  );
