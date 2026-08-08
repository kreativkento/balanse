import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CalendarDays, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WeekCalendarGrid, type WeekGridEvent } from '../components/calendar/WeekCalendarGrid';
import { getWeekDatesForOffset, formatWeekRange } from '../components/calendar/weekCalendarUtils';

const CLASSES = [
  {
    id: 1,
    name: 'Calisthenics',
    img: 'https://images.unsplash.com/photo-1758274539089-8b2bd10eee92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Build real strength using only your bodyweight. Master foundational movements and progressions at your own pace.',
  },
  {
    id: 2,
    name: 'Yoga',
    img: 'https://images.unsplash.com/photo-1767611120077-3697335ec748?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Reconnect mind and body through guided breathwork, flowing postures, and deep restorative holds.',
  },
  {
    id: 3,
    name: 'Animal Flow',
    img: 'https://images.unsplash.com/photo-1717500252780-036bfd89f810?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Ground-based movement inspired by animal locomotion. Develops mobility, coordination, and fluid strength.',
  },
  {
    id: 4,
    name: 'Groundworks',
    img: 'https://images.unsplash.com/photo-1701824429245-ce783f1dc026?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Deep floor work focusing on joint health, primal movement patterns, and body awareness from the ground up.',
  },
  {
    id: 5,
    name: 'Circuit Training',
    img: 'https://images.unsplash.com/photo-1602827114685-efbb2717da9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'High-energy stations of cardio and resistance. Burn calories and build endurance in a structured, fun format.',
  },
  {
    id: 6,
    name: 'Mat Pilates',
    img: 'https://images.unsplash.com/photo-1637157216470-d92cd2edb2e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Strengthen your core, improve posture, and cultivate elegant body control through classical Pilates principles.',
  },
  {
    id: 7,
    name: 'Kickboxing',
    img: 'https://images.unsplash.com/photo-1686133368810-24f662f65cad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Powerful bag work and combination drills fused with cardio. Release tension and build real functional fitness.',
  },
  {
    id: 8,
    name: 'Capoeira',
    img: 'https://images.unsplash.com/photo-1759352856072-985a4ddab82d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Explore the Afro-Brazilian art of Capoeira — a beautiful blend of martial arts, dance, acrobatics, and music.',
  },
  {
    id: 9,
    name: 'Personal Coaching',
    img: 'https://images.unsplash.com/photo-1750698545009-679820502908?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'One-on-one sessions tailored entirely to your goals. Choose your preferred discipline and coach.',
  },
];

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
          <>
            <p className="text-[#8A7E6E] text-xs mb-4 -mt-1">{CLASSES.length} disciplines available</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {CLASSES.map((cls) => (
                <div
                  key={cls.id}
                  className="rounded-3xl overflow-hidden bg-white border border-[#D4CDB5]/60 shadow-sm flex flex-col"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden shrink-0">
                    <img
                      src={cls.img}
                      alt={cls.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E2A35]/60 to-transparent" />
                    {/* Class name overlay */}
                    <div className="absolute bottom-3 left-4">
                      <h2
                        className="text-white leading-none"
                        style={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: '1.6rem',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {cls.name}
                      </h2>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-[#8A7E6E] text-sm leading-relaxed flex-1">
                      {cls.description}
                    </p>

                    {/* CTA Button */}
                    <button
                      onClick={handleBook}
                      className="mt-4 w-full flex items-center justify-center gap-2 bg-[#C49A3C] text-white font-bold text-sm rounded-full py-3.5 min-h-[48px] shadow-[0_4px_16px_rgba(196,154,60,0.3)] active:scale-[0.97] transition-all hover:bg-[#A67E2A]"
                    >
                      Book Now <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
