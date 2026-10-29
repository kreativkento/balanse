import { useCallback, useEffect, useState } from 'react';
import { countClassCancelRequestsNeedingNotify } from '../../lib/class-cancel-holding-service';
import { PORTAL_REQUESTS_CHANGED } from '../../lib/portal-request-service';

/** Coach cancel requests that still have un-notified enrolled students. */
export function useFrontdeskCancelNotifyCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const pending = await countClassCancelRequestsNeedingNotify();
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
