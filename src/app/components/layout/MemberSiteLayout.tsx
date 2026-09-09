import { Outlet, useLocation } from 'react-router';
import { MemberSidebar } from './MemberSidebar';

/** Logged-in member chrome: sidebar layout (separate from public navbar site). */
export function MemberSiteLayout() {
  const { pathname } = useLocation();

  return (
    <MemberSidebar lockScrollDesktop={pathname === '/dashboard' || pathname === '/studio-disciplines'}>
      <Outlet />
    </MemberSidebar>
  );
}
