import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../../lib/supabase';
import {
  INACTIVITY_IDLE_MS_BY_ROLE,
  INACTIVITY_WARN_BEFORE_MS,
  loginPathForRole,
} from '../../../lib/session-inactivity-config';
import { useAuthenticatedSession } from '../../hooks/useAuthenticatedSession';
import { useInactivityLogout } from '../../hooks/useInactivityLogout';
import { InactivityWarningDialog } from './InactivityWarningDialog';

export function InactivitySessionGuard() {
  const navigate = useNavigate();
  const { sessionReady, role } = useAuthenticatedSession();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.ceil(INACTIVITY_WARN_BEFORE_MS / 1000),
  );

  const idleMs = role ? INACTIVITY_IDLE_MS_BY_ROLE[role] : INACTIVITY_IDLE_MS_BY_ROLE.user;
  const enabled = sessionReady && role !== null;

  const handleLogout = useCallback(async () => {
    const loginPath = role ? loginPathForRole(role) : '/login';
    setShowWarning(false);
    await supabase.auth.signOut();
    navigate(loginPath, { replace: true });
  }, [navigate, role]);

  const { confirmStillHere } = useInactivityLogout({
    enabled,
    idleMs,
    warnBeforeMs: INACTIVITY_WARN_BEFORE_MS,
    onWarn: () => {
      setSecondsRemaining(Math.ceil(INACTIVITY_WARN_BEFORE_MS / 1000));
      setShowWarning(true);
    },
    onWarnDismiss: () => setShowWarning(false),
    onIdleLogout: () => {
      void handleLogout();
    },
  });

  useEffect(() => {
    if (!showWarning) return;
    const id = window.setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [showWarning]);

  const dialog = useMemo(() => {
    if (!showWarning) return null;
    return (
      <InactivityWarningDialog
        secondsRemaining={secondsRemaining}
        onConfirm={confirmStillHere}
        onLogoutNow={() => {
          void handleLogout();
        }}
      />
    );
  }, [confirmStillHere, handleLogout, secondsRemaining, showWarning]);

  return dialog;
}
