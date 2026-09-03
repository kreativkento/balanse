import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  ChevronDown, LayoutDashboard, LogOut, CreditCard, Images, Layers, Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoMain from 'figma:asset/logo_main.svg';
import { ProfileAvatar } from '../ProfileImages';
import { AppSidebarLayout } from './AppSidebarLayout';
import {
  aboutLink,
  classesLinks,
  communityLinks,
  isPublicNavActive,
  ratesLinks,
  studioLinks,
} from './NavBar';

const NAV_GROUPS: {
  key: string;
  label: string;
  icon: ReactNode;
  links: { label: string; path: string; icon: ReactNode }[];
}[] = [
  { key: 'studio', label: 'Our Studio', icon: <Images size={16} />, links: studioLinks },
  { key: 'rates', label: 'Our Rates', icon: <CreditCard size={16} />, links: ratesLinks },
  { key: 'classes', label: 'Our Classes', icon: <Layers size={16} />, links: classesLinks },
  { key: 'community', label: 'Our Community', icon: <Users size={16} />, links: communityLinks },
];

function SidebarAccordion({
  label,
  icon,
  links,
  open,
  onToggle,
  isActive,
  onNavigate,
}: {
  label: string;
  icon: ReactNode;
  links: { label: string; path: string; icon: ReactNode }[];
  open: boolean;
  onToggle: () => void;
  isActive: (path: string) => boolean;
  onNavigate: () => void;
}) {
  const groupActive = links.some((link) => isActive(link.path));

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          groupActive ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
        }`}
      >
        <span className={groupActive ? 'text-[#c49a3c]' : 'text-[#8A7E6E]'}>{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-1 ml-3 flex flex-col gap-0.5 pl-3 border-l-2 border-[#D4CDB5]/50">
          {links.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active ? 'bg-[#c49a3c]/15 text-[#a67f2e]' : 'text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
                }`}
              >
                <span className={active ? 'text-[#c49a3c]' : 'text-[#8A7E6E]'}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PublicSidebarNav({
  onNavigate,
  onLogoutClick,
  openGroups,
  onToggleGroup,
}: {
  onNavigate: () => void;
  onLogoutClick: () => void;
  openGroups: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
}) {
  const location = useLocation();
  const { user } = useAuth();
  const isActive = (path: string) => isPublicNavActive(location.pathname, path);
  const dashboardActive = isActive('/dashboard');
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'M';

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-[#D4CDB5]/30">
        <Link to="/" className="flex items-center" onClick={onNavigate}>
          <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-8 w-auto object-contain" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-0.5">
          <Link
            to="/dashboard"
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              dashboardActive
                ? 'bg-[#1E2A35] text-white shadow-sm'
                : 'text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
            }`}
          >
            <LayoutDashboard size={16} className={dashboardActive ? 'text-[#c49a3c]' : 'text-[#8A7E6E]'} />
            Dashboard
          </Link>

          <Link
            to={aboutLink.path}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive(aboutLink.path)
                ? 'bg-[#1E2A35] text-white shadow-sm'
                : 'text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
            }`}
          >
            <span className={isActive(aboutLink.path) ? 'text-[#c49a3c]' : 'text-[#8A7E6E]'}>{aboutLink.icon}</span>
            {aboutLink.label}
          </Link>

          {NAV_GROUPS.map((group) => (
            <SidebarAccordion
              key={group.key}
              label={group.label}
              icon={group.icon}
              links={group.links}
              open={!!openGroups[group.key]}
              onToggle={() => onToggleGroup(group.key)}
              isActive={isActive}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="px-4 py-4 border-t border-[#D4CDB5]/30">
        <Link
          to="/profile"
          onClick={onNavigate}
          title="My profile"
          className="flex items-center gap-3 mb-3 rounded-xl px-1 py-1 -mx-1 hover:bg-[#EDE8D8] transition-colors"
        >
          <div className="w-9 h-9 bg-[#c49a3c]/15 border border-[#c49a3c]/30 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
            <ProfileAvatar
              src={user?.profile.photo}
              initials={initials}
              alt=""
              className="h-full w-full"
              initialsClassName="text-[#a67f2e] font-bold text-xs"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#1E2A35] text-xs font-semibold leading-none truncate">{user?.name}</p>
            <p className="text-[#B0A898] text-[0.6rem] mt-0.5 truncate">{user?.email}</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={onLogoutClick}
          className="w-full flex items-center justify-center gap-2 text-[#8A7E6E] hover:text-red-600 text-xs transition-colors px-3 py-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100"
        >
          <LogOut size={13} /> Log Out
        </button>
      </div>
    </div>
  );
}

interface PublicSidebarProps {
  children: React.ReactNode;
  lockScroll?: boolean;
}

export function PublicSidebar({ children, lockScroll = false }: PublicSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of NAV_GROUPS) {
      initial[group.key] = group.links.some((link) => isPublicNavActive(location.pathname, link.path));
    }
    return initial;
  });

  const handleLogout = () => {
    void logout();
    setShowLogoutModal(false);
    navigate('/');
  };

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const group of NAV_GROUPS) {
        if (group.links.some((link) => isPublicNavActive(location.pathname, link.path))) {
          next[group.key] = true;
        }
      }
      return next;
    });
  }, [location.pathname]);

  return (
    <>
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-sm p-7 flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                <LogOut size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em' }}>Log Out?</h3>
                <p className="text-[#8A7E6E] text-sm mt-1">You'll be signed out of BALANSÉ. Your bookings and data are saved.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3.5 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] active:scale-95 transition-all"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-3.5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95 transition-all shadow-sm"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <AppSidebarLayout
        mainOverflow={lockScroll ? 'hidden' : 'auto'}
        renderSidebar={(closeMobile) => (
          <PublicSidebarNav
            onNavigate={closeMobile}
            onLogoutClick={() => setShowLogoutModal(true)}
            openGroups={openGroups}
            onToggleGroup={(key) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))}
          />
        )}
        mobileBrand={
          <Link to="/" className="flex items-center min-w-0">
            <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-6 w-auto object-contain shrink-0" />
          </Link>
        }
      >
        {children}
      </AppSidebarLayout>
    </>
  );
}
