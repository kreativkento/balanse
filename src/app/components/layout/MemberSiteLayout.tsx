import { Outlet, useLocation } from 'react-router';
import { MemberSidebar } from './MemberSidebar';
import { useAuth } from '../../context/AuthContext';
import { PageLoadingScreen } from './PageLoadingScreen';
import { Navigate } from 'react-router';

/** Logged-in member chrome: sidebar layout (separate from public navbar site). */
export function MemberSiteLayout() {
  const { pathname } = useLocation();
  const { user, authReady } = useAuth();

  if (!authReady) return <PageLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <MemberSidebar
      lockScrollDesktop={
        pathname === '/dashboard'
        || pathname === '/studio-disciplines'
        || pathname === '/class-schedule'
        || pathname === '/payment-history'
        || pathname === '/credits'
      }
    >
      <Outlet />
    </MemberSidebar>
  );
}
