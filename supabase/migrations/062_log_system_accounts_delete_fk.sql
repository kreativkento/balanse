-- Fix audit log on accounts DELETE: row is gone before insert, so account_id FK must be null.
-- Keeps subject in record_id / before_data. Safe to re-run.

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
  v_subject_account_id uuid;
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

  v_subject_account_id := public.log_system_row_account_id(v_table, v_row);

  -- After DELETE on accounts, the id no longer exists for log_system.account_id FK.
  if tg_op = 'DELETE' and v_table = 'accounts' then
    v_subject_account_id := null;
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
    v_subject_account_id,
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
