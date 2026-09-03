import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ChevronLeft, ChevronRight, X, Trash2, CalendarDays, ChevronDown, Check, AlertCircle, Clock, Undo2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { MonthCalendarGrid, type MonthGridEvent } from '../components/calendar/MonthCalendarGrid';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import {
  MONTH_NAMES,
  addDaysToDate,
  dateKeyToDate,
  formatMonSunWeekRange,
  getInitialCalendarMonth,
  getMondayOfWeekContaining,
  getTodayDateKey,
  getTodayLocal,
  toDateKey,
  toDateKeyFromParts,
  SCHEDULE_HOURS,
} from '../components/calendar/weekCalendarUtils';

// ── Types & Data ───────────────────────────────────────────────

interface ScheduleBlock {
  id: number;
  dayIndex: number;
  startHour: number;
  duration: number;
  className: string;
  coach: string;
  capacity: number;
  enrolled: number;
  color: string;
  isOpen: boolean;
  status: 'upcoming' | 'completed' | 'cancelled';
}

type ReqStatus = 'pending' | 'approved' | 'rejected';

interface ClassScheduleRequest {
  id: number;
  staff: string;
  email: string;
  className: string;
  discipline: string;
  date: string;
  startTime: string;
  endTime: string;
  classLimit: number;
  submittedAt: string;
  status: ReqStatus;
  dayIndex: number;
  startHour: number;
  duration: number;
  coach: string;
}

interface CancelRequest {
  id: number;
  coach: string;
  email: string;
  className: string;
  date: string;
  time: string;
  enrolled: number;
  requestedAt: string;
  hoursUntilClass: number;
  status: ReqStatus;
}

const CLASS_COLORS: Record<string, string> = {
  'Yoga': '#c49a3c', 'Calisthenics': '#3A4A5A', 'Animal Flow': '#6B8E6B',
  'Groundworks': '#8B6F5A', 'Circuit Training': '#B86A4A', 'Mat Pilates': '#9A7A8A',
  'Kickboxing': '#7A3A4A', 'Capoeira': '#A07050', 'Personal Coaching': '#a67f2e',
};
const SERVICES  = Object.keys(CLASS_COLORS);
const COACHES   = ['Rex', 'Jodi', 'Ephraim', 'Alec', 'Rachelle', 'Kate', 'Wolf'];
const DURATIONS = [30, 45, 60, 75, 90];
const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = SCHEDULE_HOURS;

