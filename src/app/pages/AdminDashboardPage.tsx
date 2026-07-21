import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Users, UserCheck, CalendarDays,
  ChevronRight, BookOpen, Clock,
  CreditCard, Images, Star, Pencil, Check, X, ChevronDown,
  Tag, ShieldCheck, TrendingUp, BarChart3,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminTopBar } from '../components/layout/AdminTopBar';

// ── Mock data ──────────────────────────────────────────────────

const STATS = [
  { label: 'Total Staff',       value: '8',   sub: 'Active accounts',     Icon: UserCheck,   accent: false, amber: false },
  { label: 'Active Members',    value: '200', sub: 'Registered members',  Icon: Users,       accent: true,  amber: false },
  { label: 'Pending Payments',  value: '4',   sub: 'Awaiting validation', Icon: CreditCard,  accent: false, amber: true  },
  { label: 'Classes This Week', value: '12',  sub: 'Scheduled sessions',  Icon: CalendarDays,accent: false, amber: false },
];

const FEATURE_CARDS = [
  { title: 'Staff Management', desc: 'Add, edit, or deactivate coach and staff accounts.', path: '/admin-staff',    badge: '8 accounts',    Icon: UserCheck,    dark: true  },
  { title: 'Student Accounts', desc: 'Manage profiles, memberships, and client CRM data.', path: '/admin-students', badge: '200 students',  Icon: Users,        dark: false },
  { title: 'Schedule Manager', desc: 'Build the class calendar. Approve booking requests.', path: '/admin-schedule', badge: '12 classes/wk', Icon: CalendarDays, dark: false },
];

const SECONDARY_CARDS = [
  { title: 'Payments & Receipts',  desc: 'Validate payments and issue official receipts.', path: '/admin-payments',      badge: '4 pending', Icon: CreditCard, color: '#C49A3C' },
  { title: 'Gallery Manager',      desc: 'Upload, tag, and manage studio gallery photos.', path: '/admin-gallery',       badge: '12 photos', Icon: Images,     color: '#3A4A5A' },
  { title: 'Subscription Plans',   desc: 'Manage plans, session credits, and renewals.',   path: '/admin-subscriptions', badge: '3 plans',   Icon: CreditCard, color: '#7A9A8A' },
  { title: 'Promos & Discounts',   desc: 'Create promos and define eligibility rules.',    path: '/admin-promos',        badge: '3 active',  Icon: Tag,        color: '#B86A4A' },
];

const RECENT_ACTIVITY = [
  { label: 'Booking request',   detail: 'Alex Johnson — Yoga · Tue Apr 14 · Pending payment',         time: '2 min ago',  dot: '#C49A3C' },
  { label: 'Payment submitted', detail: 'Ryan Bautista · Animal Flow · Bank Transfer — ref BDO-001',   time: '15 min ago', dot: '#6B8E6B' },
  { label: 'Cancellation req.', detail: 'Sofia Reyes · Yoga Apr 14 · 18 hrs notice', time: '45 min ago', dot: '#B86A4A' },
  { label: 'Staff account',     detail: 'Alec Bautista password reset by Super Admin',                 time: '1 hr ago',   dot: '#3A4A5A' },
  { label: 'Class scheduled',   detail: 'Kickboxing · Wed Apr 15 · 5:00 PM · Coach Wolf',              time: '3 hrs ago',  dot: '#7A3A4A' },
  { label: 'Student registered',detail: 'Lea Mendoza joined with Single Class Pass',                   time: '5 hrs ago',  dot: '#9A7A8A' },
];

const QUICK_LINKS = [
  { label: 'Full Schedule',    path: '/admin-schedule',      Icon: CalendarDays },
  { label: 'All Staff',        path: '/admin-staff',         Icon: UserCheck    },
  { label: 'All Students',     path: '/admin-students',      Icon: BookOpen     },
  { label: 'Payments',         path: '/admin-payments',      Icon: CreditCard   },
  { label: 'Gallery',          path: '/admin-gallery',       Icon: Images       },
  { label: 'Subscriptions',    path: '/admin-subscriptions', Icon: CreditCard   },
  { label: 'Promos',           path: '/admin-promos',        Icon: Tag          },
  { label: 'Business Policies',path: '/admin-policies',      Icon: ShieldCheck  },
];

const SERVICES = ['Yoga', 'Calisthenics', 'Animal Flow', 'Groundworks', 'Circuit Training', 'Mat Pilates', 'Kickboxing', 'Capoeira', 'Personal Coaching'];
const COACHES  = ['Rex', 'Jodi', 'Ephraim', 'Alec', 'Rachelle', 'Kate', 'Wolf'];

