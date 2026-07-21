import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar, Clock, ChevronRight, LogOut,
  Plus, CheckCircle2, ChevronLeft, ChevronDown,
  Activity, Flame, CalendarDays, X, AlertTriangle,
  Star, User, Lock, SmilePlus, CheckCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

const INITIAL_BOOKINGS = [
  {
    id: 1,
    className: 'Yoga',
    date: 'Tomorrow, Apr 14',
    time: '8:00 AM',
    duration: '75 min',
    trainer: 'Jodi',
    location: 'Studio 1',
    status: 'confirmed' as const,
    color: 'bg-[#C49A3C]/08 border-[#C49A3C]/30',
    dot: 'bg-[#C49A3C]',
    hoursUntilClass: 20, // < 24 hrs → cancel disabled
    subscriptionType: 'Gold Membership',
    creditsUsed: 1,
  },
  {
    id: 2,
    className: 'Calisthenics',
    date: 'Wed, Apr 16',
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
    date: 'Thu, Apr 17',
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
];

const INITIAL_PAST_SESSIONS = [
  { id: 101, className: 'Yoga',         date: 'Sat, Apr 12', time: '8:00 AM',  trainer: 'Jodi',    rated: false, rating: 0   },
  { id: 102, className: 'Animal Flow',  date: 'Wed, Apr 9',  time: '9:00 AM',  trainer: 'Ephraim', rated: false, rating: 0   },
  { id: 103, className: 'Calisthenics', date: 'Mon, Apr 7',  time: '7:00 AM',  trainer: 'Rex',     rated: true,  rating: 5   },
  { id: 104, className: 'Kickboxing',   date: 'Thu, Apr 3',  time: '5:00 PM',  trainer: 'Wolf',    rated: true,  rating: 4   },
];

const CLASS_COLORS_MAP: Record<string, string> = {
  'Yoga': '#C49A3C', 'Calisthenics': '#3A4A5A', 'Animal Flow': '#6B8E6B',
  'Groundworks': '#8B6F5A', 'Circuit Training': '#B86A4A', 'Mat Pilates': '#9A7A8A',
  'Kickboxing': '#7A3A4A', 'Capoeira': '#A07050', 'Personal Coaching': '#A67E2A',
};

const QUICK_TAGS = ['Great Coach', 'Well-Paced', 'Challenging', 'Fun Session', 'Nice Facility'];

type EventType = 'confirmed' | 'waitlisted' | 'open';

interface CalEvent {
  time: string;
  name: string;
  trainer: string;
  type: EventType;
}

const CALENDAR_EVENTS: Record<string, CalEvent[]> = {
  '2026-04-06': [{ time: '6:00 PM', name: 'Animal Flow', trainer: 'Ephraim', type: 'confirmed' }],
  '2026-04-07': [{ time: '8:00 AM', name: 'Yoga', trainer: 'Jodi', type: 'confirmed' }],
  '2026-04-08': [{ time: '7:00 AM', name: 'Calisthenics', trainer: 'Rex', type: 'confirmed' }],
  '2026-04-09': [{ time: '9:00 AM', name: 'Mat Pilates', trainer: 'Kate', type: 'waitlisted' }],
  '2026-04-12': [{ time: '10:00 AM', name: 'Kickboxing', trainer: 'Wolf', type: 'open' }],
  '2026-04-14': [
    { time: '8:00 AM', name: 'Yoga', trainer: 'Jodi', type: 'confirmed' },
    { time: '6:00 PM', name: 'Groundworks', trainer: 'Alec', type: 'open' },
  ],
  '2026-04-16': [{ time: '12:00 PM', name: 'Circuit Training', trainer: 'Rachelle', type: 'open' }],
  '2026-04-21': [{ time: '7:00 AM', name: 'Groundworks', trainer: 'Alec', type: 'confirmed' }],
  '2026-04-23': [{ time: '9:00 AM', name: 'Mat Pilates', trainer: 'Kate', type: 'open' }],
  '2026-04-26': [{ time: '10:00 AM', name: 'Capoeira', trainer: 'Rex', type: 'open' }],
  '2026-04-28': [
    { time: '7:00 AM', name: 'Calisthenics', trainer: 'Rex', type: 'confirmed' },
    { time: '12:00 PM', name: 'Circuit Training', trainer: 'Rachelle', type: 'open' },
  ],
};

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

const eventStyle: Record<EventType, { bar: string; badge: string; badgeText: string; dot: string }> = {
  confirmed:  { bar: 'bg-[#C49A3C]', badge: 'bg-[#C49A3C]/12 text-[#A67E2A]', badgeText: 'Confirmed',  dot: 'bg-[#C49A3C]' },
  waitlisted: { bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700',      badgeText: 'Waitlisted', dot: 'bg-amber-400'  },
  open:       { bar: 'bg-[#8A9E7A]', badge: 'bg-[#8A9E7A]/12 text-[#5A6E4A]', badgeText: 'Available',  dot: 'bg-[#8A9E7A]'  },
};

// ─────────────────────────────────────────────
// SURVEY MODAL
// ─────────────────────────────────────────────

interface PastSession { id: number; className: string; date: string; time: string; trainer: string; rated: boolean; rating: number; }

function SurveyModal({
  session,
  onClose,
  onSubmit,
}: {
  session: PastSession;
  onClose: () => void;
  onSubmit: (id: number, rating: number, tags: string[], comment: string) => void;
}) {
  const [rating, setRating]         = useState(0);
  const [hovered, setHovered]       = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment]       = useState('');
  const [submitted, setSubmitted]   = useState(false);

  const color = CLASS_COLORS_MAP[session.className] || '#C49A3C';

  const toggleTag = (tag: string) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleSubmit = () => {
    if (rating === 0) return;
    setSubmitted(true);
    setTimeout(() => { onSubmit(session.id, rating, selectedTags, comment); }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-7 pt-6 pb-4 border-b border-[#D4CDB5]/50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-12 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <SmilePlus size={14} className="text-[#C49A3C]" />
                <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Session Feedback</span>
              </div>
              <h3 className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>{session.className}</h3>
              <p className="text-[#8A7E6E] text-xs mt-0.5">{session.date} · {session.time} · Coach {session.trainer}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0"><X size={15} /></button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center py-10 px-7 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mb-4">
              <CheckCheck size={26} className="text-green-600" />
            </div>
            <p className="text-[#1E2A35] mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.05em' }}>Thank You!</p>
            <p className="text-[#8A7E6E] text-sm">Your feedback helps us improve every session.</p>
          </div>
        ) : (
          <div className="px-7 py-5 flex flex-col gap-5">
            {/* Star Rating */}
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">How was your session?</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      size={32}
                      className={`transition-colors ${
                        star <= (hovered || rating)
                          ? 'text-[#C49A3C] fill-[#C49A3C]'
                          : 'text-[#D4CDB5]'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-[#C49A3C] text-sm font-semibold">
                    {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Needs Work'}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Tags */}
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2.5">What stood out? <span className="text-[#B0A898] normal-case">(optional)</span></p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-[#1E2A35] text-white border-[#1E2A35]'
                        : 'bg-white text-[#8A7E6E] border-[#D4CDB5]/70 hover:border-[#C49A3C]/40 hover:text-[#1E2A35]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Additional Comments <span className="text-[#B0A898] normal-case">(optional)</span></label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={2}
                placeholder="Tell us more about your experience…"
                className="w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all resize-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={rating === 0}
              className={`w-full py-3.5 rounded-full transition-all flex items-center justify-center gap-2 ${
                rating === 0
                  ? 'bg-[#EDE8D8] text-[#B0A898] cursor-not-allowed'
                  : 'bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] shadow-sm'
              }`}
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
            >
              <SmilePlus size={16} /> Submit Feedback
            </button>
            {rating === 0 && <p className="text-[#B0A898] text-xs text-center -mt-2">Select a star rating to continue</p>}
          </div>
        )}
      </div>
    </div>
  );
}

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
          <p className="text-amber-800 mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>Cancellation Policy</p>
          {[
            { label: '24+ hours before class', note: 'Free cancellation — no charge' },
            { label: 'Within 24 hours',         note: 'Cancellation is not available' },
          ].map(row => (
            <div key={row.label} className="flex items-start justify-between gap-3 text-xs">
              <span className="text-amber-700 font-medium">{row.label}</span>
              <span className="text-amber-600 text-right">{row.note}</span>
            </div>
          ))}
        </div>
        {!canCancel && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <Lock size={16} className="text-red-500 shrink-0" />
            <p className="text-red-700 text-sm">
              <span className="font-semibold">Cancellation unavailable.</span> This class is in {booking.hoursUntilClass} hrs. Free cancellation requires at least 24 hours' notice.
            </p>
          </div>
        )}
        <p className="text-[#8A7E6E] text-xs leading-relaxed">
          By confirming, your cancellation request will be sent to our team for processing.
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
  const today = new Date(2026, 3, 13);
  const [calYear, setCalYear]   = useState(2026);
  const [calMonth, setCalMonth] = useState(3);
  const [selectedKey, setSelectedKey] = useState('2026-04-14');
  const [shareAvailability, setShareAvailability] = useState(false);

  const grid = buildGrid(calYear, calMonth);
  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };

  const [selYear, selMonth0, selDay] = selectedKey.split('-').map(Number);
  const selMonth = selMonth0 - 1;
  const selectedEvents = CALENDAR_EVENTS[selectedKey] || [];
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="bg-white border border-[#D4CDB5]/60 rounded-3xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex items-center justify-between">
        <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.06em' }}>My Calendar</h2>
        <Calendar size={18} className="text-[#C49A3C]" />
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
                    isSelected ? 'bg-[#C49A3C] text-white shadow-[0_3px_12px_rgba(196,154,60,0.35)]' :
                    isToday    ? 'bg-[#C49A3C]/12 text-[#A67E2A]' : 'text-[#5A5048] hover:bg-[#F0EBE0]'
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
              { dot: 'bg-[#C49A3C]', label: 'Confirmed' },
              { dot: 'bg-amber-400',  label: 'Waitlisted' },
              { dot: 'bg-[#8A9E7A]', label: 'Available' },
            ].map(({ dot, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-[#9A8E7E]" style={{ fontSize: '0.68rem' }}>{label}</span>
              </div>
            ))}
          </div>
          {/* Availability Toggle */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#D4CDB5]/40">
            <div>
              <p className="text-[#5A5048] text-xs font-semibold">Share My Availability</p>
              <p className="text-[#9A8E7E] mt-0.5" style={{ fontSize: '0.68rem' }}>{shareAvailability ? 'Coaches can view your schedule' : 'Availability is private'}</p>
            </div>
            <button
              onClick={() => setShareAvailability(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${shareAvailability ? 'bg-[#C49A3C]' : 'bg-[#D4CDB5]'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${shareAvailability ? 'left-6' : 'left-1'}`} />
            </button>
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
                <div className="w-12 h-12 rounded-2xl bg-[#F0EBE0] border border-[#D4CDB5]/50 flex items-center justify-center mb-3"><Calendar size={20} className="text-[#C49A3C]/60" /></div>
                <p className="text-[#9A8E7E] text-sm">No classes on this day</p>
                <button onClick={onBook} className="mt-4 flex items-center gap-1.5 text-[#C49A3C] text-xs border border-[#C49A3C]/40 px-4 py-2 rounded-full hover:bg-[#C49A3C]/08 transition-all"><Plus size={13} /> Book a class</button>
              </div>
            ) : (
              <>
                {selectedEvents.map((ev, i) => {
                  const s = eventStyle[ev.type];
                  return (
                    <div key={i} className="flex items-stretch gap-3 bg-[#FAFAF7] border border-[#D4CDB5]/40 rounded-2xl overflow-hidden p-3.5 hover:border-[#C49A3C]/30 hover:shadow-sm transition-all">
                      <div className={`w-1 rounded-full shrink-0 ${s.bar}`} />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[#1E2A35] leading-none mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.04em' }}>{ev.name}</p>
                            <div className="flex items-center gap-2 text-[#8A7E6E] text-xs">
                              <Clock size={11} className="text-[#C49A3C]" />
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
                <button onClick={onBook} className="mt-1 w-full flex items-center justify-center gap-2 border border-dashed border-[#D4CDB5] rounded-2xl py-3 text-[#8A7E6E] text-xs hover:border-[#C49A3C]/50 hover:text-[#C49A3C] transition-all">
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
  const { user, logout } = useAuth();

  const [bookings, setBookings]             = useState(INITIAL_BOOKINGS);
  const [pastSessions, setPastSessions]     = useState(INITIAL_PAST_SESSIONS);
  const [expandedId, setExpandedId]         = useState<number | null>(null);
  const [cancellingId, setCancellingId]     = useState<number | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [surveySession, setSurveySession]   = useState<PastSession | null>(null);
  const [showPastSessions, setShowPastSessions] = useState(false);

  const cancellingBooking = cancellingId ? bookings.find(b => b.id === cancellingId) ?? null : null;

  const handleConfirmCancel = () => { setBookings(prev => prev.filter(b => b.id !== cancellingId)); setCancellingId(null); };
  const handleLogout = () => { logout(); navigate('/'); };

  const handleSurveySubmit = (id: number, rating: number, _tags: string[], _comment: string) => {
    setPastSessions(prev => prev.map(s => s.id === id ? { ...s, rated: true, rating } : s));
    setSurveySession(null);
  };

  const firstName = user?.name?.split(' ')[0] || 'Member';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Membership info
  const memberPlan       = 'Gold Membership';
  const sessionsTotal    = 20;
  const sessionsUsed     = 14;
  const sessionsLeft     = sessionsTotal - sessionsUsed;

  const STATS = [
    { icon: <Activity size={16} className="text-[#C49A3C]" />,      label: 'Sessions Attended', value: '24' },
    { icon: <CalendarDays size={16} className="text-[#8A9E7A]" />,   label: 'This Month',        value: '6'  },
    { icon: <Flame size={16} className="text-amber-500" />,          label: 'Current Streak',    value: '5 sessions' },
  ];

  const unratedCount = pastSessions.filter(s => !s.rated).length;

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {/* Modals */}
      {cancellingBooking && (
        <CancelModal booking={cancellingBooking} onClose={() => setCancellingId(null)} onConfirm={handleConfirmCancel} />
      )}
      {surveySession && (
        <SurveyModal session={surveySession} onClose={() => setSurveySession(null)} onSubmit={handleSurveySubmit} />
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
              className="w-11 h-11 bg-[#C49A3C]/15 border-2 border-[#C49A3C]/40 rounded-full flex items-center justify-center hover:bg-[#C49A3C]/25 active:scale-95 transition-all"
              title="My Profile"
            >
              <span className="text-[#A67E2A] font-black text-sm">{user?.name?.split(' ').map(n => n[0]).join('') || 'M'}</span>
            </button>
          </div>

          {/* Membership status + credits */}
          <div className="bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-[#C49A3C]/10 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={16} className="text-[#C49A3C]" />
              </div>
              <div className="flex-1">
                <p className="text-[#1E2A35] text-sm font-semibold">{memberPlan}</p>
                <p className="text-[#8A7E6E] text-xs">Active — Renews Apr 30, 2026</p>
              </div>
              <span className="bg-[#C49A3C]/15 text-[#A67E2A] text-xs font-bold px-2 py-1 rounded-full">Active</span>
            </div>
            {/* Credits bar */}
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
                      backgroundColor: sessionsLeft <= 3 ? '#E56B6B' : sessionsLeft <= 6 ? '#D97706' : '#C49A3C',
                    }}
                  />
                </div>
              </div>
              <span className="text-[#1E2A35] text-lg font-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{sessionsLeft}</span>
            </div>
          </div>
        </div>

        {/* ── Attendance Stats ── */}
        <div className="grid grid-cols-3 gap-3 py-5 border-b border-[#D4CDB5]/50">
          {STATS.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-sm px-4 py-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {stat.icon}
                <span className="text-[#9A8E7E]" style={{ fontSize: '0.67rem', letterSpacing: '0.04em' }}>{stat.label}</span>
              </div>
              <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Two-column body ── */}
        <div className="md:grid md:grid-cols-2 md:gap-8 py-6">

          {/* Left: Upcoming Bookings + Past Sessions */}
          <div>
            {/* ── Upcoming Bookings ── */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.05em' }}>Upcoming Bookings</h2>
              <span className="text-[#8A7E6E] text-xs">{bookings.length} scheduled</span>
            </div>

            {bookings.length === 0 ? (
              <div className="bg-white border border-[#D4CDB5]/60 rounded-2xl p-8 text-center">
                <CalendarDays size={28} className="text-[#C49A3C]/50 mx-auto mb-2" />
                <p className="text-[#9A8E7E] text-sm">No upcoming bookings</p>
                <button onClick={() => navigate('/book')} className="mt-3 text-[#C49A3C] text-xs border border-[#C49A3C]/40 px-4 py-2 rounded-full hover:bg-[#C49A3C]/08 transition-all">Book a class</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {bookings.map(booking => {
                  const isExpanded = expandedId === booking.id;
                  const canCancel  = booking.hoursUntilClass >= 24;
                  return (
                    <div key={booking.id} className={`rounded-2xl border overflow-hidden ${booking.color}`}>
                      {/* Collapsed row */}
                      <div className="flex items-start justify-between px-4 py-4">
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
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
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
                              { label: 'Duration',       val: booking.duration },
                              { label: 'Location',       val: booking.location },
                              { label: 'Coach',          val: `Coach ${booking.trainer}` },
                              { label: 'Subscription',   val: booking.subscriptionType },
                              { label: 'Credits Used',   val: `${booking.creditsUsed} session credit` },
                            ].map(row => (
                              <div key={row.label} className="flex items-center justify-between text-xs">
                                <span className="text-[#9A8E7E]">{row.label}</span>
                                <span className="text-[#1E2A35] font-medium">{row.val}</span>
                              </div>
                            ))}
                          </div>

                          {/* Cancel button — disabled when < 24 hrs */}
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

            {/* ── Past Sessions + Survey ── */}
            <div className="mt-6">
              <button
                onClick={() => setShowPastSessions(v => !v)}
                className="flex items-center justify-between w-full mb-3"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em' }}>Past Sessions</h2>
                  {unratedCount > 0 && (
                    <span className="bg-[#C49A3C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unratedCount} unrated</span>
                  )}
                </div>
                <ChevronDown size={16} className={`text-[#8A7E6E] transition-transform ${showPastSessions ? 'rotate-180' : ''}`} />
              </button>

              {/* Survey nudge */}
              {unratedCount > 0 && !showPastSessions && (
                <button
                  onClick={() => setShowPastSessions(true)}
                  className="w-full flex items-center gap-3 bg-[#C49A3C]/06 border border-[#C49A3C]/30 rounded-2xl px-4 py-3 hover:bg-[#C49A3C]/10 transition-all mb-3"
                >
                  <SmilePlus size={16} className="text-[#C49A3C] shrink-0" />
                  <span className="text-[#A67E2A] text-xs font-semibold">{unratedCount} completed session{unratedCount > 1 ? 's' : ''} awaiting your feedback</span>
                  <ChevronRight size={14} className="text-[#C49A3C] ml-auto" />
                </button>
              )}

              {showPastSessions && (
                <div className="flex flex-col gap-2.5">
                  {pastSessions.map(session => {
                    const color = CLASS_COLORS_MAP[session.className] || '#C49A3C';
                    return (
                      <div key={session.id} className="bg-white border border-[#D4CDB5]/60 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-[#C49A3C]/30 transition-colors">
                        <div className="w-1 h-9 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[#1E2A35] text-sm font-semibold">{session.className}</p>
                          <p className="text-[#8A7E6E] text-xs">{session.date} · {session.time} · Coach {session.trainer}</p>
                        </div>
                        {session.rated ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} size={11} className={s <= session.rating ? 'text-[#C49A3C] fill-[#C49A3C]' : 'text-[#D4CDB5]'} />
                              ))}
                            </div>
                            <span className="text-[#6B8E6B] text-xs font-semibold flex items-center gap-1"><CheckCheck size={11} /> Reviewed</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSurveySession(session)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C49A3C]/10 text-[#A67E2A] text-xs font-semibold rounded-xl hover:bg-[#C49A3C]/20 active:scale-95 transition-all shrink-0"
                          >
                            <SmilePlus size={13} /> Rate Session
                          </button>
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
            <div className="bg-white border border-[#D4CDB5]/60 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-[#D4CDB5]/50 flex items-center justify-between">
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em' }}>Book a Class</h2>
                <Calendar size={18} className="text-[#C49A3C]" />
              </div>
              <div className="p-4">
                <p className="text-[#8A7E6E] text-sm mb-4 leading-relaxed">Browse the Balansé calendar and reserve your spot — spaces are limited.</p>
                <button
                  onClick={() => navigate('/book')}
                  className="w-full flex items-center justify-center gap-2 bg-[#C49A3C] text-white rounded-full py-4 min-h-[52px] shadow-[0_4px_16px_rgba(196,154,60,0.3)] active:scale-[0.97] transition-all hover:bg-[#A67E2A]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em' }}
                >
                  <Plus size={18} /> Browse &amp; Book Classes
                </button>
              </div>
            </div>

            {/* Featured: Class of the Month */}
            <div className="rounded-3xl overflow-hidden border border-[#C49A3C]/25 shadow-sm" style={{ background: 'linear-gradient(135deg, #1E2A35 0%, #2C3E4E 100%)' }}>
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star size={12} className="text-[#C49A3C] fill-[#C49A3C]" />
                  <span className="text-[#C49A3C] text-xs font-bold uppercase tracking-widest">Class of the Month</span>
                </div>
                <h3 className="text-white leading-tight mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.7rem', letterSpacing: '0.05em' }}>Animal Flow</h3>
                <p className="text-white/55 text-xs leading-relaxed mb-4">Experience ground-based movement inspired by animals. Builds mobility, coordination, and fluid strength — with Coach Ephraim this April.</p>
                <button onClick={() => navigate('/book')} className="flex items-center gap-2 bg-[#C49A3C] text-white text-xs font-bold px-4 py-2.5 rounded-full hover:bg-[#A67E2A] active:scale-95 transition-all" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}>
                  Book This Class <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* Profile & Logout */}
            <div className="bg-white border border-[#D4CDB5]/60 rounded-3xl overflow-hidden shadow-sm p-4 flex flex-col gap-2">
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F8F3E8] border border-[#D4CDB5]/60 text-[#1E2A35] text-sm font-medium hover:border-[#C49A3C]/40 hover:bg-[#EDE8D8] active:scale-95 transition-all"
              >
                <User size={16} className="text-[#C49A3C]" />
                View My Profile
                <ChevronRight size={15} className="ml-auto text-[#B0A898]" />
              </button>

              {!showLogoutConfirm ? (
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 text-sm rounded-2xl py-3 min-h-[48px] hover:bg-red-100 active:scale-[0.97] transition-all font-semibold"
                >
                  <LogOut size={15} /> Log Out
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-red-700 text-sm font-semibold mb-1 text-center">Confirm Logout?</p>
                  <p className="text-red-500 text-xs text-center mb-3">You'll be signed out of BALANSÉ</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-[#EDE8D8] text-[#1E2A35] rounded-xl text-sm font-semibold active:scale-95 transition-all min-h-[44px]">Cancel</button>
                    <button onClick={handleLogout} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-all min-h-[44px]">Log Out</button>
                  </div>
                </div>
              )}
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