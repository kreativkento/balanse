-- Repair public signup: auth.users → accounts + profiles_client.
-- Run if /auth/v1/signup returns 500 ("Database error saving new user").
-- Safe to re-run.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_first_name text;
  v_last_name text;
  v_middle_initial text;
  v_name text;
begin
  v_first_name := coalesce(new.raw_user_meta_data->>'first_name', '');
  v_last_name := coalesce(new.raw_user_meta_data->>'last_name', '');
  v_middle_initial := coalesce(new.raw_user_meta_data->>'middle_initial', '');

  v_name := trim(both from concat_ws(
    ' ',
    nullif(v_first_name, ''),
    case when v_middle_initial <> '' then v_middle_initial || '.' else null end,
    nullif(v_last_name, '')
  ));

  if v_name = '' then
    v_name := split_part(new.email, '@', 1);
  end if;

  insert into public.accounts (auth_user_id, email, role)
  values (new.id, new.email, 'user'::public.user_role)
  returning id into v_account_id;

  insert into public.profiles_client (
    account_id,
    first_name,
    last_name,
    middle_initial,
    name
  )
  values (
    v_account_id,
    v_first_name,
    v_last_name,
    v_middle_initial,
    v_name
  );

  return new;
exception
  when others then
    raise exception 'handle_new_user failed for %: %', new.email, sqlerrm;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- System-log trigger runs on accounts / profiles_client inserts during signup.
-- Ensure RLS does not block the security-definer writer.
create or replace function public.tg_write_log_system()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor jsonb := public.log_actor_snapshot();
  v_table text := tg_table_name;
  v_before jsonb;
  v_after jsonb;
  v_row jsonb;
begin
  perform set_config('row_security', 'off', true);

  if tg_op = 'INSERT' then
    v_before := null;
    v_after := public.sanitize_log_system_row(v_table, to_jsonb(new));
    v_row := v_after;
  elsif tg_op = 'UPDATE' then
    v_before := public.sanitize_log_system_row(v_table, to_jsonb(old));
    v_after := public.sanitize_log_system_row(v_table, to_jsonb(new));
    v_row := v_after;
  else
    v_before := public.sanitize_log_system_row(v_table, to_jsonb(old));
    v_after := null;
    v_row := v_before;
  end if;

  insert into public.log_system (
    action,
    table_name,
    record_id,
    record_label,
    account_id,
    actor_account_id,
    actor_email,
    actor_role,
    before_data,
    after_data,
    changed_fields,
    metadata,
    source
  ) values (
    public.log_system_action(v_table, tg_op, v_before, v_after),
    v_table,
    public.log_system_row_id(v_table, v_row),
    public.log_system_row_label(v_table, v_row),
    public.log_system_row_account_id(v_table, v_row),
    nullif(v_actor->>'account_id', '')::uuid,
    v_actor->>'email',
    nullif(v_actor->>'role', '')::public.user_role,
    v_before,
    v_after,
    case
      when tg_op = 'UPDATE' then public.jsonb_object_diff(v_before, v_after)
      else '{}'::jsonb
    end,
    jsonb_build_object('op', tg_op),
    'trigger'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
