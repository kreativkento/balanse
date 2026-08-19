import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ChevronLeft, ChevronRight, X, Trash2, CalendarDays, ChevronDown, Check, AlertCircle, Clock } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminSidebar } from '../components/layout/AdminSidebar';

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

interface BookingRequest {
  id: number; student: string; email: string; class: string;
  date: string; time: string; coach: string; amount: number;
  method: string; ref: string; submittedAt: string; status: ReqStatus;
}

interface CancelRequest {
  id: number; student: string; email: string; class: string;
  date: string; time: string; coach: string;
  requestedAt: string; hoursUntilClass: number;
  status: ReqStatus;
}

const CLASS_COLORS: Record<string, string> = {
  'Yoga': '#C49A3C', 'Calisthenics': '#3A4A5A', 'Animal Flow': '#6B8E6B',
  'Groundworks': '#8B6F5A', 'Circuit Training': '#B86A4A', 'Mat Pilates': '#9A7A8A',
  'Kickboxing': '#7A3A4A', 'Capoeira': '#A07050', 'Personal Coaching': '#A67E2A',
};
const SERVICES  = Object.keys(CLASS_COLORS);
const COACHES   = ['Rex', 'Jodi', 'Ephraim', 'Alec', 'Rachelle', 'Kate', 'Wolf'];
const DURATIONS = [30, 45, 60, 75, 90];
const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_DATES  = ['Apr 7', 'Apr 8', 'Apr 9', 'Apr 10', 'Apr 11', 'Apr 12', 'Apr 13'];
const HOURS       = Array.from({ length: 14 }, (_, i) => i + 7);

