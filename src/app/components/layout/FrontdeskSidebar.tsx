import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import {
  Award,
  Ban,
  CalendarRange,
  ClipboardList,
  CreditCard,
  Images,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { AdminHeaderActionsProvider } from '../../context/AdminHeaderActionsContext';
import { FrontdeskGreetingHeader, FrontdeskPortalHeader } from './DashboardGreetingBar';
import { AppSidebarLayout } from './AppSidebarLayout';
import { isPublicNavActive } from './NavBar';
import { SidebarCollapseBar, SidebarNav, SidebarNavGroupButton, SidebarNavLink } from './SidebarNavLink';
import { useUnreadAccountNotifications } from '../../hooks/useUnreadAccountNotifications';
import { useFrontdeskCancelNotifyCount } from '../../hooks/useFrontdeskCancelNotifyCount';
import { useFrontdeskBookingsPendingCount } from '../../hooks/useFrontdeskBookingsPendingCount';
import { useAdminClassPaymentPendingCount } from '../../hooks/useAdminClassPaymentPendingCount';
import { useAdminBulletinPendingCount } from '../../hooks/useAdminBulletinPendingCount';
import {
  PortalSectionNavProvider,
  usePortalSectionNav,
  type PortalSectionGroup,
} from '../../context/PortalSectionNavContext';

function buildFrontdeskGroups(
  cancelNotifyCount: number,
  bookingsPendingCount: number,
  classPaymentPendingCount: number,
  bulletinPendingCount: number,
): PortalSectionGroup[] {
  return [
    {
      key: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard size={16} />,
      links: [{ label: 'Dashboard', path: '/frontdesk-dashboard', icon: <LayoutDashboard size={16} /> }],
    },
    {
      key: 'community',
      label: 'Community',
      icon: <Users size={16} />,
      links: [
        { label: 'Clients', path: '/frontdesk-students', icon: <Users size={16} /> },
        { label: 'Coaches', path: '/frontdesk-coaches', icon: <Award size={16} /> },
        { label: 'Disciplines', path: '/frontdesk-disciplines', icon: <Layers size={16} /> },
      ],
    },
    {
      key: 'schedule',
      label: 'Schedule',
      icon: <CalendarRange size={16} />,
      links: [{ label: 'Class Schedule', path: '/frontdesk-classes', icon: <CalendarRange size={16} /> }],
    },
    {
      key: 'enrollments',
      label: 'Enrollments',
      icon: <ClipboardList size={16} />,
      links: [
        {
          label: 'Bookings',
          path: '/frontdesk-bookings',
          icon: <ClipboardList size={16} />,
          pendingCount: bookingsPendingCount,
        },
        {
          label: 'Cancellations',
          path: '/frontdesk-cancellations',
          icon: <Ban size={16} />,
          pendingCount: cancelNotifyCount,
        },
      ],
    },
    {
      key: 'marketing',
      label: 'Marketing',
      icon: <Images size={16} />,
      links: [
        { label: 'Gallery', path: '/frontdesk-gallery', icon: <Images size={16} /> },
        { label: 'Amenities', path: '/frontdesk-amenities', icon: <Sparkles size={16} /> },
        {
          label: 'Bulletin',
          path: '/frontdesk-bulletin',
          icon: <Newspaper size={16} />,
          pendingCount: bulletinPendingCount,
        },
      ],
    },
    {
      key: 'finance',
      label: 'Finance',
      icon: <CreditCard size={16} />,
      links: [
        {
          label: 'Payments',
          path: '/frontdesk-payments',
          icon: <CreditCard size={16} />,
          pendingCount: classPaymentPendingCount,
        },
        { label: 'Policies', path: '/frontdesk-policies', icon: <ShieldCheck size={16} /> },
      ],
    },
  ];
}

function FrontdeskSidebarNav({ onNavigate }: { onNavigate: () => void }) {
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
            to="/frontdesk-feedback"
            icon={<MessageSquare size={16} />}
            label="System Feedback"
            active={isActive('/frontdesk-feedback')}
            onNavigate={onNavigate}
            appearance="gold"
            pendingCount={unreadNotifications}
          />
        </div>
      </SidebarNav>
    </div>
  );
}

interface FrontdeskSidebarProps {
  children: React.ReactNode;
}

/** Logged-in front desk portal chrome (sidebar). */
export function FrontdeskSidebar({ children }: FrontdeskSidebarProps) {
  const { pathname } = useLocation();
  const cancelNotifyCount = useFrontdeskCancelNotifyCount();
  const bookingsPendingCount = useFrontdeskBookingsPendingCount();
  const classPaymentPendingCount = useAdminClassPaymentPendingCount();
  const bulletinPendingCount = useAdminBulletinPendingCount();
  const groups = useMemo(
    () =>
      buildFrontdeskGroups(
        cancelNotifyCount,
        bookingsPendingCount,
        classPaymentPendingCount,
        bulletinPendingCount,
      ),
    [cancelNotifyCount, bookingsPendingCount, classPaymentPendingCount, bulletinPendingCount],
  );

  useEffect(() => {
    document.querySelector('[data-frontdesk-main-scroll]')?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <AdminHeaderActionsProvider>
      <PortalSectionNavProvider groups={groups}>
        <AppSidebarLayout
          sidebarWidthClass="w-60"
          mainOverflow="desktop-hidden"
          header={<FrontdeskPortalHeader searchPlaceholder="Search gallery, amenities, bulletin…" />}
          renderSidebar={(closeMobile) => <FrontdeskSidebarNav onNavigate={closeMobile} />}
        >
          <div className="flex h-full min-h-0 flex-col bg-[#F8F3E8]">
            <div className="mx-auto w-full max-w-8xl shrink-0 px-4 md:px-6">
              <FrontdeskGreetingHeader slot="nav" />
            </div>
            <div data-frontdesk-main-scroll className="min-h-0 flex-1 overflow-y-auto flex flex-col">
              <div className="mx-auto w-full max-w-8xl shrink-0 px-4 md:px-6">
                <FrontdeskGreetingHeader slot="title" />
              </div>
              {children}
            </div>
          </div>
        </AppSidebarLayout>
      </PortalSectionNavProvider>
    </AdminHeaderActionsProvider>
  );
}
