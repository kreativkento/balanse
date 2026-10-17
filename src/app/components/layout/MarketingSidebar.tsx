import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import {
  ChevronDown,
  Images,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Newspaper,
  Sparkles,
} from 'lucide-react';
import logoMain from '@/assets/logo_main.svg';
import logoMainWhite from '@/assets/logo_main_white.svg';
import { AdminHeaderActionsProvider } from '../../context/AdminHeaderActionsContext';
import { MarketingGreetingHeader } from './DashboardGreetingBar';
import { AppSidebarLayout } from './AppSidebarLayout';
import { isPublicNavActive } from './NavBar';
import { SidebarNavLink } from './SidebarNavLink';

const MARKETING_HOME = '/marketing-dashboard';

const overviewLinks: { label: string; path: string; icon: ReactNode }[] = [
  { label: 'Dashboard', path: '/marketing-dashboard', icon: <LayoutDashboard size={16} /> },
];

const contentLinks: { label: string; path: string; icon: ReactNode }[] = [
  { label: 'Gallery', path: '/marketing-gallery', icon: <Images size={16} /> },
  { label: 'Amenities', path: '/marketing-amenities', icon: <Sparkles size={16} /> },
  { label: 'Bulletin', path: '/marketing-bulletin', icon: <Newspaper size={16} /> },
];

const NAV_GROUPS: {
  key: string;
  label: string;
  links: { label: string; path: string; icon: ReactNode }[];
}[] = [
  { key: 'overview', label: 'Overview', links: overviewLinks },
  { key: 'content', label: 'Content', links: contentLinks },
];

function MarketingBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#c49a3c] px-1.5 py-0.5">
      <Megaphone size={compact ? 7 : 8} className="text-[#1E2A35]" />
      <span
        className={`font-bold uppercase tracking-widest text-[#1E2A35] ${compact ? 'text-[0.45rem]' : 'text-[0.5rem]'}`}
      >
        Marketing
      </span>
    </div>
  );
}

function MarketingSidebarNav({ onNavigate }: { onNavigate: () => void }) {
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
        <Link to={MARKETING_HOME} className="flex items-center gap-2" onClick={onNavigate}>
          <img src={logoMainWhite} alt="BALANSÉ Wellness Hub" className="h-8 w-auto object-contain" />
          <MarketingBadge />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-0.5">
          {NAV_GROUPS.map((group) => {
            const open = openGroups[group.key] ?? true;
            const groupActive = group.links.some((link) => isActive(link.path));

            return (
              <div key={group.key} className="mt-3 first:mt-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={open}
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
          to="/marketing-feedback"
          icon={<MessageSquare size={16} />}
          label="System Feedback"
          active={isActive('/marketing-feedback')}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

interface MarketingSidebarProps {
  children: React.ReactNode;
}

export function MarketingSidebar({ children }: MarketingSidebarProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.querySelector('[data-marketing-main-scroll]')?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <AppSidebarLayout
      sidebarWidthClass="w-60"
      mainOverflow="desktop-hidden"
      renderSidebar={(closeMobile) => <MarketingSidebarNav onNavigate={closeMobile} />}
      mobileBrand={
        <Link to={MARKETING_HOME} className="flex min-w-0 items-center gap-2">
          <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-6 w-auto shrink-0 object-contain" />
          <MarketingBadge compact />
        </Link>
      }
    >
      <AdminHeaderActionsProvider>
        <div className="flex h-full min-h-0 flex-col bg-[#F8F3E8]">
          <div className="mx-auto w-full max-w-7xl shrink-0 px-6">
            <MarketingGreetingHeader searchPlaceholder="Search gallery, bulletin…" />
          </div>
          <div data-marketing-main-scroll className="min-h-0 flex-1 overflow-y-auto flex flex-col">
            {children}
          </div>
        </div>
      </AdminHeaderActionsProvider>
    </AppSidebarLayout>
  );
}
