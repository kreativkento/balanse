-- Allow submitters to delete their own feedback while status is unresolved.
-- Run after 023_feedback.sql. Safe to re-run.
-- Works on public.feedback or public.feedback_system (after 026 rename).

do $$
declare
  v_table text;
begin
  if to_regclass('public.feedback_system') is not null then
    v_table := 'feedback_system';
  elsif to_regclass('public.feedback') is not null then
    v_table := 'feedback';
  else
    raise exception 'Feedback table not found. Run 023_feedback.sql first.';
  end if;

  execute format('drop policy if exists %I on public.%I', 'Feedback delete own unresolved', v_table);
  execute format(
    $sql$
      create policy %I
        on public.%I
        for delete
        to authenticated
        using (
          account_id = public.current_account_id()
          and status = 'unresolved'::public.feedback_status
        )
    $sql$,
    'Feedback delete own unresolved',
    v_table
  );
end $$;
