import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Code2, LogOut, ScrollText,
  UserCog, UserRound, Headphones, MessageSquare, Dumbbell, CalendarDays, Megaphone,
} from 'lucide-react';
import { useDevAuth } from '../../context/DevAuthContext';
import { SidebarCollapseBar, SidebarNav, SidebarNavGroupButton, SidebarNavLink } from './SidebarNavLink';
import { AppSidebarLayout } from './AppSidebarLayout';
import { AccountMenu } from './AccountMenu';
import { PortalNotificationBell } from './PortalNotificationBell';
import { useUnreadAccountNotifications } from '../../hooks/useUnreadAccountNotifications';
import { PortalAppHeader, PortalRoleBadge } from './PortalAppHeader';
import { PortalSearch } from './DashboardGreetingBar';
import { PortalSectionSubnav } from './PortalSectionSubnav';
import {
  PortalSectionNavProvider,
  usePortalSectionNav,
  type PortalSectionGroup,
} from '../../context/PortalSectionNavContext';
import { isPublicNavActive } from './NavBar';
import logoMainWhite from '@/assets/logo_main_white.svg';

const NAV_LINKS = [
  { label: 'Feedback Inbox', path: '/development/feedback', icon: MessageSquare },
];

const SYSTEM_LOGS_DISABLED = true;

const SYSTEM_LOG_LINKS = [
  { label: 'Account Logs', path: '/development/logs/accounts', icon: UserCog, desc: 'Account create/role/email changes' },
  { label: 'Profile Logs', path: '/development/logs/profiles', icon: UserRound, desc: 'Client and staff profile changes' },
  { label: 'Discipline Logs', path: '/development/logs/disciplines', icon: Dumbbell, desc: 'Catalog and coach tags' },
  { label: 'Class Logs', path: '/development/logs/classes', icon: CalendarDays, desc: 'Classes, enrollments, coaches' },
  { label: 'Bulletin Logs', path: '/development/logs/bulletin', icon: Megaphone, desc: 'Bulletin create/edit/approve' },
  { label: 'Feedback Logs', path: '/development/logs/support', icon: Headphones, desc: 'feedback_system CUD' },
];

function DevPortalHeader({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const { devUser } = useDevAuth();

  return (
    <PortalAppHeader
      homeHref="/development/dashboard"
      logoSrc={logoMainWhite}
      badge={
        <PortalRoleBadge
          label="Dev"
          icon={<Code2 size={8} className="text-[#1E2A35]" />}
        />
      }
      search={
        <PortalSearch
          searchPlaceholder="Search development pages…"
          navSearchMatches={(query) => {
            const q = query.trim().toLowerCase();
            if (!q) return [];
            return [
              ...NAV_LINKS.filter((l) => !l.disabled).map((l) => ({
                path: l.path,
                label: l.label,
                group: 'Navigation',
              })),
              ...SYSTEM_LOG_LINKS.map((l) => ({
                path: l.path,
                label: l.label,
                group: 'System Logs',
                disabled: SYSTEM_LOGS_DISABLED,
              })),
            ].filter(
              (row) =>
                row.label.toLowerCase().includes(q) || row.group.toLowerCase().includes(q),
            );
          }}
          onPickNavMatch={(path) => navigate(path)}
        />
      }
      notifications={<PortalNotificationBell />}
      accountMenu={
        <AccountMenu
          onLogout={onLogout}
          name={devUser?.name}
          email={devUser?.email}
          photo={devUser?.photo}
          profilePath="/development/account"
        />
      }
    />
  );
}

function buildDevGroups(): PortalSectionGroup[] {
  return [
    {
      key: 'navigation',
      label: 'Navigation',
      icon: <MessageSquare size={16} />,
      links: NAV_LINKS.map(({ label, path, icon: Icon, disabled }) => ({
        label,
        path,
        icon: <Icon size={16} />,
        disabled,
      })),
    },
    {
      key: 'logs',
      label: 'System Logs',
      icon: <ScrollText size={16} />,
      disabled: SYSTEM_LOGS_DISABLED,
      links: SYSTEM_LOG_LINKS.map((link) => ({
        label: link.label,
        path: link.path,
        icon: <link.icon size={16} />,
        disabled: SYSTEM_LOGS_DISABLED,
      })),
    },
  ];
}

function DevSidebarNav({ onNavigate }: { onNavigate: () => void }) {
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
            to="/development/feedback"
            icon={<MessageSquare size={16} />}
            label="System Feedback"
            active={isActive('/development/feedback')}
            onNavigate={onNavigate}
            appearance="gold"
            pendingCount={unreadNotifications}
          />
        </div>
      </SidebarNav>
    </div>
  );
}

interface DevSidebarProps {
  children: React.ReactNode;
}

export function DevSidebar({ children }: DevSidebarProps) {
  const navigate = useNavigate();
  const { devLogout } = useDevAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const groups = useMemo(() => buildDevGroups(), []);

  const handleLogout = () => {
    devLogout();
    navigate('/development');
  };

  return (
    <>
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="flex w-full max-w-sm flex-col gap-5 rounded-3xl border border-[#D4CDB5]/60 bg-white p-7 shadow-2xl">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
                <LogOut size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.04em' }}>Log Out?</h3>
                <p className="mt-1 text-sm text-[#8A7E6E]">You'll be signed out of the development portal.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 rounded-full border border-[#D4CDB5]/70 py-3.5 text-sm font-semibold text-[#5A5048] transition-all hover:bg-[#EDE8D8] active:scale-95">
                Cancel
              </button>
              <button onClick={handleLogout} className="flex-1 rounded-full bg-red-600 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700 active:scale-95">
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <PortalSectionNavProvider groups={groups}>
        <AppSidebarLayout
          sidebarWidthClass="w-56"
          header={<DevPortalHeader onLogout={() => setShowLogoutModal(true)} />}
          renderSidebar={(closeMobile) => <DevSidebarNav onNavigate={closeMobile} />}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mx-auto w-full max-w-8xl shrink-0 px-4 pt-3 md:px-6 md:pt-5">
              <PortalSectionSubnav />
            </div>
            {children}
          </div>
        </AppSidebarLayout>
      </PortalSectionNavProvider>
    </>
  );
}
