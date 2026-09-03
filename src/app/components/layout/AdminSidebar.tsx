import { useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import {
  Crown, LogOut, LayoutDashboard, Users,
  CalendarDays, CreditCard, Images,
  Tag, ShieldCheck, Menu, Layers, CalendarRange, Newspaper,
  Award, Briefcase,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import logoMain from 'figma:asset/logo_main.svg';
import { ProfileAvatar } from '../ProfileImages';

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type NavSection = {
  label?: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', path: '/admin-dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Community',
    items: [
      { label: 'Clients', path: '/admin-students', icon: Users },
      { label: 'Coaches', path: '/admin-coaches', icon: Award },
      { label: 'Disciplines', path: '/admin-disciplines', icon: Layers },
    ],
  },
  {
    label: 'Schedule Management',
    items: [
      { label: 'Time Blocking', path: '/admin-schedule', icon: CalendarDays },
      { label: 'Class Schedule', path: '/admin-classes', icon: CalendarRange },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Gallery', path: '/admin-gallery', icon: Images },
      { label: 'Bulletin', path: '/admin-bulletin', icon: Newspaper },
      { label: 'Promotions', path: '/admin-promos', icon: Tag },
    ],
  },
  {
    label: 'Finance & Admin',
    items: [
      { label: 'Staffing', path: '/admin-staff', icon: Briefcase },
      { label: 'Payments', path: '/admin-payments', icon: CreditCard },
      { label: 'Subscriptions', path: '/admin-subscriptions', icon: CreditCard },
      { label: 'Policies', path: '/admin-policies', icon: ShieldCheck },
    ],
  },
];

interface AdminSidebarNavProps {
  pathname: string;
  adminUserName?: string;
  photo?: string;
  initials: string;
  onNavClick: () => void;
  onLogoutClick: () => void;
  navRef?: React.RefObject<HTMLElement | null>;
}

function AdminSidebarNav({
  pathname,
  adminUserName,
  photo,
  initials,
  onNavClick,
  onLogoutClick,
  navRef,
}: AdminSidebarNavProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-[#D4CDB5]/30">
        <Link to="/admin-dashboard" className="flex items-center gap-2 group" onClick={onNavClick}>
          <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-8 w-auto object-contain" />
          <div className="flex items-center gap-0.5 bg-[#1E2A35] rounded-full px-1.5 py-0.5 shrink-0">
            <Crown size={8} className="text-[#c49a3c]" />
            <span className="text-white text-[0.5rem] font-bold uppercase tracking-widest">Admin</span>
          </div>
        </Link>
      </div>

      <nav ref={navRef} className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-3">
          {NAV_SECTIONS.map((section, sectionIndex) => (
            <div key={section.label ?? `section-${sectionIndex}`}>
              {section.label ? (
                <div className="px-3 mb-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[#B0A898] text-[0.6rem] uppercase tracking-widest shrink-0">
                      {section.label}
                    </p>
                    <div className="h-px flex-1 bg-[#D4CDB5]/50" />
                  </div>
                </div>
              ) : sectionIndex > 0 ? (
                <div className="px-3 mb-2">
                  <div className="h-px w-full bg-[#D4CDB5]/40" />
                </div>
              ) : null}

              <div className="flex flex-col gap-0.5">
                {section.items.map(({ label, path, icon: Icon }) => {
                  const active = pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={onNavClick}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-[#1E2A35] text-white shadow-sm'
                          : 'text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
                      }`}
                    >
                      <Icon size={16} className={active ? 'text-[#c49a3c]' : 'text-[#8A7E6E]'} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="px-4 py-4 border-t border-[#D4CDB5]/30">
        <Link
          to="/admin-account"
          onClick={onNavClick}
          title="Edit profile images"
          className="flex items-center gap-3 mb-3 rounded-xl px-1 py-1 -mx-1 hover:bg-[#EDE8D8] transition-colors"
        >
          <div className="w-9 h-9 bg-[#1E2A35] rounded-full flex items-center justify-center shrink-0 overflow-hidden">
            <ProfileAvatar
              src={photo}
              initials={initials}
              alt=""
              className="h-full w-full"
              initialsClassName="text-white font-bold text-xs"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#1E2A35] text-xs font-semibold leading-none truncate">{adminUserName}</p>
            <p className="text-[#B0A898] text-[0.6rem] mt-0.5">Edit photos</p>
          </div>
        </Link>

        <button
          onClick={onLogoutClick}
          className="w-full flex items-center justify-center gap-2 text-[#8A7E6E] hover:text-red-600 text-xs transition-colors px-3 py-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100"
        >
          <LogOut size={13} /> Log Out
        </button>
      </div>
    </div>
  );
}

interface AdminSidebarProps {
  children: React.ReactNode;
}

export function AdminSidebar({ children }: AdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminUser, adminLogout } = useAdminAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopNavRef = useRef<HTMLElement>(null);

  const handleLogout = () => { adminLogout(); navigate('/admin-login'); };
  const initials = adminUser?.name.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? 'SA';

  const navProps = {
    pathname: location.pathname,
    adminUserName: adminUser?.name,
    photo: adminUser?.photo,
    initials,
    onNavClick: () => setMobileOpen(false),
    onLogoutClick: () => setShowLogoutModal(true),
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F3E8]">
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-sm p-7 flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                <LogOut size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em' }}>Log Out?</h3>
                <p className="text-[#8A7E6E] text-sm mt-1">You'll be signed out of the BALANSÉ Admin Portal.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3.5 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] active:scale-95 transition-all">
                Cancel
              </button>
              <button onClick={handleLogout} className="flex-1 py-3.5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95 transition-all shadow-sm">
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
      <aside className="hidden md:flex w-56 bg-white border-r border-[#D4CDB5]/60 shadow-sm flex-col shrink-0 z-30">
        <AdminSidebarNav {...navProps} navRef={desktopNavRef} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-[#1E2A35]/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-56 bg-white shadow-2xl z-50 flex flex-col">
            <AdminSidebarNav {...navProps} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden bg-white border-b border-[#D4CDB5]/60 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-xl bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35]"
          >
            <Menu size={18} />
          </button>
          <Link to="/admin-dashboard" className="flex items-center gap-2 min-w-0">
            <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-6 w-auto object-contain shrink-0" />
            <div className="flex items-center gap-0.5 bg-[#1E2A35] rounded-full px-1.5 py-0.5 shrink-0">
              <Crown size={8} className="text-[#c49a3c]" />
              <span className="text-white text-[0.5rem] font-bold uppercase tracking-widest">Admin</span>
            </div>
          </Link>
        </div>

        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