// ── Component ──────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [featuredClass, setFeaturedClass]     = useState('Animal Flow');
  const [featuredCoach, setFeaturedCoach]     = useState('Ephraim');
  const [featuredMsg, setFeaturedMsg]         = useState('Experience ground-based movement this April.');
  const [editingFeatured, setEditingFeatured] = useState(false);
  const [featuredSaved, setFeaturedSaved]     = useState(false);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  if (!adminUser) return null;

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const saveFeatured = () => {
    setFeaturedSaved(true);
    setEditingFeatured(false);
    setTimeout(() => setFeaturedSaved(false), 2500);
  };

  const INP = 'w-full px-3 py-2.5 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all';
  const SEL = INP + ' appearance-none cursor-pointer';

  return (
    <div className="min-h-screen bg-[#F8F3E8]">
      <AdminTopBar />

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Heading ── */}
        <div className="mb-7">
          <p className="text-[#8A7E6E] text-sm">{greeting},</p>
          <h1
            className="text-[#1E2A35] leading-tight"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', letterSpacing: '0.04em' }}
          >
            Admin Dashboard
          </h1>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          {STATS.map(({ label, value, sub, Icon, accent, amber }) => (
            <div
              key={label}
              className={`bg-white rounded-3xl border shadow-sm px-5 py-4 flex items-center gap-4 ${accent ? 'border-[#C49A3C]/40' : amber ? 'border-amber-200/60' : 'border-[#D4CDB5]/60'}`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${accent ? 'bg-[#C49A3C]/12' : amber ? 'bg-amber-50' : 'bg-[#EDE8D8]'}`}>
                <Icon size={18} className={accent ? 'text-[#C49A3C]' : amber ? 'text-amber-600' : 'text-[#5A5048]'} />
              </div>
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{label}</p>
                <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.04em' }}>{value}</p>
                <p className="text-[#B0A898] text-xs mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Feature Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
          {FEATURE_CARDS.map(({ title, desc, path, badge, Icon, dark }) => (
            <Link
              key={title}
              to={path}
              className={`rounded-3xl p-6 flex flex-col justify-between min-h-[180px] transition-all hover:scale-[1.015] active:scale-[0.98] shadow-sm group ${dark ? '' : 'border border-[#D4CDB5]/60'}`}
              style={{ backgroundColor: dark ? '#1E2A35' : 'white' }}
            >
              <div>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${dark ? 'bg-white/10' : 'bg-[#EDE8D8]'}`}>
                  <Icon size={21} className={dark ? 'text-[#C49A3C]' : 'text-[#5A5048]'} />
                </div>
                <h3 className={dark ? 'text-white' : 'text-[#1E2A35]'} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.05em' }}>{title}</h3>
                <p className={`text-sm mt-1 leading-relaxed ${dark ? 'text-white/50' : 'text-[#8A7E6E]'}`}>{desc}</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${dark ? 'bg-white/10 text-white/60' : 'bg-[#EDE8D8] text-[#7A6A52]'}`}>{badge}</span>
                <ChevronRight size={17} className={`transition-transform group-hover:translate-x-1 ${dark ? 'text-white/30 group-hover:text-white/60' : 'text-[#C49A3C]'}`} />
              </div>
            </Link>
          ))}
        </div>

        {/* ── Secondary Cards: 2x2 Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
          {SECONDARY_CARDS.map(({ title, desc, path, badge, Icon, color }) => (
            <Link
              key={title}
              to={path}
              className="bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-sm p-5 flex items-start gap-3 hover:border-[#C49A3C]/40 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${color}18` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.05em' }}>{title}</h3>
                <p className="text-[#8A7E6E] text-xs leading-snug mt-0.5">{desc}</p>
                <span className="inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EDE8D8] text-[#7A6A52]">{badge}</span>
              </div>
              <ChevronRight size={14} className="text-[#C49A3C] shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>

        {/* ── Business Metrics Row ── */}
        <div className="mb-7">
          <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Business Performance</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Sales',           value: '₱248,400', sub: 'All-time revenue',         icon: <TrendingUp size={18} className="text-[#C49A3C]" />,    gold: true  },
              { label: 'Completed Sessions',    value: '847',      sub: 'All clients, all time',     icon: <BarChart3 size={18} className="text-[#6B8E6B]" />,      gold: false },
              { label: 'Active Subscriptions',  value: '200',      sub: 'Gold + Silver + Pass',      icon: <CreditCard size={18} className="text-[#7A9A8A]" />,     gold: false },
              { label: 'Credits Remaining',     value: '236',      sub: 'Unused across all plans',   icon: <BookOpen size={18} className="text-amber-600" />,       gold: false, amber: true },
            ].map(s => (
              <div key={s.label} className={`bg-white rounded-3xl border shadow-sm px-5 py-4 flex items-center gap-4 ${s.gold ? 'border-[#C49A3C]/40' : s.amber ? 'border-amber-200/60' : 'border-[#D4CDB5]/60'}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${s.gold ? 'bg-[#C49A3C]/12' : s.amber ? 'bg-amber-50' : 'bg-[#EDE8D8]'}`}>{s.icon}</div>
                <div>
                  <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{s.label}</p>
                  <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{s.value}</p>
                  <p className="text-[#B0A898] text-xs mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom Row: Activity + Sidebar ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Recent Activity (2/3) */}
          <div className="md:col-span-2 bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex items-center justify-between">
              <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.05em' }}>Recent Activity</h2>
              <div className="flex items-center gap-1.5 text-[#8A7E6E]">
                <Clock size={12} />
                <span className="text-xs">Today, Apr 13</span>
              </div>
            </div>
            <div className="divide-y divide-[#D4CDB5]/30">
              {RECENT_ACTIVITY.map((item, i) => (
                <div key={i} className="px-6 py-3.5 flex items-center gap-4 hover:bg-[#F8F3E8]/50 transition-colors">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.dot }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[#1E2A35] text-sm font-semibold">{item.label}</span>
                    <span className="text-[#8A7E6E] text-sm"> · {item.detail}</span>
                  </div>
                  <span className="text-[#C0B8A8] text-xs shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="flex flex-col gap-4">

            {/* Quick Access */}
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-4">Quick Access</p>
              <div className="flex flex-col gap-1">
                {QUICK_LINKS.map(({ label, path, Icon }) => (
                  <Link key={label} to={path} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#F0EBE0] transition-colors group">
                    <div className="w-7 h-7 rounded-lg bg-[#EDE8D8] flex items-center justify-center shrink-0">
                      <Icon size={13} className="text-[#8A7E6E]" />
                    </div>
                    <span className="text-[#1E2A35] text-sm font-medium flex-1">{label}</span>
                    <ChevronRight size={13} className="text-[#C49A3C] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Studio Snapshot */}
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-4">Studio Snapshot</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Today's Classes",      value: '3',      color: 'text-[#1E2A35]' },
                  { label: 'Students Today',        value: '26',     color: 'text-[#1E2A35]' },
                  { label: 'Gold Members',           value: '82',     color: 'text-[#C49A3C]' },
                  { label: 'Silver Members',         value: '74',     color: 'text-[#8A7E6E]' },
                  { label: 'Single Pass (Active)',   value: '44',     color: 'text-[#1E2A35]' },
                  { label: 'Completed Sessions',     value: '847',    color: 'text-[#6B8E6B]' },
                  { label: 'Credits Remaining',      value: '236',    color: 'text-amber-600'  },
                  { label: 'Most Booked',            value: 'Yoga',   color: 'text-[#C49A3C]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[#5A5048] text-sm">{label}</span>
                    <span className={`font-semibold ${color}`} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Section Editor */}
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">Featured Section</p>
                {!editingFeatured && (
                  <button
                    onClick={() => setEditingFeatured(true)}
                    className="flex items-center gap-1 text-[#C49A3C] text-xs font-semibold hover:text-[#A67E2A] transition-colors"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                )}
              </div>

              {!editingFeatured ? (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Star size={11} className="text-[#C49A3C] fill-[#C49A3C]" />
                    <span className="text-[#C49A3C] text-xs font-bold uppercase tracking-widest">Class of the Month</span>
                  </div>
                  <p className="text-[#1E2A35] font-semibold" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.04em' }}>{featuredClass}</p>
                  <p className="text-[#8A7E6E] text-xs">Coach {featuredCoach}</p>
                  <p className="text-[#9A8E7E] text-xs mt-1 leading-relaxed italic">"{featuredMsg}"</p>
                  {featuredSaved && (
                    <p className="text-green-600 text-xs mt-2 flex items-center gap-1"><Check size={11} /> Saved to public page</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[#8A7E6E] text-[10px] uppercase tracking-widest mb-1">Featured Class</label>
                    <div className="relative">
                      <select value={featuredClass} onChange={e => setFeaturedClass(e.target.value)} className={SEL}>
                        {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#8A7E6E] text-[10px] uppercase tracking-widest mb-1">Featured Coach</label>
                    <div className="relative">
                      <select value={featuredCoach} onChange={e => setFeaturedCoach(e.target.value)} className={SEL}>
                        {COACHES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#8A7E6E] text-[10px] uppercase tracking-widest mb-1">Message</label>
                    <textarea
                      value={featuredMsg}
                      onChange={e => setFeaturedMsg(e.target.value)}
                      rows={2}
                      className={INP + ' resize-none'}
                      placeholder="Short description for the public page…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingFeatured(false)} className="flex-1 py-2 rounded-xl border border-[#D4CDB5]/70 text-[#8A7E6E] text-xs hover:bg-[#EDE8D8] transition-all">Cancel</button>
                    <button
                      onClick={saveFeatured}
                      className="flex-1 py-2 rounded-xl bg-[#1E2A35] text-white text-xs hover:bg-[#263545] transition-all flex items-center justify-center gap-1"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em' }}
                    >
                      <Check size={12} /> Save
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}