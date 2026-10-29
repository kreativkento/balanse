import { useCallback, useEffect, useState } from 'react';
import {
  fetchMyPendingPortalRequestCount,
  PORTAL_REQUESTS_CHANGED,
} from '../../lib/portal-request-service';

/** Coach/staff slot or cancellation requests still pending review. */
export function useStaffPendingPortalRequestCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setCount(await fetchMyPendingPortalRequestCount());
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
