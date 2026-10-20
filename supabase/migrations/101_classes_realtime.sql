-- Class schedule calendars listen for postgres_changes on public.classes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'classes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
  END IF;
END $$;
