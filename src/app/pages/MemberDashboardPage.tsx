import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar, Clock, ChevronRight, LogOut,
  Plus, ChevronLeft, ChevronDown,
  CalendarDays, X, AlertTriangle,
  Lock, CheckCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProfileIncompleteState } from '../components/ProfileIncompleteState';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';

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
/** Always 6 weeks (42 cells) so every month uses the same grid footprint. */
function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  while (grid.length < 42) grid.push(null);
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

function CalendarWidget({ onBook, compact = false, fill = false }: { onBook: () => void; compact?: boolean; fill?: boolean }) {
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
    <div className={`relative z-0 overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm ${fill ? 'md:flex md:h-full md:flex-col' : ''} ${CARD_HOVER_GROW} hover:z-10 hover:shadow-md`}>
      <div className={`shrink-0 border-b border-[#D4CDB5]/50 flex items-center justify-between gap-3 ${compact ? 'px-5 py-2' : 'px-6 py-4'}`}>
        <h2 className="text-[#1E2A35] shrink-0" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: compact ? '1.3rem' : '1.4rem', letterSpacing: '0.06em' }}>My Calendar</h2>
        {compact ? (
          <div className="hidden sm:flex flex-wrap items-center justify-end gap-x-3 gap-y-1 min-w-0">
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
        ) : null}
        <Calendar size={18} className="text-[#c49a3c] shrink-0" />
      </div>
      <div className={`flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#D4CDB5]/40 ${fill ? 'md:min-h-0 md:flex-1 md:items-stretch' : compact ? 'md:items-start' : ''}`}>
        {/* Left — Month Grid */}
        <div className={`md:w-[54%] ${compact ? 'p-3.5 md:p-4' : 'p-5 md:p-6'} ${fill ? 'md:flex md:min-h-0 md:flex-1 md:flex-col' : ''}`}>
          <div className={`flex shrink-0 items-center justify-between ${compact ? fill ? 'mb-3 md:mb-4' : 'mb-2' : 'mb-5'}`}>
            <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"><ChevronLeft size={15} /></button>
            <span className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: compact ? '1.25rem' : '1.35rem', letterSpacing: '0.1em' }}>{MONTH_NAMES[calMonth]} {calYear}</span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"><ChevronRight size={15} /></button>
          </div>
          <div className="mb-0.5 grid shrink-0 grid-cols-7 gap-x-0.5">
            {DAY_LABELS.map(d => <div key={d} className={`text-center text-[#B0A898] ${compact ? 'py-0.5' : 'py-1'}`} style={{ fontSize: '0.68rem', letterSpacing: '0.1em', fontFamily: "'Bebas Neue', sans-serif" }}>{d}</div>)}
          </div>
          <div
            className={`grid grid-cols-7 grid-rows-6 gap-x-0.5 gap-y-0.5 ${fill ? 'md:min-h-0 md:flex-1 md:gap-y-1' : ''}`}
          >
            {grid.map((day, idx) => {
              const cellWrap = `flex min-h-0 items-center justify-center ${fill ? 'md:h-full' : 'aspect-square'}`;
              if (!day) {
                return <div key={`pad-${calYear}-${calMonth}-${idx}`} className={cellWrap} aria-hidden />;
              }
              const key = toKey(calYear, calMonth, day);
              const isSelected = key === selectedKey;
              const isToday    = key === todayKey;
              const eventTypes = CALENDAR_EVENTS[key]?.map(e => e.type) || [];
              return (
                <div key={key} className={cellWrap}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={`flex h-full w-full min-h-0 flex-col items-center justify-center rounded-xl transition-all ${
                      fill ? 'md:max-h-full' : 'aspect-square max-h-full'
                    } ${
                      isSelected ? 'bg-[#c49a3c] text-white shadow-[0_3px_12px_rgba(196,154,60,0.35)]' :
                      isToday    ? 'bg-[#c49a3c]/12 text-[#a67f2e]' : 'text-[#5A5048] hover:bg-[#F0EBE0]'
                    }`}
                  >
                    <span className="text-sm leading-none">{day}</span>
                    <div className="mt-0.5 flex h-1.5 items-center justify-center gap-0.5">
                      {eventTypes.length > 0
                        ? Array.from(new Set(eventTypes)).slice(0, 2).map((type, i) => (
                            <span key={i} className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white/70' : eventStyle[type].dot}`} />
                          ))
                        : null}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
          {/* Legend — compact mode moves legend to card header */}
          {!compact ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-4 border-t border-[#D4CDB5]/40">
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
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 sm:hidden">
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
          )}
        </div>

        {/* Right — Daily Agenda */}
        <div className={`md:flex-1 flex flex-col min-h-0 ${compact ? fill ? 'p-3.5 md:p-5 md:overflow-y-auto' : 'p-3.5 md:p-4 md:max-h-[13.5rem] md:overflow-y-auto' : 'p-5 md:p-6'}`}>
          <div className={compact ? fill ? 'mb-2 md:mb-3' : 'mb-1.5' : 'mb-4'}>
            <p className="text-[#B0A898] text-xs uppercase tracking-widest mb-0.5">Selected</p>
            <h3 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.06em' }}>
              {formatSelectedLabel(selYear, selMonth, selDay)}
            </h3>
          </div>
          <div className={`flex flex-col ${compact ? fill ? 'min-h-0 flex-1 gap-2.5' : 'gap-2' : 'gap-3 flex-1 min-h-0'}`}>
            {selectedEvents.length === 0 ? (
              <div className={`flex flex-col items-center justify-center text-center ${compact ? fill ? 'flex-1 py-6 md:py-10' : 'py-3' : 'flex-1 py-10'}`}>
                <div className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D4CDB5]/50 bg-[#F0EBE0]"><Calendar size={18} className="text-[#c49a3c]/60" /></div>
                <p className="text-[#9A8E7E] text-sm">No classes on this day</p>
                <button onClick={onBook} className={`flex items-center gap-1.5 text-[#c49a3c] text-xs border border-[#c49a3c]/40 px-4 py-2 rounded-full hover:bg-[#c49a3c]/08 transition-all ${compact ? 'mt-2' : 'mt-4'}`}><Plus size={13} /> Book a class</button>
              </div>
            ) : (
              <>
                {selectedEvents.map((ev, i) => {
                  const s = eventStyle[ev.type];
                  return (
                    <div key={i} className={`flex items-stretch gap-2.5 overflow-hidden rounded-2xl border border-[#D4CDB5]/40 bg-[#FAFAF7] transition-all hover:border-[#c49a3c]/30 hover:shadow-sm ${compact ? 'p-2.5' : 'p-3.5'}`}>
                      <div className={`w-1 rounded-full shrink-0 ${s.bar}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[#1E2A35] leading-none mb-1 truncate" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.04em' }}>{ev.name}</p>
                            <div className="flex items-center gap-2 text-[#8A7E6E] text-xs">
                              <Clock size={11} className="text-[#c49a3c]" />
                              <span>{ev.time}</span>
                              <span className="text-[#D4CDB5]">·</span>
                              <span className="truncate">with {ev.trainer}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${s.badge}`}>{s.badgeText}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={onBook} className={`mt-0.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#D4CDB5] text-xs text-[#8A7E6E] transition-all hover:border-[#c49a3c]/50 hover:text-[#c49a3c] ${compact ? 'py-2' : 'py-3 mt-1'}`}>
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

export default function MemberDashboardPage() {
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

  return (
    <>
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

      <MemberPageShell
        viewportBody="desktop"
        searchPlaceholder="Search classes, bookings…"
        onLogout={() => setShowLogoutModal(true)}
      >
        {/* ── Calendar + bookings ── */}
        <div className="flex h-full min-h-0 flex-col gap-4 pt-5 pb-6 md:grid md:grid-rows-[minmax(0,1fr)_auto] md:gap-3 md:pb-0 md:pt-5">
          <div className="min-h-0 md:h-full">
            <CalendarWidget compact fill onBook={() => navigate('/book')} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            {/* ── Upcoming Bookings card ── */}
            <div className={`relative z-0 flex max-md:h-[18rem] min-h-0 flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm md:h-[10.5rem] ${CARD_HOVER_GROW} hover:z-10 hover:shadow-md`}>
              {/* Fixed header */}
              <div className="flex shrink-0 items-center justify-between border-b border-[#D4CDB5]/50 px-5 py-2">
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.05em' }}>Bookings</h2>
                {profileComplete && <span className="text-[#8A7E6E] text-xs bg-[#F8F3E8] border border-[#D4CDB5]/60 px-2.5 py-1 rounded-full">{bookings.length} active</span>}
              </div>

              {/* Scrollable body */}
              {!profileComplete ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <ProfileIncompleteState compact description="Complete your profile to view and manage your class bookings." />
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
                  <CalendarDays size={28} className="text-[#c49a3c]/40 mb-2" />
                  <p className="text-[#9A8E7E] text-sm">No upcoming bookings</p>
                  <button onClick={() => navigate('/book')} className="mt-3 text-[#c49a3c] text-xs border border-[#c49a3c]/40 px-4 py-2 rounded-full hover:bg-[#c49a3c]/08 transition-all">Book a class</button>
                </div>
              ) : (
                <div
                  className="flex h-0 min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-4 py-1.5
                    [scrollbar-gutter:stable]
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
                      <div key={booking.id} className={`shrink-0 overflow-hidden rounded-2xl border ${booking.color}`}>
                        {/* Collapsed row */}
                        <div className="flex items-start justify-between px-3 py-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${booking.dot}`} />
                              <h3 className="text-[#1E2A35] font-semibold text-sm">{booking.className}</h3>
                            </div>
                            <div className="flex items-center gap-3 text-[#8A7E6E] text-xs">
                              <span className="flex items-center gap-1"><Calendar size={11} /> {booking.date}</span>
                              <span className="flex items-center gap-1"><Clock size={11} /> {booking.time}</span>
                            </div>
                            <p className="text-[#8A7E6E] text-xs mt-0.5">with {booking.trainer}</p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${bookingStatusStyle[booking.status] ?? 'bg-[#EDE8D8] text-[#8A7E6E]'}`}>
                              {booking.status}
                            </span>
                            <button onClick={() => setExpandedId(isExpanded ? null : booking.id)} className="text-[#8A7E6E] hover:text-[#1E2A35] transition-colors">
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3 pt-0 border-t border-black/05">
                            <div className="bg-white/60 rounded-xl p-2.5 mt-1.5 flex flex-col gap-1.5">
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
                                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 border border-red-200 text-red-500 rounded-xl text-xs font-semibold hover:bg-red-50 active:scale-95 transition-all"
                              >
                                <X size={12} /> Request Cancellation
                              </button>
                            ) : (
                              <div className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-[#EDE8D8] text-[#9A8E7E] rounded-xl text-xs cursor-not-allowed select-none">
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
            <div className={`relative z-0 flex max-md:h-[16rem] min-h-0 flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm md:h-[10.5rem] ${CARD_HOVER_GROW} hover:z-10 hover:shadow-md`}>
              {/* Fixed header */}
              <div className="flex shrink-0 items-center justify-between border-b border-[#D4CDB5]/50 px-5 py-2">
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.05em' }}>Past Sessions</h2>
                {profileComplete && <span className="text-[#8A7E6E] text-xs bg-[#F8F3E8] border border-[#D4CDB5]/60 px-2.5 py-1 rounded-full">{pastSessions.length} sessions</span>}
              </div>

              {/* Scrollable body */}
              {!profileComplete ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <ProfileIncompleteState compact description="Complete your profile to see your session history." />
                </div>
              ) : (
              <div
                className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-1.5
                  [&::-webkit-scrollbar]:w-1
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:bg-[#D4CDB5]
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb:hover]:bg-[#c49a3c]/50"
              >
                {pastSessions.map(session => {
                  const color = session.status === 'cancelled' ? '#9A8E7E' : (CLASS_COLORS_MAP[session.className] || '#c49a3c');
                  return (
                    <div key={session.id} className={`flex items-center gap-2 rounded-2xl border bg-[#FAFAF7] px-3 py-2 transition-colors ${session.status === 'cancelled' ? 'border-[#D4CDB5]/40 opacity-70' : 'border-[#D4CDB5]/60 hover:border-[#c49a3c]/30'}`}>
                      <div className="h-7 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
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
        </div>
      </MemberPageShell>
    </>
  );
}