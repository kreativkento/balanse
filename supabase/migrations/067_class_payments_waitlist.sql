-- Class enrollment payments (Philippines OR-ready), proof storage, waitlist until admin verifies.
-- Run after 066_profiles_staff_is_active.sql.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'class_payment_status') then
    create type public.class_payment_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Receipt seller config (BIR Official Receipt — seller block snapshot source)
-- ---------------------------------------------------------------------------

create table if not exists public.studio_receipt_config (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'BALANSÉ Wellness Hub',
  business_address text not null default '',
  tin text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.studio_receipt_config (id)
values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2b. Payment channels (admin-managed checkout destinations; changes logged)
-- ---------------------------------------------------------------------------

create table if not exists public.payment_channels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  subtitle text not null default '',
  accent_color text not null default '#3A4A5A',
  account_name text not null default '',
  account_number text not null default '',
  bank_name text not null default '',
  qr_storage_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_channels_slug_format check (slug ~ '^[a-z0-9][a-z0-9_-]*$')
);

comment on table public.payment_channels is
  'Checkout payment methods (GCash, bank, Maya, etc.) with account details and optional QR image.';

insert into public.payment_channels (
  slug, label, subtitle, accent_color, account_name, account_number, bank_name, sort_order
)
values
  ('bank', 'Bank Transfer', 'BPI / BDO', '#3A4A5A', 'BALANSÉ Studio', '', 'BPI', 10),
  ('gcash', 'GCash', 'E-wallet', '#007DFF', 'BALANSÉ Studio', '0917 123 4567', 'GCash', 20),
  ('maya', 'Maya', 'E-wallet', '#46BFA8', 'BALANSÉ Studio', '0917 123 4567', 'Maya', 30)
on conflict (slug) do nothing;

create or replace function public.touch_payment_channels_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists payment_channels_touch_updated_at on public.payment_channels;
create trigger payment_channels_touch_updated_at
  before update on public.payment_channels
  for each row
  execute function public.touch_payment_channels_updated_at();

drop trigger if exists trg_log_system_payment_channels on public.payment_channels;
create trigger trg_log_system_payment_channels
  after insert or update or delete on public.payment_channels
  for each row
  execute function public.tg_write_log_system();

alter table public.payment_channels enable row level security;

drop policy if exists payment_channels_select_active on public.payment_channels;
drop policy if exists payment_channels_select_admin on public.payment_channels;
drop policy if exists payment_channels_insert_admin on public.payment_channels;
drop policy if exists payment_channels_update_admin on public.payment_channels;
drop policy if exists payment_channels_delete_admin on public.payment_channels;

create policy payment_channels_select_active
  on public.payment_channels
  for select
  to anon, authenticated
  using (is_active = true);

create policy payment_channels_select_admin
  on public.payment_channels
  for select
  to authenticated
  using (public.is_admin_or_dev());

create policy payment_channels_insert_admin
  on public.payment_channels
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy payment_channels_update_admin
  on public.payment_channels
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy payment_channels_delete_admin
  on public.payment_channels
  for delete
  to authenticated
  using (public.is_admin_or_dev());

alter table public.studio_receipt_config enable row level security;

drop policy if exists studio_receipt_config_select_authenticated on public.studio_receipt_config;
create policy studio_receipt_config_select_authenticated
  on public.studio_receipt_config
  for select
  to authenticated
  using (true);

drop policy if exists studio_receipt_config_update_admin on public.studio_receipt_config;
create policy studio_receipt_config_update_admin
  on public.studio_receipt_config
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

-- ---------------------------------------------------------------------------
-- 3. Payment UID sequence (YYYYMM + 3-digit control number, resets monthly — Asia/Manila)
-- ---------------------------------------------------------------------------

create table if not exists public.payment_uid_monthly (
  month_key text primary key,
  counter integer not null default 0
);

create or replace function public.next_payment_uid(p_moment timestamptz default now())
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_key text := to_char(timezone('Asia/Manila', p_moment), 'YYYYMM');
  v_seq integer;
begin
  insert into public.payment_uid_monthly as m (month_key, counter)
  values (v_month_key, 1)
  on conflict (month_key) do update
    set counter = m.counter + 1
  returning counter into v_seq;

  if v_seq > 999 then
    raise exception 'Monthly payment UID limit (999) reached for %.', v_month_key;
  end if;

  return v_month_key || lpad(v_seq::text, 3, '0');
