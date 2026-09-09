import { Outlet } from 'react-router';
import { StaffSidebar } from './StaffSidebar';

/** Logged-in staff chrome: sidebar layout (separate from member/admin sites). */
export function StaffSiteLayout() {
  return (
    <StaffSidebar>
      <Outlet />
    </StaffSidebar>
  );
}
