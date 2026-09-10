-- BALANSÉ fold status_discipline into disciplines
-- Run in Supabase Dashboard → SQL Editor after 009_status_discipline.sql.
--
-- Moves the applicable status fields (slug, display name, hue) onto each
-- discipline row and drops the lookup table. id / sort_order / timestamps
-- are not copied: disciplines already has its own.

-- ---------------------------------------------------------------------------
-- 1. Add status columns on disciplines
-- ---------------------------------------------------------------------------

alter table public.disciplines
  add column if not exists status text,
  add column if not exists status_name text,
  add column if not exists status_hue integer;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'status_discipline'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'disciplines'
      and column_name = 'status_id'
  ) then
    update public.disciplines d
    set
      status = coalesce(d.status, s.slug),
      status_name = coalesce(d.status_name, s.name),
      status_hue = coalesce(d.status_hue, s.hue)
    from public.status_discipline s
    where d.status_id = s.id;
  end if;
end
$$;

update public.disciplines
set
  status = case when is_active then 'active' else 'inactive' end,
  status_name = case when is_active then 'Active' else 'Inactive' end,
  status_hue = case when is_active then 142 else 4 end
where status is null
   or status_name is null
   or status_hue is null;

alter table public.disciplines
  alter column status set default 'active',
  alter column status_name set default 'Active',
  alter column status_hue set default 142;

alter table public.disciplines
  alter column status set not null,
  alter column status_name set not null,
  alter column status_hue set not null;

alter table public.disciplines
  drop constraint if exists disciplines_status_slug_format,
  drop constraint if exists disciplines_status_name_nonempty,
  drop constraint if exists disciplines_status_hue_range;

alter table public.disciplines
  add constraint disciplines_status_slug_format
    check (status ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  add constraint disciplines_status_name_nonempty
    check (char_length(trim(status_name)) > 0),
  add constraint disciplines_status_hue_range
    check (status_hue >= 0 and status_hue <= 360);

comment on column public.disciplines.status is
  'Lifecycle slug formerly stored on status_discipline (e.g. active, inactive).';

comment on column public.disciplines.status_name is
  'Display label for the discipline status (e.g. Active).';

comment on column public.disciplines.status_hue is
  'HSL hue (0–360) used to render the status indicator color in the UI.';

create index if not exists disciplines_status_idx
  on public.disciplines (status, sort_order, name);

-- ---------------------------------------------------------------------------
-- 2. Keep is_active aligned with status
-- ---------------------------------------------------------------------------

create or replace function public.sync_discipline_is_active_from_status()
returns trigger
language plpgsql
as $$
begin
  new.is_active := (new.status = 'active');
  return new;
end;
$$;

drop trigger if exists disciplines_sync_is_active on public.disciplines;

create trigger disciplines_sync_is_active
  before insert or update of status on public.disciplines
  for each row
  execute function public.sync_discipline_is_active_from_status();

update public.disciplines
set is_active = (status = 'active')
where is_active is distinct from (status = 'active');

-- ---------------------------------------------------------------------------
-- 3. Public RLS uses the inlined status column
-- ---------------------------------------------------------------------------

drop policy if exists "Disciplines select active public" on public.disciplines;

create policy "Disciplines select active public"
  on public.disciplines
  for select
  to anon, authenticated
  using (status = 'active');

-- ---------------------------------------------------------------------------
-- 4. Drop status_id and the status_discipline lookup
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'disciplines'
      and column_name = 'status_id'
  ) then
    alter table public.disciplines alter column status_id drop default;
  end if;
end
$$;

drop function if exists public.default_active_discipline_status_id();
drop index if exists public.disciplines_status_id_idx;

alter table public.disciplines
  drop column if exists status_id;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'status_discipline'
  ) then
    drop trigger if exists status_discipline_touch_updated_at on public.status_discipline;
  end if;
end
$$;

drop function if exists public.touch_status_discipline_updated_at();
drop table if exists public.status_discipline;
