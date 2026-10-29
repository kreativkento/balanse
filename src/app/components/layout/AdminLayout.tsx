import { AdminSidebar } from './AdminSidebar';
import { AdminAuthGate } from './PortalAuthGate';
import { PortalRouteOutlet } from './PortalRouteOutlet';

export function AdminLayout() {
  return (
    <AdminAuthGate>
      <AdminSidebar>
        <PortalRouteOutlet />
      </AdminSidebar>
    </AdminAuthGate>
  );
}
