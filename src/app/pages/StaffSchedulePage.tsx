import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Check,
  Clock, Users, CheckCircle2, CalendarDays, Plus,
  X, AlertCircle,
} from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';

// ── Constants ──────────────────────────────────────────────────

const CLASS_TYPES = [
  'Yoga', 'Calisthenics', 'Animal Flow', 'Groundworks',
  'Circuit Training', 'Mat Pilates', 'Kickboxing', 'Capoeira', 'Personal Coaching',
];
const COACHES   = ['Rex Santos', 'Jodi Reyes', 'Kate Mercado', 'Ephraim Cruz', 'Wolf Andrada', 'Alec Navarro', 'Rachelle Lim'];
const TIME_SLOTS = ['6:00 AM','7:00 AM','7:30 AM','8:00 AM','9:00 AM','9:30 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','5:30 PM','6:00 PM','7:00 PM'];
const DURATIONS  = ['45 min','60 min','75 min','90 min'];
const CLASS_COLORS: Record<string, string> = {
  'Yoga': '#C49A3C', 'Calisthenics': '#3A4A5A', 'Animal Flow': '#6B8E6B',
  'Groundworks': '#8B6F5A', 'Circuit Training': '#B86A4A', 'Mat Pilates': '#9A7A8A',
  'Kickboxing': '#7A3A4A', 'Capoeira': '#A07050', 'Personal Coaching': '#A67E2A',
};
const SCHEDULED_DATES = new Set(['2026-04-13','2026-04-14','2026-04-15','2026-04-16','2026-04-17','2026-04-18','2026-04-19','2026-04-21','2026-04-22','2026-04-23','2026-04-25','2026-04-28','2026-04-29','2026-04-30']);
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ── Approved schedule (all studio classes for the week) ────────

const APPROVED_SCHEDULE = [
  { id: 1,  day: 'Mon, Apr 13', className: 'Yoga',            time: '8:00 AM',  trainer: 'Jodi',     enrolled: 11, capacity: 15, isOpen: true  },
  { id: 2,  day: 'Mon, Apr 13', className: 'Mat Pilates',      time: '10:00 AM', trainer: 'Kate',     enrolled: 8,  capacity: 12, isOpen: true  },
  { id: 3,  day: 'Mon, Apr 13', className: 'Calisthenics',     time: '6:00 PM',  trainer: 'Rex',      enrolled: 6,  capacity: 12, isOpen: true  },
  { id: 4,  day: 'Tue, Apr 14', className: 'Animal Flow',      time: '9:00 AM',  trainer: 'Ephraim',  enrolled: 10, capacity: 12, isOpen: true  },
  { id: 5,  day: 'Tue, Apr 14', className: 'Kickboxing',       time: '5:00 PM',  trainer: 'Wolf',     enrolled: 10, capacity: 10, isOpen: false },
  { id: 6,  day: 'Wed, Apr 15', className: 'Mat Pilates',      time: '9:00 AM',  trainer: 'Kate',     enrolled: 5,  capacity: 12, isOpen: true  },
  { id: 7,  day: 'Wed, Apr 15', className: 'Circuit Training', time: '4:00 PM',  trainer: 'Rachelle', enrolled: 12, capacity: 15, isOpen: true  },
  { id: 8,  day: 'Thu, Apr 16', className: 'Yoga',             time: '8:00 AM',  trainer: 'Jodi',     enrolled: 9,  capacity: 15, isOpen: true  },
  { id: 9,  day: 'Fri, Apr 17', className: 'Groundworks',      time: '10:00 AM', trainer: 'Alec',     enrolled: 4,  capacity: 10, isOpen: true  },
  { id: 10, day: 'Sat, Apr 18', className: 'Capoeira',         time: '9:00 AM',  trainer: 'Alec',     enrolled: 7,  capacity: 10, isOpen: true  },
  { id: 11, day: 'Sun, Apr 19', className: 'Personal Coaching',time: '10:00 AM', trainer: 'Rex',      enrolled: 2,  capacity: 4,  isOpen: true  },
];

