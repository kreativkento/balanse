-- Sidebar pending badges refresh via postgres_changes (see usePortalPendingSync).

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'portal_requests',
    'class_payments_escrow',
    'subscription_package_payments_escrow',
    'bulletin_posts',
    'account_notifications',
    'class_cancel_holdings'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
