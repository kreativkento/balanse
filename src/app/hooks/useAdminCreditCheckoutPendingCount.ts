import { useCallback, useEffect, useState } from 'react';
import {
  fetchPendingSubscriptionPackagePaymentCount,
  SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED,
} from '../../lib/subscription-package-payment-service';

/** Pending credit pack checkout payments for admin sidebar / credits Requests tab. */
export function useAdminCreditCheckoutPendingCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const pending = await fetchPendingSubscriptionPackagePaymentCount();
    setCount(pending);
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    window.addEventListener(SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED, onChange);
    return () => window.removeEventListener(SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED, onChange);
  }, [refresh]);

  return count;
}
