import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CalendarDays, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WeekCalendarGrid, type WeekGridEvent } from '../components/calendar/WeekCalendarGrid';
import { getWeekDatesForOffset, formatWeekRange } from '../components/calendar/weekCalendarUtils';
import { DisciplineCardsGrid } from '../components/disciplines/DisciplineCardsGrid';

// ─── Weekly schedule (recurring studio timetable, for the "Upcoming Classes" tab) ───

interface ScheduleEvent {
  id: number;
  day: number; // 0 = Sunday ... 6 = Saturday
  time: string; // e.g. '7:00 AM'
  duration: number; // minutes
  className: string;
  trainer: string;
}

const WEEKLY_SCHEDULE: ScheduleEvent[] = [
  { id: 1, day: 1, time: '7:00 AM', duration: 60, className: 'Calisthenics', trainer: 'Rex' },
  { id: 2, day: 1, time: '9:00 AM', duration: 75, className: 'Yoga', trainer: 'Jodi' },
  { id: 3, day: 1, time: '6:00 PM', duration: 60, className: 'Kickboxing', trainer: 'Wolf' },
  { id: 4, day: 2, time: '8:00 AM', duration: 60, className: 'Animal Flow', trainer: 'Ephraim' },
  { id: 5, day: 2, time: '12:00 PM', duration: 60, className: 'Circuit Training', trainer: 'Rachelle' },
  { id: 6, day: 3, time: '7:00 AM', duration: 60, className: 'Calisthenics', trainer: 'Rex' },
  { id: 7, day: 3, time: '9:30 AM', duration: 60, className: 'Mat Pilates', trainer: 'Kate' },
  { id: 8, day: 3, time: '5:00 PM', duration: 60, className: 'Kickboxing', trainer: 'Wolf' },
  { id: 9, day: 4, time: '8:00 AM', duration: 75, className: 'Yoga', trainer: 'Jodi' },
  { id: 10, day: 4, time: '11:00 AM', duration: 60, className: 'Groundworks', trainer: 'Alec' },
  { id: 11, day: 5, time: '7:00 AM', duration: 60, className: 'Calisthenics', trainer: 'Rex' },
  { id: 12, day: 5, time: '3:00 PM', duration: 90, className: 'Capoeira', trainer: 'Rex' },
  { id: 13, day: 5, time: '6:00 PM', duration: 60, className: 'Kickboxing', trainer: 'Wolf' },
  { id: 14, day: 6, time: '9:00 AM', duration: 60, className: 'Mat Pilates', trainer: 'Kate' },
  { id: 15, day: 6, time: '10:30 AM', duration: 60, className: 'Groundworks', trainer: 'Alec' },
  { id: 16, day: 6, time: '12:00 PM', duration: 60, className: 'Circuit Training', trainer: 'Rachelle' },
];

const CLASS_COLORS: Record<string, string> = {
  Yoga: '#C49A3C',
  Calisthenics: '#3A4A5A',
  'Animal Flow': '#6B8E6B',
  Groundworks: '#8B6F5A',
  'Circuit Training': '#B86A4A',
  'Mat Pilates': '#9A7A8A',
  Kickboxing: '#7A3A4A',
  Capoeira: '#A07050',
};

function WeeklySchedule({ onBook }: { onBook: () => void }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const weekDates = useMemo(() => getWeekDatesForOffset(weekOffset), [weekOffset]);

  const gridEvents = useMemo<WeekGridEvent[]>(
    () =>
      WEEKLY_SCHEDULE.map((evt) => ({
        id: evt.id,
        dayIndex: evt.day,
        time: evt.time,
        duration: evt.duration,
        title: evt.className,
        subtitle: `${evt.time} · ${evt.trainer}`,
        color: CLASS_COLORS[evt.className] || '#C49A3C',
        onClick: onBook,
      })),
    [onBook],
  );

  const legendClasses = useMemo(
    () => Array.from(new Set(WEEKLY_SCHEDULE.map((e) => e.className))),
    [],
  );

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label="Previous week"
            className="w-9 h-9 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label="Next week"
            className="w-9 h-9 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"
          >
            <ChevronRight size={16} />
          </button>
          <span
            className="text-[#1E2A35] ml-1"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}
          >
            {formatWeekRange(weekDates)}
          </span>
        </div>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-[#C49A3C] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#C49A3C]/40 hover:bg-[#C49A3C]/10 transition-colors"
          >
            This Week
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {legendClasses.map((name) => (
          <div key={name} className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CLASS_COLORS[name] || '#C49A3C' }} />
            <span className="text-[#8A7E6E] text-xs whitespace-nowrap">{name}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <WeekCalendarGrid weekDates={weekDates} events={gridEvents} today={today} timezoneLabel="GMT+8" />

      <p className="text-[#8A7E6E] text-xs mt-3 text-center">
        Schedule repeats weekly · Tap any class to book your spot
      </p>
    </div>
  );
}

export default function ClassesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const initialTab = (location.state as { tab?: 'upcoming' | 'disciplines' } | null)?.tab === 'disciplines'
    ? 'disciplines'
    : 'upcoming';
  const [activeTab, setActiveTab] = useState<'upcoming' | 'disciplines'>(initialTab);

  const handleBook = () => {
    navigate(isAuthenticated ? '/dashboard' : '/auth');
  };

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {/* Header */}
      <div className="border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto flex items-center gap-4 px-4 md:px-8 pt-5 pb-0">
          <button
            onClick={() => navigate(-1)}
            className="md:hidden w-10 h-10 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] transition-colors active:scale-95 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          </button>
          <div className="flex-1">
            <h1
              className="text-[#1E2A35] leading-none"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                letterSpacing: '0.05em',
              }}
            >
              Our Classes
            </h1>
            {/* Tabs */}
            <div className="flex mt-3">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                  activeTab === 'upcoming'
                    ? 'border-[#C49A3C] text-[#C49A3C]'
                    : 'border-transparent text-[#8A7E6E] hover:text-[#1E2A35]'
                }`}
              >
                <CalendarDays size={14} />
                Upcoming Classes
              </button>
              <button
                onClick={() => setActiveTab('disciplines')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                  activeTab === 'disciplines'
                    ? 'border-[#C49A3C] text-[#C49A3C]'
                    : 'border-transparent text-[#8A7E6E] hover:text-[#1E2A35]'
                }`}
              >
                <Layers size={14} />
                Disciplines
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 md:py-8">

        {/* ── UPCOMING CLASSES TAB ── */}
        {activeTab === 'upcoming' && <WeeklySchedule onBook={handleBook} />}

        {/* ── DISCIPLINES TAB ── */}
        {activeTab === 'disciplines' && (
          <DisciplineCardsGrid showBookAction onBook={handleBook} />
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
