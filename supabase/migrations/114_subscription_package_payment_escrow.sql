-- Subscription / credit pack purchases: escrow, admin review, credits grant, final OR row.

create table if not exists public.subscription_package_payments_escrow (
  id uuid primary key default gen_random_uuid(),
  uid text not null unique,

  subscription_package_id uuid not null references public.subscription_packages (id) on delete restrict,
  account_id uuid not null references public.accounts (id) on delete cascade,

  status public.class_payment_status not null default 'pending',
  verified boolean not null default false,
  escrow_state public.payment_escrow_state,
  refundable_until timestamptz,
  final_transaction_id uuid,
  finalized_at timestamptz,

  payment_channel_id uuid not null references public.payment_channels (id) on delete restrict,
  payment_method_label text not null default '',
  payment_reference text not null default '',
  proof_storage_path text not null default '',
  proof_original_filename text not null default '',
  member_notes text not null default '',

  currency text not null default 'PHP',
  quantity integer not null default 1 check (quantity >= 1),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  amount_paid numeric(12, 2) not null check (amount_paid >= 0),
  total_amount_due numeric(12, 2) not null check (total_amount_due >= 0),
  amount_tendered numeric(12, 2) not null default 0 check (amount_tendered >= 0),
  change_amount numeric(12, 2) not null default 0 check (change_amount >= 0),

  package_name_snapshot text not null default '',
  package_uid_snapshot text not null default '',
  credits_granted_snapshot integer not null check (credits_granted_snapshot >= 1),
  credit_validity_days_snapshot integer not null check (credit_validity_days_snapshot >= 1),

  request_physical_receipt boolean not null default false,

  review_note text not null default '',
  reviewed_by uuid references public.accounts (id) on delete set null,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscription_package_payments_escrow is
  'Member credit pack / membership purchases awaiting verification; credits granted after admin approval + finalize.';

create index if not exists subscription_package_payments_escrow_status_idx
  on public.subscription_package_payments_escrow (status);

create index if not exists subscription_package_payments_escrow_account_idx
  on public.subscription_package_payments_escrow (account_id, created_at desc);

create index if not exists subscription_package_payments_escrow_package_idx
  on public.subscription_package_payments_escrow (subscription_package_id);

create unique index if not exists subscription_package_payments_one_pending_per_package_account
  on public.subscription_package_payments_escrow (subscription_package_id, account_id)
  where status = 'pending';

drop trigger if exists subscription_package_payments_escrow_touch_updated_at
  on public.subscription_package_payments_escrow;
create trigger subscription_package_payments_escrow_touch_updated_at
  before update on public.subscription_package_payments_escrow
  for each row
  execute function public.touch_class_payments_updated_at();

drop trigger if exists trg_log_system_subscription_package_payments_escrow
  on public.subscription_package_payments_escrow;
create trigger trg_log_system_subscription_package_payments_escrow
  after insert or update or delete on public.subscription_package_payments_escrow
  for each row
  execute function public.tg_write_log_system();

-- Final OR rows for subscription purchases (parallel to class final_transactions).
create table if not exists public.subscription_package_final_transactions (
  id uuid primary key default gen_random_uuid(),
  escrow_payment_id uuid not null unique references public.subscription_package_payments_escrow (id) on delete restrict,
  uid text not null unique,

  subscription_package_id uuid not null references public.subscription_packages (id) on delete restrict,
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
  package_name text not null default '',
  credits_granted integer not null default 0,

  request_physical_receipt boolean not null default false,
  receipt_html text not null default '',
  email_receipt_sent boolean not null default false,
  receipt_printed boolean not null default false,
  receipt_issued_at timestamptz,

  finalized_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscription_package_final_transactions is
  'Finalized subscription / credit pack payments — source for official receipts.';

create index if not exists subscription_package_final_transactions_account_idx
  on public.subscription_package_final_transactions (account_id, finalized_at desc);

drop trigger if exists subscription_package_final_transactions_touch_updated_at
  on public.subscription_package_final_transactions;
create trigger subscription_package_final_transactions_touch_updated_at
  before update on public.subscription_package_final_transactions
  for each row
  execute function public.touch_class_payments_updated_at();

alter table public.subscription_package_payments_escrow
  drop constraint if exists subscription_package_payments_escrow_final_transaction_id_fkey;
alter table public.subscription_package_payments_escrow
  add constraint subscription_package_payments_escrow_final_transaction_id_fkey
  foreign key (final_transaction_id) references public.subscription_package_final_transactions (id) on delete set null;

alter table public.subscription_package_payments_escrow enable row level security;
alter table public.subscription_package_final_transactions enable row level security;

drop policy if exists subscription_package_payments_escrow_select_admin
  on public.subscription_package_payments_escrow;
drop policy if exists subscription_package_payments_escrow_select_own
  on public.subscription_package_payments_escrow;

create policy subscription_package_payments_escrow_select_admin
  on public.subscription_package_payments_escrow for select to authenticated
  using (public.is_admin_or_dev());

create policy subscription_package_payments_escrow_select_own
  on public.subscription_package_payments_escrow for select to authenticated
  using (
    account_id = public.current_account_id()
    and public.current_user_role() = 'user'::public.user_role
  );

drop policy if exists subscription_package_final_transactions_select_admin
  on public.subscription_package_final_transactions;
drop policy if exists subscription_package_final_transactions_select_own
  on public.subscription_package_final_transactions;

create policy subscription_package_final_transactions_select_admin
  on public.subscription_package_final_transactions for select to authenticated
  using (public.is_admin_or_dev());

create policy subscription_package_final_transactions_select_own
  on public.subscription_package_final_transactions for select to authenticated
  using (
    account_id = public.current_account_id()
    and public.current_user_role() = 'user'::public.user_role
  );

-- ---------------------------------------------------------------------------
-- OR field builder for subscription purchases
-- ---------------------------------------------------------------------------

create or replace function public.build_or_fields_for_subscription_payment(
  p_package_id uuid,
  p_account_id uuid,
  p_amount_paid numeric,
  p_unit_price numeric default null
)
returns table (
  seller_business_name text,
  seller_address text,
  seller_tin text,
  buyer_name text,
  buyer_email text,
  buyer_address text,
  service_description text,
  vatable_sales numeric,
  vat_amount numeric,
  vat_exempt_sales numeric,
  zero_rated_sales numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_seller public.studio_receipt_config%rowtype;
  v_profile public.profiles_client%rowtype;
  v_pkg public.subscription_packages%rowtype;
  v_email text;
  v_buyer_name text;
  v_buyer_address text;
  v_desc text;
begin
  select * into v_seller from public.studio_receipt_config where id = 1;
  select * into v_profile from public.profiles_client where account_id = p_account_id;
  select * into v_pkg from public.subscription_packages where id = p_package_id;
  select email into v_email from public.accounts where id = p_account_id;

  v_buyer_name := coalesce(nullif(btrim(v_profile.name), ''), v_email, 'Member');
  v_buyer_address := nullif(
    btrim(concat_ws(', ', nullif(v_profile.barangay, ''), nullif(v_profile.city, ''), nullif(v_profile.province, ''))),
    ''
  );
  v_desc := coalesce(nullif(btrim(v_pkg.name), ''), 'Studio credit pack');

  return query
  select
    coalesce(v_seller.business_name, '')::text,
    coalesce(v_seller.business_address, '')::text,
    coalesce(v_seller.tin, '')::text,
    v_buyer_name,
    coalesce(v_email, '')::text,
    coalesce(v_buyer_address, '')::text,
    v_desc,
    null::numeric,
    null::numeric,
    null::numeric,
    null::numeric;
end;
$$;

revoke all on function public.build_or_fields_for_subscription_payment(uuid, uuid, numeric, numeric) from public;

-- ---------------------------------------------------------------------------
-- Grant credits + subscription period (idempotent per escrow payment)
-- ---------------------------------------------------------------------------

create or replace function public._grant_credits_for_subscription_payment(p_escrow_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e public.subscription_package_payments_escrow%rowtype;
  v_idempotency text;
  v_lot_id uuid;
  v_expires timestamptz;
  v_balance integer;
  v_reason text;
  v_sub_id uuid;
begin
  select * into v_e from public.subscription_package_payments_escrow where id = p_escrow_id;
  if not found then
    raise exception 'Subscription payment not found.';
  end if;

  v_idempotency := 'sub-pack-grant:' || p_escrow_id::text;

  if exists (
    select 1 from public.account_credit_transactions t where t.idempotency_key = v_idempotency
  ) then
    return;
  end if;

  perform public.ensure_account_credit_wallet(v_e.account_id);

  v_expires := now() + (v_e.credit_validity_days_snapshot || ' days')::interval;

  insert into public.account_credit_lots (
    account_id,
    quantity_initial,
    quantity_remaining,
    expires_at,
    source_type,
    source_id,
    idempotency_key
  )
  values (
    v_e.account_id,
    v_e.credits_granted_snapshot,
    v_e.credits_granted_snapshot,
    v_expires,
    'subscription'::public.credit_source_type,
    v_e.subscription_package_id,
    v_idempotency || ':lot'
  )
  returning id into v_lot_id;

  select w.available_balance into v_balance
  from public.account_credit_wallets w
  where w.account_id = v_e.account_id
  for update;

  v_balance := coalesce(v_balance, 0) + v_e.credits_granted_snapshot;

  update public.account_credit_wallets
  set available_balance = v_balance
  where account_id = v_e.account_id;

  v_reason := coalesce(nullif(btrim(v_e.package_name_snapshot), ''), 'Credit pack')
    || ' — ' || v_e.credits_granted_snapshot::text || ' credits';

  insert into public.account_credit_transactions (
    account_id,
    lot_id,
    delta,
    balance_after,
    kind,
    reason,
    subscription_package_id,
    idempotency_key
  )
  values (
    v_e.account_id,
    v_lot_id,
    v_e.credits_granted_snapshot,
    v_balance,
    'grant'::public.credit_transaction_kind,
    v_reason,
    v_e.subscription_package_id,
    v_idempotency
  );

  insert into public.account_subscriptions (
    account_id,
    subscription_package_id,
    status,
    starts_at,
    ends_at
  )
  values (
    v_e.account_id,
    v_e.subscription_package_id,
    'active'::public.account_subscription_status,
    now(),
    v_expires
  )
  returning id into v_sub_id;
end;
$$;

revoke all on function public._grant_credits_for_subscription_payment(uuid) from public;

-- ---------------------------------------------------------------------------
-- Finalize subscription escrow → final transaction + credits
-- ---------------------------------------------------------------------------

create or replace function public._finalize_subscription_payment_impl(p_escrow_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e public.subscription_package_payments_escrow%rowtype;
  v_final_id uuid;
  v_or record;
begin
  select * into v_e from public.subscription_package_payments_escrow where id = p_escrow_id for update;
  if not found then
    raise exception 'Subscription payment not found.';
  end if;

  if v_e.escrow_state = 'finalized' and v_e.final_transaction_id is not null then
    return v_e.final_transaction_id;
  end if;

  if v_e.status <> 'approved' or v_e.verified is distinct from true then
    raise exception 'Only approved verified payments can be finalized.';
  end if;

  if v_e.escrow_state = 'rejected' then
    raise exception 'Rejected payments cannot be finalized.';
  end if;

  perform public._grant_credits_for_subscription_payment(p_escrow_id);

  select * into v_or
  from public.build_or_fields_for_subscription_payment(
    v_e.subscription_package_id,
    v_e.account_id,
    v_e.amount_paid,
    v_e.unit_price
  );

  insert into public.subscription_package_final_transactions (
    escrow_payment_id,
    uid,
    subscription_package_id,
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
    package_name,
    credits_granted,
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
    v_e.subscription_package_id,
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
    v_or.vatable_sales,
    v_or.vat_amount,
    v_or.vat_exempt_sales,
    v_or.zero_rated_sales,
    v_or.seller_business_name,
    v_or.seller_address,
    v_or.seller_tin,
    v_or.buyer_name,
    v_or.buyer_email,
    v_or.buyer_address,
    v_or.service_description,
    v_e.package_name_snapshot,
    v_e.credits_granted_snapshot,
    v_e.request_physical_receipt,
    '',
    false,
    false,
    now(),
    now()
  )
  on conflict (escrow_payment_id) do update
    set updated_at = now()
  returning id into v_final_id;

  update public.subscription_package_payments_escrow
  set
    escrow_state = 'finalized'::public.payment_escrow_state,
    final_transaction_id = v_final_id,
    finalized_at = now()
  where id = p_escrow_id;

  return v_final_id;
end;
$$;

revoke all on function public._finalize_subscription_payment_impl(uuid) from public;

-- ---------------------------------------------------------------------------
-- Member submit
-- ---------------------------------------------------------------------------

create or replace function public.submit_member_subscription_package_payment(
  p_subscription_package_id uuid,
  p_payment_channel_id uuid,
  p_payment_reference text,
  p_proof_storage_path text,
  p_amount_paid numeric,
  p_member_notes text default '',
  p_request_physical_receipt boolean default false,
  p_proof_original_filename text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid := public.current_account_id();
  v_pkg public.subscription_packages%rowtype;
  v_channel public.payment_channels%rowtype;
  v_payment_id uuid;
  v_uid text;
begin
  if v_account_id is null then
    raise exception 'Not authenticated.';
  end if;

  if public.current_user_role() is distinct from 'user'::public.user_role then
    raise exception 'Only members can purchase credit packs.';
  end if;

  if p_proof_storage_path is null or btrim(p_proof_storage_path) = '' then
    raise exception 'Payment proof is required.';
  end if;

  if p_amount_paid is null or p_amount_paid <= 0 then
    raise exception 'Invalid payment amount.';
  end if;

  select * into v_pkg
  from public.subscription_packages
  where id = p_subscription_package_id;

  if not found or v_pkg.is_active is distinct from true then
    raise exception 'This package is not available.';
  end if;

  select * into v_channel
  from public.payment_channels
  where id = p_payment_channel_id;

  if not found or v_channel.is_active is distinct from true then
    raise exception 'Invalid or inactive payment channel.';
  end if;

  if exists (
    select 1 from public.subscription_package_payments_escrow sp
    where sp.subscription_package_id = p_subscription_package_id
      and sp.account_id = v_account_id
      and sp.status = 'pending'
  ) then
    raise exception 'You already have a payment pending review for this package.';
  end if;

  v_uid := public.next_payment_uid(now());

  insert into public.subscription_package_payments_escrow (
    uid,
    subscription_package_id,
    account_id,
    status,
    verified,
    escrow_state,
    payment_channel_id,
    payment_method_label,
    payment_reference,
    proof_storage_path,
    proof_original_filename,
    member_notes,
    unit_price,
    amount_paid,
    total_amount_due,
    amount_tendered,
    change_amount,
    package_name_snapshot,
    package_uid_snapshot,
    credits_granted_snapshot,
    credit_validity_days_snapshot,
    request_physical_receipt
  )
  values (
    v_uid,
    p_subscription_package_id,
    v_account_id,
    'pending',
    false,
    'pending_review'::public.payment_escrow_state,
    p_payment_channel_id,
    v_channel.label,
    coalesce(p_payment_reference, ''),
    btrim(p_proof_storage_path),
    left(coalesce(btrim(p_proof_original_filename), ''), 255),
    coalesce(p_member_notes, ''),
    v_pkg.price_amount,
    p_amount_paid,
    v_pkg.price_amount,
    p_amount_paid,
    greatest(p_amount_paid - v_pkg.price_amount, 0),
    v_pkg.name,
    v_pkg.uid,
    v_pkg.credits_granted,
    v_pkg.credit_validity_days,
    coalesce(p_request_physical_receipt, false)
  )
  returning id into v_payment_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'uid', v_uid,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.submit_member_subscription_package_payment(uuid, uuid, text, text, numeric, text, boolean, text) from public;
grant execute on function public.submit_member_subscription_package_payment(uuid, uuid, text, text, numeric, text, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Member resubmit after rejection
-- ---------------------------------------------------------------------------

create or replace function public.member_resubmit_subscription_package_payment(
  p_payment_id uuid,
  p_payment_channel_id uuid,
  p_payment_reference text,
  p_proof_storage_path text,
  p_member_notes text default '',
  p_request_physical_receipt boolean default false,
  p_proof_original_filename text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid := public.current_account_id();
  v_payment public.subscription_package_payments_escrow%rowtype;
  v_channel public.payment_channels%rowtype;
begin
  if v_account_id is null then
    raise exception 'Not authenticated.';
  end if;

  if p_proof_storage_path is null or btrim(p_proof_storage_path) = '' then
    raise exception 'Payment proof is required.';
  end if;

  select * into v_payment
  from public.subscription_package_payments_escrow
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found.';
  end if;

  if v_payment.account_id <> v_account_id then
    raise exception 'Not authorized.';
  end if;

  if v_payment.status <> 'rejected' or v_payment.escrow_state <> 'rejected'::public.payment_escrow_state then
    raise exception 'Only rejected payments can be resubmitted.';
  end if;

  select * into v_channel
  from public.payment_channels
  where id = p_payment_channel_id;

  if not found or v_channel.is_active is distinct from true then
    raise exception 'Invalid or inactive payment channel.';
  end if;

  if exists (
    select 1 from public.subscription_package_payments_escrow sp
    where sp.subscription_package_id = v_payment.subscription_package_id
      and sp.account_id = v_account_id
      and sp.status = 'pending'
      and sp.id <> p_payment_id
  ) then
    raise exception 'You already have another payment pending review for this package.';
  end if;

  update public.subscription_package_payments_escrow
  set
    status = 'pending',
    verified = false,
    escrow_state = 'pending_review'::public.payment_escrow_state,
    payment_channel_id = p_payment_channel_id,
    payment_method_label = v_channel.label,
    payment_reference = coalesce(p_payment_reference, ''),
    proof_storage_path = btrim(p_proof_storage_path),
    proof_original_filename = left(coalesce(btrim(p_proof_original_filename), ''), 255),
    member_notes = coalesce(p_member_notes, ''),
    request_physical_receipt = coalesce(p_request_physical_receipt, false),
    review_note = '',
    reviewed_by = null,
    reviewed_at = null,
    final_transaction_id = null,
    finalized_at = null,
    updated_at = now()
  where id = p_payment_id;

  return jsonb_build_object(
    'payment_id', p_payment_id,
    'uid', v_payment.uid,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.member_resubmit_subscription_package_payment(uuid, uuid, text, text, text, boolean, text) from public;
grant execute on function public.member_resubmit_subscription_package_payment(uuid, uuid, text, text, text, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin review
-- ---------------------------------------------------------------------------

create or replace function public.admin_review_subscription_package_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_review_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := public.current_account_id();
  v_payment public.subscription_package_payments_escrow%rowtype;
  v_final_id uuid;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Not authorized.';
  end if;

  select * into v_payment
  from public.subscription_package_payments_escrow
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found.';
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'Payment is already reviewed.';
  end if;

  if p_approve then
    update public.subscription_package_payments_escrow
    set
      status = 'approved',
      verified = true,
      escrow_state = 'in_escrow'::public.payment_escrow_state,
      refundable_until = null,
      review_note = coalesce(p_review_note, ''),
      reviewed_by = v_reviewer,
      reviewed_at = now()
    where id = p_payment_id;

    v_final_id := public._finalize_subscription_payment_impl(p_payment_id);

    return jsonb_build_object(
      'status', 'approved',
      'verified', true,
      'escrow_state', 'finalized'::public.payment_escrow_state,
      'final_transaction_id', v_final_id
    );
  end if;

  update public.subscription_package_payments_escrow
  set
    status = 'rejected',
    verified = false,
    escrow_state = 'rejected'::public.payment_escrow_state,
    review_note = coalesce(p_review_note, ''),
    reviewed_by = v_reviewer,
    reviewed_at = now()
  where id = p_payment_id;

  return jsonb_build_object('status', 'rejected', 'verified', false);
end;
$$;

revoke all on function public.admin_review_subscription_package_payment(uuid, boolean, text) from public;
grant execute on function public.admin_review_subscription_package_payment(uuid, boolean, text) to authenticated;
