import { useLocation } from 'react-router';
import { MemberSidebar } from './MemberSidebar';
import { MemberAuthGate } from './PortalAuthGate';
import { PortalRouteOutlet } from './PortalRouteOutlet';

/** Logged-in member chrome: sidebar layout (separate from public navbar site). */
export function MemberSiteLayout() {
  const { pathname } = useLocation();

  return (
    <MemberAuthGate>
      <MemberSidebar
        lockScrollDesktop={
          pathname === '/dashboard'
          || pathname === '/studio-disciplines'
          || pathname === '/class-schedule'
          || pathname === '/payment-history'
          || pathname === '/credits'
        }
      >
        <PortalRouteOutlet />
      </MemberSidebar>
    </MemberAuthGate>
  );
}
