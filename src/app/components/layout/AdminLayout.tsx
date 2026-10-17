import { Outlet, useLocation } from 'react-router';
import { AdminSidebar } from './AdminSidebar';
import { AdminAuthGate } from './PortalAuthGate';

export function AdminLayout() {
  const { pathname } = useLocation();

  return (
    <AdminAuthGate>
      <AdminSidebar>
        {/* Remount page on admin nav so viewport-fit pages (e.g. disciplines) do not stick. */}
        <Outlet key={pathname} />
      </AdminSidebar>
    </AdminAuthGate>
  );
}