function fmtHour(h: number) {
  if (h === 12) return '12:00 PM';
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

const INITIAL_BLOCKS: ScheduleBlock[] = [
  { id: 1,  dayIndex: 0, startHour: 8,  duration: 75, className: 'Yoga',            coach: 'Jodi',     capacity: 15, enrolled: 11, color: '#C49A3C', isOpen: true,  status: 'completed' },
  { id: 2,  dayIndex: 0, startHour: 10, duration: 60, className: 'Mat Pilates',      coach: 'Kate',     capacity: 12, enrolled: 8,  color: '#9A7A8A', isOpen: true,  status: 'completed' },
  { id: 3,  dayIndex: 0, startHour: 18, duration: 60, className: 'Calisthenics',     coach: 'Rex',      capacity: 12, enrolled: 6,  color: '#3A4A5A', isOpen: true,  status: 'cancelled' },
  { id: 4,  dayIndex: 1, startHour: 7,  duration: 60, className: 'Calisthenics',     coach: 'Rex',      capacity: 12, enrolled: 3,  color: '#3A4A5A', isOpen: true,  status: 'completed' },
  { id: 5,  dayIndex: 1, startHour: 9,  duration: 60, className: 'Animal Flow',      coach: 'Ephraim',  capacity: 12, enrolled: 10, color: '#6B8E6B', isOpen: true,  status: 'upcoming'  },
  { id: 6,  dayIndex: 1, startHour: 17, duration: 60, className: 'Kickboxing',       coach: 'Wolf',     capacity: 10, enrolled: 7,  color: '#7A3A4A', isOpen: false, status: 'upcoming'  },
  { id: 7,  dayIndex: 2, startHour: 9,  duration: 60, className: 'Mat Pilates',      coach: 'Kate',     capacity: 12, enrolled: 5,  color: '#9A7A8A', isOpen: true,  status: 'upcoming'  },
  { id: 8,  dayIndex: 2, startHour: 16, duration: 60, className: 'Circuit Training', coach: 'Rachelle', capacity: 15, enrolled: 12, color: '#B86A4A', isOpen: true,  status: 'upcoming'  },
  { id: 9,  dayIndex: 3, startHour: 8,  duration: 75, className: 'Yoga',             coach: 'Jodi',     capacity: 15, enrolled: 9,  color: '#C49A3C', isOpen: true,  status: 'upcoming'  },
  { id: 10, dayIndex: 4, startHour: 10, duration: 60, className: 'Groundworks',      coach: 'Alec',     capacity: 10, enrolled: 4,  color: '#8B6F5A', isOpen: true,  status: 'upcoming'  },
  { id: 11, dayIndex: 5, startHour: 9,  duration: 60, className: 'Capoeira',         coach: 'Alec',     capacity: 10, enrolled: 7,  color: '#A07050', isOpen: true,  status: 'upcoming'  },
  { id: 12, dayIndex: 6, startHour: 10, duration: 75, className: 'Personal Coaching',coach: 'Rex',      capacity: 4,  enrolled: 2,  color: '#A67E2A', isOpen: true,  status: 'upcoming'  },
];

const INITIAL_BOOKING_REQS: BookingRequest[] = [
  { id: 1, student: 'Alex Johnson',  email: 'alex.j@email.com',    class: 'Yoga',        date: 'Tue, Apr 14', time: '8:00 AM',  coach: 'Jodi',    amount: 360, method: 'Bank Transfer', ref: 'BPI-202604141', submittedAt: '2 hrs ago',  status: 'pending'  },
  { id: 2, student: 'Ryan Bautista', email: 'ryan.b@email.com',    class: 'Animal Flow', date: 'Tue, Apr 14', time: '9:00 AM',  coach: 'Ephraim', amount: 360, method: 'Bank Transfer', ref: 'BDO-202604142', submittedAt: '3 hrs ago',  status: 'pending'  },
  { id: 3, student: 'Camille Cruz',  email: 'camille.c@email.com', class: 'Kickboxing',  date: 'Wed, Apr 15', time: '5:00 PM',  coach: 'Wolf',    amount: 360, method: 'Cash',          ref: 'CASH-001',     submittedAt: '30 min ago', status: 'pending'  },
  { id: 4, student: 'Lea Mendoza',   email: 'lea.m@email.com',     class: 'Mat Pilates', date: 'Thu, Apr 16', time: '9:30 AM',  coach: 'Kate',    amount: 360, method: 'Bank Transfer', ref: 'BPI-202604143', submittedAt: '5 hrs ago',  status: 'pending'  },
  { id: 5, student: 'Jan Corpus',    email: 'jan.c@email.com',     class: 'Groundworks', date: 'Fri, Apr 17', time: '10:00 AM', coach: 'Alec',    amount: 360, method: 'Bank Transfer', ref: 'BDO-202604144', submittedAt: '1 day ago',  status: 'approved' },
];

const INITIAL_CANCEL_REQS: CancelRequest[] = [
  { id: 1, student: 'Sofia Reyes', email: 'sofia.r@email.com',   class: 'Yoga',             date: 'Tue, Apr 14', time: '8:00 AM',  coach: 'Jodi',     requestedAt: '1 hr ago',   hoursUntilClass: 18, status: 'pending'  },
  { id: 2, student: 'Marco Lim',   email: 'marco.lim@email.com', class: 'Calisthenics',     date: 'Wed, Apr 16', time: '7:00 AM',  coach: 'Rex',      requestedAt: '30 min ago', hoursUntilClass: 42, status: 'pending'  },
  { id: 3, student: 'Diego Tan',   email: 'diego.t@email.com',   class: 'Circuit Training', date: 'Mon, Apr 13', time: '4:00 PM',  coach: 'Rachelle', requestedAt: '3 hrs ago',  hoursUntilClass: 6,  status: 'approved' },
];

const EMPTY_FORM = { className: 'Yoga', coach: 'Jodi', dayIndex: 0, startHour: 8, duration: 60, capacity: 12, isOpen: true, status: 'upcoming' as const };

// ── Component ──────────────────────────────────────────────────

export default function AdminSchedulePage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [activeTab, setActiveTab]     = useState<'calendar' | 'requests' | 'cancellations'>('calendar');
  const [blocks, setBlocks]           = useState<ScheduleBlock[]>(INITIAL_BLOCKS);
  const [bookingReqs, setBookingReqs] = useState<BookingRequest[]>(INITIAL_BOOKING_REQS);
  const [cancelReqs, setCancelReqs]   = useState<CancelRequest[]>(INITIAL_CANCEL_REQS);
  const [weekOffset, setWeekOffset]   = useState(0);
  const [showModal, setShowModal]     = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [rejectBId, setRejectBId]     = useState<number | null>(null);
  const [rejectCId, setRejectCId]     = useState<number | null>(null);
  const [coachFilter, setCoachFilter] = useState<string>('All Coaches');

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

  const blocksAt = (dayIndex: number, hour: number) => {
    const filtered = coachFilter === 'All Coaches'
      ? blocks
      : blocks.filter(b => b.coach === coachFilter);
    return filtered.filter(b => b.dayIndex === dayIndex && b.startHour === hour);
  };

  const weekLabel = weekOffset === 0
    ? 'Week of Apr 7 – Apr 13, 2026'
    : weekOffset === 1 ? 'Week of Apr 14 – Apr 20, 2026'
    : weekOffset === -1 ? 'Week of Mar 31 – Apr 6, 2026'
    : `Week offset: ${weekOffset > 0 ? '+' : ''}${weekOffset}`;

  const openEdit = (block: ScheduleBlock) => {
    setForm({ className: block.className, coach: block.coach, dayIndex: block.dayIndex, startHour: block.startHour, duration: block.duration, capacity: block.capacity, isOpen: block.isOpen, status: block.status });
    setEditingBlock(block);
    setShowModal(true);
  };

  const handleSave = () => {
    if (hasConflict) return; // prevent save if conflict
    const color = CLASS_COLORS[form.className] || '#C49A3C';
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

  const approveBooking = (id: number) => setBookingReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
  const rejectBooking  = (id: number) => { setBookingReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r)); setRejectBId(null); };
  const approveCancel  = (id: number) => setCancelReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
  const rejectCancel   = (id: number) => { setCancelReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r)); setRejectCId(null); };

  const pendingB = bookingReqs.filter(r => r.status === 'pending').length;
  const pendingC = cancelReqs.filter(r => r.status === 'pending').length;

  const inputClass  = "w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  const StatusBadge = ({ s }: { s: ReqStatus }) => (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${
      s === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
      s === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
      'bg-red-50 text-red-600 border border-red-200'
    }`}>{s}</span>
  );

  return (
    <AdminSidebar>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ���─ Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={14} className="text-[#C49A3C]" />
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
            ['calendar', 'Weekly Calendar', null] as const,
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
            <div className="flex items-center gap-4 mb-5 flex-wrap">
              <div className="flex items-center gap-4 bg-white border border-[#D4CDB5]/60 rounded-2xl px-5 py-3 shadow-sm w-fit">
                <button onClick={() => setWeekOffset(w => w - 1)} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] transition-all"><ChevronLeft size={16} /></button>
                <span className="text-[#1E2A35] text-sm font-semibold px-2">{weekLabel}</span>
                <button onClick={() => setWeekOffset(w => w + 1)} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] transition-all"><ChevronRight size={16} /></button>
                {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="text-[#C49A3C] text-xs font-bold hover:text-[#A67E2A] ml-1">Today</button>}
              </div>
              {/* Coach filter */}
              <div className="flex items-center gap-2 bg-white border border-[#D4CDB5]/60 rounded-2xl px-4 py-2.5 shadow-sm">
                <span className="text-[#8A7E6E] text-xs font-medium">Coach:</span>
                <select
                  value={coachFilter}
                  onChange={e => setCoachFilter(e.target.value)}
                  className="text-xs text-[#1E2A35] bg-transparent outline-none cursor-pointer font-semibold"
                >
                  <option value="All Coaches">All Coaches</option>
                  {COACHES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Class-type legend */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {SERVICES.map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLASS_COLORS[s] }} />
                  <span className="text-[#8A7E6E] text-xs">{s}</span>
                </div>
              ))}
            </div>
            {/* Status legend */}
            <div className="flex items-center gap-4 mb-5">
              {[
                { label: 'Upcoming',  bg: 'bg-white border border-[#D4CDB5]/60', dot: 'bg-[#6B8E6B]' },
                { label: 'Completed', bg: 'bg-white border border-[#D4CDB5]/60', dot: 'bg-[#3A4A5A]' },
                { label: 'Cancelled', bg: 'bg-white border border-[#D4CDB5]/60', dot: 'bg-red-400' },
                { label: 'Closed',    bg: 'bg-white border border-[#D4CDB5]/60', dot: 'bg-[#D4CDB5]' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                  <span className="text-[#8A7E6E] text-xs">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <div style={{ minWidth: '900px' }}>
                  <div className="grid border-b border-[#D4CDB5]/50" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
                    <div className="px-3 py-3 bg-[#F8F3E8]/60" />
                    {WEEK_LABELS.map((day, i) => (
                      <div key={day} className="px-3 py-3 text-center border-l border-[#D4CDB5]/40 bg-[#F8F3E8]/60">
                        <p className="text-[#1E2A35] text-xs font-bold uppercase tracking-wider">{day}</p>
                        <p className="text-[#B0A898] text-xs">{WEEK_DATES[i]}</p>
                      </div>
                    ))}
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
                              className="w-full flex items-center justify-center rounded-xl border border-dashed border-[#D4CDB5]/60 text-[#C0B8A8] hover:text-[#C49A3C] hover:border-[#C49A3C]/40 hover:bg-[#C49A3C]/05 transition-all opacity-0 group-hover:opacity-100"
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
            </div>
            <p className="text-[#B0A898] text-xs mt-4 text-right">{blocks.length} schedule blocks this week</p>
          </>
        )}

        {/* ══ BOOKING REQUESTS TAB ══ */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex items-center justify-between bg-[#F8F3E8]/60">
              <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}>Booking Requests</h2>
              <span className="text-[#8A7E6E] text-xs">{bookingReqs.length} total · {pendingB} pending</span>
            </div>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.3fr)_minmax(0,1fr)_150px] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40">
              {['Student', 'Class / Date', 'Method', 'Amount', 'Reference', 'Status', 'Actions'].map(h => (
                <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-[#D4CDB5]/30">
              {bookingReqs.map(req => (
                <div key={req.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.3fr)_minmax(0,1fr)_150px] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px]">
                  <div className="min-w-0">
                    <p className="text-[#1E2A35] text-sm font-semibold truncate">{req.student}</p>
                    <p className="text-[#B0A898] text-xs truncate">{req.email}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#1E2A35] text-sm font-medium truncate">{req.class}</p>
                    <p className="text-[#9A8E7E] text-xs truncate">{req.date} · {req.time}</p>
                  </div>
                  <p className="text-[#5A5048] text-xs truncate">{req.method}</p>
                  <p className="text-[#1E2A35] font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem' }}>₱{req.amount}</p>
                  <p className="text-[#8A7E6E] text-xs font-mono truncate">{req.ref}</p>
                  <StatusBadge s={req.status} />
                  {/* Actions — fixed 150px column */}
                  <div className="flex items-center gap-1 w-[150px]">
                    {req.status === 'pending' && (
                      rejectBId === req.id ? (
                        <>
                          <span className="text-red-600 text-xs font-semibold whitespace-nowrap mr-1">Reject?</span>
                          <button onClick={() => rejectBooking(req.id)} className="h-7 px-2.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 active:scale-95 transition-all">Yes</button>
                          <button onClick={() => setRejectBId(null)} className="h-7 px-2.5 bg-white border border-[#D4CDB5]/70 text-[#8A7E6E] text-xs rounded-lg hover:bg-[#EDE8D8] active:scale-95 transition-all">No</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => approveBooking(req.id)} className="h-7 px-2.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 active:scale-95 transition-all whitespace-nowrap">Approve</button>
                          <button onClick={() => setRejectBId(req.id)} className="h-7 px-2.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 active:scale-95 transition-all whitespace-nowrap">Reject</button>
                        </>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ CANCELLATION REQUESTS TAB ══ */}
        {activeTab === 'cancellations' && (
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex items-center justify-between bg-[#F8F3E8]/60">
              <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}>Cancellation Requests</h2>
              <span className="text-[#8A7E6E] text-xs">{cancelReqs.length} total · {pendingC} pending</span>
            </div>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1fr)_150px] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40">
              {['Student', 'Class / Date', 'Notice', 'Status', 'Actions'].map(h => (
                <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-[#D4CDB5]/30">
              {cancelReqs.map(req => (
                <div key={req.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1fr)_150px] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px]">
                  <div className="min-w-0">
                    <p className="text-[#1E2A35] text-sm font-semibold truncate">{req.student}</p>
                    <p className="text-[#B0A898] text-xs truncate">{req.email}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#1E2A35] text-sm font-medium truncate">{req.class}</p>
                    <p className="text-[#9A8E7E] text-xs truncate">{req.date} · {req.time} · {req.coach}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-[#9A8E7E]" />
                    <span className="text-[#5A5048] text-sm">{req.hoursUntilClass} hrs before</span>
                  </div>
                  <StatusBadge s={req.status} />
                  {/* Actions — fixed 150px column */}
                  <div className="flex items-center gap-1 w-[150px]">
                    {req.status === 'pending' && (
                      rejectCId === req.id ? (
                        <>
                          <span className="text-red-600 text-xs font-semibold whitespace-nowrap mr-1">Reject?</span>
                          <button onClick={() => rejectCancel(req.id)} className="h-7 px-2.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 active:scale-95 transition-all">Yes</button>
                          <button onClick={() => setRejectCId(null)} className="h-7 px-2.5 bg-white border border-[#D4CDB5]/70 text-[#8A7E6E] text-xs rounded-lg hover:bg-[#EDE8D8] active:scale-95 transition-all">No</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => approveCancel(req.id)} className="h-7 px-2.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 active:scale-95 transition-all whitespace-nowrap">Approve</button>
                          <button onClick={() => setRejectCId(req.id)} className="h-7 px-2.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 active:scale-95 transition-all whitespace-nowrap">Reject</button>
                        </>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-[440px] max-h-[90vh] overflow-y-auto">
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
              <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
                {editingBlock ? 'Edit Schedule Block' : 'Add Schedule Block'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
            </div>

            {/* Conflict warning */}
            {hasConflict && (
              <div className="mx-7 mt-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-sm font-semibold">Schedule Conflict Detected</p>
                  <p className="text-red-600 text-xs mt-0.5">Coach <strong>{form.coach}</strong> is already assigned to a class at this day and time. Please choose a different time slot or coach.</p>
                </div>
              </div>
            )}

            <div className="px-7 py-6 flex flex-col gap-4">
              {/* Class */}
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
              {/* Coach */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Coach</label>
                <div className="relative">
                  <select value={form.coach} onChange={e => setForm(f => ({ ...f, coach: e.target.value }))} className={selectClass}>
                    {COACHES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                </div>
              </div>
              {/* Day + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Day</label>
                  <div className="relative">
                    <select value={form.dayIndex} onChange={e => setForm(f => ({ ...f, dayIndex: Number(e.target.value) }))} className={selectClass}>
                      {WEEK_LABELS.map((d, i) => <option key={d} value={i}>{d} {WEEK_DATES[i]}</option>)}
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
              {/* Duration + Capacity */}
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
              {/* Status Toggle */}
              <div className="flex items-center justify-between bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 px-4 py-3">
                <div>
                  <p className="text-[#1E2A35] text-sm font-semibold">Schedule Status</p>
                  <p className="text-[#9A8E7E] text-xs">{form.isOpen ? 'Open — accepting bookings' : 'Closed — no new bookings'}</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, isOpen: !f.isOpen }))}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.isOpen ? 'bg-[#6B8E6B]' : 'bg-[#D4CDB5]'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isOpen ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              {/* Status */}
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
                          : 'bg-[#F8F3E8] border-[#D4CDB5]/70 text-[#5A5048] hover:border-[#C49A3C]/40'
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
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50">
                <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: CLASS_COLORS[form.className] }} />
                <div>
                  <p className="text-[#1E2A35] text-sm font-semibold">{form.className}</p>
                  <p className="text-[#8A7E6E] text-xs">Coach {form.coach} · {WEEK_LABELS[form.dayIndex]} · {fmtHour(form.startHour)} · {form.duration} min · {form.capacity} spots · {form.isOpen ? 'Open' : 'Closed'}</p>
                </div>
              </div>
            </div>
            <div className="px-7 pb-7 flex gap-3">
              {editingBlock && (
                confirmDeleteId === editingBlock.id ? (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-full px-4">
                    <span className="text-red-700 text-xs font-semibold">Delete?</span>
                    <button onClick={() => handleDelete(editingBlock.id)} className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"><Check size={11} /></button>
                    <button onClick={() => setConfirmDeleteId(null)} className="w-6 h-6 rounded-full bg-white border border-[#D4CDB5] flex items-center justify-center text-[#8A7E6E]"><X size={11} /></button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(editingBlock.id)} className="flex items-center gap-1 px-4 py-3 bg-red-50 text-red-500 border border-red-200 rounded-full text-xs font-semibold hover:bg-red-100 transition-all">
                    <Trash2 size={13} /> Delete
                  </button>
                )
              )}
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">Cancel</button>
              <button
                onClick={handleSave}
                disabled={hasConflict}
                className={`flex-1 py-3 rounded-full text-white shadow-sm active:scale-[0.97] transition-all ${hasConflict ? 'bg-[#8A7E6E] cursor-not-allowed' : 'bg-[#1E2A35] hover:bg-[#263545]'}`}
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
              >
                {editingBlock ? 'Save Changes' : 'Add Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSidebar>
  );
}