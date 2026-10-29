import { useCallback, useEffect, useState } from 'react';
import { countClassCancelHoldingsPendingRefund } from '../../lib/class-cancel-holding-service';
import {
  fetchPendingPortalRequestCount,
  PORTAL_REQUESTS_CHANGED,
} from '../../lib/portal-request-service';

export type AdminCoachQueuePendingCounts = {
  slots: number;
  cancellations: number;
};

/** Pending coach slot requests vs cancellation / refund-holding queues. */
export function useAdminCoachQueuePendingCounts(): AdminCoachQueuePendingCounts {
  const [counts, setCounts] = useState<AdminCoachQueuePendingCounts>({
    slots: 0,
    cancellations: 0,
  });

  const refresh = useCallback(async () => {
    const [slots, cancelRequests, refunds] = await Promise.all([
      fetchPendingPortalRequestCount(['slot_request']),
      fetchPendingPortalRequestCount(['cancellation_request', 'member_enrollment_cancellation']),
      countClassCancelHoldingsPendingRefund(),
    ]);
    setCounts({
      slots,
      cancellations: cancelRequests + refunds,
    });
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    window.addEventListener(PORTAL_REQUESTS_CHANGED, onChange);
    return () => window.removeEventListener(PORTAL_REQUESTS_CHANGED, onChange);
  }, [refresh]);

  return counts;
}
