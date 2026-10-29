import { MarketingSidebar } from './MarketingSidebar';
import { MarketingAuthGate } from './PortalAuthGate';
import { PortalRouteOutlet } from './PortalRouteOutlet';

export function MarketingLayout() {
  return (
    <MarketingAuthGate>
      <MarketingSidebar>
        <PortalRouteOutlet />
      </MarketingSidebar>
    </MarketingAuthGate>
  );
}
