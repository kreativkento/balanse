import { Outlet, useLocation } from 'react-router';
import { StaffSidebar } from './StaffSidebar';
import { StaffAuthGate } from './PortalAuthGate';

/** Logged-in staff chrome: sidebar layout (separate from member/admin sites). */
export function StaffSiteLayout() {
  const { pathname } = useLocation();

  return (
    <StaffAuthGate>
      <StaffSidebar>
        <Outlet key={pathname} />
      </StaffSidebar>
    </StaffAuthGate>
  );
}
