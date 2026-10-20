import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { Images, Megaphone, MessageSquare, Newspaper, Sparkles } from 'lucide-react';
import logoMain from '@/assets/logo_main.svg';
import logoMainWhite from '@/assets/logo_main_white.svg';
import { AdminHeaderActionsProvider } from '../../context/AdminHeaderActionsContext';
import { MarketingGreetingHeader } from './DashboardGreetingBar';
import { AppSidebarLayout } from './AppSidebarLayout';
import { isPublicNavActive } from './NavBar';
import { SidebarNavLink } from './SidebarNavLink';

const MARKETING_HOME = '/marketing-dashboard';

const navLinks: {
  label: string;
  path: string;
  icon: ReactNode;
}[] = [
  { label: 'Bulletin', path: '/marketing-dashboard', icon: <Newspaper size={16} /> },
  { label: 'Gallery', path: '/marketing-gallery', icon: <Images size={16} /> },
  { label: 'Amenities', path: '/marketing-amenities', icon: <Sparkles size={16} /> },
];

function MarketingBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#c49a3c] px-1.5 py-0.5">
      <Megaphone size={compact ? 7 : 8} className="text-[#1E2A35]" />
      <span className={`font-bold uppercase tracking-widest text-[#1E2A35] ${compact ? 'text-[0.45rem]' : 'text-[0.5rem]'}`}>
        Marketing
      </span>
    </div>
  );
}

function MarketingSidebarNav({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const location = useLocation();
  const isActive = (path: string) => isPublicNavActive(location.pathname, path);

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
          {navLinks.map((link) => (
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
      </nav>

      <div className="px-3 py-4 border-t border-[#D4CDB5]/30">
        <SidebarNavLink
          to="/marketing-feedback"
          icon={<MessageSquare size={16} />}
          label="System Feedback"
          active={isActive('/marketing-feedback')}
          onNavigate={onNavigate}
          appearance="gold"
        />
      </div>
    </div>
  );
}

interface MarketingSidebarProps {
  children: React.ReactNode;
}

/** Logged-in marketing portal chrome (sidebar). */
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
            <MarketingGreetingHeader searchPlaceholder="Search gallery, amenities, bulletin…" />
          </div>
          <div data-marketing-main-scroll className="min-h-0 flex-1 overflow-y-auto flex flex-col">
            {children}
          </div>
        </div>
      </AdminHeaderActionsProvider>
    </AppSidebarLayout>
  );
}
