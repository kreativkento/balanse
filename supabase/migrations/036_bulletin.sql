-- BALANSÉ community bulletin
-- Admin/dev/frontend/marketing CRUD. Non-admin posts need admin_approved
-- before they appear. Public site (/bulletin) sees is_public + approved only.
-- Safe to re-run.
--
-- Audience (visibility):
--   public     — everyone, including the public page
--   private    — internal (members + staff), not the public page
--   staff      — staff only (no members)
--   user       — members only
--   coach      — coaches only
--   marketing  — marketing only
--   frontdesk  — frontend / front desk only
-- Admin and dev can read every post (not used as audience targets).

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.bulletin_post_type as enum (
    'Event',
    'Promo',
    'Announcement',
    'Update'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.bulletin_visibility as enum (
    'public',
    'private',
    'staff',
    'user',
    'coach',
    'marketing',
    'frontdesk'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Table
-- ---------------------------------------------------------------------------

create table if not exists public.bulletin_posts (
  id uuid primary key default gen_random_uuid(),
  uid text unique,

  title text not null
    check (char_length(btrim(title)) > 0 and char_length(title) <= 200),
  body text not null
    check (char_length(btrim(body)) > 0 and char_length(body) <= 8000),

  category public.bulletin_post_type not null,
  visibility public.bulletin_visibility not null default 'public',
  is_public boolean generated always as (visibility = 'public'::public.bulletin_visibility) stored,
  admin_approved boolean not null default false,

  pinned boolean not null default false,

  image_path text,
  attachment_path text,
  attachment_name text,
  attachment_mime text,

  created_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bulletin_posts add column if not exists uid text;
alter table public.bulletin_posts add column if not exists admin_approved boolean not null default false;

comment on table public.bulletin_posts is
  'Studio bulletin posts. is_public is derived from visibility = public. Live posts also require admin_approved.';

comment on column public.bulletin_posts.uid is
  'Short public reference: B-YYYYMMxxx (Philippines date). xxx resets to 001 each month.';

comment on column public.bulletin_posts.visibility is
  'Audience tag: public, private (internal), staff, or a single role.';

comment on column public.bulletin_posts.is_public is
  'True when visibility is public. Only these rows appear on /bulletin.';

comment on column public.bulletin_posts.admin_approved is
  'True when an admin posted it or an admin approved it. Required before the post goes live.';

comment on column public.bulletin_posts.image_path is
  'Cover image object path in the bulletin_resources bucket.';

comment on column public.bulletin_posts.attachment_path is
  'Optional file object path in the bulletin_resources bucket.';

update public.bulletin_posts
set uid = 'TMP-' || replace(id::text, '-', '')
where uid is null or btrim(uid) = '';

create unique index if not exists bulletin_posts_uid_idx on public.bulletin_posts (uid);
create index if not exists bulletin_posts_created_at_idx on public.bulletin_posts (created_at desc);
create index if not exists bulletin_posts_category_idx on public.bulletin_posts (category);
create index if not exists bulletin_posts_visibility_idx on public.bulletin_posts (visibility);
create index if not exists bulletin_posts_is_public_idx on public.bulletin_posts (is_public);
create index if not exists bulletin_posts_admin_approved_idx on public.bulletin_posts (admin_approved);
create index if not exists bulletin_posts_pinned_idx on public.bulletin_posts (pinned);

create or replace function public.tg_bulletin_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.bulletin_next_uid(p_at timestamptz default now())
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stamp text;
  v_prefix text;
  v_seq integer;
begin
  v_stamp := to_char(timezone('Asia/Manila', p_at), 'YYYYMM');
  v_prefix := 'B-' || v_stamp;

  perform pg_advisory_xact_lock(hashtext('bulletin_uid_' || v_stamp));

  select coalesce(max(right(uid, 3)::integer), 0) + 1
  into v_seq
  from public.bulletin_posts
  where uid ~ ('^' || v_prefix || '[0-9]{3}$');

  return v_prefix || lpad(v_seq::text, 3, '0');
end;
$$;

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
    if auth.uid() is not null then
      new.admin_approved := public.is_admin();
    end if;
  elsif not public.is_admin() then
    new.admin_approved := false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bulletin_updated_at on public.bulletin_posts;
create trigger trg_bulletin_updated_at
  before update on public.bulletin_posts
  for each row
  execute function public.tg_bulletin_set_updated_at();

drop trigger if exists trg_bulletin_uid_approval on public.bulletin_posts;
create trigger trg_bulletin_uid_approval
  before insert or update on public.bulletin_posts
  for each row
  execute function public.tg_bulletin_assign_uid_and_approval();

revoke all on function public.bulletin_next_uid(timestamptz) from public;

do $$
declare
  r record;
begin
  for r in
    select id, created_at
    from public.bulletin_posts
    where uid is null or uid !~ '^B-[0-9]{9}$'
    order by created_at, id
  loop
    update public.bulletin_posts
    set uid = public.bulletin_next_uid(r.created_at)
    where id = r.id;
  end loop;
end;
$$;

alter table public.bulletin_posts alter column uid set not null;

drop sequence if exists public.bulletin_post_uid_seq;

-- ---------------------------------------------------------------------------
-- 3. Access helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_bulletin()
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
      'frontdesk'::public.user_role,
      'marketing'::public.user_role
    ),
    false
  );
$$;

create or replace function public.can_read_bulletin_visibility(
  p_visibility public.bulletin_visibility
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when p_visibility = 'public'::public.bulletin_visibility then true
      when public.current_user_role() in (
        'admin'::public.user_role,
        'dev'::public.user_role
      ) then true
      when p_visibility = 'private'::public.bulletin_visibility
        then public.current_user_role() is not null
      when p_visibility = 'staff'::public.bulletin_visibility
        then public.current_user_role() in (
          'coach'::public.user_role,
          'admin'::public.user_role,
          'dev'::public.user_role,
          'frontdesk'::public.user_role,
          'marketing'::public.user_role
        )
      when p_visibility = 'user'::public.bulletin_visibility
        then public.current_user_role() = 'user'::public.user_role
      when p_visibility = 'coach'::public.bulletin_visibility
        then public.current_user_role() = 'coach'::public.user_role
      when p_visibility = 'marketing'::public.bulletin_visibility
        then public.current_user_role() = 'marketing'::public.user_role
      when p_visibility = 'frontdesk'::public.bulletin_visibility
        then public.current_user_role() = 'frontdesk'::public.user_role
      else false
    end;
$$;

revoke all on function public.can_manage_bulletin() from public;
revoke all on function public.can_read_bulletin_visibility(public.bulletin_visibility) from public;
grant execute on function public.can_manage_bulletin() to authenticated;
grant execute on function public.can_read_bulletin_visibility(public.bulletin_visibility) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

alter table public.bulletin_posts enable row level security;

drop policy if exists "Bulletin select public" on public.bulletin_posts;
drop policy if exists "Bulletin select audience" on public.bulletin_posts;
drop policy if exists "Bulletin select managers" on public.bulletin_posts;
drop policy if exists "Bulletin insert managers" on public.bulletin_posts;
drop policy if exists "Bulletin update managers" on public.bulletin_posts;
drop policy if exists "Bulletin delete managers" on public.bulletin_posts;

create policy "Bulletin select public"
  on public.bulletin_posts
  for select
  to anon, authenticated
  using (is_public and admin_approved);

create policy "Bulletin select audience"
  on public.bulletin_posts
  for select
  to authenticated
  using (
    admin_approved
    and public.can_read_bulletin_visibility(visibility)
  );

create policy "Bulletin select managers"
  on public.bulletin_posts
  for select
  to authenticated
  using (public.can_manage_bulletin());

create policy "Bulletin insert managers"
  on public.bulletin_posts
  for insert
  to authenticated
  with check (
    public.can_manage_bulletin()
    and (created_by is null or created_by = public.current_account_id())
  );

create policy "Bulletin update managers"
  on public.bulletin_posts
  for update
  to authenticated
  using (public.can_manage_bulletin())
  with check (
    public.can_manage_bulletin()
    and (not admin_approved or public.is_admin())
  );

create policy "Bulletin delete managers"
  on public.bulletin_posts
  for delete
  to authenticated
  using (public.can_manage_bulletin());

grant select on table public.bulletin_posts to anon, authenticated;
grant insert, update, delete on table public.bulletin_posts to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bulletin_resources',
  'bulletin_resources',
  true,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

update storage.buckets
set
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
where id = 'bulletin_resources';

drop policy if exists "bulletin_resources_select_public" on storage.objects;
drop policy if exists "bulletin_resources_insert_managers" on storage.objects;
drop policy if exists "bulletin_resources_update_managers" on storage.objects;
drop policy if exists "bulletin_resources_delete_managers" on storage.objects;

-- Paths: {post_id}/cover.{ext} and {post_id}/attachment/{filename}
create policy "bulletin_resources_select_public"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'bulletin_resources');

create policy "bulletin_resources_insert_managers"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'bulletin_resources'
    and public.can_manage_bulletin()
  );

