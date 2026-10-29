import { useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import {
  Bookmark,
  CalendarRange,
  Coins,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Sparkles,
  User,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  computeProfileScore,
  PROFILE_COMPLETION_READY,
  profileScoreBarClasses,
} from '../../../lib/profile-completion';
import { AppSidebarLayout } from './AppSidebarLayout';
import { HelpSupportFab } from './HelpSupportFab';
import { SidebarCollapseBar, SidebarNav, SidebarNavGroupButton, SidebarNavLink } from './SidebarNavLink';
import { useUnreadAccountNotifications } from '../../hooks/useUnreadAccountNotifications';
import { MemberPortalHeader, MemberGreetingHeader } from './DashboardGreetingBar';
import { PortalSectionSubnav } from './PortalSectionSubnav';
import { DocumentReacceptBanner } from './MemberPageShell';
import { usePortalNavIconOnly } from '../../context/PortalChromeContext';
import {
  PortalSectionNavProvider,
  usePortalSectionNav,
  type PortalSectionGroup,
} from '../../context/PortalSectionNavContext';
import { useMemberFinanceAttentionCounts } from '../../hooks/useMemberFinanceAttentionCounts';
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
  { label: 'Profile', path: '/profile', icon: <User size={16} /> },
];

const financeLinks = [
  { label: 'Credits & Pass', path: '/credits', icon: <Coins size={16} /> },
  { label: 'Billing & Receipts', path: '/payment-history', icon: <CreditCard size={16} /> },
];

const communityBulletinLink = {
  label: 'Community Bulletin',
  path: '/member-bulletin',
  icon: <Newspaper size={16} />,
};

function memberPageHeader(pathname: string) {
  if (pathname === '/my-classes') {
    return {
      crumb: 'Class Management',
      title: 'My Classes',
      icon: <CalendarRange size={14} className="shrink-0 text-[#c49a3c]" aria-hidden />,
    };
  }
  if (pathname === '/class-schedule') {
    return {
      crumb: 'Class Management',
      title: 'Class Schedule',
      icon: <CalendarRange size={14} className="shrink-0 text-[#c49a3c]" aria-hidden />,
    };
  }
  return undefined;
}

function buildMemberGroups(
  featuresLocked: boolean,
  financeAttention: { classReturned: number; packReturned: number },
): PortalSectionGroup[] {
  return [
    {
      key: 'classes',
      label: 'Class Management',
      icon: <Bookmark size={16} />,
      disabled: featuresLocked,
      links: memberClassLinks.map((link) => ({ ...link, disabled: featuresLocked })),
    },
    {
      key: 'finances',
      label: 'Finances',
      icon: <Coins size={16} />,
      disabled: featuresLocked,
      links: financeLinks.map((link) => ({
        ...link,
        disabled: featuresLocked,
        pendingCount:
          link.path === '/payment-history'
            ? financeAttention.classReturned
            : link.path === '/credits'
              ? financeAttention.packReturned
              : undefined,
      })),
    },
    {
      key: 'studio',
      label: 'Studio',
      icon: <Sparkles size={16} />,
      disabled: featuresLocked,
      links: memberStudioLinks.map((link) => ({ ...link, disabled: featuresLocked })),
    },
  ];
}

