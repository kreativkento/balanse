import { StaffSidebar } from './StaffSidebar';
import { StaffAuthGate } from './PortalAuthGate';
import { PortalRouteOutlet } from './PortalRouteOutlet';

/** Logged-in staff chrome: sidebar layout (separate from member/admin sites). */
export function StaffSiteLayout() {
  return (
    <StaffAuthGate>
      <StaffSidebar>
        <PortalRouteOutlet />
      </StaffSidebar>
    </StaffAuthGate>
  );
}
