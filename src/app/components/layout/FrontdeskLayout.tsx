import { Outlet, useLocation } from 'react-router';
import { FrontdeskSidebar } from './FrontdeskSidebar';
import { FrontdeskAuthGate } from './PortalAuthGate';

export function FrontdeskLayout() {
  const { pathname } = useLocation();

  return (
    <FrontdeskAuthGate>
      <FrontdeskSidebar>
        <Outlet key={pathname} />
      </FrontdeskSidebar>
    </FrontdeskAuthGate>
  );
}
