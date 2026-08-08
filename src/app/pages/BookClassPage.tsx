import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown,
  Clock, Users, Check, CalendarDays, User, Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { WeekCalendarGrid, type WeekGridEvent } from '../components/calendar/WeekCalendarGrid';
import { MonthCalendarGrid, type MonthGridEvent } from '../components/calendar/MonthCalendarGrid';
import {
  MONTH_NAMES, DAY_LABELS_SHORT, buildMonthGrid, toDateKeyFromParts, toDateKey,
  getWeekDatesContaining, formatWeekRange, dateKeyToDate, getTodayLocal,
} from '../components/calendar/weekCalendarUtils';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Slot {
  id: number;
  className: string;
  time: string;
  duration: string;
  trainer: string;
  spots: number;
}

// ─────────────────────────────────────────────
// SCHEDULE DATA — April 2026
// ─────────────────────────────────────────────

const SCHEDULE: Record<string, Slot[]> = {
  '2026-04-07': [
    { id: 1,  className: 'Yoga',             time: '8:00 AM',  duration: '75 min', trainer: 'Jodi',    spots: 4  },
    { id: 2,  className: 'Mat Pilates',       time: '10:00 AM', duration: '60 min', trainer: 'Kate',    spots: 0  },
    { id: 3,  className: 'Calisthenics',      time: '6:00 PM',  duration: '60 min', trainer: 'Rex',     spots: 6  },
  ],
  '2026-04-08': [
    { id: 4,  className: 'Calisthenics',      time: '7:00 AM',  duration: '60 min', trainer: 'Rex',     spots: 3  },
    { id: 5,  className: 'Animal Flow',       time: '9:00 AM',  duration: '60 min', trainer: 'Ephraim', spots: 10 },
    { id: 6,  className: 'Kickboxing',        time: '5:00 PM',  duration: '60 min', trainer: 'Wolf',    spots: 0  },
  ],
  '2026-04-09': [
    { id: 7,  className: 'Mat Pilates',       time: '9:00 AM',  duration: '60 min', trainer: 'Kate',    spots: 5  },
    { id: 8,  className: 'Groundworks',       time: '11:00 AM', duration: '60 min', trainer: 'Alec',    spots: 9  },
    { id: 9,  className: 'Circuit Training',  time: '4:00 PM',  duration: '60 min', trainer: 'Rachelle',spots: 12 },
  ],
  '2026-04-10': [
    { id: 10, className: 'Yoga',             time: '7:30 AM',  duration: '75 min', trainer: 'Jodi',    spots: 6  },
    { id: 11, className: 'Capoeira',         time: '3:00 PM',  duration: '90 min', trainer: 'Rex',     spots: 8  },
  ],
  '2026-04-11': [
    { id: 12, className: 'Animal Flow',      time: '8:00 AM',  duration: '60 min', trainer: 'Ephraim', spots: 7  },
    { id: 13, className: 'Kickboxing',       time: '6:00 PM',  duration: '60 min', trainer: 'Wolf',    spots: 5  },
  ],
  '2026-04-12': [
    { id: 14, className: 'Calisthenics',     time: '9:00 AM',  duration: '60 min', trainer: 'Rex',     spots: 10 },
    { id: 15, className: 'Mat Pilates',      time: '11:00 AM', duration: '60 min', trainer: 'Kate',    spots: 0  },
    { id: 16, className: 'Yoga',            time: '2:00 PM',  duration: '75 min', trainer: 'Jodi',    spots: 4  },
  ],
  '2026-04-13': [
    { id: 17, className: 'Groundworks',      time: '10:00 AM', duration: '60 min', trainer: 'Alec',    spots: 8  },
    { id: 18, className: 'Circuit Training', time: '12:00 PM', duration: '60 min', trainer: 'Rachelle',spots: 11 },
  ],
  '2026-04-14': [
    { id: 19, className: 'Yoga',            time: '8:00 AM',  duration: '75 min', trainer: 'Jodi',    spots: 3  },
    { id: 20, className: 'Animal Flow',     time: '10:00 AM', duration: '60 min', trainer: 'Ephraim', spots: 9  },
    { id: 21, className: 'Kickboxing',      time: '5:30 PM',  duration: '60 min', trainer: 'Wolf',    spots: 6  },
  ],
  '2026-04-15': [
    { id: 22, className: 'Calisthenics',    time: '7:00 AM',  duration: '60 min', trainer: 'Rex',     spots: 5  },
    { id: 23, className: 'Mat Pilates',     time: '9:30 AM',  duration: '60 min', trainer: 'Kate',    spots: 7  },
    { id: 24, className: 'Capoeira',        time: '4:00 PM',  duration: '90 min', trainer: 'Rex',     spots: 10 },
  ],
  '2026-04-16': [
    { id: 25, className: 'Circuit Training',time: '12:00 PM', duration: '60 min', trainer: 'Rachelle',spots: 8  },
    { id: 26, className: 'Groundworks',     time: '6:00 PM',  duration: '60 min', trainer: 'Alec',    spots: 6  },
  ],
  '2026-04-17': [
    { id: 27, className: 'Yoga',            time: '8:00 AM',  duration: '75 min', trainer: 'Jodi',    spots: 5  },
    { id: 28, className: 'Kickboxing',      time: '5:00 PM',  duration: '60 min', trainer: 'Wolf',    spots: 4  },
  ],
  '2026-04-18': [
    { id: 29, className: 'Calisthenics',    time: '9:00 AM',  duration: '60 min', trainer: 'Rex',     spots: 7  },
    { id: 30, className: 'Animal Flow',     time: '11:00 AM', duration: '60 min', trainer: 'Ephraim', spots: 8  },
  ],
  '2026-04-21': [
    { id: 31, className: 'Groundworks',     time: '7:00 AM',  duration: '60 min', trainer: 'Alec',    spots: 6  },
    { id: 32, className: 'Mat Pilates',     time: '10:00 AM', duration: '60 min', trainer: 'Kate',    spots: 9  },
    { id: 33, className: 'Capoeira',        time: '3:00 PM',  duration: '90 min', trainer: 'Rex',     spots: 11 },
  ],
  '2026-04-22': [
    { id: 34, className: 'Yoga',            time: '8:00 AM',  duration: '75 min', trainer: 'Jodi',    spots: 0  },
    { id: 35, className: 'Circuit Training',time: '12:00 PM', duration: '60 min', trainer: 'Rachelle',spots: 10 },
  ],
  '2026-04-23': [
    { id: 36, className: 'Calisthenics',    time: '7:00 AM',  duration: '60 min', trainer: 'Rex',     spots: 5  },
    { id: 37, className: 'Kickboxing',      time: '5:00 PM',  duration: '60 min', trainer: 'Wolf',    spots: 7  },
  ],
  '2026-04-25': [
    { id: 38, className: 'Yoga',            time: '9:00 AM',  duration: '75 min', trainer: 'Jodi',    spots: 6  },
    { id: 39, className: 'Animal Flow',     time: '11:00 AM', duration: '60 min', trainer: 'Ephraim', spots: 8  },
    { id: 40, className: 'Groundworks',     time: '3:00 PM',  duration: '60 min', trainer: 'Alec',    spots: 5  },
  ],
  '2026-04-28': [
    { id: 41, className: 'Calisthenics',    time: '7:00 AM',  duration: '60 min', trainer: 'Rex',     spots: 4  },
    { id: 42, className: 'Circuit Training',time: '12:00 PM', duration: '60 min', trainer: 'Rachelle',spots: 9  },
  ],
  '2026-04-29': [
    { id: 43, className: 'Mat Pilates',     time: '9:00 AM',  duration: '60 min', trainer: 'Kate',    spots: 6  },
    { id: 44, className: 'Capoeira',        time: '4:00 PM',  duration: '90 min', trainer: 'Rex',     spots: 8  },
  ],
  '2026-04-30': [
    { id: 45, className: 'Yoga',            time: '8:00 AM',  duration: '75 min', trainer: 'Jodi',    spots: 3  },
    { id: 46, className: 'Kickboxing',      time: '5:00 PM',  duration: '60 min', trainer: 'Wolf',    spots: 6  },
  ],
};

