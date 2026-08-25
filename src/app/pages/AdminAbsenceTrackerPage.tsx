import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  UserX, Check, X, ChevronDown, ClipboardList,
  Calendar, Search, AlertCircle, CheckCircle,
  Clock,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  MONTH_NAMES,
  dateKeyFromOffset,
  dateKeyToDate,
  daysBetweenKeys,
  formatDateShortFromKey,
  getTodayDateKey,
  getTodayLocal,
  getWeekDatesContaining,
  toDateKey,
} from '../components/calendar/weekCalendarUtils';

// ── Types ──────────────────────────────────────────────────────

type AbsenceStatus = 'present' | 'absent';
type PeriodFilter = 'weekly' | 'monthly';

interface ScheduledClass {
  id: number;
  coach: string;
  coachInitials: string;
  coachColor: string;
  class: string;
  dateKey: string;
  date: string;
  dayLabel: string;
  time: string;
  students: number;
  capacity: number;
  status: AbsenceStatus;
  note: string;
}

// ── Mock Data ──────────────────────────────────────────────────

type ClassTemplate = Omit<ScheduledClass, 'id' | 'dateKey' | 'date' | 'dayLabel'> & { dayOffset: number };

const CLASS_TEMPLATES: ClassTemplate[] = [
  { dayOffset: 0,  coach: 'Jodi',     coachInitials: 'JO', coachColor: '#E8A87C', class: 'Yoga',         time: '8:00 AM',  students: 10, capacity: 12, status: 'present', note: '' },
  { dayOffset: 0,  coach: 'Rex',      coachInitials: 'RX', coachColor: '#5A8A7A', class: 'Calisthenics', time: '7:00 AM',  students: 8,  capacity: 10, status: 'present', note: '' },
  { dayOffset: 0,  coach: 'Ephraim',  coachInitials: 'EP', coachColor: '#7A7EBC', class: 'Animal Flow',  time: '9:00 AM',  students: 6,  capacity: 10, status: 'absent',  note: 'Called in sick morning of class' },
  { dayOffset: 0,  coach: 'Kate',     coachInitials: 'KT', coachColor: '#745b3c', class: 'Mat Pilates',  time: '9:30 AM',  students: 12, capacity: 12, status: 'present', note: '' },
  { dayOffset: 0,  coach: 'Wolf',     coachInitials: 'WF', coachColor: '#3A4A5A', class: 'Kickboxing',   time: '5:00 PM',  students: 9,  capacity: 12, status: 'present', note: '' },
  { dayOffset: 0,  coach: 'Alec',     coachInitials: 'AL', coachColor: '#A8806A', class: 'Groundworks',  time: '11:00 AM', students: 7,  capacity: 10, status: 'present', note: '' },
  { dayOffset: 1,  coach: 'Jodi',     coachInitials: 'JO', coachColor: '#E8A87C', class: 'Yoga',         time: '8:00 AM',  students: 11, capacity: 12, status: 'present', note: '' },
  { dayOffset: 1,  coach: 'Rex',      coachInitials: 'RX', coachColor: '#5A8A7A', class: 'Calisthenics', time: '7:00 AM',  students: 8,  capacity: 10, status: 'present', note: '' },
  { dayOffset: 2,  coach: 'Kate',     coachInitials: 'KT', coachColor: '#745b3c', class: 'Mat Pilates',  time: '9:30 AM',  students: 10, capacity: 12, status: 'present', note: '' },
  { dayOffset: 2,  coach: 'Ephraim',  coachInitials: 'EP', coachColor: '#7A7EBC', class: 'Animal Flow',  time: '9:00 AM',  students: 7,  capacity: 10, status: 'present', note: '' },
  { dayOffset: 3,  coach: 'Wolf',     coachInitials: 'WF', coachColor: '#3A4A5A', class: 'Kickboxing',   time: '5:00 PM',  students: 9,  capacity: 12, status: 'present', note: '' },
  { dayOffset: 3,  coach: 'Rachelle', coachInitials: 'RC', coachColor: '#B07A9E', class: 'Stretching',   time: '6:00 PM',  students: 8,  capacity: 12, status: 'present', note: '' },
  { dayOffset: -7, coach: 'Jodi',     coachInitials: 'JO', coachColor: '#E8A87C', class: 'Yoga',         time: '8:00 AM',  students: 12, capacity: 12, status: 'absent',  note: 'Emergency leave – classes covered by Rachelle' },
  { dayOffset: -3, coach: 'Rex',      coachInitials: 'RX', coachColor: '#5A8A7A', class: 'Calisthenics', time: '7:00 AM',  students: 9,  capacity: 10, status: 'present', note: '' },
  { dayOffset: -14, coach: 'Alec',    coachInitials: 'AL', coachColor: '#A8806A', class: 'Groundworks',  time: '11:00 AM', students: 6,  capacity: 10, status: 'absent',  note: 'Transport issue – notified admin' },
  { dayOffset: -18, coach: 'Kate',    coachInitials: 'KT', coachColor: '#745b3c', class: 'Mat Pilates',  time: '9:30 AM',  students: 11, capacity: 12, status: 'present', note: '' },
  { dayOffset: -21, coach: 'Wolf',    coachInitials: 'WF', coachColor: '#3A4A5A', class: 'Kickboxing',   time: '5:00 PM',  students: 8,  capacity: 12, status: 'absent',  note: 'Family emergency' },
  { dayOffset: -25, coach: 'Ephraim', coachInitials: 'EP', coachColor: '#7A7EBC', class: 'Animal Flow',  time: '9:00 AM',  students: 5,  capacity: 10, status: 'present', note: '' },
];

