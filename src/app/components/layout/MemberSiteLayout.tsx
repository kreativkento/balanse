import { Outlet } from 'react-router';
import { MemberSidebar } from './MemberSidebar';

/** Logged-in member chrome: sidebar layout (separate from public navbar site). */
export function MemberSiteLayout() {
  return (
    <MemberSidebar>
      <Outlet />
    </MemberSidebar>
  );
}
