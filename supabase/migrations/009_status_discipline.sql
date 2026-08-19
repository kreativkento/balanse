-- BALANSÉ discipline status options
-- Run in Supabase Dashboard → SQL Editor (after 008_disciplines.sql).
--
-- Replaces the boolean is_active flag with a lookup table so status labels
-- and indicator colors can be managed dynamically (hue stored per status).

-- ---------------------------------------------------------------------------
-- 1. Status lookup table
-- ---------------------------------------------------------------------------

create table if not exists public.status_discipline (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  hue integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint status_discipline_name_nonempty check (char_length(trim(name)) > 0),
  constraint status_discipline_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint status_discipline_hue_range check (hue >= 0 and hue <= 360)
);

comment on table public.status_discipline is
  'Lookup table for discipline lifecycle states (Active, Inactive, etc.).';

comment on column public.status_discipline.name is
  'Display label shown in admin UI and public surfaces (e.g. Active).';

comment on column public.status_discipline.slug is
  'Stable code-friendly key (e.g. active, inactive).';

comment on column public.status_discipline.hue is
  'HSL hue (0–360) used to render the status indicator color in the UI.';

create unique index if not exists status_discipline_name_unique_idx
  on public.status_discipline (lower(name));

create unique index if not exists status_discipline_slug_unique_idx
  on public.status_discipline (slug);

create index if not exists status_discipline_sort_idx
  on public.status_discipline (sort_order, name);

-- ---------------------------------------------------------------------------
-- 2. updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.touch_status_discipline_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists status_discipline_touch_updated_at on public.status_discipline;

create trigger status_discipline_touch_updated_at
  before update on public.status_discipline
  for each row
  execute function public.touch_status_discipline_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Link disciplines → status_discipline
-- ---------------------------------------------------------------------------

alter table public.disciplines
  add column if not exists status_id uuid references public.status_discipline (id);

create index if not exists disciplines_status_id_idx
  on public.disciplines (status_id);

-- ---------------------------------------------------------------------------
-- 4. Seed statuses (idempotent by slug)
-- ---------------------------------------------------------------------------

insert into public.status_discipline (name, slug, hue, sort_order)
values
  ('Active',   'active',   142, 10),
  ('Inactive', 'inactive',   4, 20)
on conflict (slug) do update
set
  name = excluded.name,
  hue = excluded.hue,
  sort_order = excluded.sort_order;

-- Backfill existing discipline rows
update public.disciplines d
set status_id = s.id
from public.status_discipline s
where d.status_id is null
  and s.slug = case when d.is_active then 'active' else 'inactive' end;

-- Default new disciplines to Active
create or replace function public.default_active_discipline_status_id()
returns uuid
language sql
stable
as $$
  select id from public.status_discipline where slug = 'active' limit 1
$$;

alter table public.disciplines
  alter column status_id set default public.default_active_discipline_status_id();

update public.disciplines
set status_id = (select id from public.status_discipline where slug = 'active' limit 1)
where status_id is null;

alter table public.disciplines
  alter column status_id set not null;

comment on column public.disciplines.status_id is
  'Foreign key to status_discipline; replaces the legacy is_active boolean.';

-- Keep is_active aligned for legacy queries until fully removed
create or replace function public.sync_discipline_is_active_from_status()
returns trigger
language plpgsql
as $$
begin
  select (s.slug = 'active')
  into new.is_active
  from public.status_discipline s
  where s.id = new.status_id;

  return new;
end;
$$;

drop trigger if exists disciplines_sync_is_active on public.disciplines;

create trigger disciplines_sync_is_active
  before insert or update of status_id on public.disciplines
  for each row
  execute function public.sync_discipline_is_active_from_status();

-- ---------------------------------------------------------------------------
-- 5. Row Level Security — status_discipline
-- ---------------------------------------------------------------------------

alter table public.status_discipline enable row level security;

drop policy if exists "Status discipline select public" on public.status_discipline;
drop policy if exists "Status discipline select admin coach dev" on public.status_discipline;
drop policy if exists "Status discipline insert admin dev" on public.status_discipline;
drop policy if exists "Status discipline update admin dev" on public.status_discipline;
drop policy if exists "Status discipline delete admin dev" on public.status_discipline;

create policy "Status discipline select public"
  on public.status_discipline
  for select
  to anon, authenticated
  using (true);

create policy "Status discipline insert admin dev"
  on public.status_discipline
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy "Status discipline update admin dev"
  on public.status_discipline
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy "Status discipline delete admin dev"
  on public.status_discipline
  for delete
  to authenticated
  using (public.is_admin_or_dev());

-- ---------------------------------------------------------------------------
-- 6. Refresh disciplines RLS to use status_id
-- ---------------------------------------------------------------------------

drop policy if exists "Disciplines select active public" on public.disciplines;

create policy "Disciplines select active public"
  on public.disciplines
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.status_discipline sd
      where sd.id = disciplines.status_id
        and sd.slug = 'active'
    )
  );
