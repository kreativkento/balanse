-- Rename profiles_client.medical_history → health_declaration and drop
-- boolean flags that can be derived from real profile data.
--
-- Run after 027_profiles_client_location_emergency.sql.
--
-- Changes:
--   • medical_history → health_declaration (JSON questionnaire + acknowledgment)
--   • Drop health_declaration_signed (stored as health_declaration.acknowledged)
--   • Drop share_availability
--   • Drop profile_complete

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles_client'
      and column_name = 'medical_history'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles_client'
      and column_name = 'health_declaration'
  ) then
    alter table public.profiles_client rename column medical_history to health_declaration;
  end if;
end $$;

-- Keep previously signed declarations by writing acknowledged: true into JSON.
do $$
declare
  r record;
  merged jsonb;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles_client'
      and column_name = 'health_declaration_signed'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles_client'
      and column_name = 'health_declaration'
  ) then
    return;
  end if;

  for r in
    select id, health_declaration
    from public.profiles_client
    where health_declaration_signed is true
  loop
    begin
      if coalesce(trim(r.health_declaration), '') = '' then
        merged := '{"acknowledged":true}'::jsonb;
      else
        merged := r.health_declaration::jsonb || '{"acknowledged":true}'::jsonb;
      end if;
    exception
      when others then
        merged := jsonb_build_object('details', r.health_declaration, 'acknowledged', true);
    end;

    update public.profiles_client
    set health_declaration = merged::text
    where id = r.id;
  end loop;
end $$;

alter table public.profiles_client
  drop column if exists health_declaration_signed,
  drop column if exists share_availability,
  drop column if exists profile_complete;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles_client'
      and column_name = 'health_declaration'
  ) then
    comment on column public.profiles_client.health_declaration is
      'JSON health declaration: questionnaire answers, extra details, and acknowledgment.';
  end if;
end $$;

-- Redact PHI in profile_logs snapshots. Harmless if 900_system_logs.sql is not installed yet.
create or replace function public.sanitize_profile_log_row(row_data jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when row_data is null then null
    else (
      row_data
      - 'health_declaration_signed'
      - 'share_availability'
      - 'profile_complete'
      - 'medical_history'
    ) || jsonb_build_object(
      'health_declaration',
      case
        when coalesce(
          row_data->>'health_declaration',
          row_data->>'medical_history',
          ''
        ) = '' then ''
        else '[REDACTED]'
      end
    )
  end;
$$;

do $$
begin
  if to_regclass('public.profile_logs') is not null then
    comment on table public.profile_logs is
      'Append-only audit of profiles_client and profiles_staff changes. health_declaration is redacted in snapshots.';
  end if;
end $$;
