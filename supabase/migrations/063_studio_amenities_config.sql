-- Public studio page: admin-selected amenity labels (icons/labels defined in app catalog).
-- Safe to re-run.

create table if not exists public.studio_amenities_config (
  id smallint primary key default 1 check (id = 1),
  selected_labels text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

comment on table public.studio_amenities_config is
  'Singleton: labels from studio-amenities catalog shown on /studio amenities section. Empty array = show full catalog (app default).';

insert into public.studio_amenities_config (id, selected_labels)
values (1, '{}'::text[])
on conflict (id) do nothing;

create or replace function public.tg_studio_amenities_config_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists studio_amenities_config_touch_updated_at on public.studio_amenities_config;
create trigger studio_amenities_config_touch_updated_at
  before update on public.studio_amenities_config
  for each row
  execute function public.tg_studio_amenities_config_touch_updated_at();

alter table public.studio_amenities_config enable row level security;

drop policy if exists studio_amenities_config_select_public on public.studio_amenities_config;
drop policy if exists studio_amenities_config_insert_admin on public.studio_amenities_config;
drop policy if exists studio_amenities_config_update_admin on public.studio_amenities_config;

create policy studio_amenities_config_select_public
  on public.studio_amenities_config
  for select
  to anon, authenticated
  using (true);

create policy studio_amenities_config_insert_admin
  on public.studio_amenities_config
  for insert
  to authenticated
  with check (public.can_manage_discipline_images());

create policy studio_amenities_config_update_admin
  on public.studio_amenities_config
  for update
  to authenticated
  using (public.can_manage_discipline_images())
  with check (public.can_manage_discipline_images());
