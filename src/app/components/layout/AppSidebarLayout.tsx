import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import {
  PortalChromeProvider,
  PortalMobileDrawerProvider,
  PortalNavIconOnlyProvider,
  usePortalChrome,
} from '../../context/PortalChromeContext';
import { usePortalSectionNav } from '../../context/PortalSectionNavContext';
import { MobileSectionSubnav } from './SidebarNavLink';

const RAIL_WIDTH_CLASS = 'w-[4.5rem]';

interface AppSidebarLayoutProps {
  children: ReactNode;
  renderSidebar: (closeMobile: () => void) => ReactNode;
  header: ReactNode;
  /** Tailwind width class for desktop hover-expanded + mobile drawer (default `w-60`). */
  sidebarWidthClass?: string;
  /** `desktop-hidden`: scroll on mobile, locked on md+ */
  mainOverflow?: 'auto' | 'hidden' | 'desktop-hidden';
  /** Marks the main pane so member class schedule can lock overflow. */
  memberMainScroll?: boolean;
}

function AppSidebarShell({
  children,
  renderSidebar,
  header,
  sidebarWidthClass = 'w-60',
  mainOverflow = 'auto',
  memberMainScroll = false,
}: AppSidebarLayoutProps) {
  const location = useLocation();
  const chrome = usePortalChrome();
  const mobileOpen = chrome?.mobileOpen ?? false;
  const closeMobile = chrome?.closeMobileMenu ?? (() => undefined);
  const { groups } = usePortalSectionNav();
  const mobileSection =
    groups.find(
      (group) =>
        group.key === chrome?.mobileSectionKey &&
        !group.disabled &&
        group.links.filter((link) => !link.disabled).length >= 2,
    ) ?? null;
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<number | null>(null);

  useEffect(() => {
    closeMobile();
  }, [location.pathname, closeMobile]);

  useEffect(() => {
    return () => {
      if (leaveTimer.current != null) window.clearTimeout(leaveTimer.current);
    };
  }, []);

  const handleEnter = () => {
    if (leaveTimer.current != null) window.clearTimeout(leaveTimer.current);
    setHovered(true);
  };

  const handleLeave = () => {
    if (leaveTimer.current != null) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setHovered(false), 180);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8F3E8]">
      <div className="relative z-40 shrink-0">{header}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[#1E2A35]/40 backdrop-blur-sm" onClick={closeMobile} />
          <aside
            className={`absolute left-0 top-0 z-50 flex h-full bg-white shadow-2xl ${
              mobileSection ? 'w-[min(92vw,21.5rem)]' : sidebarWidthClass
            }`}
          >
            <PortalMobileDrawerProvider active>
              <div
                className={`flex h-full shrink-0 flex-col ${
                  mobileSection ? `${RAIL_WIDTH_CLASS} overflow-visible` : 'w-full overflow-hidden'
                }`}
              >
                <PortalNavIconOnlyProvider iconOnly={Boolean(mobileSection)}>
                  {renderSidebar(closeMobile)}
                </PortalNavIconOnlyProvider>
              </div>
              {mobileSection ? (
                <div className="flex min-h-0 min-w-0 flex-1 border-l border-[#D4CDB5]/50">
                  <PortalNavIconOnlyProvider iconOnly={false}>
                    <MobileSectionSubnav group={mobileSection} onNavigate={closeMobile} />
                  </PortalNavIconOnlyProvider>
                </div>
              ) : null}
            </PortalMobileDrawerProvider>
          </aside>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className={`relative z-30 hidden shrink-0 ${RAIL_WIDTH_CLASS} md:block`}>
          <aside
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            className={`absolute inset-y-0 left-0 z-30 flex flex-col border-r border-[#D4CDB5]/60 bg-white will-change-[width] ${
              hovered
                ? `${sidebarWidthClass} overflow-hidden shadow-[12px_0_32px_rgba(30,42,53,0.14)]`
                : `${RAIL_WIDTH_CLASS} overflow-visible`
            }`}
            style={{
              transition:
                'width 480ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 480ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <PortalNavIconOnlyProvider iconOnly={!hovered}>
              {renderSidebar(closeMobile)}
            </PortalNavIconOnlyProvider>
          </aside>
        </div>

        <main
          data-mobile-compact
          {...(memberMainScroll ? { 'data-member-main-scroll': true } : {})}
          className={`relative z-0 isolate flex min-h-0 min-w-0 flex-1 flex-col pb-5 md:pb-10 [scrollbar-gutter:stable] ${
            mainOverflow === 'hidden'
              ? 'overflow-hidden'
              : mainOverflow === 'desktop-hidden'
                ? 'overflow-y-auto md:overflow-y-hidden'
                : 'overflow-y-auto'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Shared sidebar shell for member / admin / staff.
 * Icon rail on desktop that expands on hover; drawer on mobile.
 */
export function AppSidebarLayout(props: AppSidebarLayoutProps) {
  return (
    <PortalChromeProvider>
      <AppSidebarShell {...props} />
    </PortalChromeProvider>
  );
}
