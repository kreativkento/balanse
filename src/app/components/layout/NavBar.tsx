import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import {
  Menu, X, LogOut, LayoutDashboard,
  Home, Images, CreditCard, Layers, ShieldCheck, Newspaper, Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStaffAuth } from '../../context/StaffAuthContext';
import logoImg from 'figma:asset/bbdd3c4813a82e401f4feb97932ab9a28f6161ee.png';

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
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
    { label: 'Home', path: '/', icon: <Home size={18} /> },
    { label: 'Gallery', path: '/gallery', icon: <Images size={18} /> },
    { label: 'Pricing', path: '/pricing', icon: <CreditCard size={18} /> },
    { label: 'Classes', path: '/classes', icon: <Layers size={18} /> },
    { label: 'News', path: '/news', icon: <Newspaper size={18} /> },
    { label: 'Coaches', path: '/coaches', icon: <Users size={18} /> },
  ];

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <>
      <nav className="sticky top-0 z-30 bg-[#F8F3E8]/95 backdrop-blur-md border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setMenuOpen(false)}>
            <img src={logoImg} alt="BALANSÉ logo" className="w-8 h-8 object-contain" />
            <div className="flex flex-col leading-none">
              <span
                className="text-[#1E2A35] tracking-widest uppercase"
                style={{
                  fontFamily: "'Cormorant Garant', serif",
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                }}
              >
                BALANSÉ
              </span>
              <span
                className="text-[#C49A3C] uppercase tracking-widest"
                style={{ fontSize: '0.48rem', letterSpacing: '0.2em', fontFamily: "'Inter', sans-serif" }}
              >
                WELLNESS HUB
              </span>
            </div>
          </Link>

          {/* Desktop centre nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-[#C49A3C]/10 text-[#C49A3C]'
                    : 'text-[#5A5048] hover:text-[#1E2A35] hover:bg-[#EDE8D8]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right actions */}
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
                  className="flex items-center gap-2 px-4 py-2 bg-[#C49A3C]/10 text-[#C49A3C] rounded-xl text-sm font-semibold hover:bg-[#C49A3C]/20 transition-colors"
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
                className="px-5 py-2.5 bg-[#C49A3C] text-white rounded-full text-sm font-bold shadow-[0_4px_16px_rgba(196,154,60,0.35)] hover:bg-[#A67E2A] transition-colors active:scale-95"
              >
                Book / Schedule
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden text-[#1E2A35] p-2 rounded-xl hover:bg-[#EDE8D8] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* Mobile backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#1E2A35]/40 backdrop-blur-sm md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile slide-in drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[280px] bg-[#F8F3E8] shadow-2xl transition-transform duration-300 ease-out flex flex-col md:hidden ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4CDB5]/60">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="BALANSÉ logo" className="w-7 h-7 object-contain" />
            <div className="flex flex-col leading-none">
              <span
                className="text-[#1E2A35] tracking-widest uppercase"
                style={{
                  fontFamily: "'Cormorant Garant', serif",
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                }}
              >
                BALANSÉ
              </span>
              <span
                className="text-[#C49A3C] uppercase tracking-widest"
                style={{ fontSize: '0.44rem', letterSpacing: '0.2em', fontFamily: "'Inter', sans-serif" }}
              >
                WELLNESS HUB
              </span>
            </div>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="text-[#8A7E6E] hover:text-[#1E2A35] p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[#EDE8D8] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        {isAuthenticated && user && (
          <div className="px-5 py-4 border-b border-[#D4CDB5]/60 bg-[#EDE8D8]/50">
            <p className="text-[#8A7E6E] text-xs mb-1 uppercase tracking-wider">Signed in as</p>
            <p className="text-[#1E2A35] font-semibold">{user.name}</p>
            <p className="text-[#8A7E6E] text-sm">{user.email}</p>
          </div>
        )}

        {/* Nav links */}
        <div className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors min-h-[52px] ${
                isActive(link.path)
                  ? 'bg-[#C49A3C]/10 text-[#C49A3C]'
                  : 'text-[#1E2A35] hover:bg-[#EDE8D8]'
              }`}
            >
              <span className="text-[#8A7E6E]">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Bottom actions */}
        <div className="p-4 border-t border-[#D4CDB5]/60 flex flex-col gap-2">
          {isStaffAuthenticated ? (
            <>
              <Link
                to="/staff-dashboard"
                onClick={() => setMenuOpen(false)}
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
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-[#C49A3C] hover:bg-[#EDE8D8] rounded-xl text-base font-medium transition-colors min-h-[52px]"
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
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center px-4 py-4 bg-[#C49A3C] text-white rounded-2xl font-bold transition-all hover:bg-[#A67E2A] active:scale-95 min-h-[56px] shadow-[0_4px_20px_rgba(196,154,60,0.3)]"
            >
              Book / Schedule
            </Link>
          )}
        </div>
      </div>
    </>
  );
}