const ENROLLED_BY_CLASS: Record<number, { name: string; membership: string }[]> = {
  1:  [{ name: 'Alex Johnson', membership: 'Gold' }, { name: 'Sofia Reyes', membership: 'Gold' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Maria Santos', membership: 'Silver' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Pia Villanueva', membership: 'Gold' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Camille Cruz', membership: 'Silver' }, { name: 'Jan Corpus', membership: 'Silver' }, { name: 'Lea Mendoza', membership: 'Single Pass' }, { name: 'Cris Dela Cruz', membership: 'Single Pass' }],
  2:  [{ name: 'Maria Santos', membership: 'Silver' }, { name: 'Camille Cruz', membership: 'Silver' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Sofia Reyes', membership: 'Gold' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Alex Johnson', membership: 'Gold' }, { name: 'Jan Corpus', membership: 'Silver' }, { name: 'Lea Mendoza', membership: 'Single Pass' }],
  3:  [{ name: 'Cris Dela Cruz', membership: 'Single Pass' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Pia Villanueva', membership: 'Gold' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Jan Corpus', membership: 'Silver' }, { name: 'Alex Johnson', membership: 'Gold' }],
  4:  [{ name: 'Sofia Reyes', membership: 'Gold' }, { name: 'Pia Villanueva', membership: 'Gold' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Camille Cruz', membership: 'Silver' }, { name: 'Alex Johnson', membership: 'Gold' }, { name: 'Maria Santos', membership: 'Silver' }, { name: 'Jan Corpus', membership: 'Silver' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Cris Dela Cruz', membership: 'Single Pass' }],
  5:  [{ name: 'Alex Johnson', membership: 'Gold' }, { name: 'Maria Santos', membership: 'Silver' }, { name: 'Cris Dela Cruz', membership: 'Single Pass' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Pia Villanueva', membership: 'Gold' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Camille Cruz', membership: 'Silver' }, { name: 'Jan Corpus', membership: 'Silver' }, { name: 'Sofia Reyes', membership: 'Gold' }],
  6:  [{ name: 'Lea Mendoza', membership: 'Single Pass' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Alex Johnson', membership: 'Gold' }, { name: 'Sofia Reyes', membership: 'Gold' }, { name: 'Camille Cruz', membership: 'Silver' }],
  7:  [{ name: 'Lea Mendoza', membership: 'Single Pass' }, { name: 'Alex Johnson', membership: 'Gold' }, { name: 'Sofia Reyes', membership: 'Gold' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Maria Santos', membership: 'Silver' }, { name: 'Camille Cruz', membership: 'Silver' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Jan Corpus', membership: 'Silver' }, { name: 'Cris Dela Cruz', membership: 'Single Pass' }, { name: 'Pia Villanueva', membership: 'Gold' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Diego Tan', membership: 'Single Pass' }],
  8:  [{ name: 'Alex Johnson', membership: 'Gold' }, { name: 'Maria Santos', membership: 'Silver' }, { name: 'Sofia Reyes', membership: 'Gold' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Jan Corpus', membership: 'Silver' }, { name: 'Lea Mendoza', membership: 'Single Pass' }, { name: 'Camille Cruz', membership: 'Silver' }],
  9:  [{ name: 'Pia Villanueva', membership: 'Gold' }, { name: 'Camille Cruz', membership: 'Silver' }, { name: 'Cris Dela Cruz', membership: 'Single Pass' }, { name: 'Diego Tan', membership: 'Single Pass' }],
  10: [{ name: 'Alex Johnson', membership: 'Gold' }, { name: 'Sofia Reyes', membership: 'Gold' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Maria Santos', membership: 'Silver' }, { name: 'Jan Corpus', membership: 'Silver' }],
  11: [{ name: 'Alex Johnson', membership: 'Gold' }, { name: 'Pia Villanueva', membership: 'Gold' }],
};

const MEMBERSHIP_COLOR: Record<string, string> = {
  'Gold': 'bg-[#C49A3C]/12 text-[#A67E2A] border-[#C49A3C]/30',
  'Silver': 'bg-[#8A7E6E]/10 text-[#5A5048] border-[#8A7E6E]/20',
  'Single Pass': 'bg-[#EDE8D8] text-[#7A6A52] border-[#D4CDB5]/60',
};

// ── Helpers ────────────────────────────────────────────────────

function buildGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = [];
  for (let i = 0; i < first; i++) grid.push(null);
  for (let d = 1; d <= days; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}
const toKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const formatDateFull = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};
const formatDateShort = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// Group approved schedule by day
const DAYS_ORDER = ['Mon, Apr 13','Tue, Apr 14','Wed, Apr 15','Thu, Apr 16','Fri, Apr 17','Sat, Apr 18','Sun, Apr 19'];

// ── Enrolled Students Modal ────────────────────────────────────

function EnrolledModal({ cls, onClose }: { cls: typeof APPROVED_SCHEDULE[0]; onClose: () => void }) {
  const students = ENROLLED_BY_CLASS[cls.id] ?? [];
  const color    = CLASS_COLORS[cls.className] || '#C49A3C';
  const fillPct  = Math.round((cls.enrolled / cls.capacity) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-[#D4CDB5]/50 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <div>
                <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.05em' }}>{cls.className}</h3>
                <p className="text-[#8A7E6E] text-xs">{cls.day} · {cls.time} · Coach {cls.trainer}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0"><X size={16} /></button>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              !cls.isOpen ? 'bg-[#EDE8D8] text-[#8A7E6E] border-[#D4CDB5]/60' :
              cls.enrolled >= cls.capacity ? 'bg-red-50 text-red-600 border-red-200' :
              fillPct >= 80 ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-green-50 text-green-700 border-green-200'
            }`}>
              {!cls.isOpen ? 'Closed' : cls.enrolled >= cls.capacity ? 'Fully Booked' : fillPct >= 80 ? 'Almost Full' : 'Open'}
            </span>
            <span className="text-[#8A7E6E] text-xs">{cls.enrolled}/{cls.capacity} enrolled</span>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-3">
          <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Enrolled Students</p>
          {students.length === 0 ? (
            <p className="text-[#B0A898] text-sm text-center py-6">No students enrolled yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {students.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-[#F8F3E8] rounded-xl border border-[#D4CDB5]/40 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#1E2A35]/08 border border-[#1E2A35]/12 flex items-center justify-center">
                      <span className="text-[#1E2A35] text-[10px] font-bold">{s.name.split(' ').map(n => n[0]).join('').slice(0,2)}</span>
                    </div>
                    <span className="text-[#1E2A35] text-sm font-medium">{s.name}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${MEMBERSHIP_COLOR[s.membership]}`}>{s.membership}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step Bar (for Request Block tab) ──────────────────────────

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Pick Date','Class Details','Submitted'];
  return (
    <div className="hidden md:flex items-center gap-0">
      {steps.map((label, i) => {
        const num = i + 1; const isActive = num === step; const isDone = num < step;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${isDone ? 'bg-[#1E2A35] text-white' : isActive ? 'bg-[#1E2A35] text-white shadow-[0_0_0_3px_rgba(30,42,53,0.15)]' : 'bg-[#EDE8D8] text-[#9A8E7E]'}`} style={{ fontSize: '0.7rem', fontFamily: "'Bebas Neue', sans-serif" }}>
                {isDone ? <Check size={13} strokeWidth={3} /> : num}
              </div>
              <span className={`text-[10px] mt-1 whitespace-nowrap ${isActive ? 'text-[#1E2A35]' : 'text-[#B0A898]'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={`w-14 h-px mx-1.5 mb-4 ${isDone ? 'bg-[#1E2A35]' : 'bg-[#D4CDB5]'}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function StaffSchedulePage() {
  const navigate = useNavigate();
  const { staffUser } = useStaffAuth();

  const [activeTab, setActiveTab] = useState<'approved' | 'myclasses' | 'request'>('approved');

  // Enrolled modal
  const [viewingClass, setViewingClass] = useState<typeof APPROVED_SCHEDULE[0] | null>(null);

  // Cancel request state
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  interface CancelReq { id: number; className: string; day: string; time: string; reason: string; status: 'pending' | 'approved' | 'rejected' }
  const [cancelRequests, setCancelRequests] = useState<CancelReq[]>([]);

  // Request block form state
  const TODAY_KEY = '2026-04-13';
  const [calYear, setCalYear]   = useState(2026);
  const [calMonth, setCalMonth] = useState(3);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [classType, setClassType]   = useState('');
  const [coach, setCoach]           = useState(staffUser?.name || '');
  const [time, setTime]             = useState('');
  const [duration, setDuration]     = useState('60 min');
  const [maxSpots, setMaxSpots]     = useState('12');
  const [notes, setNotes]           = useState('');
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [submitted, setSubmitted]   = useState(false);
  const [scheduledSet, setScheduledSet] = useState(new Set(SCHEDULED_DATES));

  useEffect(() => { if (!staffUser) navigate('/staff-login'); }, [staffUser, navigate]);
  if (!staffUser) return null;

  const grid = buildGrid(calYear, calMonth);
  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11); } else setCalMonth(m => m-1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0); } else setCalMonth(m => m+1); };

  const handleDateSelect = (key: string) => { setSelectedDate(key); setSubmitted(false); setErrors({}); setClassType(''); setTime(''); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!classType) e.classType = 'Please select a class type.';
    if (!time) e.time = 'Please select a time slot.';
    if (!coach.trim()) e.coach = 'Please assign a coach.';
    if (!maxSpots || isNaN(Number(maxSpots)) || Number(maxSpots) < 1) e.maxSpots = 'Enter a valid number.';
    setErrors(e); return Object.keys(e).length === 0;
  };
  const handleSubmit = () => {
    if (!validate() || !selectedDate) return;
    setScheduledSet(prev => new Set([...prev, selectedDate]));
    setSubmitted(true);
  };
  const handleScheduleAnother = () => { setSubmitted(false); setClassType(''); setTime(''); setDuration('60 min'); setMaxSpots('12'); setNotes(''); setErrors({}); };
  const classColor = CLASS_COLORS[classType] || '#1E2A35';

  const submitCancellation = () => {
    if (!cancelReason.trim()) { setCancelError('Please provide a reason.'); return; }
    const cls = APPROVED_SCHEDULE.find(c => c.id === cancellingId);
    if (!cls) return;
    setCancelRequests(prev => [...prev, { id: cancellingId!, className: cls.className, day: cls.day, time: cls.time, reason: cancelReason, status: 'pending' }]);
    setCancellingId(null); setCancelReason(''); setCancelError('');
  };

  // Grouped days for Approved Schedule tab
  const classesByDay = DAYS_ORDER.map(day => ({
    day, classes: APPROVED_SCHEDULE.filter(c => c.day === day),
  })).filter(g => g.classes.length > 0);

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {viewingClass && <EnrolledModal cls={viewingClass} onClose={() => setViewingClass(null)} />}

      {/* Cancel Reason Modal */}
      {cancellingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md">
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
              <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.05em' }}>Request Cancellation</h3>
              <button onClick={() => { setCancellingId(null); setCancelReason(''); setCancelError(''); }} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
            </div>
            <div className="px-7 py-6 flex flex-col gap-4">
              {(() => { const cls = APPROVED_SCHEDULE.find(c => c.id === cancellingId); return cls ? (
                <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 px-4 py-3">
                  <p className="text-[#1E2A35] text-sm font-semibold">{cls.className}</p>
                  <p className="text-[#8A7E6E] text-xs">{cls.day} · {cls.time} · Coach {cls.trainer}</p>
                </div>
              ) : null; })()}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-amber-700 text-xs leading-relaxed">Cancellation requests require admin approval before taking effect.</p>
              </div>
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Reason for Cancellation <span className="text-red-400">*</span></label>
                <textarea
                  value={cancelReason}
                  onChange={e => { setCancelReason(e.target.value); setCancelError(''); }}
                  rows={3}
                  placeholder="Describe why you need to cancel this class…"
                  className="w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-sm text-[#1E2A35] placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-[#C49A3C]/25 transition-all resize-none"
                />
                {cancelError && <p className="text-red-500 text-xs mt-1">{cancelError}</p>}
              </div>
            </div>
            <div className="px-7 pb-7 flex gap-3">
              <button onClick={() => { setCancellingId(null); setCancelReason(''); setCancelError(''); }} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">Cancel</button>
              <button onClick={submitCancellation} className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-8">

        {/* ── Header ── */}
        <div className="pt-6 pb-5 border-b border-[#D4CDB5]/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/staff-dashboard')}
              className="w-10 h-10 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: '0.05em' }}>
                Staff Calendar
              </h1>
              <p className="text-[#8A7E6E] text-xs mt-0.5">View schedule · request blocks · manage cancellations</p>
            </div>
          </div>
          {activeTab === 'request' && <StepBar step={!selectedDate ? 1 : submitted ? 3 : 2} />}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm my-5 w-fit">
          {([
            ['approved',  'Approved Schedule'],
            ['myclasses', 'My Classes'],
            ['request',   'Request Block'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ══ APPROVED SCHEDULE TAB ══ */}
        {activeTab === 'approved' && (
          <div className="pb-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">Week of Apr 13 – Apr 19, 2026</p>
              <p className="text-[#B0A898] text-xs">{APPROVED_SCHEDULE.length} approved blocks · tap to view students</p>
            </div>
            {classesByDay.map(({ day, classes }) => (
              <div key={day} className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/60">
                  <p className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.06em' }}>{day}</p>
                </div>
                <div className="divide-y divide-[#D4CDB5]/30">
                  {classes.map(cls => {
                    const color   = CLASS_COLORS[cls.className] || '#C49A3C';
                    const fillPct = Math.round((cls.enrolled / cls.capacity) * 100);
                    const isFull  = cls.enrolled >= cls.capacity;
                    return (
                      <button
                        key={cls.id}
                        onClick={() => setViewingClass(cls)}
                        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8F3E8]/70 transition-colors group text-left"
                      >
                        <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="w-20 shrink-0">
                          <p className="text-[#1E2A35] text-sm font-semibold">{cls.time}</p>
                          <p className="text-[#8A7E6E] text-xs">{cls.enrolled}/{cls.capacity}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[#1E2A35] text-sm font-semibold">{cls.className}</p>
                          <p className="text-[#8A7E6E] text-xs">Coach {cls.trainer}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            !cls.isOpen ? 'bg-[#EDE8D8] text-[#8A7E6E] border-[#D4CDB5]/60' :
                            isFull ? 'bg-red-50 text-red-600 border-red-200' :
                            fillPct >= 80 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {!cls.isOpen ? 'Closed' : isFull ? 'Full' : fillPct >= 80 ? 'Almost Full' : 'Open'}
                          </span>
                          <div className="flex items-center gap-1 text-[#B0A898] group-hover:text-[#C49A3C] transition-colors">
                            <Users size={13} />
                            <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ MY CLASSES TAB ══ */}
        {activeTab === 'myclasses' && (
          <div className="pb-10 flex flex-col gap-4">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">Your assigned classes this week · Apr 13–19</p>

            {/* Assigned classes (using a filtered subset for demo) */}
            {APPROVED_SCHEDULE.filter(c => ['Yoga','Calisthenics','Mat Pilates','Animal Flow','Kickboxing','Circuit Training','Groundworks','Capoeira','Personal Coaching'].includes(c.className)).slice(0, 6).map(cls => {
              const color   = CLASS_COLORS[cls.className] || '#C49A3C';
              const fillPct = Math.round((cls.enrolled / cls.capacity) * 100);
              const hasReq  = cancelRequests.some(r => r.id === cls.id);
              return (
                <div key={cls.id} className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="w-1.5 h-14 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1E2A35] font-semibold" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.04em' }}>{cls.className}</p>
                      <p className="text-[#8A7E6E] text-xs">{cls.day} · {cls.time} · Coach {cls.trainer}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[#5A5048] text-xs">{cls.enrolled}/{cls.capacity} enrolled</span>
                        <div className="w-20 h-1 bg-[#EDE8D8] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${fillPct}%`, backgroundColor: color }} />
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          !cls.isOpen ? 'bg-[#EDE8D8] text-[#8A7E6E] border-[#D4CDB5]/60' :
                          cls.enrolled >= cls.capacity ? 'bg-red-50 text-red-600 border-red-200' :
                          fillPct >= 80 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {!cls.isOpen ? 'Closed' : cls.enrolled >= cls.capacity ? 'Full' : fillPct >= 80 ? 'Almost Full' : 'Open'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setViewingClass(cls)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#EDE8D8] text-[#5A5048] text-xs font-semibold rounded-xl hover:bg-[#E3DCC8] active:scale-95 transition-all"
                      >
                        <Users size={13} /> Students
                      </button>
                      {hasReq ? (
                        <span className="text-xs font-bold px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">Cancel Pending</span>
                      ) : (
                        <button
                          onClick={() => { setCancellingId(cls.id); setCancelReason(''); setCancelError(''); }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-xl hover:bg-red-100 active:scale-95 transition-all"
                        >
                          <X size={13} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Submitted cancellation requests */}
            {cancelRequests.length > 0 && (
              <div className="bg-white rounded-3xl border border-amber-200/60 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/40 flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-600" />
                  <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}>Submitted Cancellation Requests</h2>
                </div>
                <div className="divide-y divide-[#D4CDB5]/30">
                  {cancelRequests.map((req, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: CLASS_COLORS[req.className] || '#C49A3C' }} />
                      <div className="flex-1">
                        <p className="text-[#1E2A35] text-sm font-semibold">{req.className}</p>
                        <p className="text-[#8A7E6E] text-xs">{req.day} · {req.time}</p>
                        <p className="text-[#9A8E7E] text-xs mt-0.5 italic">"{req.reason}"</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ REQUEST BLOCK TAB ══ */}
        {activeTab === 'request' && (
          <div className="py-2 pb-10 flex gap-6 items-start">

            {/* LEFT: Calendar */}
            <div className="w-72 shrink-0">
              <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5 sticky top-6">
                <div className="flex items-center justify-between mb-5">
                  <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"><ChevronLeft size={15} /></button>
                  <span className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.1em' }}>{MONTH_NAMES[calMonth]} {calYear}</span>
                  <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all"><ChevronRight size={15} /></button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {DAY_LABELS.map(d => (
                    <div key={d} className="text-center text-[#B0A898] py-1" style={{ fontSize: '0.62rem', letterSpacing: '0.08em', fontFamily: "'Bebas Neue', sans-serif" }}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-0.5">
                  {grid.map((day, idx) => {
                    if (!day) return <div key={`e-${idx}`} />;
                    const key = toKey(calYear, calMonth, day);
                    const isSelected = key === selectedDate;
                    const isToday    = key === TODAY_KEY;
                    const isScheduled = scheduledSet.has(key);
                    return (
                      <button key={key} onClick={() => handleDateSelect(key)} className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 mx-0.5 transition-all ${isSelected ? 'bg-[#1E2A35] text-white shadow-[0_3px_12px_rgba(30,42,53,0.3)]' : isToday ? 'bg-[#C49A3C]/12 text-[#A67E2A]' : 'text-[#1E2A35] hover:bg-[#F0EBE0] cursor-pointer'}`}>
                        <span className="text-sm leading-none mb-1">{day}</span>
                        {isScheduled && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/60' : 'bg-[#C49A3C]'}`} />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-[#D4CDB5]/40 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#C49A3C]" /><span className="text-[#9A8E7E]" style={{ fontSize: '0.68rem' }}>Has scheduled classes</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#1E2A35] flex items-center justify-center shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-white" /></div><span className="text-[#9A8E7E]" style={{ fontSize: '0.68rem' }}>Selected date</span></div>
                </div>
              </div>
            </div>

            {/* RIGHT: Form panel */}
            <div className="flex-1">
              {!selectedDate && (
                <div className="flex flex-col items-center justify-center py-28 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-white border border-[#D4CDB5]/60 flex items-center justify-center mb-4 shadow-sm"><CalendarDays size={26} className="text-[#1E2A35]/40" /></div>
                  <h3 className="text-[#1E2A35] mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>Select a Date</h3>
                  <p className="text-[#8A7E6E] text-sm max-w-xs leading-relaxed">Choose a date on the calendar to request a new schedule block.</p>
                </div>
              )}

              {selectedDate && submitted && (
                <div className="flex flex-col items-center text-center py-10">
                  <div className="w-20 h-20 rounded-full bg-[#1E2A35]/08 border-2 border-[#1E2A35]/20 flex items-center justify-center mb-5"><CheckCircle2 size={36} className="text-[#1E2A35]" /></div>
                  <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider">
                    <Clock size={11} /> Request Submitted
                  </span>
                  <h2 className="text-[#1E2A35] leading-none mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.04em' }}>{classType}</h2>
                  <p className="text-[#8A7E6E] text-sm mb-2">{formatDateShort(selectedDate)} · {time} · {duration} · Coach {coach}</p>
                  <p className="text-[#9A8E7E] text-xs mb-6 max-w-xs leading-relaxed">Your request has been submitted for admin review. It will appear on the schedule once approved.</p>
                  <div className="w-full max-w-sm bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden text-left mb-6">
                    <div className="h-1.5" style={{ backgroundColor: classColor }} />
                    <div className="p-5 flex flex-col gap-3">
                      {[['Date', formatDateFull(selectedDate)],['Time', time],['Duration', duration],['Coach', coach],['Capacity', `${maxSpots} students`]].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-[#9A8E7E] text-xs uppercase tracking-widest">{label}</span>
                          <span className="text-[#1E2A35] text-sm font-semibold">{value}</span>
                        </div>
                      ))}
                      {notes && (
                        <div className="pt-2 border-t border-[#D4CDB5]/40">
                          <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">Notes</p>
                          <p className="text-[#5A5048] text-sm">{notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleScheduleAnother} className="flex items-center gap-2 bg-[#1E2A35] text-white rounded-full px-6 py-3 text-sm hover:bg-[#263545] transition-all active:scale-[0.97]" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}>
                      <Plus size={15} /> Request Another
                    </button>
                    <button onClick={() => navigate('/staff-dashboard')} className="flex items-center gap-2 bg-white border border-[#D4CDB5]/70 text-[#1E2A35] rounded-full px-6 py-3 text-sm hover:border-[#C49A3C]/40 hover:bg-[#F8F3E8] transition-all active:scale-[0.97]" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}>
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              )}

              {selectedDate && !submitted && (
                <div className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em' }}>{formatDateFull(selectedDate)}</h2>
                    <p className="text-[#8A7E6E] text-xs mt-1">Fill in the class details below — this will be sent to admin for approval</p>
                  </div>

                  {/* Class Type */}
                  <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
                    <p className="text-[#1E2A35] mb-3" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.06em' }}>Class Type</p>
                    <div className="grid grid-cols-3 gap-2">
                      {CLASS_TYPES.map(ct => {
                        const c = CLASS_COLORS[ct]; const isSelected = classType === ct;
                        return (
                          <button key={ct} onClick={() => { setClassType(ct); setErrors(e => ({ ...e, classType: '' })); }} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left border-2 transition-all ${isSelected ? 'border-transparent text-white' : 'border-[#D4CDB5]/60 bg-[#F8F3E8] text-[#5A5048] hover:border-[#C49A3C]/40'}`} style={isSelected ? { backgroundColor: c } : {}}>
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : c }} />
                            <span className="text-xs font-semibold leading-tight">{ct}</span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.classType && <p className="text-red-500 text-xs mt-2">{errors.classType}</p>}
                  </div>

                  {/* Session Details */}
                  <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
                    <p className="text-[#1E2A35] mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.06em' }}>Session Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Start Time <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0A898]" />
                          <select value={time} onChange={e => { setTime(e.target.value); setErrors(er => ({ ...er, time: '' })); }} className={`w-full pl-8 pr-3 py-3 rounded-xl border text-sm text-[#1E2A35] bg-[#F8F3E8] outline-none focus:ring-2 focus:ring-[#C49A3C]/25 transition-all appearance-none ${errors.time ? 'border-red-300' : 'border-[#D4CDB5]/70'}`}>
                            <option value="">Select time</option>
                            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
                      </div>
                      <div>
                        <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Duration</label>
                        <div className="flex gap-2">
                          {DURATIONS.map(d => (
                            <button key={d} onClick={() => setDuration(d)} className={`flex-1 py-3 rounded-xl border text-xs font-semibold transition-all ${duration === d ? 'bg-[#1E2A35] text-white border-[#1E2A35]' : 'bg-[#F8F3E8] text-[#5A5048] border-[#D4CDB5]/70 hover:border-[#C49A3C]/40'}`}>{d}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Assign Coach <span className="text-red-400">*</span></label>
                        <select value={coach} onChange={e => { setCoach(e.target.value); setErrors(er => ({ ...er, coach: '' })); }} className={`w-full px-3 py-3 rounded-xl border text-sm text-[#1E2A35] bg-[#F8F3E8] outline-none focus:ring-2 focus:ring-[#C49A3C]/25 transition-all appearance-none ${errors.coach ? 'border-red-300' : 'border-[#D4CDB5]/70'}`}>
                          {COACHES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {errors.coach && <p className="text-red-500 text-xs mt-1">{errors.coach}</p>}
                      </div>
                      <div>
                        <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Max Spots <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0A898]" />
                          <input type="number" min={1} max={50} value={maxSpots} onChange={e => { setMaxSpots(e.target.value); setErrors(er => ({ ...er, maxSpots: '' })); }} className={`w-full pl-8 pr-3 py-3 rounded-xl border text-sm text-[#1E2A35] bg-[#F8F3E8] outline-none focus:ring-2 focus:ring-[#C49A3C]/25 transition-all ${errors.maxSpots ? 'border-red-300' : 'border-[#D4CDB5]/70'}`} />
                        </div>
                        {errors.maxSpots && <p className="text-red-500 text-xs mt-1">{errors.maxSpots}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
                    <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Notes <span className="text-[#B0A898]">(optional)</span></label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Special instructions, equipment needed, room assignment..." className="w-full px-4 py-3 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-sm text-[#1E2A35] placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-[#C49A3C]/25 transition-all resize-none" />
                  </div>

                  {/* Submit */}
                  <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
                    <button onClick={handleSubmit} className="w-full flex items-center justify-center gap-2 bg-[#1E2A35] text-white rounded-full py-4 shadow-[0_4px_20px_rgba(30,42,53,0.25)] hover:bg-[#263545] active:scale-[0.97] transition-all" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em' }}>
                      <CalendarDays size={17} /> Submit Schedule Request
                    </button>
                    <p className="text-[#B0A898] text-xs text-center mt-3 leading-relaxed">
                      Your request will be reviewed by admin before being added to the live calendar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
