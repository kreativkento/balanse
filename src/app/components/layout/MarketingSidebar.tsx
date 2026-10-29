import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { Images, Megaphone, MessageSquare, Newspaper, Sparkles } from 'lucide-react';
import { AdminHeaderActionsProvider } from '../../context/AdminHeaderActionsContext';
import { MarketingGreetingHeader, MarketingPortalHeader } from './DashboardGreetingBar';
import { AppSidebarLayout } from './AppSidebarLayout';
import { isPublicNavActive } from './NavBar';
import { SidebarCollapseBar, SidebarNav, SidebarNavGroupButton, SidebarNavLink } from './SidebarNavLink';
import { useUnreadAccountNotifications } from '../../hooks/useUnreadAccountNotifications';
import { useAdminBulletinPendingCount } from '../../hooks/useAdminBulletinPendingCount';
import {
  PortalSectionNavProvider,
  usePortalSectionNav,
  type PortalSectionGroup,
} from '../../context/PortalSectionNavContext';

function buildMarketingGroups(bulletinPendingCount: number): PortalSectionGroup[] {
  return [
    {
      key: 'marketing',
      label: 'Marketing',
      icon: <Megaphone size={16} />,
      links: [
        {
          label: 'Bulletin',
          path: '/marketing-dashboard',
          icon: <Newspaper size={16} />,
          pendingCount: bulletinPendingCount,
        },
        { label: 'Gallery', path: '/marketing-gallery', icon: <Images size={16} /> },
        { label: 'Amenities', path: '/marketing-amenities', icon: <Sparkles size={16} /> },
      ],
    },
  ];
}

function MarketingSidebarNav({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const location = useLocation();
  const { groups } = usePortalSectionNav();
  const unreadNotifications = useUnreadAccountNotifications();
  const isActive = (path: string) => isPublicNavActive(location.pathname, path);

  return (
    <div className="flex h-full flex-col">
      <SidebarCollapseBar onCloseMobile={onNavigate} />

      <SidebarNav>
        <div className="flex flex-col gap-1">
          {groups.map((group) => (
            <SidebarNavGroupButton
              key={group.key}
              group={group}
              active={group.links.some((link) => isActive(link.path))}
              onNavigate={onNavigate}
            />
          ))}
          <SidebarNavLink
            to="/marketing-feedback"
            icon={<MessageSquare size={16} />}
            label="System Feedback"
            active={isActive('/marketing-feedback')}
            onNavigate={onNavigate}
            appearance="gold"
            pendingCount={unreadNotifications}
          />
        </div>
      </SidebarNav>
    </div>
  );
}

interface MarketingSidebarProps {
  children: React.ReactNode;
}

/** Logged-in marketing portal chrome (sidebar). */
export function MarketingSidebar({ children }: MarketingSidebarProps) {
  const { pathname } = useLocation();
  const bulletinPendingCount = useAdminBulletinPendingCount();
  const groups = useMemo(() => buildMarketingGroups(bulletinPendingCount), [bulletinPendingCount]);

  useEffect(() => {
    document.querySelector('[data-marketing-main-scroll]')?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <AdminHeaderActionsProvider>
      <PortalSectionNavProvider groups={groups}>
        <AppSidebarLayout
          sidebarWidthClass="w-60"
          mainOverflow="desktop-hidden"
          header={<MarketingPortalHeader searchPlaceholder="Search gallery, amenities, bulletin…" />}
          renderSidebar={(closeMobile) => <MarketingSidebarNav onNavigate={closeMobile} />}
        >
          <div className="flex h-full min-h-0 flex-col bg-[#F8F3E8]">
            <div className="mx-auto w-full max-w-8xl shrink-0 px-4 md:px-6">
              <MarketingGreetingHeader slot="nav" />
            </div>
            <div data-marketing-main-scroll className="min-h-0 flex-1 overflow-y-auto flex flex-col">
              <div className="mx-auto w-full max-w-8xl shrink-0 px-4 md:px-6">
                <MarketingGreetingHeader slot="title" />
              </div>
              {children}
            </div>
          </div>
        </AppSidebarLayout>
      </PortalSectionNavProvider>
    </AdminHeaderActionsProvider>
  );
}