end;
$$;

revoke all on function public.next_payment_uid(timestamptz) from public;
grant execute on function public.next_payment_uid(timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Payments (Official Receipt fields — snapshot at submission / verification)
-- ---------------------------------------------------------------------------

create table if not exists public.class_payments (
  id uuid primary key default gen_random_uuid(),
  uid text not null unique,

  class_id uuid not null references public.classes (id) on delete restrict,
  account_id uuid not null references public.accounts (id) on delete cascade,

  status public.class_payment_status not null default 'pending',
  verified boolean not null default false,

  payment_channel_id uuid not null references public.payment_channels (id) on delete restrict,
  payment_method_label text not null default '',
  payment_reference text not null default '',
  proof_storage_path text not null default '',
  member_notes text not null default '',

  currency text not null default 'PHP',
  quantity integer not null default 1 check (quantity >= 1),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  amount_paid numeric(12, 2) not null check (amount_paid >= 0),
  total_amount_due numeric(12, 2) not null check (total_amount_due >= 0),
  amount_tendered numeric(12, 2) not null default 0 check (amount_tendered >= 0),
  change_amount numeric(12, 2) not null default 0 check (change_amount >= 0),

  -- VAT breakdown (Philippines OR; nullable when non-VAT or simplified)
  vatable_sales numeric(12, 2),
  vat_amount numeric(12, 2),
  vat_exempt_sales numeric(12, 2),
  zero_rated_sales numeric(12, 2),

  -- Seller (registered business) snapshot
  seller_business_name text not null default '',
  seller_address text not null default '',
  seller_tin text not null default '',

  -- Buyer snapshot
  buyer_name text not null default '',
  buyer_email text not null default '',
  buyer_address text not null default '',

  -- Service line (OR description)
  service_description text not null default '',
  class_starts_at timestamptz,
  class_ends_at timestamptz,

  request_physical_receipt boolean not null default false,
  email_receipt_sent boolean not null default false,
  receipt_printed boolean not null default false,
  receipt_issued_at timestamptz,

  review_note text not null default '',
  reviewed_by uuid references public.accounts (id) on delete set null,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.class_payments is
  'Member class enrollment payments with Philippines Official Receipt field snapshots. verified=true when admin approves.';

create index if not exists class_payments_status_idx on public.class_payments (status);
create index if not exists class_payments_class_id_idx on public.class_payments (class_id);
create index if not exists class_payments_account_id_idx on public.class_payments (account_id);
create index if not exists class_payments_created_at_idx on public.class_payments (created_at desc);
create index if not exists class_payments_payment_channel_id_idx on public.class_payments (payment_channel_id);

create unique index if not exists class_payments_one_pending_per_class_account
  on public.class_payments (class_id, account_id)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- 5. Waitlist (pending verification — not counted in class_students / capacity)
-- ---------------------------------------------------------------------------

create table if not exists public.class_waitlist (
  class_id uuid not null references public.classes (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  payment_id uuid not null references public.class_payments (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, account_id)
);

comment on table public.class_waitlist is
  'Members awaiting payment verification for a class. Removed on approve (→ class_students) or reject.';

create index if not exists class_waitlist_payment_id_idx on public.class_waitlist (payment_id);

-- ---------------------------------------------------------------------------
-- 6. updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.touch_class_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists class_payments_touch_updated_at on public.class_payments;
create trigger class_payments_touch_updated_at
  before update on public.class_payments
  for each row
  execute function public.touch_class_payments_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Submit payment + waitlist (member)
-- ---------------------------------------------------------------------------

create or replace function public.submit_member_class_payment(
  p_class_id uuid,
  p_payment_channel_id uuid,
  p_payment_reference text,
  p_proof_storage_path text,
  p_amount_paid numeric,
  p_member_notes text default '',
  p_request_physical_receipt boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid := public.current_account_id();
  v_class public.classes%rowtype;
  v_profile public.profiles_client%rowtype;
  v_seller public.studio_receipt_config%rowtype;
  v_channel public.payment_channels%rowtype;
  v_payment_id uuid;
  v_uid text;
  v_enrolled integer;
  v_limit integer;
  v_desc text;
  v_buyer_name text;
  v_buyer_address text;
begin
  if v_account_id is null then
    raise exception 'Not authenticated.';
  end if;

  if p_proof_storage_path is null or btrim(p_proof_storage_path) = '' then
    raise exception 'Payment proof is required.';
  end if;

  if p_amount_paid is null or p_amount_paid <= 0 then
    raise exception 'Invalid payment amount.';
  end if;

  select * into v_channel
  from public.payment_channels
  where id = p_payment_channel_id;

  if not found or v_channel.is_active is distinct from true then
    raise exception 'Invalid or inactive payment channel.';
  end if;

  select * into v_class from public.classes where id = p_class_id for update;
  if not found then
    raise exception 'Class not found.';
  end if;

  if v_class.status_block not in (
    'active'::public.class_block_status,
    'occupied'::public.class_block_status
  ) then
    raise exception 'This class is not open for enrollment.';
  end if;

  if v_class.status_class = 'close'::public.class_open_status then
    raise exception 'This class is closed for enrollment.';
  end if;

  if exists (
    select 1 from public.class_students cs
    where cs.class_id = p_class_id and cs.account_id = v_account_id
  ) then
    raise exception 'You are already enrolled in this class.';
  end if;

  if exists (
    select 1 from public.class_payments cp
    where cp.class_id = p_class_id
      and cp.account_id = v_account_id
      and cp.status = 'pending'
  ) then
    raise exception 'You already have a payment pending review for this class.';
  end if;

  select count(*)::integer into v_enrolled from public.class_students where class_id = p_class_id;
  v_limit := v_class.class_limit;
  if v_limit is not null and v_limit > 0 and v_enrolled >= v_limit then
    raise exception 'This class is full.';
  end if;

  select * into v_profile from public.profiles_client where account_id = v_account_id;
  select * into v_seller from public.studio_receipt_config where id = 1;

  v_buyer_name := coalesce(nullif(btrim(v_profile.name), ''), (
    select email from public.accounts where id = v_account_id
  ), 'Member');
  v_buyer_address := nullif(
    btrim(concat_ws(', ', nullif(v_profile.barangay, ''), nullif(v_profile.city, ''), nullif(v_profile.province, ''))),
    ''
  );

  v_desc := coalesce(nullif(btrim(v_class.name), ''), 'Studio class session');

  v_uid := public.next_payment_uid(now());

  insert into public.class_payments (
    uid,
    class_id,
    account_id,
    status,
    verified,
    payment_channel_id,
    payment_method_label,
    payment_reference,
    proof_storage_path,
    member_notes,
    unit_price,
    amount_paid,
    total_amount_due,
    amount_tendered,
    change_amount,
    seller_business_name,
    seller_address,
    seller_tin,
    buyer_name,
    buyer_email,
    buyer_address,
    service_description,
    class_starts_at,
    class_ends_at,
    request_physical_receipt
  )
  values (
    v_uid,
    p_class_id,
    v_account_id,
    'pending',
    false,
    p_payment_channel_id,
    v_channel.label,
    coalesce(p_payment_reference, ''),
    btrim(p_proof_storage_path),
    coalesce(p_member_notes, ''),
    p_amount_paid,
    p_amount_paid,
    p_amount_paid,
    p_amount_paid,
    0,
    coalesce(v_seller.business_name, ''),
    coalesce(v_seller.business_address, ''),
    coalesce(v_seller.tin, ''),
    v_buyer_name,
    (select email from public.accounts where id = v_account_id),
    coalesce(v_buyer_address, ''),
    v_desc,
    v_class.starts_at,
    v_class.ends_at,
    coalesce(p_request_physical_receipt, false)
  )
  returning id into v_payment_id;

  insert into public.class_waitlist (class_id, account_id, payment_id)
  values (p_class_id, v_account_id, v_payment_id)
  on conflict (class_id, account_id) do update
    set payment_id = excluded.payment_id,
        joined_at = now();

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'uid', v_uid,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.submit_member_class_payment(uuid, uuid, text, text, numeric, text, boolean) from public;
grant execute on function public.submit_member_class_payment(uuid, uuid, text, text, numeric, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Admin approve / reject
-- ---------------------------------------------------------------------------

create or replace function public.admin_review_class_payment(
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
  v_payment public.class_payments%rowtype;
  v_class public.classes%rowtype;
  v_enrolled integer;
begin
  if not public.is_admin_or_dev() then
    raise exception 'Not authorized.';
  end if;

  select * into v_payment from public.class_payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.';
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'Payment is already reviewed.';
  end if;

  if p_approve then
    select * into v_class from public.classes where id = v_payment.class_id for update;
    select count(*)::integer into v_enrolled from public.class_students where class_id = v_payment.class_id;
    if v_class.class_limit is not null and v_class.class_limit > 0 and v_enrolled >= v_class.class_limit then
      raise exception 'Class is full; cannot approve enrollment.';
    end if;

    update public.class_payments
    set
      status = 'approved',
      verified = true,
      review_note = coalesce(p_review_note, ''),
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      receipt_issued_at = coalesce(receipt_issued_at, now())
    where id = p_payment_id;

    if not exists (
      select 1 from public.class_students cs
      where cs.class_id = v_payment.class_id and cs.account_id = v_payment.account_id
    ) then
      insert into public.class_students (class_id, account_id, enrolled_by)
      values (v_payment.class_id, v_payment.account_id, v_reviewer);
    end if;

    delete from public.class_waitlist
    where class_id = v_payment.class_id and account_id = v_payment.account_id;

    return jsonb_build_object('status', 'approved', 'verified', true);
  end if;

  update public.class_payments
  set
    status = 'rejected',
    verified = false,
    review_note = coalesce(p_review_note, ''),
    reviewed_by = v_reviewer,
    reviewed_at = now()
  where id = p_payment_id;

  delete from public.class_waitlist
  where class_id = v_payment.class_id and account_id = v_payment.account_id;

  return jsonb_build_object('status', 'rejected', 'verified', false);
end;
$$;

revoke all on function public.admin_review_class_payment(uuid, boolean, text) from public;
grant execute on function public.admin_review_class_payment(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. RLS
-- ---------------------------------------------------------------------------

alter table public.class_payments enable row level security;
alter table public.class_waitlist enable row level security;

drop policy if exists class_payments_select_own on public.class_payments;
drop policy if exists class_payments_select_admin on public.class_payments;
drop policy if exists class_payments_insert_member on public.class_payments;
drop policy if exists class_payments_update_admin on public.class_payments;

create policy class_payments_select_own
  on public.class_payments
  for select
  to authenticated
  using (account_id = public.current_account_id());

create policy class_payments_select_admin
  on public.class_payments
  for select
  to authenticated
  using (public.is_admin_or_dev());

create policy class_payments_update_admin
  on public.class_payments
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

drop policy if exists class_waitlist_select_own on public.class_waitlist;
drop policy if exists class_waitlist_select_admin on public.class_waitlist;

create policy class_waitlist_select_own
  on public.class_waitlist
  for select
  to authenticated
  using (account_id = public.current_account_id());

create policy class_waitlist_select_admin
  on public.class_waitlist
  for select
  to authenticated
  using (public.is_admin_or_dev());

-- ---------------------------------------------------------------------------
-- 10. Storage bucket: payment_proofs (private; member folder = auth uid)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment_proofs',
  'payment_proofs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payment_proofs_insert_own on storage.objects;
drop policy if exists payment_proofs_select_own on storage.objects;
drop policy if exists payment_proofs_select_admin on storage.objects;

create policy payment_proofs_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'payment_proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy payment_proofs_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'payment_proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy payment_proofs_select_admin
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'payment_proofs'
    and public.is_admin_or_dev()
  );

-- ---------------------------------------------------------------------------
-- 11. Storage bucket: payment_channel_qr (public read; admin manages QR images)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment_channel_qr',
  'payment_channel_qr',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payment_channel_qr_select_public on storage.objects;
drop policy if exists payment_channel_qr_insert_admin on storage.objects;
drop policy if exists payment_channel_qr_update_admin on storage.objects;
drop policy if exists payment_channel_qr_delete_admin on storage.objects;

create policy payment_channel_qr_select_public
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'payment_channel_qr');

create policy payment_channel_qr_insert_admin
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'payment_channel_qr'
    and public.is_admin_or_dev()
  );

create policy payment_channel_qr_update_admin
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'payment_channel_qr'
    and public.is_admin_or_dev()
  )
  with check (
    bucket_id = 'payment_channel_qr'
    and public.is_admin_or_dev()
  );

create policy payment_channel_qr_delete_admin
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'payment_channel_qr'
    and public.is_admin_or_dev()
  );
