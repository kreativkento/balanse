-- BALANSÉ disciplines catalog
-- Run in Supabase Dashboard → SQL Editor (after 001_profiles.sql).
--
-- Purpose:
--   Dynamic list of gym disciplines used as tags on events (and elsewhere).
--   Admins/devs can add, rename, reorder, or soft-disable disciplines without
--   shipping a new frontend build.
--
-- Future event tagging:
--   Prefer a junction table, e.g.
--     event_disciplines (event_id uuid references events(id), discipline_id uuid references disciplines(id))
--   so one event can have many disciplines and discipline rows stay stable by id.

-- ---------------------------------------------------------------------------
-- 1. Disciplines table
-- ---------------------------------------------------------------------------

create table if not exists public.disciplines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text not null default '',
  logo_url text not null default '',
  image_url text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint disciplines_name_nonempty check (char_length(trim(name)) > 0),
  constraint disciplines_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- Upgrade path if an earlier draft of this table already exists
alter table public.disciplines add column if not exists description text not null default '';
alter table public.disciplines add column if not exists logo_url text not null default '';
alter table public.disciplines add column if not exists image_url text not null default '';
alter table public.disciplines add column if not exists sort_order integer not null default 0;
alter table public.disciplines add column if not exists is_active boolean not null default true;
alter table public.disciplines add column if not exists created_at timestamptz not null default now();
alter table public.disciplines add column if not exists updated_at timestamptz not null default now();

comment on table public.disciplines is
  'Gym discipline catalog. Use id (stable) when tagging events; name/slug may change over time.';

comment on column public.disciplines.name is
  'Display title of the discipline (e.g. Mat Pilates, Kickboxing Kids).';

comment on column public.disciplines.slug is
  'URL- and code-friendly unique key derived from name (e.g. mat-pilates, jiu-jutsu-kids).';

comment on column public.disciplines.description is
  'Short marketing or listing copy shown with the discipline.';

comment on column public.disciplines.logo_url is
  'URL for the discipline logo/icon (small mark used in tags, pickers, chips).';

comment on column public.disciplines.image_url is
  'URL for the main discipline image (cards, detail headers, class listings).';

comment on column public.disciplines.is_active is
  'Soft flag: inactive disciplines stay on historical event tags but are hidden from new pickers.';

comment on column public.disciplines.sort_order is
  'Display order in admin/public pickers (lower first).';

create unique index if not exists disciplines_name_unique_idx
  on public.disciplines (lower(name));

create unique index if not exists disciplines_slug_unique_idx
  on public.disciplines (slug);

create index if not exists disciplines_active_sort_idx
  on public.disciplines (is_active, sort_order, name);

-- ---------------------------------------------------------------------------
-- 2. updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.touch_discipline_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists disciplines_touch_updated_at on public.disciplines;

create trigger disciplines_touch_updated_at
  before update on public.disciplines
  for each row
  execute function public.touch_discipline_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.disciplines enable row level security;

drop policy if exists "Disciplines select active public" on public.disciplines;
drop policy if exists "Disciplines select all admin coach dev" on public.disciplines;
drop policy if exists "Disciplines insert admin dev" on public.disciplines;
drop policy if exists "Disciplines update admin dev" on public.disciplines;
drop policy if exists "Disciplines delete admin dev" on public.disciplines;

-- Anyone (including anon) can read active disciplines for public class/event UIs.
create policy "Disciplines select active public"
  on public.disciplines
  for select
  to anon, authenticated
  using (is_active = true);

-- Coaches/admins/devs can also see inactive rows (admin management + tagging history).
create policy "Disciplines select all admin coach dev"
  on public.disciplines
  for select
  to authenticated
  using (
    public.is_dev()
    or public.is_admin()
    or public.current_user_role() = 'coach'::public.user_role
  );

create policy "Disciplines insert admin dev"
  on public.disciplines
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy "Disciplines update admin dev"
  on public.disciplines
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy "Disciplines delete admin dev"
  on public.disciplines
  for delete
  to authenticated
  using (public.is_admin_or_dev());

-- ---------------------------------------------------------------------------
-- 4. Seed initial disciplines (idempotent by slug)
-- ---------------------------------------------------------------------------

insert into public.disciplines (name, slug, sort_order)
values
  ('Calisthenics',       'calisthenics',        10),
  ('Animal Flow',        'animal-flow',         20),
  ('Kickboxing',         'kickboxing',          30),
  ('Circuit Training',   'circuit-training',    40),
  ('Mat Pilates',        'mat-pilates',         50),
  ('Groundworks',        'groundworks',         60),
  ('Yoga',               'yoga',                70),
  ('Capoeira',           'capoeira',            80),
  ('Dance Basics',       'dance-basics',        90),
  ('Dance Fitness',      'dance-fitness',      100),
  ('Jiu Jutsu Kids',     'jiu-jutsu-kids',     110),
  ('Calisthenics Kids',  'calisthenics-kids',  120),
  ('Kickboxing Kids',    'kickboxing-kids',    130)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;
