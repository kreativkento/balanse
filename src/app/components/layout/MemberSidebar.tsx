import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { Activity, ChevronDown, CreditCard, FileText, LayoutDashboard, MessageSquare, Newspaper, Repeat, User } from 'lucide-react';
import logoMain from '@/assets/logo_main.svg';
import { useAuth } from '../../context/AuthContext';
import {
  computeProfileScore,
  PROFILE_COMPLETION_READY,
  profileScoreBarClasses,
} from '../../../lib/profile-completion';
import { AppSidebarLayout } from './AppSidebarLayout';
import { HelpSupportFab } from './HelpSupportFab';
import {
  memberClassLinks,
  isPublicNavActive,
  memberStudioLinks,
} from './NavBar';

const memberLinks: {
  label: string;
  path: string;
  icon: ReactNode;
}[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={16} /> },
];

const financeLinks: {
  label: string;
  path: string;
  icon: ReactNode;
}[] = [
  { label: 'Payments', path: '/payment-history', icon: <CreditCard size={16} /> },
  { label: 'Subscriptions', path: '/subscriptions', icon: <Repeat size={16} /> },
];

const userProfileLinks: {
  label: string;
  path: string;
  icon: ReactNode;
}[] = [
  { label: 'Profile', path: '/profile', icon: <User size={16} /> },
  { label: 'Documents', path: '/documents', icon: <FileText size={16} /> },
  { label: 'Performance', path: '/performance', icon: <Activity size={16} /> },
];

const NAV_GROUPS: {
  key: string;
  label: string;
  links: { label: string; path: string; icon: ReactNode }[];
}[] = [
  { key: 'profile', label: 'User Profile', links: userProfileLinks },
  { key: 'classes', label: 'Class Management', links: memberClassLinks },
  { key: 'finances', label: 'Finances', links: financeLinks },
  { key: 'studio', label: 'Studio', links: memberStudioLinks },
];

const communityBulletinLink = {
  label: 'Community Bulletin',
  path: '/member-bulletin',
  icon: <Newspaper size={16} />,
};

function SidebarNavLink({
  to,
  icon,
  label,
  active,
  onNavigate,
  statusDotClass,
  statusLabel,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  onNavigate: () => void;
  statusDotClass?: string;
  statusLabel?: string;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-[#1E2A35] text-white shadow-sm'
          : 'text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
      }`}
    >
      <span className={active ? 'text-[#c49a3c]' : 'text-[#8A7E6E]'}>{icon}</span>
      <span className="flex-1">{label}</span>
      {statusDotClass && (
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass}`}
          aria-label={statusLabel || 'Incomplete'}
        />
      )}
    </Link>
  );
}

function MemberSidebarNav({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const location = useLocation();
  const { user } = useAuth();
  const isActive = (path: string) => isPublicNavActive(location.pathname, path);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((group) => [group.key, true])),
  );
  const profileScore = computeProfileScore(user?.profile);
  const showProfileStatus = profileScore < PROFILE_COMPLETION_READY;
  const profileStatusDot = showProfileStatus
    ? profileScoreBarClasses(profileScore).bar
    : undefined;

  const toggleGroup = (key: string) => {
    setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
  };

  const linkStatus = (path: string) =>
    path === '/profile' && profileStatusDot
      ? {
          statusDotClass: profileStatusDot,
          statusLabel: `Profile ${profileScore}% complete`,
        }
      : {};

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-[#D4CDB5]/30">
        <Link to="/dashboard" className="flex items-center" onClick={onNavigate}>
          <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-8 w-auto object-contain" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-0.5">
          {memberLinks.map((link) => (
            <SidebarNavLink
              key={link.path}
              to={link.path}
              icon={link.icon}
              label={link.label}
              active={isActive(link.path)}
              onNavigate={onNavigate}
              {...linkStatus(link.path)}
            />
          ))}

          {NAV_GROUPS.map((group) => {
            const open = openGroups[group.key] ?? true;
            const groupActive = group.links.some((link) => isActive(link.path));

            return (
              <div key={group.key} className="mt-3 first:mt-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={open}
                  aria-label={`${open ? 'Collapse' : 'Expand'} ${group.label}`}
                  className="group/nav mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors hover:bg-[#EDE8D8]/50"
                >
                  <span
                    className={`text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                      groupActive
                        ? 'text-[#745b3c] group-hover/nav:text-[#5F4A32]'
                        : 'text-[#8A7E6E] group-hover/nav:text-[#5A5048]'
                    }`}
                  >
                    {group.label}
                  </span>
                  <span className="h-px min-w-0 flex-1 bg-[#D4CDB5]/60 transition-colors group-hover/nav:bg-[#C4B8A0]" />
                  <ChevronDown
                    size={12}
                    className={`shrink-0 text-[#C4B8A0] transition-all group-hover/nav:text-[#8A7E6E] ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open && (
                  <div className="flex flex-col gap-0.5 pl-2.5">
                    {group.links.map((link) => (
                      <SidebarNavLink
                        key={link.path}
                        to={link.path}
                        icon={link.icon}
                        label={link.label}
                        active={isActive(link.path)}
                        onNavigate={onNavigate}
                        {...linkStatus(link.path)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-3">
            <SidebarNavLink
              to={communityBulletinLink.path}
              icon={communityBulletinLink.icon}
              label={communityBulletinLink.label}
              active={isActive(communityBulletinLink.path)}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-[#D4CDB5]/30">
        <SidebarNavLink
          to="/feedback"
          icon={<MessageSquare size={16} />}
          label="System Feedback"
          active={isActive('/feedback')}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

interface MemberSidebarProps {
  children: React.ReactNode;
  lockScroll?: boolean;
}

/** Logged-in member dashboard chrome (sidebar + help FAB). */
export function MemberSidebar({ children, lockScroll = false }: MemberSidebarProps) {
  return (
    <>
      <AppSidebarLayout
        mainOverflow={lockScroll ? 'hidden' : 'auto'}
        renderSidebar={(closeMobile) => (
          <MemberSidebarNav onNavigate={closeMobile} />
        )}
        mobileBrand={
          <Link to="/dashboard" className="flex items-center min-w-0">
            <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-6 w-auto object-contain shrink-0" />
          </Link>
        }
      >
        {children}
      </AppSidebarLayout>
      <HelpSupportFab variant="chat" />
    </>
  );
}
