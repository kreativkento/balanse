import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import {
  Menu, X, LogOut, LayoutDashboard,
  Home, Images, CreditCard, Layers, ShieldCheck, Newspaper, Users, ChevronDown, CalendarDays, Sparkles, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStaffAuth } from '../../context/StaffAuthContext';
import logoMain from 'figma:asset/logo_main.svg';

const ratesLinks = [
  { label: 'Pricing and Plans', path: '/pricing', icon: <CreditCard size={18} /> },
  { label: 'Services', path: '/services', icon: <Sparkles size={18} /> },
];

const communityLinks = [
  { label: 'Bulletin', path: '/bulletin', icon: <Newspaper size={18} /> },
  { label: 'Events', path: '/events', icon: <CalendarDays size={18} /> },
];

const classesLinks = [
  { label: 'Class Schedules', path: '/classes', icon: <CalendarDays size={18} /> },
  { label: 'Disciplines', path: '/disciplines', icon: <Layers size={18} /> },
];

const studioLinks = [
  { label: 'Amenities', path: '/studio', icon: <Images size={18} /> },
  { label: 'Guidelines', path: '/studio/guidelines', icon: <ClipboardList size={18} /> },
];

function DesktopDropdown({
  label,
  links,
  isActive,
}: {
  label: string;
  links: { label: string; path: string; icon: ReactNode }[];
  isActive: (path: string) => boolean;
}) {
  const groupActive = links.some((link) => isActive(link.path));

  return (
    <div className="relative group">
      <button
        type="button"
        className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
          groupActive
            ? 'bg-[#c49a3c]/10 text-[#c49a3c]'
            : 'text-[#5A5048] group-hover:text-[#1E2A35] group-hover:bg-[#EDE8D8]'
        }`}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
      </button>
      <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
        <div className="min-w-[200px] bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-lg py-2">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive(link.path)
                  ? 'bg-[#c49a3c]/10 text-[#c49a3c]'
                  : 'text-[#5A5048] hover:text-[#1E2A35] hover:bg-[#EDE8D8]'
              }`}
            >
              <span className="text-[#8A7E6E]">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileAccordion({
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
    <>
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors min-h-[52px] w-full text-left ${
          groupActive
            ? 'bg-[#c49a3c]/10 text-[#c49a3c]'
            : 'text-[#1E2A35] hover:bg-[#EDE8D8]'
        }`}
      >
        <span className="flex items-center gap-3">
          <span className="text-[#8A7E6E]">{icon}</span>
          {label}
        </span>
        <ChevronDown
          size={16}
          className={`text-[#8A7E6E] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="ml-4 flex flex-col gap-1 border-l border-[#D4CDB5]/60 pl-2">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors min-h-[48px] ${
                isActive(link.path)
                  ? 'bg-[#c49a3c]/10 text-[#c49a3c]'
                  : 'text-[#1E2A35] hover:bg-[#EDE8D8]'
              }`}
            >
              <span className="text-[#8A7E6E]">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [classesOpen, setClassesOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { staffUser, isStaffAuthenticated, staffLogout } = useStaffAuth();

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const handleStaffLogout = () => {
    staffLogout();
    setMenuOpen(false);
    navigate('/');
  };

  const navLinks = [
    { label: 'About Us', path: '/', icon: <Home size={18} /> },
  ];

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname === path;

  const closeMenu = () => {
    setMenuOpen(false);
    setCommunityOpen(false);
    setClassesOpen(false);
    setRatesOpen(false);
    setStudioOpen(false);
  };

  return (
    <>
      <nav className="sticky top-0 z-30 bg-[#F8F3E8]/95 backdrop-blur-md border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">

          <Link to="/" className="flex items-center shrink-0" onClick={closeMenu}>
            <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-8 w-auto object-contain" />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-[#c49a3c]/10 text-[#c49a3c]'
                    : 'text-[#5A5048] hover:text-[#1E2A35] hover:bg-[#EDE8D8]'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <DesktopDropdown label="Our Studio" links={studioLinks} isActive={isActive} />
            <DesktopDropdown label="Our Rates" links={ratesLinks} isActive={isActive} />
            <DesktopDropdown label="Our Classes" links={classesLinks} isActive={isActive} />
            <DesktopDropdown label="Our Community" links={communityLinks} isActive={isActive} />
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isStaffAuthenticated ? (
              <>
                <div className="flex items-center gap-1.5 bg-[#1E2A35]/08 border border-[#1E2A35]/15 rounded-full px-3 py-1">
                  <ShieldCheck size={12} className="text-[#1E2A35]" />
                  <span className="text-[#1E2A35] text-xs font-bold uppercase tracking-widest">{staffUser?.role}</span>
                </div>
                <Link
                  to="/staff-dashboard"
                  className="flex items-center gap-2 px-4 py-2 bg-[#1E2A35]/08 text-[#1E2A35] rounded-xl text-sm font-semibold hover:bg-[#1E2A35]/15 transition-colors"
                >
                  <LayoutDashboard size={15} />
                  Staff Dashboard
                </Link>
                <button
                  onClick={handleStaffLogout}
                  className="p-2 text-[#8A7E6E] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Staff log out"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 bg-[#c49a3c]/10 text-[#c49a3c] rounded-xl text-sm font-semibold hover:bg-[#c49a3c]/20 transition-colors"
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-[#8A7E6E] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Log out"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="px-5 py-2.5 bg-[#c49a3c] text-white rounded-full text-sm font-bold shadow-[0_4px_16px_rgba(196,154,60,0.35)] hover:bg-[#a67f2e] transition-colors active:scale-95"
              >
                Login / Sign Up
              </Link>
            )}
          </div>

          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden text-[#1E2A35] p-2 rounded-xl hover:bg-[#EDE8D8] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#1E2A35]/40 backdrop-blur-sm md:hidden"
          onClick={closeMenu}
        />
      )}

      <div
        className={`fixed top-0 right-0 z-50 h-full w-[280px] bg-[#F8F3E8] shadow-2xl transition-transform duration-300 ease-out flex flex-col md:hidden ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4CDB5]/60">
          <div className="flex items-center">
            <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-7 w-auto object-contain" />
          </div>
          <button
            onClick={closeMenu}
            className="text-[#8A7E6E] hover:text-[#1E2A35] p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[#EDE8D8] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {isAuthenticated && user && (
          <div className="px-5 py-4 border-b border-[#D4CDB5]/60 bg-[#EDE8D8]/50">
            <p className="text-[#8A7E6E] text-xs mb-1 uppercase tracking-wider">Signed in as</p>
            <p className="text-[#1E2A35] font-semibold">{user.name}</p>
            <p className="text-[#8A7E6E] text-sm">{user.email}</p>
          </div>
        )}

        <div className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={closeMenu}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors min-h-[52px] ${
                isActive(link.path)
                  ? 'bg-[#c49a3c]/10 text-[#c49a3c]'
                  : 'text-[#1E2A35] hover:bg-[#EDE8D8]'
              }`}
            >
              <span className="text-[#8A7E6E]">{link.icon}</span>
              {link.label}
            </Link>
          ))}

          <MobileAccordion
            label="Our Studio"
            icon={<Images size={18} />}
            links={studioLinks}
            open={studioOpen}
            onToggle={() => setStudioOpen((v) => !v)}
            isActive={isActive}
            onNavigate={closeMenu}
          />

          <MobileAccordion
            label="Our Rates"
            icon={<CreditCard size={18} />}
            links={ratesLinks}
            open={ratesOpen}
            onToggle={() => setRatesOpen((v) => !v)}
            isActive={isActive}
            onNavigate={closeMenu}
          />

          <MobileAccordion
            label="Our Classes"
            icon={<Layers size={18} />}
            links={classesLinks}
            open={classesOpen}
            onToggle={() => setClassesOpen((v) => !v)}
            isActive={isActive}
            onNavigate={closeMenu}
          />

          <MobileAccordion
            label="Our Community"
            icon={<Users size={18} />}
            links={communityLinks}
            open={communityOpen}
            onToggle={() => setCommunityOpen((v) => !v)}
            isActive={isActive}
            onNavigate={closeMenu}
          />
        </div>

        <div className="p-4 border-t border-[#D4CDB5]/60 flex flex-col gap-2">
          {isStaffAuthenticated ? (
            <>
              <Link
                to="/staff-dashboard"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 text-[#1E2A35] hover:bg-[#EDE8D8] rounded-xl text-base font-medium transition-colors min-h-[52px]"
              >
                <ShieldCheck size={18} className="text-[#8A7E6E]" />
                Staff Dashboard
              </Link>
              <button
                onClick={handleStaffLogout}
                className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl text-base font-medium transition-colors w-full text-left min-h-[52px]"
              >
                <LogOut size={18} />
                Staff Logout
              </button>
            </>
          ) : isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 text-[#c49a3c] hover:bg-[#EDE8D8] rounded-xl text-base font-medium transition-colors min-h-[52px]"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl text-base font-medium transition-colors w-full text-left min-h-[52px]"
              >
                <LogOut size={18} />
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              onClick={closeMenu}
              className="flex items-center justify-center px-4 py-4 bg-[#c49a3c] text-white rounded-2xl font-bold transition-all hover:bg-[#a67f2e] active:scale-95 min-h-[56px] shadow-[0_4px_20px_rgba(196,154,60,0.3)]"
            >
              Login / Sign Up
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
