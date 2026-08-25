import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Check, X,
  CalendarDays, Clock, Plus, Trash2, ToggleLeft, ToggleRight,
  Pencil, CheckCircle, AlarmClock,
} from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';
import {
  MONTH_NAMES, DAY_LABELS_SHORT, buildMonthGrid, toDateKeyFromParts,
  getTodayDateKey, getInitialCalendarMonth, dateKeyFromOffset,
  formatDateShortFromKey, formatTimeRange24,
  SCHEDULE_START_TIME_24, SCHEDULE_END_TIME_24,
} from '../components/calendar/weekCalendarUtils';

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

function buildInitialEntries(): AvailabilityEntry[] {
  return [
    {
      id: 1, date: dateKeyFromOffset(1), dayOff: false, note: '',
      periods: [
        { id: 101, start: '09:00', end: '11:00' },
        { id: 102, start: '14:00', end: '17:00' },
      ],
    },
    {
      id: 2, date: dateKeyFromOffset(2), dayOff: false, note: '',
      periods: [{ id: 201, start: '09:00', end: '10:00' }],
    },
    {
      id: 3, date: dateKeyFromOffset(3), dayOff: true, note: 'Personal leave',
      periods: [],
    },
    {
      id: 4, date: dateKeyFromOffset(4), dayOff: false, note: '',
      periods: [{ id: 401, start: '09:00', end: '11:00' }],
    },
  ];
}

