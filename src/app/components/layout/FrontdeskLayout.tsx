import { FrontdeskSidebar } from './FrontdeskSidebar';
import { FrontdeskAuthGate } from './PortalAuthGate';
import { PortalRouteOutlet } from './PortalRouteOutlet';

export function FrontdeskLayout() {
  return (
    <FrontdeskAuthGate>
      <FrontdeskSidebar>
        <PortalRouteOutlet />
      </FrontdeskSidebar>
    </FrontdeskAuthGate>
  );
}
