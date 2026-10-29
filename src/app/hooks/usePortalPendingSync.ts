import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BULLETIN_POSTS_CHANGED } from '../../lib/bulletin-service';
import { ACCOUNT_NOTIFICATIONS_CHANGED } from '../../lib/feedback-comment-service';
import { CLASS_PAYMENTS_CHANGED } from '../../lib/class-payment-service';
import { PORTAL_REQUESTS_CHANGED } from '../../lib/portal-request-service';
import { SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED } from '../../lib/subscription-package-payment-service';

const DEBOUNCE_MS = 400;
const POLL_MS = 30_000;

const TABLE_EVENTS: { table: string; event: string }[] = [
  { table: 'portal_requests', event: PORTAL_REQUESTS_CHANGED },
  { table: 'class_cancel_holdings', event: PORTAL_REQUESTS_CHANGED },
  { table: 'class_payments_escrow', event: CLASS_PAYMENTS_CHANGED },
  { table: 'subscription_package_payments_escrow', event: SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED },
  { table: 'bulletin_posts', event: BULLETIN_POSTS_CHANGED },
  { table: 'account_notifications', event: ACCOUNT_NOTIFICATIONS_CHANGED },
];

function dispatchEvent(name: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(name));
}

function dispatchAllPendingEvents() {
  const seen = new Set<string>();
  for (const { event } of TABLE_EVENTS) {
    if (seen.has(event)) continue;
    seen.add(event);
    dispatchEvent(event);
  }
}

/**
 * Keeps sidebar pending badges and notification counts fresh when data changes
 * on the server (other tabs, other roles, edge functions) via Realtime + polling.
 */
export function usePortalPendingSync(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase.channel(`portal-pending-${crypto.randomUUID()}`);

    const schedule = (eventName: string) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => dispatchEvent(eventName), DEBOUNCE_MS);
    };

    for (const { table, event } of TABLE_EVENTS) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        schedule(event);
      });
    }

    void channel.subscribe();

    dispatchAllPendingEvents();
    const pollTimer = window.setInterval(dispatchAllPendingEvents, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') dispatchAllPendingEvents();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      void supabase.removeChannel(channel);
    };
  }, [enabled]);
}