// ─────────────────────────────────────────────
// CLASS ACCENT COLORS
// ─────────────────────────────────────────────

const CLASS_COLORS: Record<string, string> = {
  'Yoga':             '#C49A3C',
  'Calisthenics':     '#3A4A5A',
  'Animal Flow':      '#6B8E6B',
  'Groundworks':      '#8B6F5A',
  'Circuit Training': '#B86A4A',
  'Mat Pilates':      '#9A7A8A',
  'Kickboxing':       '#7A3A4A',
  'Capoeira':         '#A07050',
  'Personal Coaching':'#A67E2A',
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatDateLabel(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function formatDateShort(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function parseDurationMinutes(duration: string): number {
  return parseInt(duration, 10) || 60;
}

// ─────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Select Class', 'Payment', 'Confirmed'];
  return (
    <div className="hidden md:flex items-center gap-0">
      {steps.map((label, i) => {
        const num = i + 1;
        const isActive = num === step;
        const isDone   = num < step;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  isDone   ? 'bg-[#C49A3C] text-white' :
                  isActive ? 'bg-[#C49A3C] text-white shadow-[0_0_0_3px_rgba(196,154,60,0.2)]' :
                             'bg-[#EDE8D8] text-[#9A8E7E]'
                }`}
                style={{ fontSize: '0.7rem', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
              >
                {isDone ? <Check size={13} strokeWidth={3} /> : num}
              </div>
              <span
                className={`text-[10px] mt-1 whitespace-nowrap ${isActive ? 'text-[#C49A3C]' : 'text-[#B0A898]'}`}
                style={{ letterSpacing: '0.05em' }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-14 h-px mx-1.5 mb-4 transition-colors ${isDone ? 'bg-[#C49A3C]' : 'bg-[#D4CDB5]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// SLOT CARD
// ─────────────────────────────────────────────

function SlotCard({
  slot, isSelected, onSelect,
}: {
  slot: Slot;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const color      = CLASS_COLORS[slot.className] || '#C49A3C';
  const fullyBooked = slot.spots === 0;
  const lowSpots   = slot.spots > 0 && slot.spots <= 4;

  return (
    <button
      onClick={fullyBooked ? undefined : onSelect}
      disabled={fullyBooked}
      className={`w-full text-left flex items-stretch rounded-2xl border transition-all group ${
        fullyBooked
          ? 'border-[#D4CDB5]/40 bg-[#F5F2EC] opacity-70 cursor-not-allowed'
          : isSelected
            ? 'border-[#C49A3C]/60 bg-[#C49A3C]/06 shadow-[0_2px_16px_rgba(196,154,60,0.12)]'
            : 'border-[#D4CDB5]/60 bg-white hover:border-[#C49A3C]/30 hover:shadow-sm'
      }`}
    >
      {/* Color bar */}
      <div
        className="w-1 rounded-l-2xl shrink-0"
        style={{ backgroundColor: fullyBooked ? '#C0B8A8' : color }}
      />

      {/* Content */}
      <div className="flex-1 flex items-center gap-4 px-4 py-4">
        {/* Time */}
        <div className="shrink-0 w-20 text-center">
          <p
            className="leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.15rem',
              letterSpacing: '0.04em',
              color: fullyBooked ? '#B0A898' : '#1E2A35',
            }}
          >
            {slot.time}
          </p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Clock size={10} className="text-[#B0A898]" />
            <span className="text-[#B0A898]" style={{ fontSize: '0.65rem' }}>{slot.duration}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-[#D4CDB5]/50" />

        {/* Class info */}
        <div className="flex-1">
          <p
            className="leading-none mb-1"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.25rem',
              letterSpacing: '0.04em',
              color: fullyBooked ? '#9A8E7E' : isSelected ? color : '#1E2A35',
            }}
          >
            {slot.className}
          </p>
          <p className="text-[#8A7E6E] text-xs">with Coach {slot.trainer}</p>
        </div>

        {/* Slots / status */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {fullyBooked ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
              <Users size={9} /> Fully Booked
            </div>
          ) : (
            <>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                lowSpots ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-[#F0EBE0] text-[#7A6A52]'
              }`}>
                <Users size={9} /> {slot.spots} spots left
              </div>
              {isSelected ? (
                <div className="w-6 h-6 rounded-full bg-[#C49A3C] flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              ) : (
                <span className="text-[#C49A3C] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Select →
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────
// MULTI-SELECT FILTER
// ─────────────────────────────────────────────

function MultiSelectFilter({
  label, icon, options, selected, onChange,
}: {
  label: string;
  icon: ReactNode;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  };

  const allSelected = selected.length === 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold transition-all ${
          !allSelected
            ? 'bg-[#C49A3C]/10 border-[#C49A3C]/40 text-[#A67E2A]'
            : 'bg-white border-[#D4CDB5]/60 text-[#5A5048] hover:border-[#C49A3C]/30'
        }`}
      >
        {icon}
        {label}
        {!allSelected && (
          <span className="w-4 h-4 rounded-full bg-[#C49A3C] text-white text-[9px] flex items-center justify-center">
            {selected.length}
          </span>
        )}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-2 w-56 bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-[0_8px_28px_rgba(30,42,53,0.16)] p-2 max-h-72 overflow-y-auto">
          <button
            onClick={() => onChange([])}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#C49A3C] hover:bg-[#F5F2E8] transition-colors mb-1"
          >
            All {label}s
          </button>
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#F5F2E8] cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggleOption(opt)}
                className="w-3.5 h-3.5 rounded accent-[#C49A3C]"
              />
              <span className="text-xs text-[#1E2A35]">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function BookClassPage() {
  const navigate = useNavigate();
  const { profileComplete } = useAuth();

  useEffect(() => {
    if (!profileComplete) navigate('/profile-setup');
  }, [profileComplete, navigate]);

  const today = useMemo(() => getTodayLocal(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  // Main calendar month view (unchanged)
  const [calYear, setCalYear]   = useState(() => today.getFullYear());
  const [calMonth, setCalMonth] = useState(() => today.getMonth());

  // Small month calendar (left) — independent state, always opens to the current local month
  const [miniCalYear, setMiniCalYear]   = useState(() => getTodayLocal().getFullYear());
  const [miniCalMonth, setMiniCalMonth] = useState(() => getTodayLocal().getMonth());

  // Main calendar: Week / Month toggle, week view is the default
  const [view, setView]         = useState<'week' | 'month'>('week');
  const [weekAnchor, setWeekAnchor] = useState(() => getTodayLocal());

  // Coach & Class/Discipline filters (multi-select)
  const [coachFilter, setCoachFilter] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string[]>([]);

  // Right-side day panel + booking
  const [panelOpen, setPanelOpen]         = useState(false);
  const [panelDateKey, setPanelDateKey]   = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot]   = useState<Slot | null>(null);

  const ALL_TRAINERS = useMemo(
    () => Array.from(new Set(Object.values(SCHEDULE).flat().map((s) => s.trainer))).sort(),
    [],
  );
  const ALL_CLASSES = useMemo(
    () => Array.from(new Set(Object.values(SCHEDULE).flat().map((s) => s.className))).sort(),
    [],
  );

  const filteredSchedule = useMemo(() => {
    const result: Record<string, Slot[]> = {};
    Object.entries(SCHEDULE).forEach(([key, slots]) => {
      const filtered = slots.filter((s) => {
        if (coachFilter.length && !coachFilter.includes(s.trainer)) return false;
        if (classFilter.length && !classFilter.includes(s.className)) return false;
        return true;
      });
      if (filtered.length) result[key] = filtered;
    });
    return result;
  }, [coachFilter, classFilter]);

  const filtersActive = coachFilter.length > 0 || classFilter.length > 0;

  const grid      = buildMonthGrid(miniCalYear, miniCalMonth);
  const weekDates = useMemo(() => getWeekDatesContaining(weekAnchor), [weekAnchor]);
  const panelSlots = panelDateKey ? (filteredSchedule[panelDateKey] || []) : [];

  // ── Navigation ──
  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };
  const prevMiniMonth = () => {
    if (miniCalMonth === 0) { setMiniCalYear((y) => y - 1); setMiniCalMonth(11); }
    else setMiniCalMonth((m) => m - 1);
  };
  const nextMiniMonth = () => {
    if (miniCalMonth === 11) { setMiniCalYear((y) => y + 1); setMiniCalMonth(0); }
    else setMiniCalMonth((m) => m + 1);
  };
  const prevWeek = () => setWeekAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const goToday  = () => {
    const now = getTodayLocal();
    setWeekAnchor(now);
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setMiniCalYear(now.getFullYear());
    setMiniCalMonth(now.getMonth());
  };

  // ── Right-side day panel ──
  const openDayPanel = (key: string, slot: Slot | null = null) => {
    setPanelDateKey(key);
    setSelectedSlot(slot);
    setPanelOpen(true);
  };

  const handleMiniDateSelect = (key: string) => {
    if (!filteredSchedule[key]?.length) return;
    setWeekAnchor(dateKeyToDate(key));
    openDayPanel(key);
  };

  const handleWeekDayHeaderClick = (date: Date) => {
    openDayPanel(toDateKeyFromParts(date.getFullYear(), date.getMonth(), date.getDate()));
  };

  const handleProceed = () => {
    if (!selectedSlot || !panelDateKey) return;
    navigate('/payment', {
      state: {
        booking: {
          className:  selectedSlot.className,
          date:       panelDateKey,
          dateLabel:  formatDateShort(panelDateKey),
          time:       selectedSlot.time,
          duration:   selectedSlot.duration,
          trainer:    selectedSlot.trainer,
          price:      '₱360',
          priceNum:   360,
        },
      },
    });
  };

  // ── Week grid events (Google-Calendar-style, reusing the shared week grid) ──
  const weekEvents = useMemo<WeekGridEvent[]>(() => {
    const evts: WeekGridEvent[] = [];
    weekDates.forEach((date, dayIdx) => {
      const key = toDateKeyFromParts(date.getFullYear(), date.getMonth(), date.getDate());
      const slots = filteredSchedule[key] || [];
      slots.forEach((slot) => {
        const fullyBooked = slot.spots === 0;
        evts.push({
          id: `${key}-${slot.id}`,
          dayIndex: dayIdx,
          time: slot.time,
          duration: parseDurationMinutes(slot.duration),
          title: slot.className,
          subtitle: `${slot.time} · Coach ${slot.trainer}`,
          color: CLASS_COLORS[slot.className] || '#C49A3C',
          muted: fullyBooked,
          mutedLabel: fullyBooked ? 'Full' : undefined,
          onClick: () => openDayPanel(key, fullyBooked ? null : slot),
        });
      });
    });
    return evts;
  }, [weekDates, filteredSchedule]);

  // ── Month grid events ──
  const monthEventsByDate = useMemo(() => {
    const map: Record<string, MonthGridEvent[]> = {};
    Object.entries(filteredSchedule).forEach(([key, slots]) => {
      const [y, m] = key.split('-').map(Number);
      if (y !== calYear || m - 1 !== calMonth) return;
      map[key] = slots.map((slot) => ({
        id: slot.id,
        time: slot.time,
        title: slot.className,
        color: CLASS_COLORS[slot.className] || '#C49A3C',
        muted: slot.spots === 0,
      }));
    });
    return map;
  }, [filteredSchedule, calYear, calMonth]);

  const selectedDayIndex = useMemo(() => {
    if (!panelDateKey) return null;
    const idx = weekDates.findIndex(
      (d) => toDateKeyFromParts(d.getFullYear(), d.getMonth(), d.getDate()) === panelDateKey,
    );
    return idx === -1 ? null : idx;
  }, [panelDateKey, weekDates]);

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 md:px-8">

        {/* ── Header ── */}
        <div className="pt-6 pb-5 border-b border-[#D4CDB5]/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1
                className="text-[#1E2A35] leading-none"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: '0.05em' }}
              >
                Book a Class
              </h1>
              <p className="text-[#8A7E6E] text-xs mt-0.5">Browse the calendar, tap a class or day, and secure your spot</p>
            </div>
          </div>
          <StepBar step={1} />
        </div>

        {/* ── Toolbar: date nav + filters + view toggle ── */}
        <div className="pt-5 pb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={goToday}
              className="text-xs font-bold text-[#1E2A35] bg-white border border-[#D4CDB5]/60 rounded-full px-4 py-2.5 hover:bg-[#F0EBE0] active:scale-95 transition-all"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={view === 'week' ? prevWeek : prevMonth}
                className="w-9 h-9 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={view === 'week' ? nextWeek : nextMonth}
                className="w-9 h-9 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <span
              className="text-[#1E2A35] ml-1"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.05em' }}
            >
              {view === 'week' ? formatWeekRange(weekDates) : `${MONTH_NAMES[calMonth]} ${calYear}`}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <MultiSelectFilter label="Coach" icon={<User size={13} />} options={ALL_TRAINERS} selected={coachFilter} onChange={setCoachFilter} />
            <MultiSelectFilter label="Class" icon={<Layers size={13} />} options={ALL_CLASSES} selected={classFilter} onChange={setClassFilter} />
            {filtersActive && (
              <button
                onClick={() => { setCoachFilter([]); setClassFilter([]); }}
                className="text-[#C49A3C] text-xs font-semibold px-3 py-2 rounded-full border border-[#C49A3C]/40 hover:bg-[#C49A3C]/10 transition-colors"
              >
                Clear
              </button>
            )}
            <div className="flex items-center bg-[#EDE8D8] rounded-2xl p-1 border border-[#D4CDB5]/50">
              {(['week', 'month'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-2 rounded-xl transition-all capitalize ${
                    view === v ? 'bg-white text-[#1E2A35] shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                  }`}
                  style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em', fontSize: '0.8rem' }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Two-panel body ── */}
        <div className="pb-10 flex gap-6 items-start">

          {/* ── LEFT: small month calendar (preserved) ── */}
          <div className="w-72 shrink-0">
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5 sticky top-6">

              {/* Month nav */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={prevMiniMonth}
                  className="w-8 h-8 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"
                >
                  <ChevronLeft size={15} />
                </button>
                <span
                  className="text-[#1E2A35]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.1em' }}
                >
                  {MONTH_NAMES[miniCalMonth]} {miniCalYear}
                </span>
                <button
                  onClick={nextMiniMonth}
                  className="w-8 h-8 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_LABELS_SHORT.map(d => (
                  <div
                    key={d}
                    className="text-center text-[#B0A898] py-1"
                    style={{ fontSize: '0.62rem', letterSpacing: '0.08em', fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Date grid */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {grid.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} />;
                  const key      = toDateKeyFromParts(miniCalYear, miniCalMonth, day);
                  const isSelected = key === panelDateKey;
                  const isToday    = key === todayKey;
                  const hasClasses = !!filteredSchedule[key]?.length;

                  return (
                    <button
                      key={key}
                      onClick={() => hasClasses ? handleMiniDateSelect(key) : undefined}
                      disabled={!hasClasses}
                      className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 mx-0.5 transition-all ${
                        isSelected
                          ? 'bg-[#C49A3C] text-white shadow-[0_3px_12px_rgba(196,154,60,0.35)]'
                          : isToday
                            ? 'bg-[#C49A3C]/12 text-[#A67E2A]'
                            : hasClasses
                              ? 'text-[#1E2A35] hover:bg-[#F0EBE0] cursor-pointer'
                              : 'text-[#D4CDB5] cursor-default'
                      }`}
                    >
                      <span className="text-sm leading-none mb-1">{day}</span>
                      {hasClasses && (
                        <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/70' : 'bg-[#C49A3C]'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-[#D4CDB5]/40 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C49A3C]" />
                  <span className="text-[#9A8E7E]" style={{ fontSize: '0.68rem' }}>Classes available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#D4CDB5]/40 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4CDB5]" />
                  </div>
                  <span className="text-[#9A8E7E]" style={{ fontSize: '0.68rem' }}>No classes today</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── CENTER: main Google-Calendar-inspired schedule ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {view === 'week' ? (
              <WeekCalendarGrid
                weekDates={weekDates}
                events={weekEvents}
                today={today}
                selectedDayIndex={selectedDayIndex}
                onDayHeaderClick={handleWeekDayHeaderClick}
              />
            ) : (
              <MonthCalendarGrid
                year={calYear}
                month={calMonth}
                eventsByDate={monthEventsByDate}
                todayKey={todayKey}
                selectedDateKey={panelDateKey}
                onSelectDate={openDayPanel}
              />
            )}

            {/* Legend */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {ALL_CLASSES.map((name) => (
                <div key={name} className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CLASS_COLORS[name] || '#C49A3C' }} />
                  <span className="text-[#8A7E6E] text-xs whitespace-nowrap">{name}</span>
                </div>
              ))}
            </div>

            <p className="text-[#8A7E6E] text-xs text-center">
              {view === 'week'
                ? 'Tap a class to book it, or a day header to see its full schedule'
                : 'Tap any day to see its full schedule'}
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT: day schedule + booking panel ── */}
      <Sheet
        open={panelOpen}
        onOpenChange={(open) => { setPanelOpen(open); if (!open) setSelectedSlot(null); }}
      >
        <SheetContent side="right" className="bg-[#FBF9F3] border-l border-[#D4CDB5]/60 w-full sm:max-w-md flex flex-col gap-0 p-0">
          {panelDateKey && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#D4CDB5]/50 text-left space-y-1">
                <SheetTitle
                  className="text-[#1E2A35] leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
                >
                  {formatDateLabel(panelDateKey)}
                </SheetTitle>
                <p className="text-[#8A7E6E] text-xs">
                  {panelSlots.length > 0 ? `${panelSlots.length} class${panelSlots.length > 1 ? 'es' : ''} available` : 'No classes scheduled'}
                </p>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {panelSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-[#D4CDB5]/60 flex items-center justify-center mb-3 shadow-sm">
                      <CalendarDays size={22} className="text-[#C49A3C]/60" />
                    </div>
                    <p className="text-[#9A8E7E] text-sm">No classes on this day.</p>
                    {filtersActive && (
                      <p className="text-[#B0A898] text-xs mt-1">Try adjusting your filters.</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {panelSlots.map((slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        isSelected={selectedSlot?.id === slot.id}
                        onSelect={() => setSelectedSlot(selectedSlot?.id === slot.id ? null : slot)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Booking summary (appears when a slot is selected) ── */}
              {selectedSlot && (
                <div className="border-t border-[#C49A3C]/30 bg-white px-6 py-5 shrink-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${CLASS_COLORS[selectedSlot.className] || '#C49A3C'}18` }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CLASS_COLORS[selectedSlot.className] || '#C49A3C' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Your Selection</p>
                      <p
                        className="text-[#1E2A35] leading-none truncate"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.04em' }}
                      >
                        {selectedSlot.className}
                      </p>
                      <div className="flex items-center gap-2 text-[#8A7E6E] text-xs mt-1 flex-wrap">
                        <span>{formatDateShort(panelDateKey)}</span>
                        <span className="text-[#D4CDB5]">·</span>
                        <span>{selectedSlot.time}</span>
                        <span className="text-[#D4CDB5]">·</span>
                        <span>Coach {selectedSlot.trainer}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[#8A7E6E] text-xs">Session fee</p>
                      <p
                        className="text-[#C49A3C] leading-none"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.02em' }}
                      >
                        ₱360
                      </p>
                    </div>
                    <button
                      onClick={handleProceed}
                      className="flex items-center gap-2 bg-[#C49A3C] text-white font-bold text-sm rounded-full py-3.5 px-6 shadow-[0_4px_16px_rgba(196,154,60,0.35)] hover:bg-[#A67E2A] active:scale-[0.97] transition-all whitespace-nowrap"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em', fontSize: '0.9rem' }}
                    >
                      Proceed to Payment <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
