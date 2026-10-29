import { useCallback, useEffect, useState } from 'react';
import {
  fetchPendingPortalRequestCount,
  PORTAL_REQUESTS_CHANGED,
} from '../../lib/portal-request-service';

/** Coach slot booking requests waiting for review (front desk Bookings). */
export function useFrontdeskBookingsPendingCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setCount(await fetchPendingPortalRequestCount(['slot_request']));
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
