-- Escrow vs final OR: rename class_payments → class_payments_escrow, add final_transactions.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_escrow_state') then
    create type public.payment_escrow_state as enum (
      'pending_review',
      'in_escrow',
      'finalized',
      'rejected',
      'refunded'
    );
  end if;
end
$$;

-- 1) Rename escrow table (FKs from class_waitlist follow the rename).
alter table if exists public.class_payments rename to class_payments_escrow;

alter index if exists class_payments_pkey rename to class_payments_escrow_pkey;
alter index if exists class_payments_uid_key rename to class_payments_escrow_uid_key;
alter index if exists class_payments_status_idx rename to class_payments_escrow_status_idx;
alter index if exists class_payments_class_id_idx rename to class_payments_escrow_class_id_idx;
alter index if exists class_payments_account_id_idx rename to class_payments_escrow_account_id_idx;
alter index if exists class_payments_created_at_idx rename to class_payments_escrow_created_at_idx;
alter index if exists class_payments_payment_channel_id_idx rename to class_payments_escrow_payment_channel_id_idx;
alter index if exists class_payments_one_pending_per_class_account rename to class_payments_escrow_one_pending_per_class_account;

drop trigger if exists class_payments_touch_updated_at on public.class_payments_escrow;
create trigger class_payments_escrow_touch_updated_at
  before update on public.class_payments_escrow
  for each row
  execute function public.touch_class_payments_updated_at();

comment on table public.class_payments_escrow is
  'Enrollment payments in escrow (refund-eligible until refundable_until). Official receipts use final_transactions.';

alter table public.class_payments_escrow
  add column if not exists escrow_state public.payment_escrow_state,
  add column if not exists refundable_until timestamptz,
  add column if not exists final_transaction_id uuid,
  add column if not exists finalized_at timestamptz;

-- 2) Final transactions (BIR OR snapshot + receipt artifacts).
create table if not exists public.final_transactions (
  id uuid primary key default gen_random_uuid(),
  escrow_payment_id uuid not null unique references public.class_payments_escrow (id) on delete restrict,
  uid text not null unique,

  class_id uuid not null references public.classes (id) on delete restrict,
  account_id uuid not null references public.accounts (id) on delete cascade,

  payment_channel_id uuid not null references public.payment_channels (id) on delete restrict,
  payment_method_label text not null default '',
  payment_reference text not null default '',

  currency text not null default 'PHP',
  quantity integer not null default 1 check (quantity >= 1),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  amount_paid numeric(12, 2) not null check (amount_paid >= 0),
  total_amount_due numeric(12, 2) not null check (total_amount_due >= 0),
  amount_tendered numeric(12, 2) not null default 0 check (amount_tendered >= 0),
  change_amount numeric(12, 2) not null default 0 check (change_amount >= 0),

  vatable_sales numeric(12, 2),
  vat_amount numeric(12, 2),
  vat_exempt_sales numeric(12, 2),
  zero_rated_sales numeric(12, 2),

  seller_business_name text not null default '',
  seller_address text not null default '',
  seller_tin text not null default '',

  buyer_name text not null default '',
  buyer_email text not null default '',
  buyer_address text not null default '',

  service_description text not null default '',
  class_starts_at timestamptz,
  class_ends_at timestamptz,

  request_physical_receipt boolean not null default false,
  receipt_html text not null default '',
  email_receipt_sent boolean not null default false,
  receipt_printed boolean not null default false,
  receipt_issued_at timestamptz,

  official_receipt_image_path text not null default '',
  official_receipt_image_original_name text not null default '',

  finalized_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.final_transactions is
  'Finalized class payments — source for Philippines BIR official receipts after escrow/refund window.';
comment on column public.final_transactions.official_receipt_image_path is
  'Storage path for scanned/uploaded BIR official receipt image (official_receipts bucket).';

create index if not exists final_transactions_account_id_idx on public.final_transactions (account_id);
create index if not exists final_transactions_class_id_idx on public.final_transactions (class_id);
create index if not exists final_transactions_finalized_at_idx on public.final_transactions (finalized_at desc);

drop trigger if exists final_transactions_touch_updated_at on public.final_transactions;
create trigger final_transactions_touch_updated_at
  before update on public.final_transactions
  for each row
  execute function public.touch_class_payments_updated_at();

alter table public.class_payments_escrow
  drop constraint if exists class_payments_escrow_final_transaction_id_fkey;
alter table public.class_payments_escrow
  add constraint class_payments_escrow_final_transaction_id_fkey
  foreign key (final_transaction_id) references public.final_transactions (id) on delete set null;

-- 3) Backfill escrow_state from legacy status.
update public.class_payments_escrow e
set
  escrow_state = case
    when e.status = 'pending' then 'pending_review'::public.payment_escrow_state
    when e.status = 'rejected' then 'rejected'::public.payment_escrow_state
    when e.status = 'approved' and e.verified then 'in_escrow'::public.payment_escrow_state
    else 'pending_review'::public.payment_escrow_state
  end,
  refundable_until = case
    when e.class_starts_at is not null then
      e.class_starts_at - make_interval(hours => coalesce((
        select s.cancel_window_hours from public.studio_policy_settings s where s.id = 1
      ), 24))
    else null
  end
