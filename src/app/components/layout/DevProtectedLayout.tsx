import { DevAuthGate } from './PortalAuthGate';
import { DevSidebar } from './DevSidebar';
import { PortalRouteOutlet } from './PortalRouteOutlet';

/** Dev portal pages (not the public `/development` login screen). */
export function DevProtectedLayout() {
  return (
    <DevAuthGate>
      <DevSidebar>
        <PortalRouteOutlet />
      </DevSidebar>
    </DevAuthGate>
  );
}
