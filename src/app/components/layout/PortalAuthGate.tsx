import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useStaffAuth } from '../../context/StaffAuthContext';
import { staffPortalHomePath } from '../../../lib/staff-portal-routes';
import { PageLoadingScreen } from './PageLoadingScreen';

function PortalAuthLoading() {
  return <PageLoadingScreen />;
}

/** Wait for Supabase session restore before rendering coach staff routes or redirecting. */
export function StaffAuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { staffUser, staffAuthReady } = useStaffAuth();

  useEffect(() => {
    if (!staffAuthReady) return;
    if (!staffUser) {
      navigate('/staff-login', { replace: true });
      return;
    }
    if (staffUser.accountRole !== 'coach') {
      navigate(staffPortalHomePath(staffUser.accountRole), { replace: true });
    }
  }, [staffAuthReady, staffUser, navigate]);

  if (!staffAuthReady) return <PortalAuthLoading />;
  if (!staffUser || staffUser.accountRole !== 'coach') return null;
  return <>{children}</>;
}

/** Wait for Supabase session restore before rendering admin routes or redirecting to login. */
export function AdminAuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { adminUser, adminAuthReady } = useAdminAuth();

  useEffect(() => {
    if (!adminAuthReady) return;
    if (!adminUser) {
      navigate('/admin-login', { replace: true });
      return;
    }
    if (adminUser.role === 'frontdesk') {
      navigate('/frontdesk-dashboard', { replace: true });
    }
    if (adminUser.role === 'marketing') {
      navigate('/marketing-dashboard', { replace: true });
    }
  }, [adminAuthReady, adminUser, navigate]);

  if (!adminAuthReady) return <PortalAuthLoading />;
  if (!adminUser || adminUser.role === 'frontdesk' || adminUser.role === 'marketing') return null;
  return <>{children}</>;
}

/** Front desk portal — frontdesk role via staff or admin login. */
export function FrontdeskAuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { staffUser, staffAuthReady } = useStaffAuth();
  const { adminUser, adminAuthReady } = useAdminAuth();

  const ready = staffAuthReady && adminAuthReady;
  const isFrontdesk =
    staffUser?.accountRole === 'frontdesk' || adminUser?.role === 'frontdesk';

  useEffect(() => {
    if (!ready) return;
    if (isFrontdesk) return;
    if (staffUser) {
      navigate(staffPortalHomePath(staffUser.accountRole), { replace: true });
      return;
    }
    if (adminUser) {
      navigate('/admin-dashboard', { replace: true });
      return;
    }
    navigate('/staff-login', { replace: true });
  }, [ready, isFrontdesk, staffUser, adminUser, navigate]);

  if (!ready || !isFrontdesk) return null;
  return <>{children}</>;
}

/** Marketing portal — marketing role via staff or admin login. */
export function MarketingAuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { staffUser, staffAuthReady } = useStaffAuth();
  const { adminUser, adminAuthReady } = useAdminAuth();

  const ready = staffAuthReady && adminAuthReady;
  const isMarketing =
    staffUser?.accountRole === 'marketing' || adminUser?.role === 'marketing';

  useEffect(() => {
    if (!ready) return;
    if (isMarketing) return;
    if (staffUser) {
      navigate(staffPortalHomePath(staffUser.accountRole), { replace: true });
      return;
    }
    if (adminUser) {
      navigate('/admin-dashboard', { replace: true });
      return;
    }
    navigate('/staff-login', { replace: true });
  }, [ready, isMarketing, staffUser, adminUser, navigate]);

  if (!ready || !isMarketing) return null;
  return <>{children}</>;
}
