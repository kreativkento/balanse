import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Layers, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WeekCalendarGrid, type WeekGridEvent } from '../components/calendar/WeekCalendarGrid';
import { getWeekDatesForOffset, formatWeekRange, getTodayLocal } from '../components/calendar/weekCalendarUtils';
import { AdminDisciplineCardsGrid } from '../components/disciplines/AdminDisciplineCardsGrid';
import { AdminDisciplineModal } from '../components/disciplines/AdminDisciplineModal';
import {
  fetchDisciplinesForPublic,
  type DisciplineDisplay,
} from '../../lib/discipline-service';

// ─── Weekly schedule (recurring studio timetable, for the "Upcoming Classes" tab) ───

interface ScheduleEvent {
  id: number;
  day: number; // 0 = Sunday ... 6 = Saturday
  time: string; // e.g. '9:00 AM'
  duration: number; // minutes
  className: string;
  trainer: string;
}

const WEEKLY_SCHEDULE: ScheduleEvent[] = [
  { id: 1, day: 1, time: '9:00 AM', duration: 60, className: 'Calisthenics', trainer: 'Rex' },
  { id: 2, day: 1, time: '10:00 AM', duration: 75, className: 'Yoga', trainer: 'Jodi' },
  { id: 3, day: 1, time: '6:00 PM', duration: 60, className: 'Kickboxing', trainer: 'Wolf' },
  { id: 4, day: 2, time: '9:00 AM', duration: 60, className: 'Animal Flow', trainer: 'Ephraim' },
  { id: 5, day: 2, time: '12:00 PM', duration: 60, className: 'Circuit Training', trainer: 'Rachelle' },
  { id: 6, day: 3, time: '9:00 AM', duration: 60, className: 'Calisthenics', trainer: 'Rex' },
  { id: 7, day: 3, time: '10:00 AM', duration: 60, className: 'Mat Pilates', trainer: 'Kate' },
  { id: 8, day: 3, time: '5:00 PM', duration: 60, className: 'Kickboxing', trainer: 'Wolf' },
  { id: 9, day: 4, time: '9:00 AM', duration: 75, className: 'Yoga', trainer: 'Jodi' },
  { id: 10, day: 4, time: '11:00 AM', duration: 60, className: 'Groundworks', trainer: 'Alec' },
  { id: 11, day: 5, time: '9:00 AM', duration: 60, className: 'Calisthenics', trainer: 'Rex' },
  { id: 12, day: 5, time: '3:00 PM', duration: 90, className: 'Capoeira', trainer: 'Rex' },
  { id: 13, day: 5, time: '6:00 PM', duration: 60, className: 'Kickboxing', trainer: 'Wolf' },
  { id: 14, day: 6, time: '9:00 AM', duration: 60, className: 'Mat Pilates', trainer: 'Kate' },
  { id: 15, day: 6, time: '10:30 AM', duration: 60, className: 'Groundworks', trainer: 'Alec' },
  { id: 16, day: 6, time: '12:00 PM', duration: 60, className: 'Circuit Training', trainer: 'Rachelle' },
];

const CLASS_COLORS: Record<string, string> = {
  Yoga: '#745b3c',
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
  const today = getTodayLocal();
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
        color: CLASS_COLORS[evt.className] || '#745b3c',
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
            className="text-[#745b3c] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#745b3c]/40 hover:bg-[#745b3c]/10 transition-colors"
          >
            This Week
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {legendClasses.map((name) => (
          <div key={name} className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CLASS_COLORS[name] || '#745b3c' }} />
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
  const [disciplines, setDisciplines] = useState<DisciplineDisplay[]>([]);
  const [disciplinesLoading, setDisciplinesLoading] = useState(true);
  const [disciplinesError, setDisciplinesError] = useState<string | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineDisplay | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDisciplinesLoading(true);

    void fetchDisciplinesForPublic().then((result) => {
      if (cancelled) return;
      setDisciplines(result.data);
      setDisciplinesError(result.error);
      setDisciplinesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnroll = () => {
    if (isAuthenticated) {
      navigate('/book');
      return;
    }
    setShowSignInPrompt(true);
  };

  const handleProceedToAuth = () => {
    setShowSignInPrompt(false);
    navigate('/auth');
  };

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {selectedDiscipline && (
        <AdminDisciplineModal
          discipline={selectedDiscipline}
          readOnly
          onClose={() => setSelectedDiscipline(null)}
          onEnroll={handleEnroll}
        />
      )}

      {showSignInPrompt && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowSignInPrompt(false)}
        >
          <div
            className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-sm p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#745b3c]/12 border border-[#745b3c]/25 flex items-center justify-center mb-4">
              <LogIn size={20} className="text-[#745b3c]" />
            </div>
            <h2
              className="text-[#1E2A35] leading-none mb-2"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em' }}
            >
              Sign in required
            </h2>
            <p className="text-[#8A7E6E] text-sm leading-relaxed mb-6">
              Sign-in to manage your class schedules.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSignInPrompt(false)}
                className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 bg-white text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-all"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleProceedToAuth}
                className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white text-sm font-bold hover:bg-[#263545] transition-all"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-5 pb-0">
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
                  ? 'border-[#745b3c] text-[#745b3c]'
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
                  ? 'border-[#745b3c] text-[#745b3c]'
                  : 'border-transparent text-[#8A7E6E] hover:text-[#1E2A35]'
              }`}
            >
              <Layers size={14} />
              Disciplines
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 md:py-8">

        {/* ── UPCOMING CLASSES TAB ── */}
        {activeTab === 'upcoming' && <WeeklySchedule onBook={handleEnroll} />}

        {/* ── DISCIPLINES TAB ── */}
        {activeTab === 'disciplines' && (
          <>
            {disciplinesLoading && (
              <div className="flex items-center justify-center gap-2 text-[#8A7E6E] py-16">
                <Loader2 size={18} className="animate-spin text-[#745b3c]" />
                <span className="text-sm">Loading disciplines…</span>
              </div>
            )}

            {!disciplinesLoading && disciplinesError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-sm font-semibold">Could not load disciplines</p>
                  <p className="text-red-600/80 text-xs mt-0.5">{disciplinesError}</p>
                </div>
              </div>
            )}

            {!disciplinesLoading && !disciplinesError && disciplines.length === 0 && (
              <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-5 py-10 text-center">
                <p className="text-[#1E2A35] text-sm font-semibold">No disciplines available yet</p>
                <p className="text-[#8A7E6E] text-xs mt-1">Check back soon for our class catalog.</p>
              </div>
            )}

            {!disciplinesLoading && disciplines.length > 0 && (
              <AdminDisciplineCardsGrid
                variant="public"
                disciplines={disciplines}
                onSelect={setSelectedDiscipline}
                onEnroll={handleEnroll}
              />
            )}
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
