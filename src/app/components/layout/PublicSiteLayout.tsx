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

const LOCK_SCROLL_PATHS = ['/login', '/signup'];

/** Full-height calendar (same flex chain as member class schedule). */
const FILL_VIEWPORT_PATHS = ['/classes'];

/** Public site chrome: sticky navbar (+ optional footer). Member pages use MemberSiteLayout. */
export function PublicSiteLayout() {
  const location = useLocation();
  const fillViewport = FILL_VIEWPORT_PATHS.includes(location.pathname);
  const showBottomCTA =
    PAGES_WITH_CTA.includes(location.pathname) && !fillViewport;
  const lockScroll = LOCK_SCROLL_PATHS.includes(location.pathname) || fillViewport;

  return (
    <div
      className={`bg-[#F8F3E8] flex flex-col ${
        lockScroll ? 'h-dvh overflow-hidden' : 'min-h-screen'
      }`}
    >
      <NavBar />
      <main
        className={`flex-1 flex flex-col min-h-0 ${lockScroll ? 'overflow-hidden' : ''}`}
      >
        <Outlet />
      </main>
      {showBottomCTA && <BottomCTA />}
    </div>
  );
}
