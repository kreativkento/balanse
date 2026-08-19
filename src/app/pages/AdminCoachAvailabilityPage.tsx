import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronLeft, ChevronRight, Info, Users, Clock, X,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  MONTH_NAMES, DAY_LABELS_SHORT, buildMonthGrid, toDateKeyFromParts,
  getTodayDateKey, getInitialCalendarMonth, dateKeyFromOffset,
  formatDateShortFromKey, formatTimeRange24,
} from '../components/calendar/weekCalendarUtils';

// ── Types ──────────────────────────────────────────────────────

interface TimeRange {
  id: number;
  start: string; // "HH:MM" 24-hour
  end: string;   // "HH:MM" 24-hour
}

interface AvailabilityEntry {
  id: number;
  date: string;
  periods: TimeRange[];
  dayOff: boolean;
  note: string;
}

interface Coach {
  id: number;
  name: string;
  initials: string;
  color: string;
  role: string;
  availability: AvailabilityEntry[];
}

// ── Mock Data (mirrors coach-set availability from Staff Portal) ──

function buildCoachMockData(): Coach[] {
  const d = dateKeyFromOffset;
  return [
  {
    id: 1, name: 'Rex Santos', initials: 'RX', color: '#5A8A7A', role: 'Calisthenics · Capoeira',
    availability: [
      { id: 101, date: d(1), dayOff: false, note: '', periods: [{ id: 1011, start: '07:00', end: '09:00' }, { id: 1012, start: '14:00', end: '17:00' }] },
      { id: 102, date: d(2), dayOff: false, note: '', periods: [{ id: 1021, start: '07:00', end: '09:00' }] },
      { id: 103, date: d(3), dayOff: true,  note: 'Personal leave', periods: [] },
      { id: 104, date: d(4), dayOff: false, note: '', periods: [{ id: 1041, start: '07:00', end: '10:00' }] },
    ],
  },
  {
    id: 2, name: 'Jodi Reyes', initials: 'JO', color: '#E8A87C', role: 'Yoga',
    availability: [
      { id: 201, date: d(1), dayOff: false, note: '', periods: [{ id: 2011, start: '08:00', end: '11:00' }] },
      { id: 202, date: d(2), dayOff: false, note: '', periods: [{ id: 2021, start: '08:00', end: '10:00' }] },
      { id: 203, date: d(8), dayOff: false, note: 'Back from Bali retreat', periods: [{ id: 2031, start: '08:00', end: '12:00' }] },
    ],
  },
  {
    id: 3, name: 'Ephraim Cruz', initials: 'EP', color: '#7A7EBC', role: 'Animal Flow',
    availability: [
      { id: 301, date: d(1), dayOff: false, note: '', periods: [{ id: 3011, start: '09:00', end: '11:00' }] },
      { id: 302, date: d(2), dayOff: true,  note: 'Medical appointment', periods: [] },
    ],
  },
  {
    id: 4, name: 'Alec Navarro', initials: 'AL', color: '#A8806A', role: 'Groundworks',
    availability: [
      { id: 401, date: d(1), dayOff: false, note: '', periods: [{ id: 4011, start: '11:00', end: '13:00' }] },
      { id: 402, date: d(3), dayOff: false, note: '', periods: [{ id: 4021, start: '11:00', end: '14:00' }] },
    ],
  },
  {
    id: 5, name: 'Rachelle Lim', initials: 'RC', color: '#B07A9E', role: 'Circuit Training · Stretching',
    availability: [
      { id: 501, date: d(1), dayOff: false, note: '', periods: [{ id: 5011, start: '16:00', end: '19:00' }] },
      { id: 502, date: d(2), dayOff: false, note: '', periods: [{ id: 5021, start: '16:00', end: '18:00' }] },
    ],
  },
  {
    id: 6, name: 'Kate Mercado', initials: 'KT', color: '#C49A3C', role: 'Mat Pilates',
    availability: [
      { id: 601, date: d(1), dayOff: false, note: '', periods: [{ id: 6011, start: '09:30', end: '12:00' }] },
      { id: 602, date: d(4), dayOff: false, note: '', periods: [{ id: 6021, start: '09:30', end: '11:30' }] },
      { id: 603, date: d(5), dayOff: true,  note: 'Studio event conflict', periods: [] },
    ],
  },
  {
    id: 7, name: 'Wolf Andrada', initials: 'WF', color: '#3A4A5A', role: 'Kickboxing',
    availability: [
      { id: 701, date: d(1), dayOff: false, note: '', periods: [{ id: 7011, start: '17:00', end: '20:00' }] },
      { id: 702, date: d(2), dayOff: false, note: '', periods: [{ id: 7021, start: '17:00', end: '19:00' }] },
    ],
  },
];
}

const COACHES: Coach[] = buildCoachMockData();

// ── Entry Detail Panel ─────────────────────────────────────────

