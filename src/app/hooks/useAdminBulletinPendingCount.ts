import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import {
  BULLETIN_POSTS_CHANGED,
  countPendingBulletinPosts,
} from '../../lib/bulletin-service';

/** Unapproved bulletin posts waiting on admin. */
export function useAdminBulletinPendingCount(): number {
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setCount(await countPendingBulletinPosts());
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    window.addEventListener(BULLETIN_POSTS_CHANGED, onChange);
    return () => window.removeEventListener(BULLETIN_POSTS_CHANGED, onChange);
  }, [pathname, refresh]);

  return count;
}
