import { useCallback, useEffect, useState } from 'react';
import {
  fetchPendingPortalRequestCount,
  PORTAL_REQUESTS_CHANGED,
} from '../../lib/portal-request-service';

/** Pending portal requests (booking + cancellation) for admin sidebar badge. */
export function useAdminCoachRequestsPendingCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const pending = await fetchPendingPortalRequestCount();
    setCount(pending);
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    window.addEventListener(PORTAL_REQUESTS_CHANGED, onChange);
    return () => window.removeEventListener(PORTAL_REQUESTS_CHANGED, onChange);
  }, [refresh]);

  return count;
}
