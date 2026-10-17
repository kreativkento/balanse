import { Outlet, useLocation } from 'react-router';
import { MarketingSidebar } from './MarketingSidebar';
import { MarketingAuthGate } from './PortalAuthGate';

export function MarketingLayout() {
  const { pathname } = useLocation();

  return (
    <MarketingAuthGate>
      <MarketingSidebar>
        <Outlet key={pathname} />
      </MarketingSidebar>
    </MarketingAuthGate>
  );
}
