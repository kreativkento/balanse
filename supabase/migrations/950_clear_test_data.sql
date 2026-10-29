-- Test reset. Clears operational data and the storage files those rows point at.
-- Keeps the admin@balanse.com login (auth user, accounts row, and staff profile).
--
-- Applying this migration deletes the listed data on that database.
-- Catalog seeds inserted by earlier migrations (disciplines, payment channels,
-- gallery posts) are removed here and are not restored.
--
-- Left in place: pricing_offerings, studio_policy_settings, status lookups,
-- tickets created by the kept admin, and the default_assets bucket.

-- ---------------------------------------------------------------------------
-- 1. Storage objects tied to the rows being removed
-- ---------------------------------------------------------------------------

delete from storage.objects
where bucket_id in (
  'bulletin_resources',
  'gallery_media',
  'payment_proofs',
  'payment_channel_qr',
  'official_receipts',
  'feedback_attachments',
  'disciplines_images'
);

-- Profile photos/covers and signed member PDFs are stored under {auth_user_id}/...
delete from storage.objects o
where o.bucket_id in ('profile_images', 'member_documents')
  and not exists (
    select 1
    from public.accounts a
    where lower(a.email) = 'admin@balanse.com'
      and split_part(o.name, '/', 1) = a.auth_user_id::text
  );

do $$
begin
  if to_regclass('storage.prefixes') is null then
    return;
  end if;

  delete from storage.prefixes
  where bucket_id in (
    'bulletin_resources',
    'gallery_media',
    'payment_proofs',
    'payment_channel_qr',
    'official_receipts',
    'feedback_attachments',
    'disciplines_images'
  );

  delete from storage.prefixes p
  where p.bucket_id in ('profile_images', 'member_documents')
    and not exists (
      select 1
      from public.accounts a
      where lower(a.email) = 'admin@balanse.com'
        and (
          p.name = a.auth_user_id::text
          or p.name like a.auth_user_id::text || '/%'
        )
    );
end $$;

-- ---------------------------------------------------------------------------
-- 2. Rows, children before parents (RESTRICT foreign keys)
-- ---------------------------------------------------------------------------

delete from public.feedback_comments;
delete from public.feedback_ticket_participants;
delete from public.account_notifications;
delete from public.feedback_system;

delete from public.account_credit_lot_consumptions;
delete from public.account_credit_transactions;
delete from public.account_credit_lots;
delete from public.account_credit_wallets;
delete from public.account_subscriptions;

-- Final rows reference escrow with ON DELETE RESTRICT. Escrow points back
-- with ON DELETE SET NULL, so the final rows go first.
delete from public.subscription_package_final_transactions;
delete from public.final_transactions;
delete from public.class_waitlist;
delete from public.subscription_package_payments_escrow;
delete from public.class_payments_escrow;

delete from public.class_cancel_holdings;
delete from public.class_students;
delete from public.class_coaches;
delete from public.portal_requests;
delete from public.classes;

delete from public.coach_disciplines;
delete from public.disciplines;

delete from public.gallery_post_media;
delete from public.gallery_posts;
delete from public.bulletin_posts;

delete from public.payment_channels;
delete from public.staff_availability;
delete from public.studio_amenities_config;
delete from public.subscription_packages;

-- tickets.creator_account_id is ON DELETE RESTRICT. Drop tickets owned by
-- accounts that are about to be removed. The delete trigger would insert a
-- ticket_logs row pointing at the ticket that was just removed.
alter table public.tickets disable trigger user;
delete from public.tickets t
where not exists (
  select 1
  from public.accounts a
  where a.id = t.creator_account_id
    and lower(a.email) = 'admin@balanse.com'
);
alter table public.tickets enable trigger user;

delete from public.profiles_client;
delete from public.profiles_staff ps
where not exists (
  select 1
  from public.accounts a
  where a.id = ps.account_id
    and lower(a.email) = 'admin@balanse.com'
);

do $$
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  delete from public.profiles p
  where not exists (
    select 1
    from public.accounts a
    where a.id = p.account_id
      and lower(a.email) = 'admin@balanse.com'
  );
end $$;

delete from public.accounts
where lower(email) <> 'admin@balanse.com';

-- Storage owners reference auth.users. Detach files we kept (default assets)
-- before removing the auth users.
update storage.objects o
set owner = null
where not exists (
  select 1
  from public.accounts a
  where lower(a.email) = 'admin@balanse.com'
    and o.owner = a.auth_user_id
);

delete from auth.users u
where not exists (
  select 1
  from public.accounts a
  where a.auth_user_id = u.id
    and lower(a.email) = 'admin@balanse.com'
);

-- Audit triggers repopulate this table while the deletes above run.
delete from public.log_system;

-- Admin login reads profiles_staff. Restore the staff row if this reset
-- removed it or it was never created.
insert into public.profiles_staff (
  account_id,
  first_name,
  last_name,
  name,
  display_name,
  staff_type
)
select
  a.id,
  'Studio',
  'Admin',
  'Studio Admin',
  'Studio Admin',
  'Administrator'
from public.accounts a
where lower(a.email) = 'admin@balanse.com'
  and not exists (
    select 1
    from public.profiles_staff ps
    where ps.account_id = a.id
  );
