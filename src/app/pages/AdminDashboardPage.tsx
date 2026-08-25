import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Clock, Star, Pencil, Check, ChevronDown,
  ArrowUpRight, ArrowDownRight,
  BookOpen, AlertCircle, CalendarDays,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { formatDateLongFromKey, getTodayDateKey } from '../components/calendar/weekCalendarUtils';

// ── Types & Data ───────────────────────────────────────────────

type MetricPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const SERVICES = ['Yoga', 'Calisthenics', 'Animal Flow', 'Groundworks', 'Circuit Training', 'Mat Pilates', 'Kickboxing', 'Capoeira', 'Personal Coaching'];
const COACHES  = ['Rex', 'Jodi', 'Ephraim', 'Alec', 'Rachelle', 'Kate', 'Wolf'];

const METRICS: Record<MetricPeriod, { revenue: number; sessions: number; trend: number; prev: number }> = {
  weekly:    { revenue: 5040,   sessions: 14,  trend: +8.5,  prev: 4640   },
  monthly:   { revenue: 21240,  sessions: 59,  trend: +12.3, prev: 18910  },
  quarterly: { revenue: 61560,  sessions: 171, trend: +5.7,  prev: 58240  },
  yearly:    { revenue: 247320, sessions: 687, trend: +21.0, prev: 204400 },
};

const PERIOD_LABEL: Record<MetricPeriod, string> = {
  weekly: 'This Week', monthly: 'This Month', quarterly: 'This Quarter', yearly: 'This Year',
};

const METHOD_SPLITS: Record<MetricPeriod, { method: string; pct: number; color: string }[]> = {
  weekly:    [{ method: 'Bank Transfer', pct: 50, color: '#3A4A5A' }, { method: 'GCash', pct: 33, color: '#007DFF' }, { method: 'Maya', pct: 17, color: '#46BFA8' }],
  monthly:   [{ method: 'Bank Transfer', pct: 52, color: '#3A4A5A' }, { method: 'GCash', pct: 31, color: '#007DFF' }, { method: 'Maya', pct: 17, color: '#46BFA8' }],
  quarterly: [{ method: 'Bank Transfer', pct: 55, color: '#3A4A5A' }, { method: 'GCash', pct: 28, color: '#007DFF' }, { method: 'Maya', pct: 17, color: '#46BFA8' }],
  yearly:    [{ method: 'Bank Transfer', pct: 58, color: '#3A4A5A' }, { method: 'GCash', pct: 27, color: '#007DFF' }, { method: 'Maya', pct: 15, color: '#46BFA8' }],
};

const RECENT_ACTIVITY = [
  { label: 'Booking request',    detail: 'Alex Johnson — Yoga · Apr 28',                      time: '2 min ago',  dot: '#745b3c',  type: 'booking'  },
  { label: 'Payment submitted',  detail: 'Ryan Bautista · Animal Flow · GCash ref GC-001',    time: '15 min ago', dot: '#6B8E6B',  type: 'payment'  },
  { label: 'Cancellation',       detail: 'Sofia Reyes · Yoga Apr 14 · 28 hrs notice',         time: '45 min ago', dot: '#B86A4A',  type: 'cancel'   },
  { label: 'Staff update',       detail: 'Alec Bautista password reset by Super Admin',        time: '1 hr ago',   dot: '#3A4A5A',  type: 'staff'    },
  { label: 'Class scheduled',    detail: 'Kickboxing · Wed Apr 29 · 5:00 PM · Coach Wolf',    time: '3 hrs ago',  dot: '#7A3A4A',  type: 'schedule' },
  { label: 'New registration',   detail: 'Lea Mendoza joined with Single Class Pass',          time: '5 hrs ago',  dot: '#9A7A8A',  type: 'register' },
];