where e.escrow_state is null;

-- 4) Helper: refund deadline from studio policy.
create or replace function public.payment_refundable_until(p_class_starts_at timestamptz)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_class_starts_at is null then null
    else p_class_starts_at - make_interval(
      hours => coalesce((select cancel_window_hours from public.studio_policy_settings where id = 1), 24)
    )
  end;
$$;

revoke all on function public.payment_refundable_until(timestamptz) from public;
grant execute on function public.payment_refundable_until(timestamptz) to authenticated;

-- 5) Finalize one escrow row → final_transactions (idempotent).
create or replace function public._finalize_escrow_payment_impl(p_escrow_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e public.class_payments_escrow%rowtype;
  v_final_id uuid;
  v_block boolean;
begin
  select * into v_e from public.class_payments_escrow where id = p_escrow_id for update;
  if not found then
    raise exception 'Escrow payment not found.';
  end if;

  if v_e.escrow_state = 'finalized' and v_e.final_transaction_id is not null then
    return v_e.final_transaction_id;
  end if;

  if v_e.status <> 'approved' or v_e.verified is distinct from true then
    raise exception 'Only approved verified payments can be finalized.';
  end if;

  if v_e.refundable_until is not null and now() < v_e.refundable_until then
    raise exception 'Refund window has not ended yet.';
  end if;

  select exists (
    select 1
    from public.portal_requests pr
    where pr.request_type = 'cancellation_request'
      and pr.requester_account_id = v_e.account_id
      and coalesce(pr.target_class_id, pr.result_class_id) = v_e.class_id
      and pr.status = 'pending'
  ) into v_block;

  if v_block then
    raise exception 'Pending cancellation request — resolve before finalizing.';
  end if;

  insert into public.final_transactions (
    escrow_payment_id,
    uid,
    class_id,
    account_id,
    payment_channel_id,
    payment_method_label,
    payment_reference,
    currency,
    quantity,
    unit_price,
    amount_paid,
    total_amount_due,
    amount_tendered,
    change_amount,
    vatable_sales,
    vat_amount,
    vat_exempt_sales,
    zero_rated_sales,
    seller_business_name,
    seller_address,
    seller_tin,
    buyer_name,
    buyer_email,
    buyer_address,
    service_description,
    class_starts_at,
    class_ends_at,
    request_physical_receipt,
    receipt_html,
    email_receipt_sent,
    receipt_printed,
    receipt_issued_at,
    finalized_at
  )
  values (
    v_e.id,
    v_e.uid,
    v_e.class_id,
    v_e.account_id,
    v_e.payment_channel_id,
    v_e.payment_method_label,
    v_e.payment_reference,
    v_e.currency,
    v_e.quantity,
    v_e.unit_price,
    v_e.amount_paid,
    v_e.total_amount_due,
    v_e.amount_tendered,
    v_e.change_amount,
    v_e.vatable_sales,
    v_e.vat_amount,
    v_e.vat_exempt_sales,
    v_e.zero_rated_sales,
    v_e.seller_business_name,
    v_e.seller_address,
    v_e.seller_tin,
    v_e.buyer_name,
    v_e.buyer_email,
    v_e.buyer_address,
    v_e.service_description,
    v_e.class_starts_at,
    v_e.class_ends_at,
    v_e.request_physical_receipt,
    coalesce(v_e.receipt_html, ''),
    coalesce(v_e.email_receipt_sent, false),
    coalesce(v_e.receipt_printed, false),
    coalesce(v_e.receipt_issued_at, now()),
    now()
  )
  on conflict (escrow_payment_id) do update
    set updated_at = now()
  returning id into v_final_id;

  update public.class_payments_escrow
  set
    escrow_state = 'finalized',
    final_transaction_id = v_final_id,
    finalized_at = now()
  where id = p_escrow_id;

  return v_final_id;
end;
$$;

revoke all on function public._finalize_escrow_payment_impl(uuid) from public;

create or replace function public.finalize_escrow_payment(p_escrow_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_or_dev() then
    raise exception 'Not authorized.';
  end if;
  return public._finalize_escrow_payment_impl(p_escrow_id);
end;
$$;

revoke all on function public.finalize_escrow_payment(uuid) from public;
grant execute on function public.finalize_escrow_payment(uuid) to authenticated;

-- Batch finalize due escrow rows (call from cron or admin).
create or replace function public.finalize_due_escrow_payments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Not authorized.';
  end if;

  for v_row in
    select e.id
    from public.class_payments_escrow e
    where e.escrow_state = 'in_escrow'
      and e.status = 'approved'
      and e.verified is true
      and e.final_transaction_id is null
      and e.refundable_until is not null
      and now() >= e.refundable_until
      and not exists (
        select 1
        from public.portal_requests pr
        where pr.request_type = 'cancellation_request'
          and pr.requester_account_id = e.account_id
          and coalesce(pr.target_class_id, pr.result_class_id) = e.class_id
          and pr.status = 'pending'
      )
  loop
    begin
      perform public._finalize_escrow_payment_impl(v_row.id);
      v_count := v_count + 1;
    exception
      when others then
        raise notice 'finalize_escrow_payment % skipped: %', v_row.id, sqlerrm;
    end;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.finalize_due_escrow_payments() from public;
grant execute on function public.finalize_due_escrow_payments() to authenticated;

-- 6) Migrate existing approved rows that are already past refund deadline.
do $$
declare
  v_row record;
begin
  for v_row in
    select e.id
    from public.class_payments_escrow e
    where e.status = 'approved'
      and e.verified is true
      and e.escrow_state = 'in_escrow'
      and e.final_transaction_id is null
      and e.refundable_until is not null
      and now() >= e.refundable_until
  loop
    begin
      perform public._finalize_escrow_payment_impl(v_row.id);
    exception
      when others then
        null;
    end;
  end loop;
end
$$;

-- 7) RLS policies (rename + final_transactions).
alter table public.class_payments_escrow enable row level security;
alter table public.final_transactions enable row level security;

