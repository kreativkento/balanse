-- Align FK constraint names with class_payments_escrow (table rename in 109 did not rename constraints).
-- Helps PostgREST schema cache and explicit embed hints.

do $$
begin
  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'class_payments_escrow'
      and c.conname = 'class_payments_account_id_fkey'
  ) then
    alter table public.class_payments_escrow
      rename constraint class_payments_account_id_fkey to class_payments_escrow_account_id_fkey;
  end if;

  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'class_payments_escrow'
      and c.conname = 'class_payments_class_id_fkey'
  ) then
    alter table public.class_payments_escrow
      rename constraint class_payments_class_id_fkey to class_payments_escrow_class_id_fkey;
  end if;

  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'class_payments_escrow'
      and c.conname = 'class_payments_payment_channel_id_fkey'
  ) then
    alter table public.class_payments_escrow
      rename constraint class_payments_payment_channel_id_fkey
      to class_payments_escrow_payment_channel_id_fkey;
  end if;

  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'class_payments_escrow'
      and c.conname = 'class_payments_reviewed_by_fkey'
  ) then
    alter table public.class_payments_escrow
      rename constraint class_payments_reviewed_by_fkey to class_payments_escrow_reviewed_by_fkey;
  end if;
end
$$;
