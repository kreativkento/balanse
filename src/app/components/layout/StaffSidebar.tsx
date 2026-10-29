import { useEffect, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { StaffGreetingHeader, StaffPortalHeader } from './DashboardGreetingBar';
import {
  Bookmark,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Clock,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  User,
} from 'lucide-react';
import { isPublicNavActive } from './NavBar';
import { AppSidebarLayout } from './AppSidebarLayout';
import { HelpSupportFab } from './HelpSupportFab';
import { SidebarCollapseBar, SidebarNav, SidebarNavGroupButton, SidebarNavLink } from './SidebarNavLink';
import { useUnreadAccountNotifications } from '../../hooks/useUnreadAccountNotifications';
import { useStaffAuth } from '../../context/StaffAuthContext';
import {
  PortalSectionNavProvider,
  usePortalSectionNav,
  type PortalSectionGroup,
} from '../../context/PortalSectionNavContext';

const dashboardLink = {
  label: 'Dashboard',
  path: '/staff-dashboard',
  icon: <LayoutDashboard size={16} />,
};

const scheduleManagementLinks: { label: string; path: string; icon: ReactNode }[] = [
  { label: 'My Classes', path: '/staff-my-classes', icon: <Bookmark size={16} /> },
  { label: 'Time Slots', path: '/staff-time-slots', icon: <Clock size={16} /> },
  { label: 'Class Schedule', path: '/staff-class-schedule', icon: <CalendarRange size={16} /> },
  { label: 'Requests', path: '/staff-requests', icon: <CalendarDays size={16} /> },
  { label: 'Availability', path: '/staff-availability', icon: <CalendarCheck size={16} /> },
];

const bulletinLink = { label: 'Bulletin', path: '/staff-bulletin', icon: <Newspaper size={16} /> };

const staffGroups: PortalSectionGroup[] = [
  {
    key: 'schedule',
    label: 'Schedule',
    icon: <CalendarDays size={16} />,
    links: scheduleManagementLinks,
  },
];

function StaffSidebarNav({ onNavigate }: { onNavigate: () => void }) {
  const { staffUser } = useStaffAuth();
  const { groups } = usePortalSectionNav();
  const profileLink = {
    label: staffUser?.staffType === 'Administrator' ? 'Profile' : 'Coach Profile',
    path: '/staff-profile',
    icon: <User size={16} />,
  };
  const location = useLocation();
  const unreadNotifications = useUnreadAccountNotifications();
  const isActive = (path: string) => isPublicNavActive(location.pathname, path);

  return (
    <div className="flex h-full flex-col">
      <SidebarCollapseBar onCloseMobile={onNavigate} />

      <SidebarNav>
        <div className="flex flex-col gap-1">
          <SidebarNavLink
            to={dashboardLink.path}
            icon={dashboardLink.icon}
            label={dashboardLink.label}
            active={isActive(dashboardLink.path)}
            onNavigate={onNavigate}
          />

          {groups.map((group) => (
            <SidebarNavGroupButton
              key={group.key}
              group={group}
              active={group.links.some((link) => isActive(link.path))}
              onNavigate={onNavigate}
            />
          ))}

          <SidebarNavLink
            to={bulletinLink.path}
            icon={bulletinLink.icon}
            label={bulletinLink.label}
            active={isActive(bulletinLink.path)}
            onNavigate={onNavigate}
          />

          <SidebarNavLink
            to={profileLink.path}
            icon={profileLink.icon}
            label={profileLink.label}
            active={isActive(profileLink.path)}
            onNavigate={onNavigate}
          />
          <SidebarNavLink
            to="/staff-feedback"
            icon={<MessageSquare size={16} />}
            label="System Feedback"
            active={isActive('/staff-feedback')}
            onNavigate={onNavigate}
            appearance="gold"
            pendingCount={unreadNotifications}
          />
        </div>
      </SidebarNav>
    </div>
  );
}

interface StaffSidebarProps {
  children: React.ReactNode;
}

/** Logged-in staff/coach portal chrome (sidebar + help FAB). */
export function StaffSidebar({ children }: StaffSidebarProps) {
  const { pathname } = useLocation();
  const isDashboard = pathname === '/staff-dashboard';
  const groups = useMemo(() => staffGroups, []);

  useEffect(() => {
    document.querySelector('[data-staff-main-scroll]')?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <PortalSectionNavProvider groups={groups}>
        <AppSidebarLayout
          sidebarWidthClass="w-60"
          mainOverflow="desktop-hidden"
          header={<StaffPortalHeader searchPlaceholder="Search classes, students…" />}
          renderSidebar={(closeMobile) => <StaffSidebarNav onNavigate={closeMobile} />}
        >
          <div className="flex h-full min-h-0 flex-col bg-[#F8F3E8]">
            <div className="mx-auto w-full max-w-8xl shrink-0 px-4 md:px-6">
              <StaffGreetingHeader compact={isDashboard} slot="nav" />
            </div>
            <div
              data-staff-main-scroll
              className={`flex min-h-0 flex-1 flex-col ${isDashboard ? 'overflow-hidden' : 'overflow-y-auto'}`}
            >
              <div className="mx-auto w-full max-w-8xl shrink-0 px-4 md:px-6">
                <StaffGreetingHeader compact={isDashboard} slot="title" />
              </div>
              {children}
            </div>
          </div>
        </AppSidebarLayout>
      </PortalSectionNavProvider>
      <HelpSupportFab variant="chat" />
    </>
  );
}
