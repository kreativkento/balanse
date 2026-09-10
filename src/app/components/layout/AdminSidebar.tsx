import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Award,
  Briefcase,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  CreditCard,
  Crown,
  Images,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  ShieldCheck,
  Tag,
  Users,
} from 'lucide-react';
import logoMain from '@/assets/logo_main.svg';
import logoMainWhite from '@/assets/logo_main_white.svg';
import { AdminGreetingHeader } from './DashboardGreetingBar';
import { AppSidebarLayout } from './AppSidebarLayout';
import { isPublicNavActive } from './NavBar';
import { SidebarNavLink } from './SidebarNavLink';

const dashboardLinks: {
  label: string;
  path: string;
  icon: ReactNode;
}[] = [
  { label: 'Dashboard', path: '/admin-dashboard', icon: <LayoutDashboard size={16} /> },
];

const communityLinks: {
  label: string;
  path: string;
  icon: ReactNode;
}[] = [
  { label: 'Clients', path: '/admin-students', icon: <Users size={16} /> },
  { label: 'Coaches', path: '/admin-coaches', icon: <Award size={16} /> },
  { label: 'Disciplines', path: '/admin-disciplines', icon: <Layers size={16} /> },
];

const scheduleLinks: {
  label: string;
  path: string;
  icon: ReactNode;
}[] = [
  { label: 'Time Blocking', path: '/admin-schedule', icon: <CalendarDays size={16} /> },
  { label: 'Class Schedule', path: '/admin-classes', icon: <CalendarRange size={16} /> },
];

const marketingLinks: {
  label: string;
  path: string;
  icon: ReactNode;
  disabled?: boolean;
}[] = [
  { label: 'Gallery', path: '/admin-gallery', icon: <Images size={16} />, disabled: true },
  { label: 'Bulletin', path: '/admin-bulletin', icon: <Newspaper size={16} /> },
  { label: 'Promotions', path: '/admin-promos', icon: <Tag size={16} />, disabled: true },
];

const financeLinks: {
  label: string;
  path: string;
  icon: ReactNode;
}[] = [
  { label: 'Staffing', path: '/admin-staff', icon: <Briefcase size={16} /> },
  { label: 'Payments', path: '/admin-payments', icon: <CreditCard size={16} /> },
  { label: 'Subscriptions', path: '/admin-subscriptions', icon: <CreditCard size={16} /> },
  { label: 'Policies', path: '/admin-policies', icon: <ShieldCheck size={16} /> },
];

const NAV_GROUPS: {
  key: string;
  label: string;
  links: { label: string; path: string; icon: ReactNode; disabled?: boolean }[];
}[] = [
  { key: 'community', label: 'Community', links: communityLinks },
  { key: 'schedule', label: 'Schedule', links: scheduleLinks },
  { key: 'marketing', label: 'Marketing', links: marketingLinks },
  { key: 'finance', label: 'Finance & Admin', links: financeLinks },
];

function AdminBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#c49a3c] px-1.5 py-0.5">
      <Crown size={compact ? 7 : 8} className="text-[#1E2A35]" />
      <span className={`font-bold uppercase tracking-widest text-[#1E2A35] ${compact ? 'text-[0.45rem]' : 'text-[0.5rem]'}`}>
        Admin
      </span>
    </div>
  );
}

function AdminSidebarNav({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const location = useLocation();
  const isActive = (path: string) => isPublicNavActive(location.pathname, path);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((group) => [group.key, true])),
  );

  const toggleGroup = (key: string) => {
    setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 bg-[#1e2a35] px-5 py-5">
        <Link to="/admin-dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          <img src={logoMainWhite} alt="BALANSÉ Wellness Hub" className="h-8 w-auto object-contain" />
          <AdminBadge />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-0.5">
          {dashboardLinks.map((link) => (
            <SidebarNavLink
              key={link.path}
              to={link.path}
              icon={link.icon}
              label={link.label}
              active={isActive(link.path)}
              onNavigate={onNavigate}
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
                        disabled={link.disabled}
                        disabledTitle="Temporarily unavailable"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-[#D4CDB5]/30">
        <SidebarNavLink
          to="/admin-feedback"
          icon={<MessageSquare size={16} />}
          label="System Feedback"
          active={isActive('/admin-feedback')}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

interface AdminSidebarProps {
  children: React.ReactNode;
}

/** Logged-in admin portal chrome (sidebar). */
export function AdminSidebar({ children }: AdminSidebarProps) {
  return (
    <AppSidebarLayout
      renderSidebar={(closeMobile) => <AdminSidebarNav onNavigate={closeMobile} />}
      mobileBrand={
        <Link to="/admin-dashboard" className="flex min-w-0 items-center gap-2">
          <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-6 w-auto shrink-0 object-contain" />
          <AdminBadge compact />
        </Link>
      }
      >
      <div className="flex h-full min-h-0 flex-col bg-[#F8F3E8]">
        <div className="mx-auto w-full max-w-7xl shrink-0 px-6">
          <AdminGreetingHeader searchPlaceholder="Search clients, classes…" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </AppSidebarLayout>
  );
}