function fmtHour(h: number) {
  if (h === 12) return '12:00 PM';
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

function jsDayToMonIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function formatDayShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const INITIAL_BLOCKS: ScheduleBlock[] = [
  { id: 1,  dayIndex: 0, startHour: 9,  duration: 75, className: 'Yoga',            coach: 'Jodi',     capacity: 15, enrolled: 11, color: '#c49a3c', isOpen: true,  status: 'completed' },
  { id: 2,  dayIndex: 0, startHour: 10, duration: 60, className: 'Mat Pilates',      coach: 'Kate',     capacity: 12, enrolled: 8,  color: '#9A7A8A', isOpen: true,  status: 'completed' },
  { id: 3,  dayIndex: 0, startHour: 18, duration: 60, className: 'Calisthenics',     coach: 'Rex',      capacity: 12, enrolled: 6,  color: '#3A4A5A', isOpen: true,  status: 'cancelled' },
  { id: 4,  dayIndex: 1, startHour: 9,  duration: 60, className: 'Calisthenics',     coach: 'Rex',      capacity: 12, enrolled: 3,  color: '#3A4A5A', isOpen: true,  status: 'completed' },
  { id: 5,  dayIndex: 1, startHour: 9,  duration: 60, className: 'Animal Flow',      coach: 'Ephraim',  capacity: 12, enrolled: 10, color: '#6B8E6B', isOpen: true,  status: 'upcoming'  },
  { id: 6,  dayIndex: 1, startHour: 17, duration: 60, className: 'Kickboxing',       coach: 'Wolf',     capacity: 10, enrolled: 7,  color: '#7A3A4A', isOpen: false, status: 'upcoming'  },
  { id: 7,  dayIndex: 2, startHour: 9,  duration: 60, className: 'Mat Pilates',      coach: 'Kate',     capacity: 12, enrolled: 5,  color: '#9A7A8A', isOpen: true,  status: 'upcoming'  },
  { id: 8,  dayIndex: 2, startHour: 16, duration: 60, className: 'Circuit Training', coach: 'Rachelle', capacity: 15, enrolled: 12, color: '#B86A4A', isOpen: true,  status: 'upcoming'  },
  { id: 9,  dayIndex: 3, startHour: 9,  duration: 75, className: 'Yoga',             coach: 'Jodi',     capacity: 15, enrolled: 9,  color: '#c49a3c', isOpen: true,  status: 'upcoming'  },
  { id: 10, dayIndex: 4, startHour: 10, duration: 60, className: 'Groundworks',      coach: 'Alec',     capacity: 10, enrolled: 4,  color: '#8B6F5A', isOpen: true,  status: 'upcoming'  },
  { id: 11, dayIndex: 5, startHour: 9,  duration: 60, className: 'Capoeira',         coach: 'Alec',     capacity: 10, enrolled: 7,  color: '#A07050', isOpen: true,  status: 'upcoming'  },
  { id: 12, dayIndex: 6, startHour: 10, duration: 75, className: 'Personal Coaching',coach: 'Rex',      capacity: 4,  enrolled: 2,  color: '#a67f2e', isOpen: true,  status: 'upcoming'  },
];

const INITIAL_SCHEDULE_REQS: ClassScheduleRequest[] = [
  { id: 1, staff: 'Jodi Reyes',    email: 'jodi.reyes@balanse.com',    className: 'Morning Yoga Flow',     discipline: 'Yoga',             date: 'Tue, Apr 14', startTime: '9:00 AM',  endTime: '10:15 AM', classLimit: 15, submittedAt: '2 hrs ago',  status: 'pending',  dayIndex: 1, startHour: 9,  duration: 75, coach: 'Jodi'     },
  { id: 2, staff: 'Ephraim Cruz',  email: 'ephraim.cruz@balanse.com',  className: 'Animal Flow Foundations', discipline: 'Animal Flow',   date: 'Tue, Apr 14', startTime: '9:00 AM',  endTime: '10:00 AM', classLimit: 12, submittedAt: '3 hrs ago',  status: 'pending',  dayIndex: 1, startHour: 9,  duration: 60, coach: 'Ephraim'  },
  { id: 3, staff: 'Wolf Andrada',  email: 'wolf.andrada@balanse.com',  className: 'Evening Kickboxing',    discipline: 'Kickboxing',       date: 'Wed, Apr 15', startTime: '5:00 PM',  endTime: '6:00 PM',  classLimit: 10, submittedAt: '30 min ago', status: 'pending',  dayIndex: 2, startHour: 17, duration: 60, coach: 'Wolf'     },
  { id: 4, staff: 'Kate Mercado',  email: 'kate.mercado@balanse.com',  className: 'Mat Pilates Core',      discipline: 'Mat Pilates',      date: 'Thu, Apr 16', startTime: '9:00 AM',  endTime: '10:00 AM', classLimit: 12, submittedAt: '5 hrs ago',  status: 'pending',  dayIndex: 3, startHour: 9,  duration: 60, coach: 'Kate'     },
  { id: 5, staff: 'Alec Navarro',  email: 'alec.navarro@balanse.com',  className: 'Groundworks Intro',     discipline: 'Groundworks',      date: 'Fri, Apr 17', startTime: '10:00 AM', endTime: '11:00 AM', classLimit: 10, submittedAt: '1 day ago',  status: 'approved', dayIndex: 4, startHour: 10, duration: 60, coach: 'Alec'     },
];

const INITIAL_CANCEL_REQS: CancelRequest[] = [
  { id: 1, coach: 'Jodi Reyes',    email: 'jodi.reyes@balanse.com',    className: 'Yoga',             date: 'Tue, Apr 14', time: '9:00 AM',  enrolled: 11, requestedAt: '1 hr ago',   hoursUntilClass: 18, status: 'pending'  },
  { id: 2, coach: 'Rex Santos',    email: 'rex.santos@balanse.com',    className: 'Calisthenics',     date: 'Wed, Apr 16', time: '9:00 AM',  enrolled: 3,  requestedAt: '30 min ago', hoursUntilClass: 42, status: 'pending'  },
  { id: 3, coach: 'Rachelle Lim',  email: 'rachelle.lim@balanse.com',  className: 'Circuit Training', date: 'Mon, Apr 13', time: '4:00 PM',  enrolled: 12, requestedAt: '3 hrs ago',  hoursUntilClass: 6,  status: 'approved' },
];

const EMPTY_FORM: {
  className: string;
  coach: string;
  dayIndex: number;
  startHour: number;
  duration: number;
  capacity: number;
  isOpen: boolean;
  status: ScheduleBlock['status'];
} = { className: 'Yoga', coach: 'Jodi', dayIndex: 0, startHour: 9, duration: 60, capacity: 12, isOpen: true, status: 'upcoming' };

// ── Component ──────────────────────────────────────────────────

export default function AdminSchedulePage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [activeTab, setActiveTab]     = useState<'calendar' | 'requests' | 'cancellations'>('calendar');
  const [blocks, setBlocks]           = useState<ScheduleBlock[]>(INITIAL_BLOCKS);
  const [scheduleReqs, setScheduleReqs] = useState<ClassScheduleRequest[]>(INITIAL_SCHEDULE_REQS);
  const [cancelReqs, setCancelReqs]   = useState<CancelRequest[]>(INITIAL_CANCEL_REQS);
  const [weekOffset, setWeekOffset]   = useState(0);
  const [calendarView, setCalendarView] = useState<'weekly' | 'monthly'>('weekly');
  const [calMonth, setCalMonth]       = useState(getInitialCalendarMonth);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [showModal, setShowModal]     = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [selectedReqId, setSelectedReqId] = useState<number | null>(null);
  const [selectedCancelId, setSelectedCancelId] = useState<number | null>(null);
  const [coachFilter, setCoachFilter] = useState<string>('All Coaches');
  const [reqStatusFilter, setReqStatusFilter] = useState<'all' | ReqStatus>('all');

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);
  if (!adminUser) return null;

  // ── Conflict detection ──
  const detectConflict = (dayIndex: number, startHour: number, coach: string, excludeId?: number): boolean =>
    blocks.some(b =>
      b.dayIndex === dayIndex &&
      b.startHour === startHour &&
      b.coach === coach &&
      b.id !== excludeId
    );

  const hasConflict = showModal && detectConflict(form.dayIndex, form.startHour, form.coach, editingBlock?.id);

  const today = getTodayLocal();
  const todayKey = getTodayDateKey();
  const weekStart = addDaysToDate(getMondayOfWeekContaining(today), weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysToDate(weekStart, i));
  const weekLabel = formatMonSunWeekRange(weekStart);
  const monthLabel = `${MONTH_NAMES[calMonth.month]} ${calMonth.year}`;
  const isOnToday = calendarView === 'weekly'
    ? weekOffset === 0
    : calMonth.year === today.getFullYear() && calMonth.month === today.getMonth();

  const visibleBlocks = coachFilter === 'All Coaches'
    ? blocks
    : blocks.filter(b => b.coach === coachFilter);

  const blocksAt = (dayIndex: number, hour: number) =>
    visibleBlocks.filter(b => b.dayIndex === dayIndex && b.startHour === hour);

  const blocksForDay = (dayIndex: number) =>
    visibleBlocks.filter(b => b.dayIndex === dayIndex);

  const monthEventsByDate = (() => {
    const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
    const result: Record<string, MonthGridEvent[]> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calMonth.year, calMonth.month, d);
      const dayBlocks = blocksForDay(jsDayToMonIndex(date.getDay()));
      if (dayBlocks.length === 0) continue;
      result[toDateKeyFromParts(calMonth.year, calMonth.month, d)] = dayBlocks.map(block => ({
        id: `${block.id}-${d}`,
        time: fmtHour(block.startHour),
        title: block.className,
        color: block.color,
        muted: !block.isOpen || block.status === 'cancelled' || block.status === 'completed',
      }));
    }
    return result;
  })();

  const selectedMonthDate = selectedMonthKey ? dateKeyToDate(selectedMonthKey) : null;
  const selectedMonthDayIndex = selectedMonthDate ? jsDayToMonIndex(selectedMonthDate.getDay()) : null;
  const selectedMonthBlocks = selectedMonthDayIndex == null ? [] : blocksForDay(selectedMonthDayIndex);

  const goToday = () => {
    setWeekOffset(0);
    setCalMonth(getInitialCalendarMonth());
    setSelectedMonthKey(todayKey);
  };

  const goPrev = () => {
    if (calendarView === 'weekly') setWeekOffset(w => w - 1);
    else {
      setCalMonth(m => shiftMonth(m.year, m.month, -1));
      setSelectedMonthKey(null);
    }
  };

  const goNext = () => {
    if (calendarView === 'weekly') setWeekOffset(w => w + 1);
    else {
      setCalMonth(m => shiftMonth(m.year, m.month, 1));
      setSelectedMonthKey(null);
    }
  };

  const switchCalendarView = (view: 'weekly' | 'monthly') => {
    if (view === 'monthly') {
      setCalMonth({ year: weekStart.getFullYear(), month: weekStart.getMonth() });
    } else if (selectedMonthKey) {
      const date = dateKeyToDate(selectedMonthKey);
      const monday = getMondayOfWeekContaining(date);
      const todayMonday = getMondayOfWeekContaining(today);
      setWeekOffset(Math.round((monday.getTime() - todayMonday.getTime()) / (7 * 86_400_000)));
    }
    setCalendarView(view);
  };

  const openEdit = (block: ScheduleBlock) => {
    setForm({ className: block.className, coach: block.coach, dayIndex: block.dayIndex, startHour: block.startHour, duration: block.duration, capacity: block.capacity, isOpen: block.isOpen, status: block.status });
    setEditingBlock(block);
    setShowModal(true);
  };

  const handleSave = () => {
    if (hasConflict) return; // prevent save if conflict
    const color = CLASS_COLORS[form.className] || '#c49a3c';
    if (editingBlock) {
      setBlocks(prev => prev.map(b => b.id === editingBlock.id ? { ...b, ...form, color } : b));
    } else {
      setBlocks(prev => [...prev, { id: Date.now(), ...form, color, enrolled: 0 }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    setConfirmDeleteId(null);
    setShowModal(false);
  };

  const requestBlockId = (reqId: number) => reqId + 10_000;

  const addRequestToCalendar = (req: ClassScheduleRequest) => {
    setBlocks(prev => {
      const blockId = requestBlockId(req.id);
      if (prev.some(b => b.id === blockId)) return prev;
      return [...prev, {
        id: blockId,
        dayIndex: req.dayIndex,
        startHour: req.startHour,
        duration: req.duration,
        className: req.className,
        coach: req.coach,
        capacity: req.classLimit,
        enrolled: 0,
        color: CLASS_COLORS[req.discipline] || '#c49a3c',
        isOpen: true,
        status: 'upcoming' as const,
      }];
    });
  };

  const removeRequestFromCalendar = (reqId: number) => {
    const blockId = requestBlockId(reqId);
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  const setRequestStatus = (id: number, status: ReqStatus) => {
    const req = scheduleReqs.find(r => r.id === id);
    if (!req) return;
    setScheduleReqs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (status === 'approved') addRequestToCalendar(req);
    else removeRequestFromCalendar(id);
  };

  const selectedReq = scheduleReqs.find(r => r.id === selectedReqId) ?? null;
  const selectedCancel = cancelReqs.find(r => r.id === selectedCancelId) ?? null;

  const setCancelStatus = (id: number, status: ReqStatus) => {
    setCancelReqs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const pendingB = scheduleReqs.filter(r => r.status === 'pending').length;
  const approvedB = scheduleReqs.filter(r => r.status === 'approved').length;
  const rejectedB = scheduleReqs.filter(r => r.status === 'rejected').length;
  const pendingC = cancelReqs.filter(r => r.status === 'pending').length;
  const filteredScheduleReqs = reqStatusFilter === 'all'
    ? scheduleReqs
    : scheduleReqs.filter(r => r.status === reqStatusFilter);

  const inputClass  = "w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  const StatusBadge = ({ s }: { s: ReqStatus }) => (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${
      s === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
      s === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
      'bg-red-50 text-red-600 border border-red-200'
    }`}>{s}</span>
  );

  const ReviewActions = ({
    status,
    onApprove,
    onReject,
    onUndo,
  }: {
    status: ReqStatus;
    onApprove: () => void;
    onReject: () => void;
    onUndo: () => void;
  }) => {
    const left =
      status === 'rejected'
        ? {
            label: 'Undo Reject',
            onClick: onUndo,
            className: 'flex-1 flex items-center justify-center gap-2 py-3 rounded-full border border-[#D4CDB5]/70 text-[#1E2A35] text-sm font-semibold hover:bg-[#EDE8D8] active:scale-[0.97] transition-all',
            icon: true,
            bebas: false,
          }
        : {
            label: 'Reject',
            onClick: onReject,
            className: 'flex-1 py-3 rounded-full bg-red-50 text-red-600 border border-red-200 text-sm font-semibold hover:bg-red-100 active:scale-[0.97] transition-all',
            icon: false,
            bebas: false,
          };

    const right =
      status === 'approved'
        ? {
            label: 'Undo Approve',
            onClick: onUndo,
            className: 'flex-1 flex items-center justify-center gap-2 py-3 rounded-full border border-[#D4CDB5]/70 text-[#1E2A35] text-sm font-semibold hover:bg-[#EDE8D8] active:scale-[0.97] transition-all',
            icon: true,
            bebas: false,
          }
        : {
            label: 'Approve',
            onClick: onApprove,
            className: 'flex-1 py-3 rounded-full bg-green-600 text-white text-sm font-semibold hover:bg-green-700 active:scale-[0.97] transition-all shadow-sm',
            icon: false,
            bebas: true,
          };

    return (
      <div className="px-7 pb-7">
        <div className="flex gap-3">
          <button type="button" onClick={left.onClick} className={left.className}>
            {left.icon && <Undo2 size={14} />}
            {left.label}
          </button>
          <button
            type="button"
            onClick={right.onClick}
            className={right.className}
            style={right.bebas ? { fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' } : undefined}
          >
            {right.icon && <Undo2 size={14} />}
            {right.label}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ���─ Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={14} className="text-[#c49a3c]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Schedule</span>
            </div>
            <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}>
              Schedule Management
            </h1>
          </div>
          {activeTab === 'calendar' && (
            <button
              onClick={() => { setForm(EMPTY_FORM); setEditingBlock(null); setShowModal(true); }}
              className="flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
            >
              <Plus size={16} /> Add Block
            </button>
          )}
        </div>

        {/* ── Page Tabs ── */}
        <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm mb-6 w-fit">
          {([
            ['calendar', 'Calendar', null] as const,
            ['requests', 'Booking Requests', pendingB] as const,
            ['cancellations', 'Cancellation Requests', pendingC] as const,
          ]).map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}
            >
              {label}
              {count != null && count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══ CALENDAR TAB ══ */}
        {activeTab === 'calendar' && (
          <>
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#D4CDB5]/40 flex-wrap">
                <div className="flex items-center gap-0.5 bg-[#F8F3E8] rounded-lg p-0.5">
                  {([['weekly', 'Weekly'], ['monthly', 'Monthly']] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => switchCalendarView(id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide transition-all ${
                        calendarView === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-1.5 flex-1 min-w-[220px]">
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label={calendarView === 'weekly' ? 'Previous week' : 'Previous month'}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] transition-all"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span
                    className="text-[#1E2A35] text-center min-w-[11rem]"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.06em' }}
                  >
                    {calendarView === 'weekly' ? weekLabel : monthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label={calendarView === 'weekly' ? 'Next week' : 'Next month'}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] transition-all"
                  >
                    <ChevronRight size={15} />
                  </button>
                  {!isOnToday && (
                    <button
                      type="button"
                      onClick={goToday}
                      className="text-[#c49a3c] text-[11px] font-bold px-2 py-1 rounded-md hover:bg-[#c49a3c]/10 transition-colors"
                    >
                      Today
                    </button>
                  )}
                </div>

                <div className="relative ml-auto">
                  <select
                    value={coachFilter}
                    onChange={e => setCoachFilter(e.target.value)}
                    aria-label="Filter by coach"
                    className="appearance-none pl-2.5 pr-7 py-1 rounded-lg border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-[11px] font-semibold outline-none cursor-pointer focus:ring-2 focus:ring-[#c49a3c]/20"
                  >
                    <option value="All Coaches">All Coaches</option>
                    {COACHES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-x-3 gap-y-1.5 px-3 py-2 border-b border-[#D4CDB5]/30 flex-wrap bg-[#F8F3E8]/40">
                {SERVICES.map(s => (
                  <div key={s} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CLASS_COLORS[s] }} />
                    <span className="text-[#8A7E6E] text-[10px]">{s}</span>
                  </div>
                ))}
                <span className="w-px h-3 bg-[#D4CDB5]/80 mx-0.5" />
                {[
                  { label: 'Upcoming',  dot: 'bg-[#6B8E6B]' },
                  { label: 'Completed', dot: 'bg-[#3A4A5A]' },
                  { label: 'Cancelled', dot: 'bg-red-400' },
                  { label: 'Closed',    dot: 'bg-[#D4CDB5]' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className="text-[#8A7E6E] text-[10px]">{s.label}</span>
                  </div>
                ))}
              </div>

            {calendarView === 'weekly' && (
              <div className="overflow-x-auto">
                <div style={{ minWidth: '900px' }}>
                  <div className="grid border-b border-[#D4CDB5]/50" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
                    <div className="px-3 py-2.5 bg-[#F8F3E8]/60" />
                    {WEEK_LABELS.map((day, i) => {
                      const isTodayCol = toDateKey(weekDates[i]) === todayKey;
                      return (
                      <div key={day} className={`px-3 py-2.5 text-center border-l border-[#D4CDB5]/40 ${isTodayCol ? 'bg-[#c49a3c]/10' : 'bg-[#F8F3E8]/60'}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider ${isTodayCol ? 'text-[#c49a3c]' : 'text-[#1E2A35]'}`}>{day}</p>
                        <p className={`text-xs ${isTodayCol ? 'text-[#c49a3c] font-semibold' : 'text-[#B0A898]'}`}>{formatDayShort(weekDates[i])}</p>
                      </div>
                      );
                    })}
                  </div>
                  {HOURS.map(hour => (
                    <div key={hour} className="grid border-b border-[#D4CDB5]/25 last:border-b-0" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
                      <div className="px-3 py-2 flex items-start justify-end bg-[#F8F3E8]/40 border-r border-[#D4CDB5]/40">
                        <span className="text-[#B0A898] text-xs pt-1 whitespace-nowrap">{fmtHour(hour)}</span>
                      </div>
                      {WEEK_LABELS.map((_, dayIndex) => {
                        const cellBlocks = blocksAt(dayIndex, hour);
                        return (
                          <div key={dayIndex} className="border-l border-[#D4CDB5]/30 min-h-[56px] p-1 relative group">
                            {cellBlocks.map(block => {
                              const fillPct = Math.round((block.enrolled / block.capacity) * 100);
                              const isCompleted = block.status === 'completed';
                              const isCancelled = block.status === 'cancelled';
                              return (
                                <div
                                  key={block.id}
                                  className={`rounded-xl p-2 mb-1 cursor-pointer transition-all relative overflow-hidden ${
                                    isCancelled ? 'opacity-50' : !block.isOpen ? 'opacity-50' : 'hover:opacity-90'
                                  }`}
                                  style={{ backgroundColor: block.color }}
                                  onClick={() => openEdit(block)}
                                >
                                  {/* Completed overlay */}
                                  {isCompleted && (
                                    <div className="absolute inset-0 bg-black/20 flex items-start justify-end p-1">
                                      <span className="bg-white/30 text-white text-[8px] font-bold px-1 py-0.5 rounded">✓ Done</span>
                                    </div>
                                  )}
                                  {/* Cancelled overlay */}
                                  {isCancelled && (
                                    <div className="absolute inset-0 bg-red-900/30 flex items-start justify-end p-1">
                                      <span className="bg-red-500/80 text-white text-[8px] font-bold px-1 py-0.5 rounded">✗ Cancelled</span>
                                    </div>
                                  )}
                                  <p className={`text-white text-xs font-bold leading-tight truncate ${isCancelled ? 'line-through' : ''}`}>{block.className}</p>
                                  <p className="text-white/70 text-[0.65rem]">{block.coach} · {block.duration}m</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-white/60 text-[0.6rem]">{block.enrolled}/{block.capacity}</span>
                                    {!block.isOpen
                                      ? <span className="text-[10px] bg-black/30 text-white/80 px-1.5 py-0.5 rounded-full">Closed</span>
                                      : <div className="w-10 h-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white/60 rounded-full" style={{ width: `${fillPct}%` }} /></div>
                                    }
                                  </div>
                                </div>
                              );
                            })}
                            <button
                              onClick={() => { setForm({ ...EMPTY_FORM, dayIndex, startHour: hour }); setEditingBlock(null); setShowModal(true); }}
                              className="w-full flex items-center justify-center rounded-xl border border-dashed border-[#D4CDB5]/60 text-[#C0B8A8] hover:text-[#c49a3c] hover:border-[#c49a3c]/40 hover:bg-[#c49a3c]/05 transition-all opacity-0 group-hover:opacity-100"
                              style={{ height: cellBlocks.length > 0 ? '24px' : '40px' }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {calendarView === 'monthly' && (
              <MonthCalendarGrid
                year={calMonth.year}
                month={calMonth.month}
                eventsByDate={monthEventsByDate}
                todayKey={todayKey}
                selectedDateKey={selectedMonthKey}
                onSelectDate={setSelectedMonthKey}
                className="rounded-none border-0 shadow-none"
              />
            )}
            </div>

            {calendarView === 'monthly' && selectedMonthDate && (
                  <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden mt-4">
                    <div className="px-5 py-4 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/60 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                          {selectedMonthDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-[#8A7E6E] text-xs mt-0.5">{selectedMonthBlocks.length} class{selectedMonthBlocks.length === 1 ? '' : 'es'} this day</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...EMPTY_FORM, dayIndex: selectedMonthDayIndex ?? 0 });
                          setEditingBlock(null);
                          setShowModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#1E2A35] text-white text-xs font-semibold hover:bg-[#263545] active:scale-95 transition-all"
                      >
                        <Plus size={13} /> Add Block
                      </button>
                    </div>
                    {selectedMonthBlocks.length === 0 ? (
                      <p className="px-5 py-8 text-center text-[#B0A898] text-sm">No classes scheduled for this weekday.</p>
                    ) : (
                      <div className="divide-y divide-[#D4CDB5]/30">
                        {selectedMonthBlocks.map(block => (
                          <button
                            key={block.id}
                            type="button"
                            onClick={() => openEdit(block)}
                            className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-[#F8F3E8]/70 transition-colors bg-transparent border-0"
                          >
                            <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: block.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[#1E2A35] text-sm font-semibold truncate">{block.className}</p>
                              <p className="text-[#8A7E6E] text-xs">{fmtHour(block.startHour)} · {block.duration}m · Coach {block.coach}</p>
                            </div>
                            <span className="text-[#8A7E6E] text-xs">{block.enrolled}/{block.capacity}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
            )}

            <p className="text-[#B0A898] text-xs mt-3 text-right">{visibleBlocks.length} schedule blocks {calendarView === 'weekly' ? 'this week' : 'this month'}</p>
          </>
        )}

        {/* ══ BOOKING REQUESTS TAB ══ */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#F8F3E8]/60">
              <div>
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}>Booking Requests</h2>
                <p className="text-[#8A7E6E] text-xs mt-0.5">Class schedule requests submitted by staff · click a row to review</p>
              </div>
              <div className="flex items-center gap-1 bg-white border border-[#D4CDB5]/60 rounded-xl p-1 w-fit">
                {([
                  ['all', 'All', scheduleReqs.length],
                  ['pending', 'Pending', pendingB],
                  ['approved', 'Approved', approvedB],
                  ['rejected', 'Rejected', rejectedB],
                ] as const).map(([id, label, count]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setReqStatusFilter(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      reqStatusFilter === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                    }`}
                  >
                    {label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      reqStatusFilter === id ? 'bg-white/20 text-white' : 'bg-[#EDE8D8] text-[#8A7E6E]'
                    }`}>{count}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40">
                  {['Class Name', 'Discipline', 'Start Time', 'End Time', 'Class Limit', 'Status'].map(h => (
                    <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                  ))}
                </div>
                {filteredScheduleReqs.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <p className="text-[#1E2A35] text-sm font-semibold">No {reqStatusFilter === 'all' ? '' : `${reqStatusFilter} `}requests</p>
                    <p className="text-[#B0A898] text-xs mt-1">
                      {reqStatusFilter === 'all'
                        ? 'Staff class schedule requests will appear here.'
                        : `Switch filters to see requests that are not ${reqStatusFilter}.`}
                    </p>
                  </div>
                ) : (
                <div className="divide-y divide-[#D4CDB5]/30">
                  {filteredScheduleReqs.map(req => (
                    <button
                      type="button"
                      key={req.id}
                      onClick={() => setSelectedReqId(req.id)}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px] w-full text-left cursor-pointer bg-transparent border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-semibold truncate">{req.className}</p>
                        <p className="text-[#B0A898] text-xs truncate">Requested by {req.staff}</p>
                      </div>
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CLASS_COLORS[req.discipline] || '#c49a3c' }} />
                        <p className="text-[#1E2A35] text-sm truncate">{req.discipline}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-medium truncate">{req.startTime}</p>
                        <p className="text-[#9A8E7E] text-xs truncate">{req.date}</p>
                      </div>
                      <p className="text-[#1E2A35] text-sm truncate">{req.endTime}</p>
                      <p className="text-[#1E2A35] text-sm">{req.classLimit} spots</p>
                      <StatusBadge s={req.status} />
                    </button>
                  ))}
                </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ CANCELLATION REQUESTS TAB ══ */}
        {activeTab === 'cancellations' && (
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex items-center justify-between bg-[#F8F3E8]/60">
              <div>
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}>Cancellation Requests</h2>
                <p className="text-[#8A7E6E] text-xs mt-0.5">Coaches requesting to cancel their scheduled classes · click a row to review</p>
              </div>
              <span className="text-[#8A7E6E] text-xs">{cancelReqs.length} total · {pendingC} pending</span>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40">
                  {['Coach', 'Class / Date', 'Notice', 'Status'].map(h => (
                    <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                  ))}
                </div>
                <div className="divide-y divide-[#D4CDB5]/30">
                  {cancelReqs.map(req => (
                    <button
                      type="button"
                      key={req.id}
                      onClick={() => setSelectedCancelId(req.id)}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px] w-full text-left cursor-pointer bg-transparent border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-semibold truncate">{req.coach}</p>
                        <p className="text-[#B0A898] text-xs truncate">{req.email}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-medium truncate">{req.className}</p>
                        <p className="text-[#9A8E7E] text-xs truncate">{req.date} · {req.time} · {req.enrolled} enrolled</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-[#9A8E7E]" />
                        <span className="text-[#5A5048] text-sm">{req.hoursUntilClass} hrs before</span>
                      </div>
                      <StatusBadge s={req.status} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Booking Request Review Modal ── */}
      {selectedReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedReqId(null); }}
        >
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-[460px] max-h-[90vh] overflow-y-auto">
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-start justify-between gap-3">
              <div>
                <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">Class schedule request</p>
                <h3 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
                  {selectedReq.className}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReqId(null)}
                className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-7 py-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[#8A7E6E] text-xs">Requested by {selectedReq.staff} · {selectedReq.submittedAt}</p>
                <StatusBadge s={selectedReq.status} />
              </div>

              {selectedReq.status === 'approved' && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                  <Check size={15} className="text-green-600 shrink-0 mt-0.5" />
                  <p className="text-green-700 text-xs leading-relaxed">This class is approved and added to the weekly schedule. You can undo this decision below.</p>
                </div>
              )}
              {selectedReq.status === 'rejected' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-xs leading-relaxed">This request was rejected and will not appear on the schedule. You can undo this decision below.</p>
                </div>
              )}
              {selectedReq.status === 'pending' && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <Clock size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-amber-700 text-xs leading-relaxed">Approve to add this class to the schedule, or reject to decline the staff request.</p>
                </div>
              )}

              <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: CLASS_COLORS[selectedReq.discipline] || '#c49a3c' }} />
                <div className="p-4 flex flex-col gap-3">
                  {[
                    ['Class Name', selectedReq.className],
                    ['Discipline', selectedReq.discipline],
                    ['Start Time', `${selectedReq.date} · ${selectedReq.startTime}`],
                    ['End Time', selectedReq.endTime],
                    ['Class Limit', `${selectedReq.classLimit} spots`],
                    ['Coach', selectedReq.coach],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-[#9A8E7E] text-xs uppercase tracking-widest">{label}</span>
                      <span className="text-[#1E2A35] text-sm font-semibold text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <ReviewActions
              status={selectedReq.status}
              onApprove={() => setRequestStatus(selectedReq.id, 'approved')}
              onReject={() => setRequestStatus(selectedReq.id, 'rejected')}
              onUndo={() => setRequestStatus(selectedReq.id, 'pending')}
            />
          </div>
        </div>
      )}

      {selectedCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedCancelId(null); }}
        >
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-[460px] max-h-[90vh] overflow-y-auto">
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-start justify-between gap-3">
              <div>
                <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">Class cancellation request</p>
                <h3 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
                  {selectedCancel.className}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCancelId(null)}
                className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-7 py-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[#8A7E6E] text-xs">Requested by {selectedCancel.coach} · {selectedCancel.requestedAt}</p>
                <StatusBadge s={selectedCancel.status} />
              </div>

              {selectedCancel.status === 'approved' && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                  <Check size={15} className="text-green-600 shrink-0 mt-0.5" />
                  <p className="text-green-700 text-xs leading-relaxed">This cancellation is approved. The class will be taken off the schedule. You can undo this decision below.</p>
                </div>
              )}
              {selectedCancel.status === 'rejected' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-xs leading-relaxed">This cancellation was rejected. The class stays on the schedule. You can undo this decision below.</p>
                </div>
              )}
              {selectedCancel.status === 'pending' && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <Clock size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-amber-700 text-xs leading-relaxed">Approve to cancel this class, or reject to keep it on the schedule.</p>
                </div>
              )}

              <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: CLASS_COLORS[selectedCancel.className] || '#c49a3c' }} />
                <div className="p-4 flex flex-col gap-3">
                  {[
                    ['Coach', selectedCancel.coach],
                    ['Class', selectedCancel.className],
                    ['Date', selectedCancel.date],
                    ['Time', selectedCancel.time],
                    ['Enrolled', `${selectedCancel.enrolled} students`],
                    ['Notice', `${selectedCancel.hoursUntilClass} hrs before class`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-[#9A8E7E] text-xs uppercase tracking-widest">{label}</span>
                      <span className="text-[#1E2A35] text-sm font-semibold text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <ReviewActions
              status={selectedCancel.status}
              onApprove={() => setCancelStatus(selectedCancel.id, 'approved')}
              onReject={() => setCancelStatus(selectedCancel.id, 'rejected')}
              onUndo={() => setCancelStatus(selectedCancel.id, 'pending')}
            />
          </div>
        </div>
      )}

      {/* ── Add / Edit side panel ── */}
      <Sheet
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <SheetContent side="right" className="bg-[#FBF9F3] border-l border-[#D4CDB5]/60 w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#D4CDB5]/50 text-left space-y-1">
            <SheetTitle
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
            >
              {editingBlock ? 'Edit Schedule Block' : 'Add Schedule Block'}
            </SheetTitle>
            <p className="text-[#8A7E6E] text-xs">
              {editingBlock
                ? `${editingBlock.className} · Coach ${editingBlock.coach}`
                : 'Create a new class block on the calendar'}
            </p>
          </SheetHeader>

          {hasConflict && (
            <div className="mx-6 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 text-sm font-semibold">Schedule Conflict Detected</p>
                <p className="text-red-600 text-xs mt-0.5">Coach <strong>{form.coach}</strong> is already assigned to a class at this day and time. Please choose a different time slot or coach.</p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <div>
              <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Class</label>
              <div className="relative">
                <select value={form.className} onChange={e => setForm(f => ({ ...f, className: e.target.value }))} className={selectClass}>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full" style={{ backgroundColor: CLASS_COLORS[form.className] }} />
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Coach</label>
              <div className="relative">
                <select value={form.coach} onChange={e => setForm(f => ({ ...f, coach: e.target.value }))} className={selectClass}>
                  {COACHES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Day</label>
                <div className="relative">
                  <select value={form.dayIndex} onChange={e => setForm(f => ({ ...f, dayIndex: Number(e.target.value) }))} className={selectClass}>
                    {WEEK_LABELS.map((d, i) => <option key={d} value={i}>{d} {formatDayShort(weekDates[i])}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Start Time</label>
                <div className="relative">
                  <select value={form.startHour} onChange={e => setForm(f => ({ ...f, startHour: Number(e.target.value) }))} className={selectClass}>
                    {HOURS.map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Duration</label>
                <div className="relative">
                  <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} className={selectClass}>
                    {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Capacity</label>
                <input type="number" min={1} max={50} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Math.max(1, Number(e.target.value)) }))} className={inputClass} />
              </div>
            </div>
            <div className="flex items-center justify-between bg-white rounded-2xl border border-[#D4CDB5]/50 px-4 py-3">
              <div>
                <p className="text-[#1E2A35] text-sm font-semibold">Schedule Status</p>
                <p className="text-[#9A8E7E] text-xs">{form.isOpen ? 'Open — accepting bookings' : 'Closed — no new bookings'}</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isOpen: !f.isOpen }))}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.isOpen ? 'bg-[#6B8E6B]' : 'bg-[#D4CDB5]'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isOpen ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            <div>
              <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Block Status</label>
              <div className="flex gap-2">
                {([
                  { value: 'upcoming',  label: 'Upcoming',  color: 'bg-[#6B8E6B]' },
                  { value: 'completed', label: 'Completed', color: 'bg-[#3A4A5A]' },
                  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-400' },
                ] as const).map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-xs font-medium ${
                      form.status === opt.value
                        ? 'bg-[#1E2A35] border-[#1E2A35] text-white'
                        : 'bg-white border-[#D4CDB5]/70 text-[#5A5048] hover:border-[#c49a3c]/40'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${form.status === opt.value ? 'border-white bg-white' : 'border-[#B0A898]'}`}>
                      {form.status === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-[#1E2A35]" />}
                    </div>
                    <input type="radio" value={opt.value} checked={form.status === opt.value} onChange={() => setForm(f => ({ ...f, status: opt.value }))} className="sr-only" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-[#D4CDB5]/50">
              <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: CLASS_COLORS[form.className] }} />
              <div>
                <p className="text-[#1E2A35] text-sm font-semibold">{form.className}</p>
                <p className="text-[#8A7E6E] text-xs">Coach {form.coach} · {WEEK_LABELS[form.dayIndex]} · {fmtHour(form.startHour)} · {form.duration} min · {form.capacity} spots · {form.isOpen ? 'Open' : 'Closed'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#D4CDB5]/50 bg-white px-6 py-4 shrink-0 flex gap-3">
            {editingBlock && (
              confirmDeleteId === editingBlock.id ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-full px-4">
                  <span className="text-red-700 text-xs font-semibold">Delete?</span>
                  <button type="button" onClick={() => handleDelete(editingBlock.id)} className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"><Check size={11} /></button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)} className="w-6 h-6 rounded-full bg-white border border-[#D4CDB5] flex items-center justify-center text-[#8A7E6E]"><X size={11} /></button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDeleteId(editingBlock.id)} className="flex items-center gap-1 px-4 py-3 bg-red-50 text-red-500 border border-red-200 rounded-full text-xs font-semibold hover:bg-red-100 transition-all">
                  <Trash2 size={13} /> Delete
                </button>
              )
            )}
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">Cancel</button>
            <button
              type="button"
              onClick={handleSave}
              disabled={hasConflict}
              className={`flex-1 py-3 rounded-full text-white shadow-sm active:scale-[0.97] transition-all ${hasConflict ? 'bg-[#8A7E6E] cursor-not-allowed' : 'bg-[#1E2A35] hover:bg-[#263545]'}`}
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
            >
              {editingBlock ? 'Save Changes' : 'Add Block'}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}