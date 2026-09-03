import { Outlet, useLocation } from 'react-router';
import { NavBar } from './NavBar';
import { PublicSidebar } from './PublicSidebar';
import { BottomCTA } from './BottomCTA';
import { useAuth } from '../../context/AuthContext';

const PAGES_WITH_CTA = ['/', '/studio', '/studio/guidelines', '/pricing', '/services', '/classes', '/disciplines'];

const LOCK_SCROLL_PATHS = ['/login', '/signup', '/coaches', '/disciplines'];

/** Public chrome: navbar everywhere except the logged-in dashboard, which uses the sidebar. */
export function PublicSiteLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const showBottomCTA = PAGES_WITH_CTA.includes(location.pathname);
  const lockScroll = LOCK_SCROLL_PATHS.includes(location.pathname);
  const showDashboardSidebar = isAuthenticated && location.pathname === '/dashboard';

  if (showDashboardSidebar) {
    return (
      <PublicSidebar>
        <Outlet />
      </PublicSidebar>
    );
  }

  return (
    <div className={`bg-[#F8F3E8] flex flex-col ${lockScroll ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
      <NavBar />
      <main className={`flex-1 flex flex-col ${lockScroll ? 'min-h-0 overflow-hidden' : ''}`}>
        <Outlet />
      </main>
      {showBottomCTA && <BottomCTA />}
    </div>
  );
}
