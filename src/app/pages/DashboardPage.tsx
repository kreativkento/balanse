import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar, Clock, ChevronRight, LogOut,
  Plus, CheckCircle2, ChevronLeft, ChevronDown,
  Activity, Flame, CalendarDays, X, AlertTriangle,
  Star, User, Lock, CheckCheck, CreditCard, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProfileIncompleteState } from '../components/ProfileIncompleteState';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { ProfileAvatar } from '../components/ProfileImages';

// ─────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function dateLabel(d: Date): string {
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return `Today, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  if (d.toDateString() === addDays(now, 1).toDateString())
    return `Tomorrow, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS  = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}
function formatSelectedLabel(year: number, month: number, day: number) {
  return new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ─────────────────────────────────────────────
// DATA — dates computed relative to today
// ─────────────────────────────────────────────

const _T = new Date(); // captured once at module load

const INITIAL_BOOKINGS = [
  {
    id: 1,
    className: 'Yoga',
    date: dateLabel(addDays(_T, 1)),
    time: '8:00 AM',
    duration: '75 min',
    trainer: 'Jodi',
    location: 'Studio 1',
    status: 'confirmed' as const,
    color: 'bg-[#c49a3c]/08 border-[#c49a3c]/30',
    dot: 'bg-[#c49a3c]',
    hoursUntilClass: 20,
    subscriptionType: 'Gold Membership',
    creditsUsed: 1,
  },
  {
    id: 2,
    className: 'Calisthenics',
    date: dateLabel(addDays(_T, 3)),
    time: '7:00 AM',
    duration: '60 min',
    trainer: 'Rex',
    location: 'Studio 2',
    status: 'confirmed' as const,
    color: 'bg-[#5A5048]/08 border-[#5A5048]/25',
    dot: 'bg-[#5A5048]',
    hoursUntilClass: 56,
    subscriptionType: 'Gold Membership',
    creditsUsed: 1,
  },
  {
    id: 3,
    className: 'Mat Pilates',
    date: dateLabel(addDays(_T, 4)),
    time: '9:00 AM',
    duration: '60 min',
    trainer: 'Kate',
    location: 'Studio 1',
    status: 'waitlisted' as const,
    color: 'bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
    hoursUntilClass: 77,
    subscriptionType: 'Gold Membership',
    creditsUsed: 1,
  },
  {
    id: 4,
    className: 'Kickboxing',
    date: dateLabel(addDays(_T, 6)),
    time: '5:00 PM',
    duration: '60 min',
    trainer: 'Wolf',
    location: 'Studio 2',
    status: 'pending' as const,
    color: 'bg-sky-50 border-sky-200',
    dot: 'bg-sky-400',
    hoursUntilClass: 144,
    subscriptionType: 'Gold Membership',
    creditsUsed: 1,
  },
];

const INITIAL_PAST_SESSIONS = [
  { id: 101, className: 'Yoga',         date: dateLabel(addDays(_T, -2)),  time: '8:00 AM', trainer: 'Jodi',    status: 'completed' as const },
  { id: 102, className: 'Animal Flow',  date: dateLabel(addDays(_T, -5)),  time: '9:00 AM', trainer: 'Ephraim', status: 'completed' as const },
  { id: 103, className: 'Calisthenics', date: dateLabel(addDays(_T, -7)),  time: '7:00 AM', trainer: 'Rex',     status: 'completed' as const },
  { id: 104, className: 'Kickboxing',   date: dateLabel(addDays(_T, -11)), time: '5:00 PM', trainer: 'Wolf',    status: 'completed' as const },
  { id: 105, className: 'Mat Pilates',  date: dateLabel(addDays(_T, -14)), time: '9:00 AM', trainer: 'Kate',    status: 'cancelled' as const },
];

const CLASS_COLORS_MAP: Record<string, string> = {
  'Yoga': '#c49a3c', 'Calisthenics': '#3A4A5A', 'Animal Flow': '#6B8E6B',
  'Groundworks': '#8B6F5A', 'Circuit Training': '#B86A4A', 'Mat Pilates': '#9A7A8A',
  'Kickboxing': '#7A3A4A', 'Capoeira': '#A07050', 'Personal Coaching': '#a67f2e',
};

type EventType = 'confirmed' | 'waitlisted' | 'open';

interface CalEvent {
  time: string;
  name: string;
  trainer: string;
  type: EventType;
}

function buildCalendarEvents(): Record<string, CalEvent[]> {
  const t = new Date();
  const result: Record<string, CalEvent[]> = {};
  const add = (offset: number, time: string, name: string, trainer: string, type: EventType) => {
    const d = addDays(t, offset);
    const k = toKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!result[k]) result[k] = [];
    result[k].push({ time, name, trainer, type });
  };
  add(-7,  '7:00 AM',  'Calisthenics',     'Rex',      'confirmed');
  add(-5,  '9:00 AM',  'Animal Flow',      'Ephraim',  'confirmed');
  add(-2,  '8:00 AM',  'Yoga',             'Jodi',     'confirmed');
  add(0,   '6:00 PM',  'Groundworks',      'Alec',     'open');
  add(1,   '8:00 AM',  'Yoga',             'Jodi',     'confirmed');
  add(1,   '6:00 PM',  'Groundworks',      'Alec',     'open');
  add(3,   '7:00 AM',  'Calisthenics',     'Rex',      'confirmed');
  add(4,   '9:00 AM',  'Mat Pilates',      'Kate',     'waitlisted');
  add(6,   '5:00 PM',  'Kickboxing',       'Wolf',     'confirmed');
  add(8,   '12:00 PM', 'Circuit Training', 'Rachelle', 'open');
  add(12,  '7:00 AM',  'Groundworks',      'Alec',     'confirmed');
  add(15,  '9:00 AM',  'Mat Pilates',      'Kate',     'open');
  add(18,  '10:00 AM', 'Capoeira',         'Rex',      'open');
  add(20,  '7:00 AM',  'Calisthenics',     'Rex',      'confirmed');
  add(20,  '12:00 PM', 'Circuit Training', 'Rachelle', 'open');
  return result;
}

