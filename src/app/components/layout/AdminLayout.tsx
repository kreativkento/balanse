import { Outlet } from 'react-router';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  return (
    <AdminSidebar>
      <Outlet />
    </AdminSidebar>
  );
}