function MemberSidebarNav({
  onNavigate,
  featuresLocked,
  profileStatusDot,
  profileScore,
}: {
  onNavigate: () => void;
  featuresLocked: boolean;
  profileStatusDot?: string;
  profileScore: number;
}) {
  const location = useLocation();
  const { groups } = usePortalSectionNav();
  const iconOnly = usePortalNavIconOnly();
  const unreadNotifications = useUnreadAccountNotifications();
  const isActive = (path: string) => isPublicNavActive(location.pathname, path);

  return (
    <div className="flex h-full flex-col">
      <SidebarCollapseBar onCloseMobile={onNavigate} />

      <SidebarNav>
        <div className="flex flex-col gap-1">
          {featuresLocked && !iconOnly && (
            <div className="mb-2 rounded-xl border border-[#c49a3c]/30 bg-[#c49a3c]/10 px-2.5 py-2">
              <p className="flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-[#8a6824]">
                <Info size={13} className="mt-0.5 shrink-0" />
                Finish setting up your profile to unlock all features.
              </p>
            </div>
          )}

          {memberLinks.map((link) => (
            <SidebarNavLink
              key={link.path}
              to={link.path}
              icon={link.icon}
              label={link.label}
              active={isActive(link.path)}
              onNavigate={onNavigate}
              disabled={featuresLocked && link.path !== '/profile'}
              statusDotClass={link.path === '/profile' ? profileStatusDot : undefined}
              statusLabel={link.path === '/profile' && profileStatusDot ? `Profile ${profileScore}% complete` : undefined}
            />
          ))}

          {groups.map((group) => (
            <SidebarNavGroupButton
              key={group.key}
              group={group}
              active={!featuresLocked && group.links.some((link) => isActive(link.path))}
              onNavigate={onNavigate}
            />
          ))}

          <SidebarNavLink
            to={communityBulletinLink.path}
            icon={communityBulletinLink.icon}
            label={communityBulletinLink.label}
            active={isActive(communityBulletinLink.path)}
            onNavigate={onNavigate}
            disabled={featuresLocked}
          />
          <SidebarNavLink
            to="/feedback"
            icon={<MessageSquare size={16} />}
            label="System Feedback"
            active={isActive('/feedback')}
            onNavigate={onNavigate}
            disabled={featuresLocked}
            appearance="gold"
            pendingCount={unreadNotifications}
          />
        </div>
      </SidebarNav>
    </div>
  );
}

interface MemberSidebarProps {
  children: React.ReactNode;
  lockScroll?: boolean;
  lockScrollDesktop?: boolean;
}

/** Logged-in member dashboard chrome (sidebar + help FAB). */
export function MemberSidebar({ children, lockScroll = false, lockScrollDesktop = false }: MemberSidebarProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const profileScore = computeProfileScore(user?.profile);
  const featuresLocked = profileScore < PROFILE_COMPLETION_READY;
  const profileStatusDot = featuresLocked ? profileScoreBarClasses(profileScore).bar : undefined;
  const { classReturned, packReturned } = useMemberFinanceAttentionCounts();
  const groups = useMemo(
    () => buildMemberGroups(featuresLocked, { classReturned, packReturned }),
    [featuresLocked, classReturned, packReturned],
  );

  const innerOverflow = lockScroll
    ? 'overflow-hidden'
    : lockScrollDesktop
      ? 'overflow-y-auto md:overflow-hidden'
      : 'overflow-y-auto';

  return (
    <>
      <PortalSectionNavProvider groups={groups}>
        <AppSidebarLayout
          sidebarWidthClass="w-60"
          mainOverflow="desktop-hidden"
          memberMainScroll
          header={<MemberPortalHeader />}
          renderSidebar={(closeMobile) => (
            <MemberSidebarNav
              onNavigate={closeMobile}
              featuresLocked={featuresLocked}
              profileStatusDot={profileStatusDot}
              profileScore={profileScore}
            />
          )}
        >
          <div className="flex h-full min-h-0 flex-col bg-[#F8F3E8]">
            <div className="mx-auto w-full max-w-8xl shrink-0 px-4 pt-3 md:px-8 md:pt-5">
              <PortalSectionSubnav />
            </div>
            <div className={`flex min-h-0 flex-1 flex-col ${innerOverflow}`}>
              <div className="mx-auto w-full max-w-8xl shrink-0 px-4 md:px-8">
                <MemberGreetingHeader pageHeader={memberPageHeader(pathname)} flushTop slot="title" />
                <DocumentReacceptBanner />
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