create policy "bulletin_resources_update_managers"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'bulletin_resources'
    and public.can_manage_bulletin()
  )
  with check (
    bucket_id = 'bulletin_resources'
    and public.can_manage_bulletin()
  );

create policy "bulletin_resources_delete_managers"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'bulletin_resources'
    and public.can_manage_bulletin()
  );

-- ---------------------------------------------------------------------------
-- 6. Seed sample public posts (skip if any already exist)
-- ---------------------------------------------------------------------------

insert into public.bulletin_posts (title, body, category, visibility, pinned, admin_approved)
select *
from (
  values
    (
      'Summer Grand Open Mat — Free Community Session!',
      'Celebrate summer with BALANSÉ! On June 21, we''re opening our studio doors for a free Community Open Mat session from 8:00 AM to 11:00 AM. Expect a fun-filled morning of mixed movement classes, partner drills, and a light refreshment break. Bring a friend and experience BALANSÉ together.',
      'Event'::public.bulletin_post_type,
      'public'::public.bulletin_visibility,
      true,
      true
    ),
    (
      'Referral Promo: Bring a Friend, Get 20% Off',
      'We''re celebrating our growing community! When you refer a new member who signs up for a Gold or Silver membership in July 2026, both you and your friend will receive 20% off your next billing cycle. No limits on referrals — the more friends you bring, the more you save!',
      'Promo'::public.bulletin_post_type,
      'public'::public.bulletin_visibility,
      true,
      true
    ),
    (
      'New Class: Capoeira Beginners — Starting August',
      'Exciting news! Starting August 4, we are introducing a beginner-friendly Capoeira track every Monday and Thursday at 6:00 PM. Coach Rex will guide new students through the fundamentals of movement, music, and Ginga. Class size is limited to 10 — reserve your spot through the booking system.',
      'Announcement'::public.bulletin_post_type,
      'public'::public.bulletin_visibility,
      false,
      true
    ),
    (
      'Studio Renovation: Temporary Schedule Adjustments',
      'We''re investing in a better experience for you! Studio 2 will undergo flooring upgrades from July 28 to July 30, 2026. During this period, all affected classes will be rescheduled to Studio 1 or the outdoor courtyard. Specific schedule adjustments will be reflected on the class calendar. We apologize for the inconvenience and appreciate your patience.',
      'Update'::public.bulletin_post_type,
      'public'::public.bulletin_visibility,
      false,
      true
    ),
    (
      'Silver Membership Flash Sale — This Weekend Only',
      'This weekend only — July 26 and 27 — sign up for a Silver Membership at the special rate of ₱2,800/month instead of the regular ₱3,600/month. This offer is available to new members only, and only while slots last. Lock in your rate and start your wellness journey with BALANSÉ today!',
      'Promo'::public.bulletin_post_type,
      'public'::public.bulletin_visibility,
      true,
      true
    ),
    (
      'Coach Jodi Returns from International Yoga Retreat',
      'We''re thrilled to welcome Coach Jodi back! She recently completed a 21-day immersive yoga teacher training retreat in Ubud, Bali. Expect fresh flows, deeper breath-work techniques, and new restorative sequences in her upcoming Yoga classes. Her first class back is Monday, August 3 at 8:00 AM.',
      'Announcement'::public.bulletin_post_type,
      'public'::public.bulletin_visibility,
      false,
      true
    )
) as seed(title, body, category, visibility, pinned, admin_approved)
where not exists (select 1 from public.bulletin_posts limit 1);