drop policy if exists class_payments_select_own on public.class_payments_escrow;
drop policy if exists class_payments_select_admin on public.class_payments_escrow;
drop policy if exists class_payments_update_admin on public.class_payments_escrow;
drop policy if exists class_payments_escrow_select_own on public.class_payments_escrow;
drop policy if exists class_payments_escrow_select_admin on public.class_payments_escrow;
drop policy if exists class_payments_escrow_update_admin on public.class_payments_escrow;

create policy class_payments_escrow_select_own
  on public.class_payments_escrow for select to authenticated
  using (account_id = public.current_account_id());

create policy class_payments_escrow_select_admin
  on public.class_payments_escrow for select to authenticated
  using (public.is_admin_or_dev());

create policy class_payments_escrow_update_admin
  on public.class_payments_escrow for update to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

drop policy if exists final_transactions_select_own on public.final_transactions;
drop policy if exists final_transactions_select_admin on public.final_transactions;
drop policy if exists final_transactions_update_admin on public.final_transactions;

create policy final_transactions_select_own
  on public.final_transactions for select to authenticated
  using (account_id = public.current_account_id());

create policy final_transactions_select_admin
  on public.final_transactions for select to authenticated
  using (public.is_admin_or_dev());

create policy final_transactions_update_admin
  on public.final_transactions for update to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

-- 8) Storage bucket for official receipt images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'official_receipts',
  'official_receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists official_receipts_insert_admin on storage.objects;
drop policy if exists official_receipts_select_admin on storage.objects;
drop policy if exists official_receipts_select_own on storage.objects;

create policy official_receipts_insert_admin
  on storage.objects for insert to authenticated
  with check (bucket_id = 'official_receipts' and public.is_admin_or_dev());

create policy official_receipts_select_admin
  on storage.objects for select to authenticated
  using (bucket_id = 'official_receipts' and public.is_admin_or_dev());

create policy official_receipts_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'official_receipts'
    and exists (
      select 1
      from public.final_transactions ft
      where ft.account_id = public.current_account_id()
        and ft.official_receipt_image_path = storage.objects.name
    )
  );
