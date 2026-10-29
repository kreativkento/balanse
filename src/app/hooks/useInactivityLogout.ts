import { useCallback, useEffect, useRef } from 'react';

type UseInactivityLogoutOptions = {
  enabled: boolean;
  idleMs: number;
  warnBeforeMs: number;
  onWarn: () => void;
  onWarnDismiss: () => void;
  onIdleLogout: () => void;
};

export function useInactivityLogout({
  enabled,
  idleMs,
  warnBeforeMs,
  onWarn,
  onWarnDismiss,
  onIdleLogout,
}: UseInactivityLogoutOptions) {
  const warningActiveRef = useRef(false);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const callbacksRef = useRef({ onWarn, onWarnDismiss, onIdleLogout });
  callbacksRef.current = { onWarn, onWarnDismiss, onIdleLogout };

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    warnTimerRef.current = null;
    logoutTimerRef.current = null;
  }, []);

  const scheduleIdleTimers = useCallback(() => {
    clearTimers();
    warningActiveRef.current = false;
    callbacksRef.current.onWarnDismiss();

    const warnDelay = Math.max(0, idleMs - warnBeforeMs);
    warnTimerRef.current = setTimeout(() => {
      warningActiveRef.current = true;
      callbacksRef.current.onWarn();
      logoutTimerRef.current = setTimeout(() => {
        callbacksRef.current.onIdleLogout();
      }, warnBeforeMs);
    }, warnDelay);
  }, [clearTimers, idleMs, warnBeforeMs]);

  const confirmStillHere = useCallback(() => {
    warningActiveRef.current = false;
    callbacksRef.current.onWarnDismiss();
    scheduleIdleTimers();
  }, [scheduleIdleTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      warningActiveRef.current = false;
      callbacksRef.current.onWarnDismiss();
      return;
    }

    scheduleIdleTimers();

    const onActivity = () => {
      if (warningActiveRef.current) return;
      scheduleIdleTimers();
    };

    let moveThrottle: ReturnType<typeof setTimeout> | null = null;
    const onMouseMove = () => {
      if (warningActiveRef.current) return;
      if (moveThrottle) return;
      moveThrottle = setTimeout(() => {
        moveThrottle = null;
      }, 1000);
      scheduleIdleTimers();
    };

    const activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    for (const event of activityEvents) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      clearTimers();
      for (const event of activityEvents) {
        window.removeEventListener(event, onActivity);
      }
      window.removeEventListener('mousemove', onMouseMove);
      if (moveThrottle) clearTimeout(moveThrottle);
    };
  }, [enabled, scheduleIdleTimers, clearTimers]);

  return { confirmStillHere };
}