function isValidRange(start: string, end: string): boolean {
  if (!start || !end) return false;
  return start < end && start >= SCHEDULE_START_TIME_24 && end <= SCHEDULE_END_TIME_24;
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
            <p className="text-[#9A8E7E] text-xs mt-0.5">{formatDateShortFromKey(date)}</p>
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
      <div className="flex-1 flex items-center gap-1.5 bg-[#F8F3E8] rounded-lg border border-[#D4CDB5]/60 px-2.5 py-1.5">
        <Clock size={12} className="text-[#B0A898] shrink-0" />
        <input
          type="time"
          min={SCHEDULE_START_TIME_24}
          max={SCHEDULE_END_TIME_24}
          value={period.start}
          onChange={e => onChange(period.id, 'start', e.target.value)}
          className="flex-1 bg-transparent text-[#1E2A35] text-sm outline-none min-w-0"
        />
        <span className="text-[#B0A898] text-xs font-medium shrink-0">to</span>
        <input
          type="time"
          min={SCHEDULE_START_TIME_24}
          max={SCHEDULE_END_TIME_24}
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

  const todayKey = getTodayDateKey();
  const initialCal = getInitialCalendarMonth();
  const [calYear, setCalYear]   = useState(initialCal.year);
  const [calMonth, setCalMonth] = useState(initialCal.month);

  // Saved entries
  const [entries, setEntries] = useState<AvailabilityEntry[]>(buildInitialEntries);

  // Editor state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editorDayOff, setEditorDayOff]   = useState(false);
  const [editorPeriods, setEditorPeriods] = useState<TimeRange[]>([newPeriod()]);
  const [editorNote, setEditorNote]       = useState('');
  const [saveFlash, setSaveFlash]         = useState(false);
  const [deletingId, setDeletingId]       = useState<number | null>(null);

  useEffect(() => { if (!staffUser) navigate('/staff-login'); }, [staffUser, navigate]);
  if (!staffUser) return null;

  const grid = buildMonthGrid(calYear, calMonth);

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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="pt-5 pb-4 border-b border-[#D4CDB5]/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/staff-dashboard')}
              className="w-9 h-9 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="min-w-0">
              <h1 className="text-[#1E2A35] leading-none truncate" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '0.05em' }}>
                My Availability
              </h1>
              <p className="text-[#9A8E7E] text-xs mt-0.5 hidden sm:block">Set dates and time ranges you're available to coach</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-[#1E2A35]/10 border border-[#1E2A35]/20 rounded-full flex items-center justify-center">
              <span className="text-[#1E2A35] font-bold text-[10px]">
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
        <div className="grid grid-cols-3 gap-2 sm:gap-3 py-3 sm:py-4">
          {[
            { label: 'Available Days',   value: availableCount, color: 'text-green-600', bg: 'bg-green-50',       border: 'border-green-200',    icon: <CalendarDays size={14} className="text-green-600" /> },
            { label: 'Days Off',          value: dayOffCount,    color: 'text-red-500',   bg: 'bg-red-50',         border: 'border-red-200',      icon: <X size={14} className="text-red-500" /> },
            { label: 'Time Periods',      value: periodCount,    color: 'text-[#745b3c]', bg: 'bg-[#745b3c]/10',  border: 'border-[#745b3c]/30', icon: <AlarmClock size={14} className="text-[#745b3c]" /> },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-xl border ${s.border} px-2.5 sm:px-3 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-2.5 min-w-0`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[#8A7E6E] text-[10px] sm:text-xs uppercase tracking-wider leading-none truncate">{s.label}</p>
                <p className={`leading-none mt-0.5 ${s.color}`} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', letterSpacing: '0.04em' }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main layout ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 xl:gap-5 items-start pb-10">

          {/* ─── Calendar ─── */}
          <div className="md:col-span-1 xl:col-span-3">
            <div className="bg-white rounded-2xl border border-[#D4CDB5]/60 p-3.5 sm:p-4">

              <div className="flex items-center justify-between mb-3">
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
                  <div key={d} className="text-center text-[#C0B8A8] py-0.5"
                    style={{ fontSize: '0.58rem', letterSpacing: '0.08em', fontFamily: "'Bebas Neue', sans-serif" }}>
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-0.5">
                {grid.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} />;
                  const key     = toDateKeyFromParts(calYear, calMonth, day);
                  const entry   = entries.find(e => e.date === key);
                  const isToday = key === todayKey;
                  const isSel   = key === selectedDate;
                  return (
                    <button
                      key={key}
                      onClick={() => openDate(key)}
                      className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 mx-0.5 transition-all hover:bg-[#F0EBE0] ${
                        isSel ? 'bg-[#1E2A35] hover:bg-[#263545]' : ''
                      } ${isToday && !isSel ? 'ring-1 ring-[#745b3c]/50' : ''}`}
                    >
                      <span className={`text-xs leading-none mb-0.5 ${
                        isSel ? 'text-white' : isToday ? 'text-[#745b3c] font-bold' : 'text-[#1E2A35]'
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

              <div className="mt-3 pt-3 border-t border-[#E8E2D2]/70 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-[#9A8E7E]">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Available</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Day off</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#E8E2D2]" />Not set</span>
              </div>
            </div>

            <button
              onClick={() => openDate(todayKey)}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-[#745b3c]/40 text-[#5e4a30] text-xs sm:text-sm font-semibold hover:bg-[#745b3c]/08 active:scale-[0.98] transition-all"
            >
              <Plus size={14} /> Add for Today
            </button>
          </div>

          {/* ─── Editor ─── */}
          <div className="md:col-span-1 xl:col-span-4 min-w-0">
            {!selectedDate ? (
              <div className="bg-white rounded-2xl border border-[#D4CDB5]/60 p-5 sm:p-6 flex flex-col items-center justify-center text-center gap-2 min-h-[180px] sm:min-h-[220px]">
                <div className="w-10 h-10 bg-[#EDE8D8] rounded-xl flex items-center justify-center">
                  <CalendarDays size={18} className="text-[#B0A898]" />
                </div>
                <p className="text-[#5A5048] text-sm font-medium">Select a Date</p>
                <p className="text-[#B0A898] text-xs leading-relaxed max-w-[200px]">
                  Click a date on the calendar to set availability.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#D4CDB5]/60 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#D4CDB5]/40 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[#9A8E7E] text-[10px] uppercase tracking-widest leading-none">
                      {selectedEntry ? 'Edit' : 'New'}
                    </p>
                    <h2 className="text-[#1E2A35] truncate" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.05em' }}>
                      {formatDateShortFromKey(selectedDate)}
                    </h2>
                  </div>
                  <button onClick={() => setSelectedDate(null)}
                    className="w-7 h-7 rounded-lg text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0">
                    <X size={14} />
                  </button>
                </div>

                <div className="px-4 py-3 flex flex-col gap-3">

                  {/* Day off toggle */}
                  <div className="flex items-center justify-between gap-3 bg-[#F8F3E8] rounded-xl px-3 py-2 border border-[#D4CDB5]/40">
                    <p className="text-[#1E2A35] text-sm font-semibold leading-tight">
                      {editorDayOff ? 'Day off' : 'Available to coach'}
                    </p>
                    <button onClick={() => { setEditorDayOff(v => !v); }} aria-label="Toggle availability">
                      {!editorDayOff
                        ? <ToggleRight size={26} className="text-green-500 shrink-0" />
                        : <ToggleLeft size={26} className="text-[#D4CDB5] shrink-0" />}
                    </button>
                  </div>

                  {/* Time ranges */}
                  {!editorDayOff && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[#8A7E6E] text-[10px] uppercase tracking-widest">Time Ranges</p>
                        <button
                          onClick={addPeriod}
                          className="flex items-center gap-1 text-[#745b3c] text-[11px] font-semibold hover:text-[#5e4a30] transition-colors"
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {editorPeriods.map((p) => (
                          <PeriodRow
                            key={p.id}
                            period={p}
                            onChange={updatePeriod}
                            onRemove={removePeriod}
                            showRemove={editorPeriods.length > 1}
                          />
                        ))}
                      </div>

                      {editorPeriods.some(p => p.start && p.end && !isValidRange(p.start, p.end)) && (
                        <p className="text-red-500 text-[11px] flex items-center gap-1">
                          <X size={10} /> End must be after start
                        </p>
                      )}
                    </div>
                  )}

                  {/* Note */}
                  <div>
                    <label className="block text-[#8A7E6E] text-[10px] uppercase tracking-widest mb-1">
                      Note
                    </label>
                    <input
                      type="text"
                      value={editorNote}
                      onChange={e => setEditorNote(e.target.value)}
                      placeholder={editorDayOff ? 'Personal leave, travel…' : 'Available after 10 AM…'}
                      className="w-full px-2.5 py-2 rounded-lg border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 transition-all placeholder-[#C0B8A8]"
                    />
                  </div>
                </div>

                {/* Footer actions */}
                <div className="px-4 pb-4 flex gap-2">
                  {selectedEntry && (
                    <button
                      onClick={() => setDeletingId(selectedEntry.id)}
                      className="w-9 h-9 rounded-xl bg-red-50 text-red-500 border border-red-200 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={!editorHasValidPeriod}
                    className={`flex-1 h-9 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                      saveFlash
                        ? 'bg-green-500 text-white'
                        : 'bg-[#1E2A35] text-white hover:bg-[#263545]'
                    }`}
                    style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
                  >
                    {saveFlash ? <><CheckCircle size={14} /> Saved!</> : <><Check size={14} /> Save</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── Saved entries list ─── */}
          <div className="md:col-span-2 xl:col-span-5 min-w-0">
            <div className="bg-white rounded-2xl border border-[#D4CDB5]/60 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#D4CDB5]/40 flex items-center justify-between">
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.05em' }}>
                  Saved Availability
                </h2>
                <span className="text-[#9A8E7E] text-xs">{entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}</span>
              </div>

              {/* Column headers — hidden on small screens */}
              <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_56px_minmax(9rem,1.25fr)_68px] gap-x-2 px-4 py-2 border-b border-[#D4CDB5]/30 bg-[#F8F3E8]/50">
                {['Date', 'Status', 'Time Ranges', 'Actions'].map(h => (
                  <p key={h} className="text-[#9A8E7E] text-[10px] uppercase tracking-widest font-medium">{h}</p>
                ))}
              </div>

              {sortedEntries.length === 0 ? (
                <div className="px-4 py-10 text-center flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-[#EDE8D8] rounded-xl flex items-center justify-center">
                    <Clock size={18} className="text-[#B0A898]" />
                  </div>
                  <p className="text-[#B0A898] text-sm">No availability set yet.</p>
                  <p className="text-[#C0B8A8] text-xs">Select a date on the calendar to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#D4CDB5]/25 max-h-[420px] xl:max-h-none overflow-y-auto">
                  {sortedEntries.map(entry => {
                    const isActive = entry.date === selectedDate;
                    return (
                      <div
                        key={entry.id}
                        className={`sm:grid sm:grid-cols-[minmax(0,1fr)_56px_minmax(9rem,1.25fr)_68px] gap-x-2 gap-y-1.5 px-4 py-2.5 items-start transition-colors ${
                          isActive ? 'bg-[#1E2A35]/04' : 'hover:bg-[#F8F3E8]/50'
                        }`}
                      >
                        {/* Date + note */}
                        <div className="flex sm:block items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold leading-tight ${isActive ? 'text-[#745b3c]' : 'text-[#1E2A35]'}`}>
                              {formatDateShortFromKey(entry.date)}
                            </p>
                            {entry.note && (
                              <p className="text-[#9A8E7E] text-xs mt-0.5 italic truncate">{entry.note}</p>
                            )}
                          </div>
                          <span className={`sm:hidden text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            entry.dayOff
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {entry.dayOff ? 'Day Off' : 'Open'}
                          </span>
                        </div>

                        {/* Status badge — desktop */}
                        <span className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit ${
                          entry.dayOff
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {entry.dayOff ? 'Day Off' : 'Open'}
                        </span>

                        {/* Time ranges */}
                        <div className="flex flex-col gap-0.5 min-w-0">
                          {entry.dayOff ? (
                            <span className="text-[#C0B8A8] text-xs">Not available</span>
                          ) : entry.periods.length === 0 ? (
                            <span className="text-[#C0B8A8] text-xs">No times set</span>
                          ) : (
                            entry.periods.map(p => (
                              <span
                                key={p.id}
                                className="text-xs text-[#5A5048] whitespace-nowrap tabular-nums leading-snug"
                              >
                                {formatTimeRange24(p.start, p.end)}
                              </span>
                            ))
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 sm:w-[76px]">
                          <button
                            onClick={() => openDate(entry.date)}
                            className="h-7 px-2 bg-[#F8F3E8] text-[#5A5048] border border-[#D4CDB5]/60 text-[11px] font-medium rounded-lg hover:bg-[#EDE8D8] active:scale-95 transition-all whitespace-nowrap flex items-center gap-1"
                          >
                            <Pencil size={10} /> Edit
                          </button>
                          <button
                            onClick={() => setDeletingId(entry.id)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg text-[#C0B8A8] hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
