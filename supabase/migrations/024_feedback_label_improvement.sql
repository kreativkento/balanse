-- Rename feedback_label enum value: recommendation → improvement
-- Run after 023_feedback.sql if that file was already applied with 'recommendation'.
-- Safe to re-run. New installs that used the updated 023 already have 'improvement'.

do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'feedback_label'
      and e.enumlabel = 'recommendation'
  ) then
    alter type public.feedback_label rename value 'recommendation' to 'improvement';
  end if;
end $$;
