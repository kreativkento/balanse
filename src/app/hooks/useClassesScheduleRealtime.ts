import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const DEBOUNCE_MS = 400;

/**
 * Subscribes to `public.classes` changes and calls `onSync` (debounced).
 * Used by class schedule calendars to refresh in place without a full page reload.
 */
export function useClassesScheduleRealtimeSync(
  onSync: () => void,
  enabled: boolean,
): void {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const scheduleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onSyncRef.current();
      }, DEBOUNCE_MS);
    };

    channel = supabase
      .channel(`classes-schedule-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        () => {
          scheduleSync();
        },
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled]);
}
