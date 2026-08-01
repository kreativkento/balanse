import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Check, X,
  CalendarDays, Clock, Plus, Trash2, ToggleLeft, ToggleRight,
  Info, Pencil, CheckCircle, AlarmClock,
} from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';

// ── Constants ──────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const TODAY = '2026-07-27';

// ── Types ──────────────────────────────────────────────────────

interface TimeRange {
  id: number;
  start: string; // "HH:MM" 24-hour
  end: string;   // "HH:MM" 24-hour
}

interface AvailabilityEntry {
  id: number;
  date: string;          // 'YYYY-MM-DD'
  periods: TimeRange[];  // one or more time ranges
  dayOff: boolean;       // true = whole day unavailable
  note: string;
}

// ── Helpers ────────────────────────────────────────────────────

function buildGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const toKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const formatDateShort = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
};

// Convert "HH:MM" → "h:MM AM/PM"
function fmt12(hhmm: string): string {
  if (!hhmm) return '';
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

function formatPeriods(periods: TimeRange[]): string {
  return periods.map(p => `${fmt12(p.start)} – ${fmt12(p.end)}`).join(', ');
}

function isValidRange(start: string, end: string): boolean {
  if (!start || !end) return false;
  return start < end;
}

// New blank period for the editor
function newPeriod(): TimeRange {
  return { id: Date.now() + Math.random(), start: '', end: '' };
}

// ── Delete Confirm Modal ───────────────────────────────────────

function DeleteConfirmModal({ date, onConfirm, onCancel }: {
  date: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-sm p-7 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[#1E2A35] font-semibold text-sm">Remove Availability</p>
            <p className="text-[#9A8E7E] text-xs mt-0.5">{formatDateShort(date)}</p>
          </div>
        </div>
        <p className="text-[#5A5048] text-sm leading-relaxed">
          This will remove all availability entries for this date. Clients will no longer be able to book classes with you on this day.
        </p>
        <div className="flex gap-2 mt-1">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">
            Keep
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-full bg-red-500 text-white text-sm font-semibold hover:bg-red-600 active:scale-[0.97] transition-all">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Period Row (used inside editor) ───────────────────────────

function PeriodRow({ period, onChange, onRemove, showRemove }: {
  period: TimeRange;
  onChange: (id: number, field: 'start' | 'end', val: string) => void;
  onRemove: (id: number) => void;
  showRemove: boolean;
}) {
  const valid = isValidRange(period.start, period.end);
  const invalid = period.start && period.end && !valid;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 flex items-center gap-2 bg-[#F8F3E8] rounded-xl border border-[#D4CDB5]/60 px-3 py-2">
        <Clock size={12} className="text-[#B0A898] shrink-0" />
        <input
          type="time"
          value={period.start}
          onChange={e => onChange(period.id, 'start', e.target.value)}
          className="flex-1 bg-transparent text-[#1E2A35] text-sm outline-none min-w-0"
        />
        <span className="text-[#B0A898] text-xs font-medium shrink-0">to</span>
        <input
          type="time"
          value={period.end}
          onChange={e => onChange(period.id, 'end', e.target.value)}
          className="flex-1 bg-transparent text-[#1E2A35] text-sm outline-none min-w-0"
        />
        {period.start && period.end && (
          valid
            ? <Check size={12} className="text-green-500 shrink-0" />
            : <X size={12} className="text-red-400 shrink-0" />
        )}
      </div>
      {showRemove && (
        <button
          onClick={() => onRemove(period.id)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[#C0B8A8] hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
  // suppress unused warning
  void invalid;
}

// ── Main Page ──────────────────────────────────────────────────

export default function StaffAvailabilityPage() {
  const navigate = useNavigate();
  const { staffUser } = useStaffAuth();

  const [calYear, setCalYear]   = useState(2026);
  const [calMonth, setCalMonth] = useState(6); // July

  // Saved entries
  const [entries, setEntries] = useState<AvailabilityEntry[]>([
    {
      id: 1, date: '2026-07-28', dayOff: false, note: '',
      periods: [
        { id: 101, start: '07:00', end: '09:00' },
        { id: 102, start: '14:00', end: '17:00' },
      ],
    },
    {
      id: 2, date: '2026-07-29', dayOff: false, note: '',
      periods: [
        { id: 201, start: '07:00', end: '08:00' },
      ],
    },
    {
      id: 3, date: '2026-07-30', dayOff: true, note: 'Personal leave',
      periods: [],
    },
    {
      id: 4, date: '2026-07-31', dayOff: false, note: '',
      periods: [
        { id: 401, start: '07:00', end: '09:00' },
      ],
    },
  ]);

  // Editor state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editorDayOff, setEditorDayOff]   = useState(false);
  const [editorPeriods, setEditorPeriods] = useState<TimeRange[]>([newPeriod()]);
  const [editorNote, setEditorNote]       = useState('');
  const [saveFlash, setSaveFlash]         = useState(false);
  const [deletingId, setDeletingId]       = useState<number | null>(null);

  useEffect(() => { if (!staffUser) navigate('/staff-login'); }, [staffUser, navigate]);
  if (!staffUser) return null;

  const grid = buildGrid(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const openDate = (key: string) => {
    const existing = entries.find(e => e.date === key);
    setSelectedDate(key);
    setEditorDayOff(existing?.dayOff ?? false);
    setEditorPeriods(
      existing && existing.periods.length > 0
        ? existing.periods.map(p => ({ ...p }))
        : [newPeriod()]
    );
    setEditorNote(existing?.note ?? '');
    setSaveFlash(false);
  };

  // Period editor handlers
  const updatePeriod = (id: number, field: 'start' | 'end', val: string) => {
    setEditorPeriods(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  };
  const removePeriod = (id: number) => {
    setEditorPeriods(prev => prev.filter(p => p.id !== id));
  };
  const addPeriod = () => {
    setEditorPeriods(prev => [...prev, newPeriod()]);
  };

  const handleSave = () => {
    if (!selectedDate) return;
    const validPeriods = editorDayOff
      ? []
      : editorPeriods.filter(p => isValidRange(p.start, p.end));

    const existing = entries.find(e => e.date === selectedDate);
    const entry: AvailabilityEntry = {
      id: existing?.id ?? Date.now(),
      date: selectedDate,
      dayOff: editorDayOff,
      periods: validPeriods,
      note: editorNote.trim(),
    };

    setEntries(prev => {
      if (existing) return prev.map(e => e.date === selectedDate ? entry : e);
      return [...prev, entry];
    });
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  const handleDelete = (id: number) => {
    const entry = entries.find(e => e.id === id);
    if (entry?.date === selectedDate) setSelectedDate(null);
    setEntries(prev => prev.filter(e => e.id !== id));
    setDeletingId(null);
  };

  const availableCount = entries.filter(e => !e.dayOff).length;
  const dayOffCount    = entries.filter(e => e.dayOff).length;
  const periodCount    = entries.reduce((n, e) => n + e.periods.length, 0);
  const sortedEntries  = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const selectedEntry  = selectedDate ? entries.find(e => e.date === selectedDate) : null;

  // Validate editor: at least one valid period if not day off
  const editorHasValidPeriod = editorDayOff
    || editorPeriods.some(p => isValidRange(p.start, p.end));

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {deletingId !== null && (() => {
        const entry = entries.find(e => e.id === deletingId);
        return entry ? (
          <DeleteConfirmModal
            date={entry.date}
            onConfirm={() => handleDelete(deletingId)}
            onCancel={() => setDeletingId(null)}
          />
        ) : null;
      })()}

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
                My Availability
              </h1>
              <p className="text-[#9A8E7E] text-xs mt-0.5">Set the dates and custom time ranges you're available to coach</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#1E2A35]/10 border border-[#1E2A35]/20 rounded-full flex items-center justify-center">
              <span className="text-[#1E2A35] font-bold text-xs">
                {staffUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-[#1E2A35] text-sm font-semibold leading-tight">{staffUser.name}</p>
              <p className="text-[#9A8E7E] text-xs">{staffUser.role}</p>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-4 py-5">
          {[
            { label: 'Available Days',   value: availableCount, color: 'text-green-600', bg: 'bg-green-50',       border: 'border-green-200',    icon: <CalendarDays size={15} className="text-green-600" /> },
            { label: 'Days Off',          value: dayOffCount,    color: 'text-red-500',   bg: 'bg-red-50',         border: 'border-red-200',      icon: <X size={15} className="text-red-500" /> },
            { label: 'Time Periods Set',  value: periodCount,    color: 'text-[#C49A3C]', bg: 'bg-[#C49A3C]/10',  border: 'border-[#C49A3C]/30', icon: <AlarmClock size={15} className="text-[#C49A3C]" /> },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm px-4 py-3.5 flex items-center gap-3`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest leading-none">{s.label}</p>
                <p className={`leading-none mt-1 ${s.color}`} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Info Banner ── */}
        <div className="flex items-start gap-3 bg-white border border-[#D4CDB5]/60 rounded-2xl px-4 py-3 mb-6 shadow-sm">
          <Info size={14} className="text-[#C49A3C] shrink-0 mt-0.5" />
          <p className="text-[#8A7E6E] text-xs leading-relaxed">
            Set custom date and time ranges for when you're available. You can add multiple periods per day — for example, a morning block and an afternoon block.
            Clients can only book classes within your available windows. Administrators can view your availability but cannot modify it.
          </p>
        </div>

        {/* ── Main 3-column layout ── */}
        <div className="flex gap-5 items-start pb-12">

          {/* ─── Col 1: Calendar ─── */}
          <div className="w-72 shrink-0">
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">

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
                {DAY_LABELS.map(d => (
                  <div key={d} className="text-center text-[#C0B8A8] py-0.5"
                    style={{ fontSize: '0.58rem', letterSpacing: '0.08em', fontFamily: "'Bebas Neue', sans-serif" }}>
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-0.5">
                {grid.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} />;
                  const key     = toKey(calYear, calMonth, day);
                  const entry   = entries.find(e => e.date === key);
                  const isToday = key === TODAY;
                  const isSel   = key === selectedDate;
                  return (
                    <button
                      key={key}
                      onClick={() => openDate(key)}
                      className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 mx-0.5 transition-all hover:bg-[#F0EBE0] ${
                        isSel ? 'bg-[#1E2A35] hover:bg-[#263545]' : ''
                      } ${isToday && !isSel ? 'ring-1 ring-[#C49A3C]/50' : ''}`}
                    >
                      <span className={`text-xs leading-none mb-0.5 ${
                        isSel ? 'text-white' : isToday ? 'text-[#C49A3C] font-bold' : 'text-[#1E2A35]'
                      }`}>{day}</span>
                      {entry ? (
                        <span className={`w-1.5 h-1.5 rounded-full ${entry.dayOff ? 'bg-red-400' : 'bg-green-500'}`} />
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

            <button
              onClick={() => openDate(TODAY)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-[#C49A3C]/50 text-[#A67E2A] text-sm font-semibold hover:bg-[#C49A3C]/08 active:scale-[0.98] transition-all"
            >
              <Plus size={15} /> Add for Today
            </button>
          </div>

          {/* ─── Col 2: Editor ─── */}
          <div className="w-80 shrink-0">
            {!selectedDate ? (
              <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[300px]">
                <div className="w-12 h-12 bg-[#EDE8D8] rounded-2xl flex items-center justify-center">
                  <CalendarDays size={22} className="text-[#B0A898]" />
                </div>
                <p className="text-[#5A5048] text-sm font-medium">Select a Date</p>
                <p className="text-[#B0A898] text-xs leading-relaxed max-w-[180px]">
                  Click a date on the calendar to set your availability and custom time ranges.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-[#D4CDB5]/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-0.5">
                        {selectedEntry ? 'Edit Availability' : 'New Availability'}
                      </p>
                      <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}>
                        {formatDateShort(selectedDate)}
                      </h2>
                    </div>
                    <button onClick={() => setSelectedDate(null)}
                      className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <div className="px-5 py-4 flex flex-col gap-4">

                  {/* Day off toggle */}
                  <div className="flex items-center justify-between bg-[#F8F3E8] rounded-2xl px-4 py-3 border border-[#D4CDB5]/50">
                    <div>
                      <p className="text-[#1E2A35] text-sm font-semibold">Available to Coach</p>
                      <p className="text-[#9A8E7E] text-xs mt-0.5">
                        {editorDayOff ? 'Marked as day off — not available' : 'You can be scheduled this day'}
                      </p>
                    </div>
                    <button onClick={() => { setEditorDayOff(v => !v); }}>
                      {!editorDayOff
                        ? <ToggleRight size={30} className="text-green-500" />
                        : <ToggleLeft size={30} className="text-[#D4CDB5]" />}
                    </button>
                  </div>

                  {/* Time ranges */}
                  {!editorDayOff && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">Time Ranges</p>
                        <span className="text-[#C0B8A8] text-xs">Start → End</span>
                      </div>

                      <div className="flex flex-col gap-2">
                        {editorPeriods.map((p, i) => (
                          <PeriodRow
                            key={p.id}
                            period={p}
                            onChange={updatePeriod}
                            onRemove={removePeriod}
                            showRemove={editorPeriods.length > 1}
                          />
                        ))}
                      </div>

                      <button
                        onClick={addPeriod}
                        className="flex items-center gap-1.5 text-[#C49A3C] text-xs font-semibold hover:text-[#A67E2A] transition-colors mt-0.5 self-start"
                      >
                        <Plus size={13} /> Add another time range
                      </button>

                      {editorPeriods.some(p => p.start && p.end && !isValidRange(p.start, p.end)) && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <X size={11} /> End time must be after start time
                        </p>
                      )}
                    </div>
                  )}

                  {/* Note */}
                  <div>
                    <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                      Note <span className="text-[#C0B8A8] normal-case">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={editorNote}
                      onChange={e => setEditorNote(e.target.value)}
                      placeholder={editorDayOff ? 'e.g. Personal leave, travel, rest day' : 'e.g. Available after 10 AM only'}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 transition-all placeholder-[#C0B8A8]"
                    />
                  </div>
                </div>

                {/* Footer actions */}
                <div className="px-5 pb-5 flex gap-2">
                  {selectedEntry && (
                    <button
                      onClick={() => setDeletingId(selectedEntry.id)}
                      className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 border border-red-200 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={!editorHasValidPeriod}
                    className={`flex-1 h-10 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                      saveFlash
                        ? 'bg-green-500 text-white'
                        : 'bg-[#1E2A35] text-white hover:bg-[#263545]'
                    }`}
                    style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
                  >
                    {saveFlash ? <><CheckCircle size={15} /> Saved!</> : <><Check size={15} /> Save</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── Col 3: Saved entries list ─── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#D4CDB5]/50 flex items-center justify-between">
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                  Saved Availability
                </h2>
                <span className="text-[#9A8E7E] text-xs">{entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}</span>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1.4fr_80px_1fr_90px] gap-x-3 px-5 py-2.5 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/60">
                {['Date', 'Status', 'Time Ranges', 'Actions'].map(h => (
                  <p key={h} className="text-[#9A8E7E] text-xs uppercase tracking-widest font-medium">{h}</p>
                ))}
              </div>

              {sortedEntries.length === 0 ? (
                <div className="px-5 py-16 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-[#EDE8D8] rounded-2xl flex items-center justify-center">
                    <Clock size={22} className="text-[#B0A898]" />
                  </div>
                  <p className="text-[#B0A898] text-sm">No availability set yet.</p>
                  <p className="text-[#C0B8A8] text-xs">Click a date on the calendar to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#D4CDB5]/30">
                  {sortedEntries.map(entry => {
                    const isActive = entry.date === selectedDate;
                    return (
                      <div
                        key={entry.id}
                        className={`grid grid-cols-[1.4fr_80px_1fr_90px] gap-x-3 px-5 py-3.5 items-start transition-colors min-h-[58px] ${
                          isActive ? 'bg-[#1E2A35]/04' : 'hover:bg-[#F8F3E8]/60'
                        }`}
                      >
                        {/* Date + note */}
                        <div>
                          <p className={`text-sm font-semibold ${isActive ? 'text-[#C49A3C]' : 'text-[#1E2A35]'}`}>
                            {formatDateShort(entry.date)}
                          </p>
                          {entry.note && (
                            <p className="text-[#9A8E7E] text-xs mt-0.5 italic truncate">{entry.note}</p>
                          )}
                        </div>

                        {/* Status badge */}
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border w-fit mt-0.5 ${
                          entry.dayOff
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {entry.dayOff ? 'Day Off' : 'Open'}
                        </span>

                        {/* Time ranges */}
                        <div className="flex flex-col gap-1 mt-0.5">
                          {entry.dayOff ? (
                            <span className="text-[#C0B8A8] text-xs">Not available</span>
                          ) : entry.periods.length === 0 ? (
                            <span className="text-[#C0B8A8] text-xs">No times set</span>
                          ) : (
                            entry.periods.map(p => (
                              <span key={p.id} className="flex items-center gap-1 text-xs text-[#5A5048]">
                                <Clock size={10} className="text-[#B0A898] shrink-0" />
                                {fmt12(p.start)} – {fmt12(p.end)}
                              </span>
                            ))
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-0.5 w-[90px]">
                          <button
                            onClick={() => openDate(entry.date)}
                            className="h-7 px-2.5 bg-[#F8F3E8] text-[#5A5048] border border-[#D4CDB5]/60 text-xs font-medium rounded-lg hover:bg-[#EDE8D8] active:scale-95 transition-all whitespace-nowrap flex items-center gap-1"
                          >
                            <Pencil size={10} /> Edit
                          </button>
                          <button
                            onClick={() => setDeletingId(entry.id)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg text-[#C0B8A8] hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="text-[#C0B8A8] text-xs mt-3 text-right">
              Your availability is visible to the booking system and admin portal in real time.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
