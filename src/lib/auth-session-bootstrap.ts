import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Hydrate app auth state from Supabase and mark ready only after INITIAL_SESSION,
 * so protected routes do not redirect to login while the persisted session is still loading.
 */
export function listenForSupabaseAuthBootstrap(
  applySession: (authUserId: string | null) => void | Promise<void>,
  setReady: () => void,
): () => void {
  let mounted = true;
  let readyCalled = false;

  const markReady = () => {
    if (!mounted || readyCalled) return;
    readyCalled = true;
    setReady();
  };

  const fallbackTimer = window.setTimeout(() => {
    markReady();
  }, 4000);

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;
      if (session?.user) {
        await applySession(session.user.id);
      } else {
        await applySession(null);
      }
      if (event === 'INITIAL_SESSION') {
        window.clearTimeout(fallbackTimer);
        markReady();
      }
    },
  );

  return () => {
    mounted = false;
    window.clearTimeout(fallbackTimer);
    subscription.unsubscribe();
  };
}
