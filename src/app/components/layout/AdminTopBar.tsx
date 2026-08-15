import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import {
  Crown, LogOut, LayoutDashboard, Users, UserCheck,
  CalendarDays, CreditCard, Images, ChevronDown,
  CreditCard as SubIcon, Tag, ShieldCheck,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import logoImg from 'figma:asset/bbdd3c4813a82e401f4feb97932ab9a28f6161ee.png';

const NAV_LINKS = [
  { label: 'Dashboard',  path: '/admin-dashboard', icon: LayoutDashboard },
  { label: 'Staff',      path: '/admin-staff',     icon: UserCheck },
  { label: 'Clients',   path: '/admin-students',  icon: Users },
  { label: 'Schedule',   path: '/admin-schedule',  icon: CalendarDays },
  { label: 'Payments',   path: '/admin-payments',  icon: CreditCard },
  { label: 'Gallery',    path: '/admin-gallery',   icon: Images },
];

const MANAGE_LINKS = [
  { label: 'Subscriptions', path: '/admin-subscriptions', icon: SubIcon,    desc: 'Plans & session credits' },
  { label: 'Promos',        path: '/admin-promos',        icon: Tag,        desc: 'Discounts & eligibility' },
  { label: 'Policies',      path: '/admin-policies',      icon: ShieldCheck,desc: 'Business rules & limits' },
];

export function AdminTopBar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { adminUser, adminLogout } = useAdminAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [manageOpen, setManageOpen]       = useState(false);
  const manageRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => { adminLogout(); navigate('/admin-login'); };
  const initials = adminUser?.name.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? 'SA';

  const manageActive = MANAGE_LINKS.some(l => location.pathname === l.path);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (manageRef.current && !manageRef.current.contains(e.target as Node)) {
        setManageOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="bg-white border-b border-[#D4CDB5]/60 sticky top-0 z-40 shadow-[0_1px_8px_rgba(30,42,53,0.05)]">
      <div className="max-w-7xl mx-auto px-6 h-[3.5rem] flex items-center justify-between gap-4">

        {/* ── Left: Brand ── */}
        <Link to="/admin-dashboard" className="flex items-center gap-2.5 shrink-0 group">
          <img src={logoImg} alt="BALANSÉ" className="w-7 h-7 object-contain" />
          <span
            className="text-[#1E2A35] tracking-widest uppercase"
            style={{ fontFamily: "'Cormorant Garant', serif", fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.18em' }}
          >
            BALANSÉ
          </span>
          <div className="flex items-center gap-1 bg-[#1E2A35] rounded-full px-2 py-0.5 ml-0.5">
            <Crown size={9} className="text-[#C49A3C]" />
            <span className="text-white text-[0.58rem] font-bold uppercase tracking-widest">Admin</span>
          </div>
        </Link>

        {/* ── Center: Nav ── */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#F0EBE0]'
                }`}
              >
                <link.icon size={13} />
                {link.label}
              </Link>
            );
          })}

          {/* Manage dropdown */}
          <div className="relative" ref={manageRef}>
            <button
              onClick={() => setManageOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                manageActive ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#F0EBE0]'
              }`}
            >
              <ShieldCheck size={13} />
              Manage
              <ChevronDown size={11} className={`transition-transform ${manageOpen ? 'rotate-180' : ''}`} />
            </button>
            {manageOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl border border-[#D4CDB5]/70 shadow-xl py-2 z-50">
                {MANAGE_LINKS.map(l => {
                  const active = location.pathname === l.path;
                  return (
                    <Link
                      key={l.path}
                      to={l.path}
                      onClick={() => setManageOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                        active ? 'bg-[#EDE8D8]' : 'hover:bg-[#F8F3E8]'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#EDE8D8] flex items-center justify-center shrink-0">
                        <l.icon size={13} className="text-[#8A7E6E]" />
                      </div>
                      <div>
                        <p className="text-[#1E2A35] text-xs font-semibold">{l.label}</p>
                        <p className="text-[#B0A898] text-[10px]">{l.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* ── Right: User + Logout ── */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1E2A35] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">{initials}</span>
            </div>
            <div className="hidden lg:block">
              <p className="text-[#1E2A35] text-xs font-semibold leading-none">{adminUser?.name}</p>
              <p className="text-[#B0A898] text-[0.65rem] mt-0.5">Super Admin</p>
            </div>
          </div>

          {!confirmLogout ? (
            <button
              onClick={() => setConfirmLogout(true)}
              className="flex items-center gap-1.5 text-[#8A7E6E] hover:text-red-600 text-xs transition-colors px-3 py-1.5 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100"
            >
              <LogOut size={13} /> Log Out
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5">
              <span className="text-red-700 text-xs font-semibold">Confirm?</span>
              <button onClick={handleLogout} className="text-xs font-bold text-red-600 hover:text-red-800 px-2 py-0.5 bg-white rounded-lg border border-red-200">Yes</button>
              <button onClick={() => setConfirmLogout(false)} className="text-xs text-[#8A7E6E] px-1.5 hover:text-[#1E2A35]">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