function dayLabelFromKey(dateKey: string): string {
  const diff = daysBetweenKeys(getTodayDateKey(), dateKey);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return dateKeyToDate(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildInitialClasses(): ScheduledClass[] {
  return CLASS_TEMPLATES.map((template, index) => {
    const { dayOffset, ...rest } = template;
    const dateKey = dateKeyFromOffset(dayOffset);
    return {
      id: index + 1,
      dateKey,
      date: formatDateShortFromKey(dateKey),
      dayLabel: dayLabelFromKey(dateKey),
      ...rest,
    };
  });
}

function isInCurrentWeek(dateKey: string): boolean {
  const weekKeys = new Set(getWeekDatesContaining(getTodayLocal()).map(toDateKey));
  return weekKeys.has(dateKey);
}

function isInCurrentMonth(dateKey: string): boolean {
  const d = dateKeyToDate(dateKey);
  const today = getTodayLocal();
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
}

function periodLabel(period: PeriodFilter): string {
  const today = getTodayLocal();
  if (period === 'weekly') {
    const weekDates = getWeekDatesContaining(today);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = weekDates[0].toLocaleDateString('en-US', opts);
    const end = weekDates[6].toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    return `${start} – ${end}`;
  }
  return `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
}

function filterByPeriod(classes: ScheduledClass[], period: PeriodFilter): ScheduledClass[] {
  return classes.filter((c) => (period === 'weekly' ? isInCurrentWeek(c.dateKey) : isInCurrentMonth(c.dateKey)));
}

// ── Absence Note Modal ─────────────────────────────────────────

function AbsenceModal({ item, onClose, onSave }: {
  item: ScheduledClass;
  onClose: () => void;
  onSave: (id: number, status: AbsenceStatus, note: string) => void;
}) {
  const [note, setNote] = useState(item.note);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Record Absence</p>
            <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
              {item.coach} · {item.class}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
        </div>
        <div className="px-7 py-6 flex flex-col gap-5">
          <div className="bg-[#F8F3E8] rounded-2xl p-4 border border-[#D4CDB5]/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: item.coachColor + '20' }}>
              <span className="text-xs font-bold" style={{ color: item.coachColor }}>{item.coachInitials}</span>
            </div>
            <div>
              <p className="text-[#1E2A35] text-sm font-semibold">{item.class}</p>
              <p className="text-[#9A8E7E] text-xs">{item.date} · {item.time} · {item.students}/{item.capacity} students</p>
            </div>
          </div>

          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Reason / Notes</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Called in sick, family emergency…"
              className="w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all resize-none placeholder-[#C0B8A8]"
            />
          </div>
        </div>
        <div className="px-7 pb-7 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">Cancel</button>
          <button
            onClick={() => { onSave(item.id, 'absent', note); onClose(); }}
            className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm flex items-center justify-center gap-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}>
            <Check size={14} /> Save Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Coach Summary ──────────────────────────────────────────────

function CoachAbsenceSummary({ classes, period }: { classes: ScheduledClass[]; period: PeriodFilter }) {
  const coaches = [...new Set(classes.map((c) => c.coach))];

  return (
    <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden mb-7">
      <div className="px-6 py-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardList size={15} className="text-[#745b3c]" />
          <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}>Coach Attendance Summary</h2>
        </div>
        <span className="text-[#9A8E7E] text-xs">{periodLabel(period)}</span>
      </div>
      {coaches.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-[#B0A898] text-sm">No sessions in this {period === 'weekly' ? 'week' : 'month'}.</p>
        </div>
      ) : (
        <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {coaches.map((coach) => {
            const coachClasses = classes.filter((c) => c.coach === coach);
            const absentCount = coachClasses.filter((c) => c.status === 'absent').length;
            const presentCount = coachClasses.filter((c) => c.status === 'present').length;
            const info = coachClasses[0];
            return (
              <div key={coach} className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 p-3 text-center">
                <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-2" style={{ backgroundColor: info.coachColor + '25' }}>
                  <span className="text-xs font-bold" style={{ color: info.coachColor }}>{info.coachInitials}</span>
                </div>
                <p className="text-[#1E2A35] text-xs font-semibold truncate">{coach}</p>
                <p className="text-[#9A8E7E] text-[10px] mt-0.5">{coachClasses.length} classes</p>
                <div className="mt-2 flex flex-col gap-1">
                  {absentCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full">{absentCount} absent</span>
                  )}
                  {presentCount > 0 && absentCount === 0 && (
                    <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">All present</span>
                  )}
                  {presentCount > 0 && absentCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">{presentCount} present</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Panel (embeddable in Coaches Management tabs) ─────────

export function AdminAbsenceTrackerPanel() {
  const [classes, setClasses] = useState<ScheduledClass[]>(buildInitialClasses);
  const [search, setSearch] = useState('');
  const [filterCoach, setFilterCoach] = useState('All');
  const [filterStatus, setFilterStatus] = useState<'all' | AbsenceStatus>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('weekly');
  const [activeModal, setActiveModal] = useState<ScheduledClass | null>(null);
  const [showCoachFilter, setShowCoachFilter] = useState(false);

  const periodClasses = useMemo(
    () => filterByPeriod(classes, periodFilter),
    [classes, periodFilter],
  );

  const coaches = ['All', ...Array.from(new Set(periodClasses.map((c) => c.coach)))];

  const filtered = periodClasses.filter((c) => {
    const matchSearch = c.coach.toLowerCase().includes(search.toLowerCase()) ||
      c.class.toLowerCase().includes(search.toLowerCase()) ||
      c.date.toLowerCase().includes(search.toLowerCase());
    const matchCoach = filterCoach === 'All' || c.coach === filterCoach;
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchCoach && matchStatus;
  });

  const handleSave = (id: number, status: AbsenceStatus, note: string) => {
    setClasses((prev) => prev.map((c) =>
      c.id === id ? { ...c, status, note } : c,
    ));
  };

  const INP = 'w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all placeholder-[#C0B8A8]';

  return (
    <>
      {activeModal && (
        <AbsenceModal
          item={activeModal}
          onClose={() => setActiveModal(null)}
          onSave={handleSave}
        />
      )}

      <p className="text-[#8A7E6E] text-sm mb-5">Mark coaches absent for scheduled sessions and review attendance by week or month.</p>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-[#9A8E7E] text-xs uppercase tracking-widest">View by</p>
        <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm">
          {([['weekly', 'Weekly'], ['monthly', 'Monthly']] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setPeriodFilter(val)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                periodFilter === val ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <CoachAbsenceSummary classes={periodClasses} period={periodFilter} />

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A898]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coach, class, date…" className={INP} />
        </div>
        <div className="relative">
          <button onClick={() => setShowCoachFilter((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#5A5048] text-sm font-medium hover:bg-[#EDE8D8] transition-all shadow-sm">
            {filterCoach} <ChevronDown size={14} className={`transition-transform ${showCoachFilter ? 'rotate-180' : ''}`} />
          </button>
          {showCoachFilter && (
            <div className="absolute top-full mt-1 left-0 bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-lg z-20 min-w-32 overflow-hidden">
              {coaches.map((c) => (
                <button key={c} onClick={() => { setFilterCoach(c); setShowCoachFilter(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${filterCoach === c ? 'bg-[#1E2A35] text-white' : 'text-[#5A5048] hover:bg-[#F8F3E8]'}`}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm">
          {([['all', 'All'], ['present', 'Present'], ['absent', 'Absent']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterStatus === val ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_160px] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
          {['Coach', 'Class / Date', 'Time', 'Students', 'Status', 'Notes', 'Actions'].map((h) => (
            <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Calendar size={24} className="mx-auto text-[#D4CDB5] mb-3" />
            <p className="text-[#B0A898] text-sm">No classes found for this {periodFilter === 'weekly' ? 'week' : 'month'}.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#D4CDB5]/30">
            {filtered.map((c) => (
              <div key={c.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_160px] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/40 transition-colors min-h-[64px]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: c.coachColor + '25' }}>
                    <span className="text-xs font-bold" style={{ color: c.coachColor }}>{c.coachInitials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#1E2A35] text-sm font-semibold truncate">{c.coach}</p>
                    <p className="text-[#B0A898] text-xs">{c.dayLabel}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[#1E2A35] text-sm font-medium truncate">{c.class}</p>
                  <p className="text-[#9A8E7E] text-xs">{c.date}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-[#B0A898]" />
                  <span className="text-[#5A5048] text-sm">{c.time}</span>
                </div>
                <p className="text-[#5A5048] text-sm">{c.students}<span className="text-[#B0A898]">/{c.capacity}</span></p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit border flex items-center gap-1 ${
                  c.status === 'present'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                  {c.status === 'present'
                    ? <><CheckCircle size={10} /> Present</>
                    : <><UserX size={10} /> Absent</>}
                </span>
                <p className="text-[#9A8E7E] text-xs truncate">{c.note || '—'}</p>
                <div className="flex items-center gap-1 w-[160px]">
                  <button
                    onClick={() => setActiveModal(c)}
                    className={`h-7 px-2.5 border text-xs font-medium rounded-lg active:scale-95 transition-all whitespace-nowrap ${
                      c.status === 'present'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 flex items-center gap-1'
                        : 'bg-[#F8F3E8] text-[#5A5048] border-[#D4CDB5]/60 hover:bg-[#EDE8D8]'
                    }`}
                  >
                    {c.status === 'present' ? <><AlertCircle size={11} /> Mark</> : 'Edit'}
                  </button>
                  {c.status !== 'present' && (
                    <button
                      onClick={() => handleSave(c.id, 'present', '')}
                      className="h-7 px-2.5 bg-green-50 text-green-700 border border-green-200 text-xs font-medium rounded-lg hover:bg-green-100 active:scale-95 transition-all whitespace-nowrap"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[#B0A898] text-xs mt-4 text-right">
        {filtered.length} session{filtered.length !== 1 ? 's' : ''} shown · {periodLabel(periodFilter)}
      </p>
    </>
  );
}

export default function AdminAbsenceTrackerPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
    else navigate('/admin-coaches?tab=absence', { replace: true });
  }, [adminUser, navigate]);

  return null;
}