function EntryDetailPanel({ entry, onClose }: { entry: AvailabilityEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <div>
            <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-0.5">Availability Detail</p>
            <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em' }}>
              {formatDateShortFromKey(entry.date)}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${!entry.dayOff ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${!entry.dayOff ? 'bg-green-500' : 'bg-red-400'}`} />
            {!entry.dayOff ? 'Available' : 'Day Off'}
          </div>

          {!entry.dayOff && entry.periods.length > 0 && (
            <div>
              <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">Time Ranges</p>
              <div className="flex flex-col gap-2">
                {entry.periods.map(p => (
                  <div key={p.id} className="flex items-center gap-2 bg-[#F8F3E8] rounded-xl border border-[#D4CDB5]/50 px-3 py-2">
                    <Clock size={13} className="text-[#B0A898] shrink-0" />
                    <span className="text-[#1E2A35] text-sm font-medium whitespace-nowrap tabular-nums">{formatTimeRange24(p.start, p.end)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!entry.dayOff && entry.periods.length === 0 && (
            <p className="text-[#B0A898] text-sm">No time ranges recorded for this date.</p>
          )}

          {entry.note && (
            <div className="bg-[#F8F3E8] rounded-xl border border-[#D4CDB5]/50 px-3 py-2.5">
              <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">Note</p>
              <p className="text-[#5A5048] text-sm italic">{entry.note}</p>
            </div>
          )}
          <div className="flex items-start gap-2 bg-[#EDE8D8]/60 rounded-xl px-3 py-2.5">
            <Info size={13} className="text-[#B0A898] shrink-0 mt-0.5" />
            <p className="text-[#8A7E6E] text-xs">Availability is set by the coach via the Staff Portal. Contact the coach to request changes.</p>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-full bg-[#1E2A35] text-white text-sm hover:bg-[#263545] transition-all"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel (embeddable in Coaches Management tabs) ─────────

export function AdminCoachAvailabilityPanel() {
  const todayKey = getTodayDateKey();
  const initialCal = getInitialCalendarMonth();
  const [selectedCoachId, setSelectedCoachId] = useState<number>(COACHES[0].id);
  const [calYear, setCalYear]   = useState(initialCal.year);
  const [calMonth, setCalMonth] = useState(initialCal.month);
  const [viewingEntry, setViewingEntry] = useState<AvailabilityEntry | null>(null);

  const coach = COACHES.find(c => c.id === selectedCoachId)!;
  const grid  = buildMonthGrid(calYear, calMonth);

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };

  const availableCount   = coach.availability.filter(e => !e.dayOff).length;
  const unavailableCount = coach.availability.filter(e => e.dayOff).length;
  const periodCount      = coach.availability.reduce((n, e) => n + e.periods.length, 0);

  return (
    <>
      {viewingEntry && (
        <EntryDetailPanel entry={viewingEntry} onClose={() => setViewingEntry(null)} />
      )}

      <div className="flex items-center gap-2 mb-5">
        <Info size={13} className="text-[#B0A898] shrink-0" />
        <p className="text-[#9A8E7E] text-sm">Read-only view. Coaches manage their own availability from the Staff Portal.</p>
      </div>

      <div className="flex gap-6 items-start">
          {/* ── Coach List (left) ── */}
          <div className="w-56 shrink-0">
            <p className="text-[#9A8E7E] text-xs uppercase tracking-widest px-1 mb-2">Coaches</p>
            <div className="flex flex-col gap-1">
              {COACHES.map(c => {
                const avail   = c.availability.filter(e => !e.dayOff).length;
                const unavail = c.availability.filter(e => e.dayOff).length;
                const isActive = c.id === selectedCoachId;
                return (
                  <button key={c.id} onClick={() => setSelectedCoachId(c.id)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-2xl border text-left transition-all ${isActive ? 'bg-[#1E2A35] border-[#1E2A35] shadow-sm' : 'bg-white border-[#D4CDB5]/60 hover:border-[#C49A3C]/40 hover:bg-[#FDFAF5]'}`}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: c.color + (isActive ? '40' : '25') }}>
                      <span className="text-xs font-bold" style={{ color: isActive ? '#fff' : c.color }}>{c.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight truncate ${isActive ? 'text-white' : 'text-[#1E2A35]'}`}>{c.name}</p>
                      <p className={`text-xs mt-0.5 ${isActive ? 'text-white/60' : 'text-[#B0A898]'}`}>
                        {avail > 0 ? `${avail} available` : ''}{avail > 0 && unavail > 0 ? ' · ' : ''}{unavail > 0 ? `${unavail} off` : ''}
                        {avail === 0 && unavail === 0 && 'No entries set'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="flex-1 min-w-0 flex gap-5 items-start">

            {/* Calendar */}
            <div className="w-72 shrink-0">
              <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#E8E2D2]/70">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: coach.color + '25' }}>
                    <span className="text-sm font-bold" style={{ color: coach.color }}>{coach.initials}</span>
                  </div>
                  <div>
                    <p className="text-[#1E2A35] text-sm font-semibold">{coach.name}</p>
                    <p className="text-[#9A8E7E] text-xs">{coach.role}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} className="w-7 h-7 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.08em' }}>
                    {MONTH_NAMES[calMonth]} {calYear}
                  </span>
                  <button onClick={nextMonth} className="w-7 h-7 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all">
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-1">
                  {DAY_LABELS_SHORT.map(d => (
                    <div key={d} className="text-center text-[#C0B8A8] py-0.5" style={{ fontSize: '0.58rem', letterSpacing: '0.08em', fontFamily: "'Bebas Neue', sans-serif" }}>{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-0.5">
                  {grid.map((day, idx) => {
                    if (!day) return <div key={`e-${idx}`} />;
                    const key   = toDateKeyFromParts(calYear, calMonth, day);
                    const entry = coach.availability.find(e => e.date === key);
                    const isToday = key === todayKey;
                    return (
                      <button key={key}
                        onClick={() => entry && setViewingEntry(entry)}
                        className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 mx-0.5 transition-all ${entry ? 'hover:bg-[#F0EBE0]' : 'cursor-default'} ${isToday ? 'ring-1 ring-[#C49A3C]/40' : ''}`}>
                        <span className={`text-xs leading-none mb-0.5 ${isToday ? 'text-[#C49A3C] font-bold' : 'text-[#1E2A35]'}`}>{day}</span>
                        {entry ? (
                          <span className={`w-1.5 h-1.5 rounded-full ${!entry.dayOff ? 'bg-green-500' : 'bg-red-400'}`} />
                        ) : (
                          <span className="w-1.5 h-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-[#E8E2D2]/70 flex items-center justify-between text-xs text-[#9A8E7E]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Available</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Day off</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#E8E2D2]" />Not set</span>
                </div>
              </div>
              <p className="text-[#C0B8A8] text-xs mt-2.5 text-center">Click a marked date to view details</p>
            </div>

            {/* Availability list */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Available Days',  value: availableCount,   color: 'text-green-600', bg: 'bg-green-50',       border: 'border-green-200'     },
                  { label: 'Days Off',         value: unavailableCount, color: 'text-red-600',   bg: 'bg-red-50',         border: 'border-red-200'       },
                  { label: 'Time Periods',     value: periodCount,      color: 'text-[#C49A3C]', bg: 'bg-[#C49A3C]/10',  border: 'border-[#C49A3C]/30'  },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-2xl border ${s.border} px-4 py-3 shadow-sm`}>
                    <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={`font-bold ${s.color}`} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
                <div className="grid grid-cols-[minmax(0,1.2fr)_72px_minmax(9rem,1.5fr)_72px] gap-x-3 px-5 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
                  {['Date', 'Status', 'Time Ranges', 'Actions'].map(h => (
                    <p key={h} className="text-[#9A8E7E] text-xs uppercase tracking-widest font-medium">{h}</p>
                  ))}
                </div>

                {coach.availability.length === 0 ? (
                  <div className="px-5 py-14 text-center">
                    <Users size={24} className="mx-auto text-[#D4CDB5] mb-3" />
                    <p className="text-[#B0A898] text-sm">No availability recorded for {coach.name.split(' ')[0]}.</p>
                    <p className="text-[#C0B8A8] text-xs mt-1">The coach has not set any availability yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#D4CDB5]/30">
                    {[...coach.availability].sort((a, b) => a.date.localeCompare(b.date)).map(entry => (
                      <div key={entry.id} className="grid grid-cols-[minmax(0,1.2fr)_72px_minmax(9rem,1.5fr)_72px] gap-x-3 px-5 py-3.5 items-start hover:bg-[#F8F3E8]/40 transition-colors">
                        <div>
                          <p className="text-[#1E2A35] text-sm font-semibold">{formatDateShortFromKey(entry.date)}</p>
                          {entry.note && <p className="text-[#9A8E7E] text-xs mt-0.5 italic truncate">{entry.note}</p>}
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit border mt-0.5 ${!entry.dayOff ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {!entry.dayOff ? 'Open' : 'Day Off'}
                        </span>
                        <div className="flex flex-col gap-1 min-w-0">
                          {entry.dayOff ? (
                            <span className="text-[#C0B8A8] text-xs">Not available</span>
                          ) : entry.periods.length === 0 ? (
                            <span className="text-[#C0B8A8] text-xs">No time ranges set</span>
                          ) : (
                            entry.periods.map(p => (
                              <span key={p.id} className="text-xs text-[#5A5048] whitespace-nowrap tabular-nums">
                                {formatTimeRange24(p.start, p.end)}
                              </span>
                            ))
                          )}
                        </div>
                        <button
                          onClick={() => setViewingEntry(entry)}
                          className="h-7 px-3 bg-[#F8F3E8] text-[#5A5048] border border-[#D4CDB5]/60 text-xs font-medium rounded-lg hover:bg-[#EDE8D8] active:scale-95 transition-all whitespace-nowrap w-fit mt-0.5"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[#C0B8A8] text-xs mt-3 text-right">
                {coach.availability.length} record{coach.availability.length !== 1 ? 's' : ''} · Set by coach via Staff Portal
              </p>
            </div>
          </div>
        </div>
    </>
  );
}

// ── Standalone page (redirects into Coaches Management) ────────

export default function AdminCoachAvailabilityPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
    else navigate('/admin-coaches?tab=availability', { replace: true });
  }, [adminUser, navigate]);

  return null;
}