// ── Component ──────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [period, setPeriod]               = useState<MetricPeriod>('monthly');
  const [featuredClass, setFeaturedClass] = useState('Animal Flow');
  const [featuredCoach, setFeaturedCoach] = useState('Ephraim');
  const [featuredMsg, setFeaturedMsg]     = useState('Experience ground-based movement this month.');
  const [editing, setEditing]             = useState(false);
  const [saved, setSaved]                 = useState(false);

  useEffect(() => { if (!adminUser) navigate('/admin-login'); }, [adminUser, navigate]);
  if (!adminUser) return null;

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const saveFeatured = () => {
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const m      = METRICS[period];
  const splits = METHOD_SPLITS[period];
  const avgSession = Math.round(m.revenue / m.sessions);

  const INP = 'w-full px-3 py-2.5 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all';

  return (
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[#9A8E7E] text-sm mb-1">{greeting}, {adminUser.name.split(' ')[0]}</p>
            <h1 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', letterSpacing: '0.04em', lineHeight: 1 }}>
              Admin Dashboard
            </h1>
          </div>
          <div className="shrink-0 flex items-center gap-3 rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#745b3c]/12 border border-[#745b3c]/25 flex items-center justify-center shrink-0">
              <CalendarDays size={18} className="text-[#745b3c]" />
            </div>
            <div className="text-right sm:text-left">
              <p className="text-[#B0A898] text-[10px] uppercase tracking-widest leading-none mb-1">Today</p>
              <p className="text-[#1E2A35] text-sm font-semibold leading-tight">{formatDateLongFromKey(getTodayDateKey())}</p>
              <p className="text-[#8A7E6E] text-xs mt-0.5">BALANSÉ Wellness Hub</p>
            </div>
          </div>
        </div>

        {/* ── Overview Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {([
            { label: 'Active Members',    value: '200', sub: '+3 this week',     accent: '#745b3c', trend: 'up'   },
            { label: 'Total Staff',       value: '8',   sub: '7 coaches active', accent: '#1E2A35', trend: null   },
            { label: 'Pending Payments',  value: '4',   sub: '₱1,440 pending',   accent: '#E07B39', trend: null   },
            { label: 'Classes This Week', value: '12',  sub: '↑ from 9 last wk', accent: '#6B8E6B', trend: 'up'   },
          ] as const).map(({ label, value, sub, accent, trend }) => (
            <div key={label} className={`bg-white rounded-2xl border border-[#E8E2D2]/80 px-5 py-4 shadow-sm ${CARD_HOVER_GROW}`}>
              <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">{label}</p>
              <p className="text-[#1E2A35] leading-none mb-1.5" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.04em', color: accent }}>
                {value}
              </p>
              <p className={`text-xs flex items-center gap-0.5 ${trend === 'up' ? 'text-[#6B8E6B]' : 'text-[#B0A898]'}`}>
                {trend === 'up' && <ArrowUpRight size={11} />}
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Payment Metrics ── */}
        <div className={`bg-white rounded-3xl border border-[#E8E2D2]/80 shadow-sm overflow-hidden mb-10 ${CARD_HOVER_GROW}`}>
          {/* Panel header */}
          <div className="px-7 py-5 border-b border-[#E8E2D2]/70 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-0.5">Revenue</p>
              <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em' }}>
                Payment Metrics
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Period tabs */}
              <div className="flex gap-0.5 bg-[#F0EBE0] rounded-xl p-1">
                {(['weekly', 'monthly', 'quarterly', 'yearly'] as MetricPeriod[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${period === p ? 'bg-white text-[#1E2A35] shadow-sm' : 'text-[#9A8E7E] hover:text-[#1E2A35]'}`}>
                    {p}
                  </button>
                ))}
              </div>
              <Link to="/admin-payments" className="text-[#745b3c] text-xs font-semibold hover:text-[#5e4a30] transition-colors">
                View all →
              </Link>
            </div>
          </div>

          {/* Big revenue + secondary metrics */}
          <div className="px-7 py-6">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-start">

              {/* Primary: big revenue number */}
              <div className="min-w-48">
                <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">{PERIOD_LABEL[period]} Revenue</p>
                <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.4rem, 4vw, 3.2rem)', letterSpacing: '0.02em' }}>
                  ₱{m.revenue.toLocaleString()}
                </p>
                <p className={`text-sm mt-2 flex items-center gap-1 font-semibold ${m.trend > 0 ? 'text-[#6B8E6B]' : 'text-red-500'}`}>
                  {m.trend > 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  {m.trend > 0 ? '+' : ''}{m.trend}% vs. previous {period.replace('ly', '')}
                </p>
              </div>

              {/* Secondary metrics + breakdown */}
              <div className="flex flex-col gap-5">
                {/* 3 secondary stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Sessions Paid', value: String(m.sessions), note: PERIOD_LABEL[period] },
                    { label: 'Avg per Session', value: `₱${avgSession}`, note: 'per paid session' },
                    { label: 'All-Time Total', value: '₱247K', note: 'since launch' },
                  ].map(s => (
                    <div key={s.label} className="bg-[#F8F3E8] rounded-2xl px-4 py-3 border border-[#E8E2D2]/60">
                      <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">{s.label}</p>
                      <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{s.value}</p>
                      <p className="text-[#B0A898] text-xs mt-0.5">{s.note}</p>
                    </div>
                  ))}
                </div>

                {/* Method breakdown bars */}
                <div>
                  <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-3">Revenue by Payment Method</p>
                  <div className="flex flex-col gap-2.5">
                    {splits.map(({ method, pct, color }) => (
                      <div key={method} className="flex items-center gap-3">
                        <p className="text-[#5A5048] text-xs w-28 shrink-0">{method}</p>
                        <div className="flex-1 bg-[#EDE8D8] rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <p className="text-[#8A7E6E] text-xs w-9 text-right shrink-0 font-medium">{pct}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom: Activity + Snapshot + Featured ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Activity (2/3) */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.05em' }}>Recent Activity</h2>
              <div className="flex items-center gap-1.5 text-[#B0A898]">
                <Clock size={12} />
                <span className="text-xs">Today, Jul 27</span>
              </div>
            </div>
            <div className={`bg-white rounded-3xl border border-[#E8E2D2]/80 shadow-sm overflow-hidden ${CARD_HOVER_GROW}`}>
              {RECENT_ACTIVITY.map((item, i) => (
                <div key={i} className={`px-6 py-4 flex items-start gap-4 hover:bg-[#FDFAF5] transition-colors ${i < RECENT_ACTIVITY.length - 1 ? 'border-b border-[#F0EBE0]' : ''}`}>
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: item.dot + '20' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.dot }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1E2A35] text-sm font-semibold leading-snug">{item.label}</p>
                    <p className="text-[#9A8E7E] text-xs mt-0.5 leading-relaxed">{item.detail}</p>
                  </div>
                  <span className="text-[#C0B8A8] text-xs shrink-0 mt-0.5">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">

            {/* Quick info */}
            <div>
              <h2 className="text-[#1E2A35] mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.05em' }}>Studio Today</h2>
              <div className={`bg-white rounded-3xl border border-[#E8E2D2]/80 shadow-sm p-5 ${CARD_HOVER_GROW}`}>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Today's Classes",  value: '3',    color: '#1E2A35' },
                    { label: 'Students Today',   value: '26',   color: '#1E2A35' },
                    { label: 'Gold Members',     value: '82',   color: '#745b3c' },
                    { label: 'Silver Members',   value: '74',   color: '#8A7E6E' },
                    { label: 'Credits Remaining',value: '236',  color: '#E07B39' },
                    { label: 'Top Class',        value: 'Yoga', color: '#745b3c' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[#5A5048] text-sm">{label}</span>
                      <span className="font-bold text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.04em', color }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Pending alerts */}
                <div className="mt-4 pt-4 border-t border-[#F0EBE0] flex flex-col gap-2">
                  <Link to="/admin-payments" className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors group">
                    <AlertCircle size={13} className="text-amber-600 shrink-0" />
                    <span className="text-amber-700 text-xs font-semibold flex-1">4 payments pending review</span>
                    <ArrowUpRight size={12} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <Link to="/admin-coaches?tab=absence" className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F8F3E8] border border-[#E8E2D2]/80 hover:bg-[#EDE8D8] transition-colors group">
                    <BookOpen size={13} className="text-[#8A7E6E] shrink-0" />
                    <span className="text-[#5A5048] text-xs font-semibold flex-1">Review coach attendance</span>
                    <ArrowUpRight size={12} className="text-[#B0A898] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Featured Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.05em' }}>Featured Section</h2>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[#745b3c] text-xs font-semibold hover:text-[#5e4a30] transition-colors">
                    <Pencil size={11} /> Edit
                  </button>
                )}
              </div>
              <div className={`bg-white rounded-3xl border border-[#E8E2D2]/80 shadow-sm p-5 ${CARD_HOVER_GROW}`}>
                {!editing ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Star size={12} className="text-[#745b3c] fill-[#745b3c]" />
                      <span className="text-[#745b3c] text-xs font-bold uppercase tracking-widest">Class of the Month</span>
                    </div>
                    <p className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.04em' }}>{featuredClass}</p>
                    <p className="text-[#9A8E7E] text-xs mt-0.5">with Coach {featuredCoach}</p>
                    <p className="text-[#8A7E6E] text-sm mt-2 leading-relaxed italic">"{featuredMsg}"</p>
                    {saved && (
                      <p className="text-green-600 text-xs mt-2 flex items-center gap-1"><Check size={11} /> Saved to public page</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[#9A8E7E] text-[10px] uppercase tracking-widest mb-1">Class</label>
                      <div className="relative">
                        <select value={featuredClass} onChange={e => setFeaturedClass(e.target.value)} className={INP + ' appearance-none pr-8'}>
                          {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#9A8E7E] text-[10px] uppercase tracking-widest mb-1">Coach</label>
                      <div className="relative">
                        <select value={featuredCoach} onChange={e => setFeaturedCoach(e.target.value)} className={INP + ' appearance-none pr-8'}>
                          {COACHES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#9A8E7E] text-[10px] uppercase tracking-widest mb-1">Message</label>
                      <textarea value={featuredMsg} onChange={e => setFeaturedMsg(e.target.value)} rows={2} className={INP + ' resize-none'} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-xl border border-[#D4CDB5]/70 text-[#8A7E6E] text-xs hover:bg-[#EDE8D8] transition-all">Cancel</button>
                      <button onClick={saveFeatured} className="flex-1 py-2 rounded-xl bg-[#1E2A35] text-white text-xs hover:bg-[#263545] transition-all flex items-center justify-center gap-1"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em' }}>
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
