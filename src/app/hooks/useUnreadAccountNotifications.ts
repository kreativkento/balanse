import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import {
  ACCOUNT_NOTIFICATIONS_CHANGED,
  countUnreadAccountNotifications,
} from '../../lib/feedback-comment-service';

export function useUnreadAccountNotifications(): number {
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setCount(await countUnreadAccountNotifications());
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    window.addEventListener(ACCOUNT_NOTIFICATIONS_CHANGED, onChange);
    const timer = window.setInterval(() => {
      void refresh();
    }, 30000);
    return () => {
      window.removeEventListener(ACCOUNT_NOTIFICATIONS_CHANGED, onChange);
      window.clearInterval(timer);
    };
  }, [pathname, refresh]);

  return count;
}
