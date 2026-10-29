import { useCallback, useEffect, useState } from 'react';
import {
  CLASS_PAYMENTS_CHANGED,
  fetchMemberFinanceAttentionCounts,
  type MemberFinanceAttentionCounts,
} from '../../lib/class-payment-service';
import {
  SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED,
} from '../../lib/subscription-package-payment-service';

const EMPTY: MemberFinanceAttentionCounts = { classReturned: 0, packReturned: 0 };

/** Returned payments that need member action (resubmit proof). */
export function useMemberFinanceAttentionCounts(): MemberFinanceAttentionCounts {
  const [counts, setCounts] = useState<MemberFinanceAttentionCounts>(EMPTY);

  const refresh = useCallback(async () => {
    setCounts(await fetchMemberFinanceAttentionCounts());
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    window.addEventListener(CLASS_PAYMENTS_CHANGED, onChange);
    window.addEventListener(SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED, onChange);
    return () => {
      window.removeEventListener(CLASS_PAYMENTS_CHANGED, onChange);
      window.removeEventListener(SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED, onChange);
    };
  }, [refresh]);

  return counts;
}
