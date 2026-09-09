import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import {
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Home,
  Images,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  User,
} from 'lucide-react';
import logoMain from '@/assets/logo_main.svg';
import { isPublicNavActive } from './NavBar';
import { AppSidebarLayout } from './AppSidebarLayout';
import { HelpSupportFab } from './HelpSupportFab';
import { SidebarNavLink } from './SidebarNavLink';

const staffLinks: { label: string; path: string; icon: ReactNode }[] = [
  { label: 'Dashboard', path: '/staff-dashboard', icon: <LayoutDashboard size={16} /> },
];

const quickActionLinks: { label: string; path: string; icon: ReactNode }[] = [
  { label: 'Staff Calendar', path: '/staff-schedule', icon: <CalendarDays size={16} /> },
  { label: 'My Availability', path: '/staff-availability', icon: <CalendarCheck size={16} /> },
  { label: 'Post to Gallery', path: '/staff-gallery', icon: <Images size={16} /> },
];

const profileLink = { label: 'Profile', path: '/staff-profile', icon: <User size={16} /> };

function StaffSidebarNav({ onNavigate }: { onNavigate: () => void }) {
  const location = useLocation();
  const isActive = (path: string) => isPublicNavActive(location.pathname, path);
  const [quickActionsOpen, setQuickActionsOpen] = useState(true);
  const quickActionsActive = quickActionLinks.some((link) => isActive(link.path));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#D4CDB5]/30 px-5 py-5">
        <Link to="/staff-dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-8 w-auto object-contain" />
          <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#c49a3c]/12 px-1.5 py-0.5">
            <ShieldCheck size={8} className="text-[#c49a3c]" />
            <span className="text-[0.5rem] font-bold uppercase tracking-widest text-[#a67f2e]">Staff</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-0.5">
          {staffLinks.map((link) => (
            <SidebarNavLink
              key={link.path}
              to={link.path}
              icon={link.icon}
              label={link.label}
              active={isActive(link.path)}
              onNavigate={onNavigate}
            />
          ))}

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setQuickActionsOpen((open) => !open)}
              aria-expanded={quickActionsOpen}
              aria-label={`${quickActionsOpen ? 'Collapse' : 'Expand'} Quick Actions`}
              className="group/nav mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors hover:bg-[#EDE8D8]/50"
            >
              <span
                className={`text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                  quickActionsActive
                    ? 'text-[#745b3c] group-hover/nav:text-[#5F4A32]'
                    : 'text-[#8A7E6E] group-hover/nav:text-[#5A5048]'
                }`}
              >
                Quick Actions
              </span>
              <span className="h-px min-w-0 flex-1 bg-[#D4CDB5]/60 transition-colors group-hover/nav:bg-[#C4B8A0]" />
              <ChevronDown
                size={12}
                className={`shrink-0 text-[#C4B8A0] transition-all group-hover/nav:text-[#8A7E6E] ${quickActionsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {quickActionsOpen && (
              <div className="flex flex-col gap-0.5 pl-2.5">
                {quickActionLinks.map((link) => (
                  <SidebarNavLink
                    key={link.path}
                    to={link.path}
                    icon={link.icon}
                    label={link.label}
                    active={isActive(link.path)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-3">
            <SidebarNavLink
              to={profileLink.path}
              icon={profileLink.icon}
              label={profileLink.label}
              active={isActive(profileLink.path)}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </nav>

      <div className="border-t border-[#D4CDB5]/30 px-3 py-4">
        <SidebarNavLink
          to="/staff-feedback"
          icon={<MessageSquare size={16} />}
          label="System Feedback"
          active={isActive('/staff-feedback')}
          onNavigate={onNavigate}
        />
      </div>

      <div className="border-t border-[#D4CDB5]/30 px-3 py-4">
        <SidebarNavLink
          to="/"
          icon={<Home size={16} />}
          label="Return to Main Website"
          active={false}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

interface StaffSidebarProps {
  children: React.ReactNode;
}

/** Logged-in staff/coach portal chrome (sidebar + help FAB). */
export function StaffSidebar({ children }: StaffSidebarProps) {
  return (
    <>
      <AppSidebarLayout
        renderSidebar={(closeMobile) => <StaffSidebarNav onNavigate={closeMobile} />}
        mobileBrand={
          <Link to="/staff-dashboard" className="flex min-w-0 items-center gap-2">
            <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-6 w-auto shrink-0 object-contain" />
            <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#c49a3c]/12 px-1.5 py-0.5">
              <ShieldCheck size={7} className="text-[#c49a3c]" />
              <span className="text-[0.45rem] font-bold uppercase tracking-widest text-[#a67f2e]">Staff</span>
            </div>
          </Link>
        }
      >
        {children}
      </AppSidebarLayout>
      <HelpSupportFab variant="chat" />
    </>
  );
}