const CALENDAR_EVENTS = buildCalendarEvents();

const eventStyle: Record<EventType, { bar: string; badge: string; badgeText: string; dot: string }> = {
  confirmed:  { bar: 'bg-[#c49a3c]', badge: 'bg-[#c49a3c]/12 text-[#a67f2e]', badgeText: 'Confirmed',  dot: 'bg-[#c49a3c]' },
  waitlisted: { bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700',      badgeText: 'Waitlisted', dot: 'bg-amber-400'  },
  open:       { bar: 'bg-[#8A9E7A]', badge: 'bg-[#8A9E7A]/12 text-[#5A6E4A]', badgeText: 'Available',  dot: 'bg-[#8A9E7A]'  },
};

const bookingStatusStyle: Record<string, string> = {
  confirmed:  'bg-green-100 text-green-700',
  waitlisted: 'bg-amber-100 text-amber-700',
  pending:    'bg-sky-100 text-sky-700',
  rescheduled:'bg-violet-100 text-violet-700',
};

interface PastSession { id: number; className: string; date: string; time: string; trainer: string; status: 'completed' | 'cancelled'; }

// ─────────────────────────────────────────────
// CANCEL MODAL
// ─────────────────────────────────────────────

function CancelModal({
  booking,
  onClose,
  onConfirm,
}: {
  booking: typeof INITIAL_BOOKINGS[0];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const canCancel = booking.hoursUntilClass >= 24;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#1E2A35]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#8A7E6E] hover:bg-[#E3DCC8] transition-colors">
          <X size={14} />
        </button>
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
          <AlertTriangle size={22} className="text-amber-500" />
        </div>
        <div>
          <h2 className="text-[#1E2A35] leading-none mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em' }}>
            Cancel Booking?
          </h2>
          <p className="text-[#8A7E6E] text-sm">
            <span className="font-semibold text-[#1E2A35]">{booking.className}</span>
            {' '}· {booking.date} · {booking.time}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-amber-800 mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>Cancellation & Refund Policy</p>
          {[
            { label: '24+ hours before class', note: '50% session fee refunded' },
            { label: 'Within 24 hours',         note: 'No refund — cancellation not available' },
          ].map(row => (
            <div key={row.label} className="flex items-start justify-between gap-3 text-xs">
              <span className="text-amber-700 font-medium">{row.label}</span>
              <span className="text-amber-600 text-right">{row.note}</span>
            </div>
          ))}
        </div>
        {canCancel ? (
          <div className="flex items-center gap-3 bg-[#c49a3c]/06 border border-[#c49a3c]/30 rounded-2xl px-4 py-3">
            <AlertTriangle size={16} className="text-[#c49a3c] shrink-0" />
            <p className="text-[#7A6A52] text-sm">
              <span className="font-semibold">50% refund</span> will be processed to your original payment method within 3–5 business days.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <Lock size={16} className="text-red-500 shrink-0" />
            <p className="text-red-700 text-sm">
              <span className="font-semibold">Cancellation unavailable.</span> This class is in {booking.hoursUntilClass} hrs. Cancellations require at least 24 hours' notice.
            </p>
          </div>
        )}
        <p className="text-[#8A7E6E] text-xs leading-relaxed">
          By confirming, your cancellation request will be sent to our team. The 50% refund will be credited back to your account after review.
        </p>
        <div className="flex gap-2 mt-1">
          <button onClick={onClose} className="flex-1 py-3.5 bg-[#EDE8D8] text-[#1E2A35] rounded-full text-sm font-semibold active:scale-95 transition-all">
            Keep Booking
          </button>
          <button
            onClick={canCancel ? onConfirm : undefined}
            disabled={!canCancel}
            className={`flex-1 py-3.5 rounded-full text-sm font-bold transition-all ${
              canCancel
                ? 'bg-red-600 text-white active:scale-95'
                : 'bg-[#D4CDB5] text-[#9A8E7E] cursor-not-allowed'
            }`}
          >
            {canCancel ? 'Request Cancellation' : 'Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CALENDAR WIDGET
// ─────────────────────────────────────────────

function CalendarWidget({ onBook }: { onBook: () => void }) {
  const today = new Date();
  const [calYear, setCalYear]   = useState(() => today.getFullYear());
  const [calMonth, setCalMonth] = useState(() => today.getMonth());
  const [selectedKey, setSelectedKey] = useState(() => toKey(today.getFullYear(), today.getMonth(), today.getDate()));

  const grid = buildGrid(calYear, calMonth);
  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };

  const [selYear, selMonth0, selDay] = selectedKey.split('-').map(Number);
  const selMonth = selMonth0 - 1;
  const selectedEvents = CALENDAR_EVENTS[selectedKey] || [];
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className={`bg-white border border-[#D4CDB5]/60 rounded-3xl shadow-sm overflow-hidden ${CARD_HOVER_GROW}`}>
      <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex items-center justify-between">
        <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.06em' }}>My Calendar</h2>
        <Calendar size={18} className="text-[#c49a3c]" />
      </div>
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#D4CDB5]/40">
        {/* Left — Month Grid */}
        <div className="md:w-[54%] p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"><ChevronLeft size={15} /></button>
            <span className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.1em' }}>{MONTH_NAMES[calMonth]} {calYear}</span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"><ChevronRight size={15} /></button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map(d => <div key={d} className="text-center text-[#B0A898] py-1" style={{ fontSize: '0.68rem', letterSpacing: '0.1em', fontFamily: "'Bebas Neue', sans-serif" }}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {grid.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const key = toKey(calYear, calMonth, day);
              const isSelected = key === selectedKey;
              const isToday    = key === todayKey;
              const eventTypes = CALENDAR_EVENTS[key]?.map(e => e.type) || [];
              return (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 mx-0.5 transition-all ${
                    isSelected ? 'bg-[#c49a3c] text-white shadow-[0_3px_12px_rgba(196,154,60,0.35)]' :
                    isToday    ? 'bg-[#c49a3c]/12 text-[#a67f2e]' : 'text-[#5A5048] hover:bg-[#F0EBE0]'
                  }`}
                >
                  <span className="text-sm leading-none mb-1">{day}</span>
                  {eventTypes.length > 0 && (
                    <div className="flex gap-0.5">
                      {Array.from(new Set(eventTypes)).slice(0, 2).map((type, i) => (
                        <span key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/70' : eventStyle[type].dot}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#D4CDB5]/40">
            {[
              { dot: 'bg-[#c49a3c]', label: 'Confirmed' },
              { dot: 'bg-amber-400',  label: 'Waitlisted' },
              { dot: 'bg-[#8A9E7A]', label: 'Available' },
            ].map(({ dot, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-[#9A8E7E]" style={{ fontSize: '0.68rem' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Daily Agenda */}
        <div className="md:flex-1 p-5 md:p-6 flex flex-col">
          <div className="mb-4">
            <p className="text-[#B0A898] text-xs uppercase tracking-widest mb-0.5">Selected</p>
            <h3 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.06em' }}>
              {formatSelectedLabel(selYear, selMonth, selDay)}
            </h3>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#F0EBE0] border border-[#D4CDB5]/50 flex items-center justify-center mb-3"><Calendar size={20} className="text-[#c49a3c]/60" /></div>
                <p className="text-[#9A8E7E] text-sm">No classes on this day</p>
                <button onClick={onBook} className="mt-4 flex items-center gap-1.5 text-[#c49a3c] text-xs border border-[#c49a3c]/40 px-4 py-2 rounded-full hover:bg-[#c49a3c]/08 transition-all"><Plus size={13} /> Book a class</button>
              </div>
            ) : (
              <>
                {selectedEvents.map((ev, i) => {
                  const s = eventStyle[ev.type];
                  return (
                    <div key={i} className="flex items-stretch gap-3 bg-[#FAFAF7] border border-[#D4CDB5]/40 rounded-2xl overflow-hidden p-3.5 hover:border-[#c49a3c]/30 hover:shadow-sm transition-all">
                      <div className={`w-1 rounded-full shrink-0 ${s.bar}`} />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[#1E2A35] leading-none mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.04em' }}>{ev.name}</p>
                            <div className="flex items-center gap-2 text-[#8A7E6E] text-xs">
                              <Clock size={11} className="text-[#c49a3c]" />
                              <span>{ev.time}</span>
                              <span className="text-[#D4CDB5]">·</span>
                              <span>with {ev.trainer}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${s.badge}`}>{s.badgeText}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={onBook} className="mt-1 w-full flex items-center justify-center gap-2 border border-dashed border-[#D4CDB5] rounded-2xl py-3 text-[#8A7E6E] text-xs hover:border-[#c49a3c]/50 hover:text-[#c49a3c] transition-all">
                  <Plus size={13} /> Book another class
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, profileComplete } = useAuth();

  const [bookings, setBookings]             = useState(INITIAL_BOOKINGS);
  const [pastSessions]                      = useState(INITIAL_PAST_SESSIONS);
  const [expandedId, setExpandedId]         = useState<number | null>(null);
  const [cancellingId, setCancellingId]     = useState<number | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const cancellingBooking = cancellingId ? bookings.find(b => b.id === cancellingId) ?? null : null;

  const handleConfirmCancel = () => { setBookings(prev => prev.filter(b => b.id !== cancellingId)); setCancellingId(null); };
  const handleLogout = () => { logout(); navigate('/'); };

  const firstName = user?.name?.split(' ')[0] || 'Member';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Membership info
  const memberPlan       = 'Gold Membership';
  const sessionsTotal    = 20;
  const sessionsUsed     = 14;
  const sessionsLeft     = sessionsTotal - sessionsUsed;

  const STATS = [
    { icon: <Activity size={16} className="text-[#c49a3c]" />,      label: 'Sessions Attended', value: '24' },
    { icon: <CalendarDays size={16} className="text-[#8A9E7A]" />,   label: 'This Month',        value: '6'  },
    { icon: <Flame size={16} className="text-amber-500" />,          label: 'Current Streak',    value: '5 sessions' },
  ];

  return (
    <div className="bg-[#F8F3E8] min-h-full">
      {/* Modals */}
      {cancellingBooking && (
        <CancelModal booking={cancellingBooking} onClose={() => setCancellingId(null)} onConfirm={handleConfirmCancel} />
      )}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
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
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3.5 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] active:scale-95 transition-all">
                Stay
              </button>
              <button onClick={handleLogout} className="flex-1 py-3.5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95 transition-all shadow-sm">
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-8">

        {/* ── Header ── */}
        <div className="pt-6 pb-5 border-b border-[#D4CDB5]/60">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[#8A7E6E] text-sm">{greeting},</p>
              <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.04em' }}>
                {firstName}
              </h1>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="w-11 h-11 bg-[#c49a3c]/15 border-2 border-[#c49a3c]/40 rounded-full flex items-center justify-center hover:bg-[#c49a3c]/25 active:scale-95 transition-all overflow-hidden"
              title="My Profile"
            >
              <ProfileAvatar
                src={user?.profile.photo}
                initials={user?.name?.split(' ').map(n => n[0]).join('') || 'M'}
                alt="My profile"
                className="h-full w-full"
                initialsClassName="text-[#a67f2e] font-black text-sm"
              />
            </button>
          </div>

          {/* Membership status + credits */}
          {profileComplete ? (
            <div className={`bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${CARD_HOVER_GROW}`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 bg-[#c49a3c]/10 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-[#c49a3c]" />
                </div>
                <div className="flex-1">
                  <p className="text-[#1E2A35] text-sm font-semibold">{memberPlan}</p>
                  <p className="text-[#8A7E6E] text-xs">Active — Renews Apr 30, 2026</p>
                </div>
                <span className="bg-[#c49a3c]/15 text-[#a67f2e] text-xs font-bold px-2 py-1 rounded-full">Active</span>
              </div>
              <div className="px-4 pb-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#8A7E6E] text-xs">Session Credits</span>
                    <span className={`text-xs font-bold ${sessionsLeft <= 3 ? 'text-red-500' : sessionsLeft <= 6 ? 'text-amber-600' : 'text-[#6B8E6B]'}`}>
                      {sessionsLeft} / {sessionsTotal} remaining
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EDE8D8] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(sessionsUsed / sessionsTotal) * 100}%`,
                        backgroundColor: sessionsLeft <= 3 ? '#E56B6B' : sessionsLeft <= 6 ? '#D97706' : '#c49a3c',
                      }}
                    />
                  </div>
                </div>
                <span className="text-[#1E2A35] text-lg font-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{sessionsLeft}</span>
              </div>
            </div>
          ) : (
            <div className={`bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${CARD_HOVER_GROW}`}>
              <div className="flex items-center gap-4 px-4 py-4">
                <div className="w-9 h-9 bg-[#EDE8D8] rounded-xl flex items-center justify-center shrink-0">
                  <CreditCard size={17} className="text-[#B0A898]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#1E2A35] text-sm font-semibold">No active membership yet</p>
                  <p className="text-[#9A8E7E] text-xs mt-0.5">Purchase a plan to start booking classes.</p>
                </div>
                <button
                  onClick={() => navigate('/pricing')}
                  className="shrink-0 flex items-center gap-1.5 bg-[#c49a3c] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#a67f2e] active:scale-95 transition-all shadow-sm"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em' }}
                >
                  <Sparkles size={12} /> View Plans
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Attendance Stats ── */}
        <div className="grid grid-cols-3 gap-3 py-5 border-b border-[#D4CDB5]/50">
          {STATS.map(stat => (
            <div key={stat.label} className={`bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-sm px-4 py-4 flex flex-col gap-1.5 ${CARD_HOVER_GROW}`}>
              <div className="flex items-center gap-2">
                {stat.icon}
                <span className="text-[#9A8E7E]" style={{ fontSize: '0.67rem', letterSpacing: '0.04em' }}>{stat.label}</span>
              </div>
              <p
                className="leading-none"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em', color: profileComplete ? '#1E2A35' : '#D4CDB5' }}
              >
                {profileComplete ? stat.value : '—'}
              </p>
            </div>
          ))}
        </div>

        {/* ── Two-column body ── */}
        <div className="md:grid md:grid-cols-2 md:gap-8 py-6">

          {/* Left: Upcoming Bookings + Past Sessions */}
          <div className="flex flex-col gap-5">

            {/* ── Upcoming Bookings card ── */}
            <div className={`bg-white border border-[#D4CDB5]/60 rounded-3xl shadow-sm overflow-hidden flex flex-col ${CARD_HOVER_GROW}`} style={{ height: '22rem' }}>
              {/* Fixed header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4CDB5]/50 shrink-0">
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.05em' }}>Bookings</h2>
                {profileComplete && <span className="text-[#8A7E6E] text-xs bg-[#F8F3E8] border border-[#D4CDB5]/60 px-2.5 py-1 rounded-full">{bookings.length} active</span>}
              </div>

              {/* Scrollable body */}
              {!profileComplete ? (
                <div className="flex-1 overflow-hidden">
                  <ProfileIncompleteState compact description="Complete your profile to view and manage your class bookings." />
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <CalendarDays size={28} className="text-[#c49a3c]/40 mb-2" />
                  <p className="text-[#9A8E7E] text-sm">No upcoming bookings</p>
                  <button onClick={() => navigate('/book')} className="mt-3 text-[#c49a3c] text-xs border border-[#c49a3c]/40 px-4 py-2 rounded-full hover:bg-[#c49a3c]/08 transition-all">Book a class</button>
                </div>
              ) : (
                <div
                  className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5
                    [&::-webkit-scrollbar]:w-1
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-[#D4CDB5]
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-thumb:hover]:bg-[#c49a3c]/50"
                >
                  {bookings.map(booking => {
                    const isExpanded = expandedId === booking.id;
                    const canCancel  = booking.hoursUntilClass >= 24;
                    return (
                      <div key={booking.id} className={`rounded-2xl border overflow-hidden ${booking.color}`}>
                        {/* Collapsed row */}
                        <div className="flex items-start justify-between px-4 py-3.5">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${booking.dot}`} />
                              <h3 className="text-[#1E2A35] font-semibold text-sm">{booking.className}</h3>
                            </div>
                            <div className="flex items-center gap-3 text-[#8A7E6E] text-xs">
                              <span className="flex items-center gap-1"><Calendar size={11} /> {booking.date}</span>
                              <span className="flex items-center gap-1"><Clock size={11} /> {booking.time}</span>
                            </div>
                            <p className="text-[#8A7E6E] text-xs mt-1">with {booking.trainer}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${bookingStatusStyle[booking.status] ?? 'bg-[#EDE8D8] text-[#8A7E6E]'}`}>
                              {booking.status}
                            </span>
                            <button onClick={() => setExpandedId(isExpanded ? null : booking.id)} className="text-[#8A7E6E] hover:text-[#1E2A35] transition-colors mt-1">
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-0 border-t border-black/05">
                            <div className="bg-white/60 rounded-xl p-3 mt-2 flex flex-col gap-2">
                              {[
                                { label: 'Duration',     val: booking.duration },
                                { label: 'Location',     val: booking.location },
                                { label: 'Coach',        val: `Coach ${booking.trainer}` },
                                { label: 'Subscription', val: booking.subscriptionType },
                                { label: 'Credits Used', val: `${booking.creditsUsed} session credit` },
                              ].map(row => (
                                <div key={row.label} className="flex items-center justify-between text-xs">
                                  <span className="text-[#9A8E7E]">{row.label}</span>
                                  <span className="text-[#1E2A35] font-medium">{row.val}</span>
                                </div>
                              ))}
                            </div>
                            {canCancel ? (
                              <button
                                onClick={() => setCancellingId(booking.id)}
                                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 border border-red-200 text-red-500 rounded-xl text-xs font-semibold hover:bg-red-50 active:scale-95 transition-all"
                              >
                                <X size={12} /> Request Cancellation
                              </button>
                            ) : (
                              <div className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-[#EDE8D8] text-[#9A8E7E] rounded-xl text-xs cursor-not-allowed select-none">
                                <Lock size={12} />
                                <span>Cannot Cancel — Less than 24 hrs away</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Past Sessions card ── */}
            <div className={`bg-white border border-[#D4CDB5]/60 rounded-3xl shadow-sm overflow-hidden flex flex-col ${CARD_HOVER_GROW}`} style={{ height: '20rem' }}>
              {/* Fixed header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4CDB5]/50 shrink-0">
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.05em' }}>Past Sessions</h2>
                {profileComplete && <span className="text-[#8A7E6E] text-xs bg-[#F8F3E8] border border-[#D4CDB5]/60 px-2.5 py-1 rounded-full">{pastSessions.length} sessions</span>}
              </div>

              {/* Scrollable body */}
              {!profileComplete ? (
                <div className="flex-1 overflow-hidden">
                  <ProfileIncompleteState compact description="Complete your profile to see your session history." />
                </div>
              ) : (
              <div
                className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2
                  [&::-webkit-scrollbar]:w-1
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:bg-[#D4CDB5]
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb:hover]:bg-[#c49a3c]/50"
              >
                {pastSessions.map(session => {
                  const color = session.status === 'cancelled' ? '#9A8E7E' : (CLASS_COLORS_MAP[session.className] || '#c49a3c');
                  return (
                    <div key={session.id} className={`bg-[#FAFAF7] border rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors ${session.status === 'cancelled' ? 'border-[#D4CDB5]/40 opacity-70' : 'border-[#D4CDB5]/60 hover:border-[#c49a3c]/30'}`}>
                      <div className="w-1 h-9 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[#1E2A35] text-sm font-semibold">{session.className}</p>
                          {session.status === 'cancelled' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4CDB5]/60 text-[#8A7E6E]">Cancelled</span>
                          )}
                        </div>
                        <p className="text-[#8A7E6E] text-xs">{session.date} · {session.time} · Coach {session.trainer}</p>
                      </div>
                      {session.status === 'cancelled' ? (
                        <span className="text-[#B0A898] text-xs shrink-0">—</span>
                      ) : (
                        <span className="text-[#6B8E6B] text-xs font-semibold flex items-center gap-1 shrink-0"><CheckCheck size={11} /> Completed</span>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="mt-6 md:mt-0 flex flex-col gap-4">

            {/* Book a Class */}
            <div className={`bg-white border border-[#D4CDB5]/60 rounded-3xl overflow-hidden shadow-sm ${CARD_HOVER_GROW}`}>
              <div className="px-5 py-4 border-b border-[#D4CDB5]/50 flex items-center justify-between">
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em' }}>Book a Class</h2>
                <Calendar size={18} className="text-[#c49a3c]" />
              </div>
              <div className="p-4">
                <p className="text-[#8A7E6E] text-sm mb-4 leading-relaxed">Browse the Balansé calendar and reserve your spot — spaces are limited.</p>
                <button
                  onClick={() => navigate('/book')}
                  className="w-full flex items-center justify-center gap-2 bg-[#c49a3c] text-white rounded-full py-4 min-h-[52px] shadow-[0_4px_16px_rgba(196,154,60,0.3)] active:scale-[0.97] transition-all hover:bg-[#a67f2e]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em' }}
                >
                  <Plus size={18} /> Browse &amp; Book Classes
                </button>
              </div>
            </div>

            {/* Featured: Class of the Month */}
            <div className="rounded-3xl overflow-hidden border border-[#c49a3c]/25 shadow-sm" style={{ background: 'linear-gradient(135deg, #1E2A35 0%, #2C3E4E 100%)' }}>
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star size={12} className="text-[#c49a3c] fill-[#c49a3c]" />
                  <span className="text-[#c49a3c] text-xs font-bold uppercase tracking-widest">Class of the Month</span>
                </div>
                <h3 className="text-white leading-tight mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.7rem', letterSpacing: '0.05em' }}>Animal Flow</h3>
                <p className="text-white/55 text-xs leading-relaxed mb-4">Experience ground-based movement inspired by animals. Builds mobility, coordination, and fluid strength — with Coach Ephraim this April.</p>
                <button onClick={() => navigate('/book')} className="flex items-center gap-2 bg-[#c49a3c] text-white text-xs font-bold px-4 py-2.5 rounded-full hover:bg-[#a67f2e] active:scale-95 transition-all" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}>
                  Book This Class <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* Profile & Logout */}
            <div className={`bg-white border border-[#D4CDB5]/60 rounded-3xl overflow-hidden shadow-sm p-4 flex flex-col gap-2 ${CARD_HOVER_GROW}`}>
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F8F3E8] border border-[#D4CDB5]/60 text-[#1E2A35] text-sm font-medium hover:border-[#c49a3c]/40 hover:bg-[#EDE8D8] active:scale-95 transition-all"
              >
                <User size={16} className="text-[#c49a3c]" />
                View My Profile
                <ChevronRight size={15} className="ml-auto text-[#B0A898]" />
              </button>
              <button
                onClick={() => navigate('/payment-history')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F8F3E8] border border-[#D4CDB5]/60 text-[#1E2A35] text-sm font-medium hover:border-[#c49a3c]/40 hover:bg-[#EDE8D8] active:scale-95 transition-all"
              >
                <CreditCard size={16} className="text-[#c49a3c]" />
                Payment History
                <ChevronRight size={15} className="ml-auto text-[#B0A898]" />
              </button>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 text-sm rounded-2xl py-3 min-h-[48px] hover:bg-red-100 active:scale-[0.97] transition-all font-semibold"
              >
                <LogOut size={15} /> Log Out
              </button>
            </div>
          </div>
        </div>

        {/* ── Calendar Widget ── */}
        <div className="pb-10">
          <CalendarWidget onBook={() => navigate('/book')} />
        </div>
      </div>
    </div>
  );
}