import { Outlet, useLocation } from 'react-router';
import { Suspense } from 'react';
import { NavBar } from './NavBar';
import { BottomCTA } from './BottomCTA';
import { HelpSupportFab } from './HelpSupportFab';
import { ContentAreaFallback } from './PortalRouteOutlet';

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
const HIDE_CHAT_PATHS = ['/login', '/signup', '/auth', '/member-forgot-password'];

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
        data-mobile-compact
        className={`relative z-0 flex min-h-0 flex-1 flex-col pb-5 md:pb-10 ${lockScroll ? 'overflow-hidden' : ''}`}
      >
        <Suspense fallback={<ContentAreaFallback />}>
          <Outlet />
        </Suspense>
      </main>
      {showBottomCTA && <BottomCTA />}
      {!HIDE_CHAT_PATHS.includes(location.pathname) && (
        <HelpSupportFab withBottomCta={showBottomCTA} />
      )}
    </div>
  );
}
