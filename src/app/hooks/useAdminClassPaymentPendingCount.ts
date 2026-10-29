import { useCallback, useEffect, useState } from 'react';
import {
  CLASS_PAYMENTS_CHANGED,
  fetchPendingClassPaymentCount,
} from '../../lib/class-payment-service';

/** Pending class/drop-in checkout rows awaiting admin or front desk review. */
export function useAdminClassPaymentPendingCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setCount(await fetchPendingClassPaymentCount());
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    window.addEventListener(CLASS_PAYMENTS_CHANGED, onChange);
    return () => window.removeEventListener(CLASS_PAYMENTS_CHANGED, onChange);
  }, [refresh]);

  return count;
}
