import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import {
  Crown, LogOut, LayoutDashboard, Users, UserCheck,
  CalendarDays, CreditCard, Images, ChevronDown,
  Tag, ShieldCheck, Menu, X, AlertOctagon, Clock,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import logoImg from 'figma:asset/bbdd3c4813a82e401f4feb97932ab9a28f6161ee.png';

const NAV_LINKS = [
  { label: 'Dashboard',  path: '/admin-dashboard', icon: LayoutDashboard },
  { label: 'Staff',      path: '/admin-staff',     icon: UserCheck },
  { label: 'Students',   path: '/admin-students',  icon: Users },
  { label: 'Schedule',   path: '/admin-schedule',  icon: CalendarDays },
  { label: 'Payments',   path: '/admin-payments',  icon: CreditCard },
  { label: 'Gallery',    path: '/admin-gallery',   icon: Images },
  { label: 'Absence Tracker',      path: '/admin-absence',             icon: AlertOctagon },
  { label: 'Coach Availability',   path: '/admin-coach-availability',  icon: Clock },
];

const MANAGE_LINKS = [
  { label: 'Subscriptions', path: '/admin-subscriptions', icon: CreditCard,  desc: 'Plans & session credits' },
  { label: 'Promos',        path: '/admin-promos',        icon: Tag,         desc: 'Discounts & eligibility' },
  { label: 'Policies',      path: '/admin-policies',      icon: ShieldCheck, desc: 'Business rules & limits' },
];

interface AdminSidebarProps {
  children: React.ReactNode;
}

export function AdminSidebar({ children }: AdminSidebarProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { adminUser, adminLogout } = useAdminAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { adminLogout(); navigate('/admin-login'); };
  const initials = adminUser?.name.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? 'SA';

  const manageActive = MANAGE_LINKS.some(l => location.pathname === l.path);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-[#D4CDB5]/30">
        <Link to="/admin-dashboard" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
          <img src={logoImg} alt="BALANSÉ" className="w-8 h-8 object-contain" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#1E2A35] tracking-widest uppercase" style={{ fontFamily: "'Cormorant Garant', serif", fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.18em' }}>
                BALANSÉ
              </span>
              <div className="flex items-center gap-0.5 bg-[#1E2A35] rounded-full px-1.5 py-0.5">
                <Crown size={8} className="text-[#C49A3C]" />
                <span className="text-white text-[0.5rem] font-bold uppercase tracking-widest">Admin</span>
              </div>
            </div>
            <p className="text-[#9A8E7E] text-[0.6rem] uppercase tracking-widest">Wellness Hub</p>
          </div>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="text-[#B0A898] text-[0.6rem] uppercase tracking-widest px-3 mb-2">Navigation</p>
        <div className="flex flex-col gap-0.5">
          {NAV_LINKS.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
                }`}
              >
                <Icon size={16} className={active ? 'text-[#C49A3C]' : 'text-[#8A7E6E]'} />
                {label}
              </Link>
            );
          })}

          {/* Manage section */}
          <div className="mt-3">
            <p className="text-[#B0A898] text-[0.6rem] uppercase tracking-widest px-3 mb-2">Manage</p>
            <button
              onClick={() => setManageOpen(v => !v)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                manageActive ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
              }`}
            >
              <ShieldCheck size={16} className={manageActive ? 'text-[#C49A3C]' : 'text-[#8A7E6E]'} />
              <span className="flex-1 text-left">Settings</span>
              <ChevronDown size={14} className={`transition-transform ${manageOpen ? 'rotate-180' : ''}`} />
            </button>
            {manageOpen && (
              <div className="mt-1 ml-3 flex flex-col gap-0.5 pl-6 border-l-2 border-[#D4CDB5]/50">
                {MANAGE_LINKS.map(l => {
                  const active = location.pathname === l.path;
                  return (
                    <Link
                      key={l.path}
                      to={l.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        active ? 'bg-[#C49A3C]/15 text-[#A67E2A]' : 'text-[#5A5048] hover:bg-[#EDE8D8]'
                      }`}
                    >
                      <l.icon size={13} className={active ? 'text-[#C49A3C]' : 'text-[#8A7E6E]'} />
                      {l.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-[#D4CDB5]/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-[#1E2A35] rounded-full flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#1E2A35] text-xs font-semibold leading-none truncate">{adminUser?.name}</p>
            <p className="text-[#B0A898] text-[0.6rem] mt-0.5">Super Admin</p>
          </div>
        </div>

        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center justify-center gap-2 text-[#8A7E6E] hover:text-red-600 text-xs transition-colors px-3 py-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100"
        >
          <LogOut size={13} /> Log Out
        </button>
      </div>
    </div>
  );

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
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r border-[#D4CDB5]/60 shadow-sm flex-col shrink-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-[#1E2A35]/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-56 bg-white shadow-2xl z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden bg-white border-b border-[#D4CDB5]/60 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-xl bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35]"
          >
            <Menu size={18} />
          </button>
          <Link to="/admin-dashboard" className="flex items-center gap-2">
            <img src={logoImg} alt="BALANSÉ" className="w-6 h-6 object-contain" />
            <span className="text-[#1E2A35] font-semibold text-sm" style={{ fontFamily: "'Cormorant Garant', serif" }}>BALANSÉ Admin</span>
          </Link>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
