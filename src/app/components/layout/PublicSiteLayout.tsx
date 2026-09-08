import { Outlet, useLocation } from 'react-router';
import { NavBar } from './NavBar';
import { BottomCTA } from './BottomCTA';

const PAGES_WITH_CTA = [
  '/',
  '/studio',
  '/studio/guidelines',
  '/pricing',
  '/services',
  '/classes',
  '/disciplines',
  '/coaches',
  '/bulletin',
  '/events',
];

const LOCK_SCROLL_PATHS = ['/login', '/signup', '/coaches'];

/** Public site chrome: sticky navbar (+ optional footer). Member pages use MemberSiteLayout. */
export function PublicSiteLayout() {
  const location = useLocation();
  const showBottomCTA = PAGES_WITH_CTA.includes(location.pathname);
  const lockScroll = LOCK_SCROLL_PATHS.includes(location.pathname);

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
