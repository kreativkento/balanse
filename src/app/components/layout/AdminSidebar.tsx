import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import {
  Award,
  Bookmark,
  Briefcase,
  Coins,
  CalendarDays,
  CalendarRange,
  Clock,
  Ban,
  ClipboardList,
  CreditCard,
  Receipt,
  Images,
  Layers,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { AdminHeaderActionsProvider } from '../../context/AdminHeaderActionsContext';
import {
  PortalSectionNavProvider,
  usePortalSectionNav,
  type PortalSectionGroup,
} from '../../context/PortalSectionNavContext';
import { AdminGreetingHeader, AdminPortalHeader } from './DashboardGreetingBar';
import { AppSidebarLayout } from './AppSidebarLayout';
import { isPublicNavActive } from './NavBar';
import { useAdminBulletinPendingCount } from '../../hooks/useAdminBulletinPendingCount';
import { useAdminCoachQueuePendingCounts } from '../../hooks/useAdminCoachRequestsPendingCount';
import { useAdminCreditCheckoutPendingCount } from '../../hooks/useAdminCreditCheckoutPendingCount';
import { useAdminClassPaymentPendingCount } from '../../hooks/useAdminClassPaymentPendingCount';
import { SidebarCollapseBar, SidebarNav, SidebarNavGroupButton, SidebarNavLink } from './SidebarNavLink';
import { useUnreadAccountNotifications } from '../../hooks/useUnreadAccountNotifications';

const COACH_SLOTS_PATH = '/admin-coach-slots';
const COACH_CANCELLATIONS_PATH = '/admin-coach-cancellations';
const ADMIN_CREDITS_PATH = '/admin-credits';

const dashboardLink = {
  label: 'Dashboard',
  path: '/admin-dashboard',
  icon: <LayoutDashboard size={16} />,
};

function buildAdminGroups(
  coachSlotPendingCount: number,
  coachCancellationPendingCount: number,
  creditCheckoutPendingCount: number,
  bulletinPendingCount: number,
  classPaymentPendingCount: number,
): PortalSectionGroup[] {
  return [
    {
      key: 'community',
      label: 'Community',
      icon: <Users size={16} />,
      links: [
        { label: 'Clients', path: '/admin-students', icon: <Users size={16} /> },
        { label: 'Coaches', path: '/admin-coaches', icon: <Award size={16} /> },
        { label: 'Coach Availability', path: '/admin-coach-availability', icon: <Clock size={16} /> },
        { label: 'Disciplines', path: '/admin-disciplines', icon: <Layers size={16} /> },
      ],
    },
    {
      key: 'schedule',
      label: 'Schedule',
      icon: <CalendarDays size={16} />,
      links: [
        { label: 'Time Blocking', path: '/admin-schedule', icon: <CalendarDays size={16} /> },
        { label: 'Class Schedule', path: '/admin-classes', icon: <CalendarRange size={16} /> },
        {
          label: 'Coach Slots',
          path: COACH_SLOTS_PATH,
          icon: <ClipboardList size={16} />,
          pendingCount: coachSlotPendingCount,
        },
        {
          label: 'Coach Cancellations',
          path: COACH_CANCELLATIONS_PATH,
          icon: <Ban size={16} />,
          pendingCount: coachCancellationPendingCount,
        },
      ],
    },
    {
      key: 'marketing',
      label: 'Marketing',
      icon: <Megaphone size={16} />,
      links: [
        { label: 'Gallery', path: '/admin-gallery', icon: <Images size={16} /> },
        { label: 'Amenities', path: '/admin-amenities', icon: <Sparkles size={16} /> },
        {
          label: 'Bulletin',
          path: '/admin-bulletin',
          icon: <Newspaper size={16} />,
          pendingCount: bulletinPendingCount,
        },
      ],
    },
    {
      key: 'finance',
      label: 'Finance',
      icon: <Coins size={16} />,
      links: [
        {
          label: 'Credits',
          path: ADMIN_CREDITS_PATH,
          icon: <Coins size={16} />,
          pendingCount: creditCheckoutPendingCount,
        },
        {
          label: 'Payments',
          path: '/admin-payments',
          icon: <CreditCard size={16} />,
          pendingCount: classPaymentPendingCount,
        },
        { label: 'OR Register', path: '/admin-official-receipts', icon: <Receipt size={16} /> },
        { label: 'Payment Channels', path: '/admin-payment-channels', icon: <Layers size={16} /> },
      ],
    },
    {
      key: 'admin',
      label: 'Admin',
      icon: <ShieldCheck size={16} />,
      links: [
        { label: 'Staffing', path: '/admin-staff', icon: <Briefcase size={16} /> },
        { label: 'Subscriptions', path: '/admin-subscriptions', icon: <Bookmark size={16} /> },
        { label: 'Pricing & Services', path: '/admin-pricing', icon: <CreditCard size={16} /> },
        { label: 'Policies', path: '/admin-policies', icon: <ShieldCheck size={16} /> },
      ],
    },
  ];
}

function AdminSidebarNav({ onNavigate }: { onNavigate: () => void }) {
  const location = useLocation();
  const { groups } = usePortalSectionNav();
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
            to="/admin-feedback"
            icon={<MessageSquare size={16} />}
            label="System Feedback"
            active={isActive('/admin-feedback')}
            onNavigate={onNavigate}
            appearance="gold"
            pendingCount={unreadNotifications}
          />
        </div>
      </SidebarNav>
    </div>
  );
}

interface AdminSidebarProps {
  children: React.ReactNode;
}

/** Logged-in admin portal chrome (sidebar). */
export function AdminSidebar({ children }: AdminSidebarProps) {
  const { pathname } = useLocation();
  const coachQueuePending = useAdminCoachQueuePendingCounts();
  const creditCheckoutPendingCount = useAdminCreditCheckoutPendingCount();
  const bulletinPendingCount = useAdminBulletinPendingCount();
  const classPaymentPendingCount = useAdminClassPaymentPendingCount();
  const groups = useMemo(
    () =>
      buildAdminGroups(
        coachQueuePending.slots,
        coachQueuePending.cancellations,
        creditCheckoutPendingCount,
        bulletinPendingCount,
        classPaymentPendingCount,
      ),
    [
      coachQueuePending.slots,
      coachQueuePending.cancellations,
      creditCheckoutPendingCount,
      bulletinPendingCount,
      classPaymentPendingCount,
    ],
  );

  useEffect(() => {
    document.querySelector('[data-admin-main-scroll]')?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <AdminHeaderActionsProvider>
      <PortalSectionNavProvider groups={groups}>
        <AppSidebarLayout
          sidebarWidthClass="w-60"
          mainOverflow="desktop-hidden"
          header={<AdminPortalHeader searchPlaceholder="Search clients, coaches, payments, pages…" />}
          renderSidebar={(closeMobile) => <AdminSidebarNav onNavigate={closeMobile} />}
        >
          <div className="flex h-full min-h-0 flex-col bg-[#F8F3E8]">
            <div className="mx-auto w-full max-w-8xl shrink-0 px-4 md:px-6">
              <AdminGreetingHeader slot="nav" />
            </div>
            <div data-admin-main-scroll className="min-h-0 flex-1 overflow-y-auto flex flex-col">
              <div className="mx-auto w-full max-w-8xl shrink-0 px-4 md:px-6">
                <AdminGreetingHeader slot="title" />
              </div>
              {children}
            </div>
          </div>
        </AppSidebarLayout>
      </PortalSectionNavProvider>
    </AdminHeaderActionsProvider>
  );
}
