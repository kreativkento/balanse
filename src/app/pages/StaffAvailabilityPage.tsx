import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { toastDeleted, toastOperationFailed, toastSaved } from '../../lib/operation-toast';
import {
  ChevronLeft, ChevronRight, Check, X,
  CalendarDays, Clock, Plus, Trash2, ToggleLeft, ToggleRight,
  Pencil, CheckCircle, AlarmClock, Loader2,
} from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';
import { STAFF_PAGE_CONTAINER } from '../lib/staff-page-meta';
import {
  deleteMyStaffAvailability,
  fetchMyStaffAvailability,
  upsertMyStaffAvailability,
  type StaffAvailabilityEntry as SavedAvailabilityEntry,
} from '../../lib/staff-availability-service';
import {
  MONTH_NAMES, DAY_LABELS_SHORT, buildMonthGrid, toDateKeyFromParts,
  getTodayDateKey, getInitialCalendarMonth, getTodayLocal,
  formatDateShortFromKey, formatTimeRange24, formatMonSunWeekRange,
  getMondayOfWeekContaining, toDateKey, dateKeyToDate, offsetDateKey,
  isWeekendMonthGridColumn, isWeekendDate, WEEKEND_COLUMN_BG, WEEKEND_COLUMN_BG_SOFT,
} from '../components/calendar/weekCalendarUtils';
import {
  CALENDAR_BORDER_DIVIDER,
  CALENDAR_BORDER_DIVIDER_SOFT,
  CALENDAR_TODAY_COLUMN,
  CALENDAR_TODAY_RING,
} from '../components/calendar/calendarContrast';
import { ClockTimePicker } from '../components/calendar/ClockTimePicker';
import { ClockDatePicker } from '../components/calendar/ClockDatePicker';
import {
  CLOCK_MINUTE_STEP,
  formatMinutesToTime24,
  parseTime24String,
} from '../components/calendar/clock-time';

const DAY_MIN_MINUTES = 0;
const DAY_MAX_MINUTES = 23 * 60 + 59;
const DEFAULT_START_MINUTES = 9 * 60;
const DEFAULT_END_MINUTES = 10 * 60;

// ── Types ──────────────────────────────────────────────────────

interface TimeRange {
  id: number;
  start: string; // "HH:MM" 24-hour
  end: string;   // "HH:MM" 24-hour
}

interface AvailabilityEntry {
  id: string;
  date: string;
  periods: TimeRange[];
  dayOff: boolean;
  note: string;
}

function mapSavedToUi(entry: SavedAvailabilityEntry): AvailabilityEntry {
  return {
    id: entry.id,
    date: entry.date,
    dayOff: entry.dayOff,
    note: entry.note,
    periods: entry.periods.map((p, index) => ({
      id: Date.now() + index,
      start: p.start,
      end: p.end,
    })),
  };
}

function mapUiPeriodsToSave(periods: TimeRange[]) {
  return periods
    .filter((p) => isValidRange(p.start, p.end))
    .map(({ start, end }) => ({ start, end }));
}

function isValidRange(start: string, end: string): boolean {
  if (!start || !end) return false;
  const startMin = parseTime24String(start);
  const endMin = parseTime24String(end);
  if (startMin === null || endMin === null) return false;
  return startMin < endMin;
}

function nextPeriodId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

/** Default start/end for a new row (optional anchor after an existing range). */
function defaultPeriodTimes(afterEnd?: string): { start: string; end: string } {
  const startMin = afterEnd ? parseTime24String(afterEnd) : null;
  if (startMin !== null) {
    const nextStart = Math.min(DAY_MAX_MINUTES, startMin + CLOCK_MINUTE_STEP);
    const nextEnd = Math.min(DAY_MAX_MINUTES, nextStart + 60);
    if (nextEnd > nextStart) {
      return {
        start: formatMinutesToTime24(nextStart),
        end: formatMinutesToTime24(nextEnd),
      };
    }
  }
  return {
    start: formatMinutesToTime24(DEFAULT_START_MINUTES),
    end: formatMinutesToTime24(DEFAULT_END_MINUTES),
  };
}

function newPeriod(afterEnd?: string): TimeRange {
  const { start, end } = defaultPeriodTimes(afterEnd);
  return { id: nextPeriodId(), start, end };
}

function periodRowIsPartial(p: TimeRange): boolean {
  const hasStart = Boolean(p.start);
  const hasEnd = Boolean(p.end);
  return hasStart !== hasEnd;
}

function getEditorPeriodsForSave(periods: TimeRange[]): {
  canSave: boolean;
  periods: { start: string; end: string }[];
  message?: string;
} {
  if (periods.some((p) => periodRowIsPartial(p))) {
    return {
      canSave: false,
      periods: [],
      message: 'Complete or remove any partially filled time ranges.',
    };
  }
  const invalid = periods.filter(
    (p) => p.start && p.end && !isValidRange(p.start, p.end),
  );
  if (invalid.length > 0) {
    return {
      canSave: false,
      periods: [],
      message: 'Each time range must end after it starts.',
    };
  }
  const valid = mapUiPeriodsToSave(periods);
  if (valid.length === 0) {
    return {
      canSave: false,
      periods: [],
      message: 'Add at least one time range, or mark the day as day off.',
    };
  }
  return { canSave: true, periods: valid };
}

// ── Delete Confirm Modal ───────────────────────────────────────

function DeleteConfirmModal({ date, onConfirm, onCancel }: {
  date: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4"
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

function PeriodRow({ period, index, total, onChange, onRemove, showRemove, dateLabel }: {
  period: TimeRange;
  index: number;
  total: number;
  onChange: (id: number, field: 'start' | 'end', val: string) => void;
  onRemove: (id: number) => void;
  showRemove: boolean;
  dateLabel?: string;
}) {
  const valid = isValidRange(period.start, period.end);
  const invalid = period.start && period.end && !valid;
  const startMin = parseTime24String(period.start);
  const startMinutes = startMin ?? DEFAULT_START_MINUTES;
  const endMinutesParsed = parseTime24String(period.end);
  const endMinutes = endMinutesParsed ?? DEFAULT_END_MINUTES;
  const endMinMinutes = startMin !== null
    ? startMin + CLOCK_MINUTE_STEP
    : DAY_MIN_MINUTES + CLOCK_MINUTE_STEP;

  return (
    <div className="rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8]/40 p-3">
      {total > 1 && (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#9A8E7E]">
          Range {index + 1} of {total}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ClockTimePicker
          label="Start time"
          value={startMinutes}
          minMinutes={DAY_MIN_MINUTES}
          maxMinutes={DAY_MAX_MINUTES}
          headerDateLabel={dateLabel}
          onChange={(minutes) => onChange(period.id, 'start', formatMinutesToTime24(minutes))}
        />
        <ClockTimePicker
          label="End time"
          value={endMinutes}
          minMinutes={endMinMinutes}
          maxMinutes={DAY_MAX_MINUTES}
          headerDateLabel={dateLabel}
          onChange={(minutes) => onChange(period.id, 'end', formatMinutesToTime24(minutes))}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0 text-xs text-[#8A7E6E]">
          {period.start && period.end ? (
            <span className="tabular-nums">{formatTimeRange24(period.start, period.end)}</span>
          ) : (
            <span className="text-[#C0B8A8]">Set start and end</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {period.start && period.end && (
            valid
              ? <Check size={14} className="text-green-500" aria-hidden />
              : <X size={14} className="text-red-400" aria-hidden />
          )}
          {showRemove && (
            <button
              type="button"
              onClick={() => onRemove(period.id)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#C0B8A8] transition-all hover:bg-red-50 hover:text-red-500"
              aria-label="Remove time range"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {invalid && (
        <p className="mt-1.5 text-[11px] text-red-500">End time must be after start time.</p>
      )}
    </div>
  );
}

type RangeMode = 'weekly' | 'monthly' | 'custom';

const RANGE_MODE_LABELS: Record<RangeMode, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  custom: 'Custom',
};

function monthRangeBounds(year: number, month: number): { start: string; end: string } {
  return {
    start: toDateKeyFromParts(year, month, 1),
    end: toDateKey(new Date(year, month + 1, 0)),
  };
}

function dateKeyInRange(key: string, start: string, end: string): boolean {
  return key >= start && key <= end;
}

function staffAvailabilityCellClasses(
  entry: AvailabilityEntry | undefined,
  isToday: boolean,
  isWeekend = false,
): string {
  if (!entry) {
    if (isToday) return `bg-white ${CALENDAR_TODAY_COLUMN}`;
    if (isWeekend) return `${WEEKEND_COLUMN_BG_SOFT} hover:bg-[#DDD6C8]/80`;
    return 'bg-white hover:bg-[#F5F2E8]';
  }
  if (entry.dayOff) {
    return isToday
      ? `bg-red-100/95 text-red-950 ${CALENDAR_TODAY_COLUMN}`
      : 'bg-red-100/90 hover:bg-red-100 text-red-950';
  }
  return isToday
    ? `bg-green-100/95 text-[#1E2A35] ${CALENDAR_TODAY_COLUMN}`
    : 'bg-green-100/90 hover:bg-green-100 text-[#1E2A35]';
}

// ── Availability editor (modal) ────────────────────────────────

function AvailabilityEditorModal({
  selectedDate,
  selectedEntry,
  editorDayOff,
  editorPeriods,
  editorNote,
  saveFlash,
  saveError,
  saving,
  editorSaveCheck,
  editorCanSave,
  onClose,
  onToggleDayOff,
  onUpdatePeriod,
  onRemovePeriod,
  onAddPeriod,
  onNoteChange,
  onSave,
  onRequestDelete,
}: {
  selectedDate: string;
  selectedEntry: AvailabilityEntry | null | undefined;
  editorDayOff: boolean;
  editorPeriods: TimeRange[];
  editorNote: string;
  saveFlash: boolean;
  saveError: string;
  saving: boolean;
  editorSaveCheck: ReturnType<typeof getEditorPeriodsForSave> | { canSave: true };
  editorCanSave: boolean;
  onClose: () => void;
  onToggleDayOff: () => void;
  onUpdatePeriod: (id: number, field: 'start' | 'end', val: string) => void;
  onRemovePeriod: (id: number) => void;
  onAddPeriod: () => void;
  onNoteChange: (val: string) => void;
  onSave: () => void;
  onRequestDelete: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="availability-editor-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md max-h-[min(90vh,720px)] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-[#D4CDB5]/40 flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <p className="text-[#9A8E7E] text-[10px] uppercase tracking-widest leading-none">
              {selectedEntry ? 'Edit' : 'New'}
            </p>
            <h2
              id="availability-editor-title"
              className="text-[#1E2A35] truncate"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.05em' }}
            >
              {formatDateShortFromKey(selectedDate)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-3 overflow-y-auto min-h-0 flex-1">
          <div className="flex items-center justify-between gap-3 bg-[#F8F3E8] rounded-xl px-3 py-2 border border-[#D4CDB5]/40">
            <p className="text-[#1E2A35] text-sm font-semibold leading-tight">
              {editorDayOff ? 'Day off' : 'Available to coach'}
            </p>
            <button type="button" onClick={onToggleDayOff} aria-label="Toggle availability">
              {!editorDayOff
                ? <ToggleRight size={26} className="text-green-500 shrink-0" />
                : <ToggleLeft size={26} className="text-[#D4CDB5] shrink-0" />}
            </button>
          </div>

          {!editorDayOff && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[#8A7E6E] text-[10px] uppercase tracking-widest">
                Time ranges
                <span className="normal-case tracking-normal text-[#B0A898]">
                  {' '}· add as many as you need for this day
                </span>
              </p>

              <div className="flex flex-col gap-1.5">
                {editorPeriods.map((p, index) => (
                  <PeriodRow
                    key={p.id}
                    index={index}
                    total={editorPeriods.length}
                    period={p}
                    onChange={onUpdatePeriod}
                    onRemove={onRemovePeriod}
                    showRemove={editorPeriods.length > 1}
                    dateLabel={formatDateShortFromKey(selectedDate)}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={onAddPeriod}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#c49a3c]/45 py-2 text-[#a67f2e] text-xs font-semibold hover:bg-[#c49a3c]/08 active:scale-[0.99] transition-all"
              >
                <Plus size={14} /> Add another time range
              </button>

              {!editorSaveCheck.canSave && 'message' in editorSaveCheck && editorSaveCheck.message && (
                <p className="text-red-500 text-[11px] flex items-center gap-1">
                  <X size={10} /> {editorSaveCheck.message}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-[#8A7E6E] text-[10px] uppercase tracking-widest mb-1">
              Note
            </label>
            <input
              type="text"
              value={editorNote}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={editorDayOff ? 'Personal leave, travel…' : 'Available after 10 AM…'}
              className="w-full px-2.5 py-2 rounded-lg border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 transition-all placeholder-[#C0B8A8]"
            />
          </div>
        </div>

        <div className="px-4 pb-4 flex gap-2 shrink-0 border-t border-[#E8E2D2]/70 pt-3">
          {selectedEntry && (
            <button
              type="button"
              onClick={onRequestDelete}
              className="w-9 h-9 rounded-xl bg-red-50 text-red-500 border border-red-200 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all shrink-0"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!editorCanSave || saving}
            className={`action-button flex-1 h-9 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
              saveFlash
                ? 'bg-green-500 text-white'
                : 'bg-[#1E2A35] text-white hover:bg-[#263545]'
            }`}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Saving…</>
            ) : saveFlash ? (
              <><CheckCircle size={14} /> Saved!</>
            ) : (
              <><Check size={14} /> Save</>
            )}
          </button>
        </div>
        {saveError && (
          <p className="px-4 pb-3 text-xs text-red-600 shrink-0">{saveError}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function StaffAvailabilityPage() {
  const navigate = useNavigate();
  const { staffUser } = useStaffAuth();

  const todayKey = getTodayDateKey();
  const initialCal = getInitialCalendarMonth();
  const [calYear, setCalYear]   = useState(initialCal.year);
  const [calMonth, setCalMonth] = useState(initialCal.month);

  const [rangeMode, setRangeMode] = useState<RangeMode>('monthly');
  const [weekStartKey, setWeekStartKey] = useState(() =>
    toDateKey(getMondayOfWeekContaining(getTodayLocal())),
  );
  const [customRangeStart, setCustomRangeStart] = useState(todayKey);
  const [customRangeEnd, setCustomRangeEnd] = useState(() => offsetDateKey(todayKey, 13));

  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editorDayOff, setEditorDayOff]   = useState(false);
  const [editorPeriods, setEditorPeriods] = useState<TimeRange[]>([newPeriod()]);
  const [editorNote, setEditorNote]       = useState('');
  const [saveFlash, setSaveFlash]         = useState(false);
  const [saveError, setSaveError]         = useState('');
  const [saving, setSaving]               = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const entriesListRef = useRef<HTMLDivElement>(null);
  const [entriesListOverflows, setEntriesListOverflows] = useState(false);

  useEffect(() => { if (!staffUser) navigate('/staff-login'); }, [staffUser, navigate]);

  useEffect(() => {
    if (!staffUser) return;
    let cancelled = false;
    setLoadingEntries(true);
    setLoadError('');
    void fetchMyStaffAvailability().then(({ entries: rows, error }) => {
      if (cancelled) return;
      if (error) setLoadError(error);
      else setEntries(rows.map(mapSavedToUi));
      setLoadingEntries(false);
    });
    return () => { cancelled = true; };
  }, [staffUser]);

  useEffect(() => {
    if (rangeMode !== 'custom') return;
    const start = customRangeStart <= customRangeEnd ? customRangeStart : customRangeEnd;
    const d = dateKeyToDate(start);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  }, [rangeMode, customRangeStart, customRangeEnd]);

  const { rangeStart, rangeEnd, rangeTitle } = useMemo(() => {
    if (rangeMode === 'weekly') {
      const start = weekStartKey;
      const end = offsetDateKey(start, 6);
      return {
        rangeStart: start,
        rangeEnd: end,
        rangeTitle: formatMonSunWeekRange(dateKeyToDate(start)),
      };
    }
    if (rangeMode === 'monthly') {
      const { start, end } = monthRangeBounds(calYear, calMonth);
      return {
        rangeStart: start,
        rangeEnd: end,
        rangeTitle: `${MONTH_NAMES[calMonth]} ${calYear}`,
      };
    }
    const start = customRangeStart <= customRangeEnd ? customRangeStart : customRangeEnd;
    const end = customRangeStart <= customRangeEnd ? customRangeEnd : customRangeStart;
    return {
      rangeStart: start,
      rangeEnd: end,
      rangeTitle: `${formatDateShortFromKey(start)} – ${formatDateShortFromKey(end)}`,
    };
  }, [rangeMode, weekStartKey, calYear, calMonth, customRangeStart, customRangeEnd]);

  const entriesInRange = useMemo(
    () => entries.filter((e) => dateKeyInRange(e.date, rangeStart, rangeEnd)),
    [entries, rangeStart, rangeEnd],
  );

  const availableCount = useMemo(
    () => entriesInRange.filter((e) => !e.dayOff).length,
    [entriesInRange],
  );
  const dayOffCount = useMemo(
    () => entriesInRange.filter((e) => e.dayOff).length,
    [entriesInRange],
  );
  const periodCount = useMemo(
    () => entriesInRange.reduce((n, e) => n + e.periods.length, 0),
    [entriesInRange],
  );
  const sortedEntriesInRange = useMemo(
    () => [...entriesInRange].sort((a, b) => a.date.localeCompare(b.date)),
    [entriesInRange],
  );

  useLayoutEffect(() => {
    const el = entriesListRef.current;
    if (!el) {
      setEntriesListOverflows(false);
      return;
    }
    const check = () => {
      setEntriesListOverflows(el.scrollHeight > el.clientHeight + 2);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    el.addEventListener('scroll', check);
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', check);
    };
  }, [sortedEntriesInRange.length, loadingEntries, rangeMode]);

  if (!staffUser) return null;

  const grid = buildMonthGrid(calYear, calMonth);
  const monthRowCount = Math.max(1, Math.ceil(grid.length / 7));
  const weekDayKeys = Array.from({ length: 7 }, (_, i) => offsetDateKey(weekStartKey, i));

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };
  const prevWeek = () => setWeekStartKey((k) => offsetDateKey(k, -7));
  const nextWeek = () => setWeekStartKey((k) => offsetDateKey(k, 7));

  const shiftRangePrev = () => {
    if (rangeMode === 'weekly') prevWeek();
    else if (rangeMode === 'monthly') prevMonth();
    else prevMonth();
  };
  const shiftRangeNext = () => {
    if (rangeMode === 'weekly') nextWeek();
    else if (rangeMode === 'monthly') nextMonth();
    else nextMonth();
  };

  const setRangeModeAndSync = (mode: RangeMode) => {
    setRangeMode(mode);
    if (mode === 'weekly') {
      setWeekStartKey(toDateKey(getMondayOfWeekContaining(dateKeyToDate(todayKey))));
    }
    if (mode === 'monthly') {
      const d = dateKeyToDate(todayKey);
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
    }
  };

  const inFilterRange = (key: string) => dateKeyInRange(key, rangeStart, rangeEnd);

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
    setSaveError('');
  };

  const renderMonthDayCell = (day: number, cellIndex: number) => {
    const key = toDateKeyFromParts(calYear, calMonth, day);
    const entry = entries.find((e) => e.date === key);
    const isToday = key === todayKey;
    const isSel = key === selectedDate;
    const outOfRange = rangeMode === 'custom' && !inFilterRange(key);
    const disabled = outOfRange;
    const isWeekend = isWeekendDate(new Date(calYear, calMonth, day));

    return (
      <button
        key={key}
        type="button"
        disabled={disabled}
        onClick={() => openDate(key)}
        className={`relative h-full min-h-0 flex flex-col items-stretch text-left p-1.5 border-r border-b ${CALENDAR_BORDER_DIVIDER_SOFT} transition-colors ${
          (cellIndex + 1) % 7 === 0 ? 'border-r-0' : ''
        } ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-[#F5F2E8]/50'
            : isSel
              ? 'bg-[#1E2A35] text-white z-[1] cursor-pointer'
              : staffAvailabilityCellClasses(entry, isToday, isWeekend)
        }`}
      >
        <span
          className={`self-start w-8 h-8 flex items-center justify-center rounded-lg text-sm leading-none shrink-0 ${
            isSel
              ? 'bg-white/15 text-white font-bold'
              : isToday
                ? `${CALENDAR_TODAY_RING} font-bold text-[#1E2A35] bg-white/80`
                : entry?.dayOff
                  ? 'font-bold text-red-900'
                  : entry
                    ? 'font-bold text-[#1E3A2F]'
                    : 'font-semibold text-[#1E2A35]'
          }`}
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em' }}
        >
          {day}
        </span>
        {isSel ? (
          entry?.dayOff ? (
            <span className="mt-auto text-[10px] font-semibold text-white/90 leading-tight">Day off</span>
          ) : entry && entry.periods.length > 0 ? (
            <span className="mt-auto text-[10px] text-white/85 tabular-nums leading-tight line-clamp-2">
              {formatTimeRange24(entry.periods[0].start, entry.periods[0].end)}
              {entry.periods.length > 1 ? ` +${entry.periods.length - 1}` : ''}
            </span>
          ) : entry ? (
            <span className="mt-auto text-[10px] text-white/80">Open</span>
          ) : null
        ) : entry?.dayOff ? (
          <span className="mt-auto text-[10px] font-semibold text-red-800 leading-tight">Day off</span>
        ) : entry && entry.periods.length > 0 ? (
          <span className="mt-auto text-[10px] font-medium text-[#2F4F3F] tabular-nums leading-tight line-clamp-2">
            {formatTimeRange24(entry.periods[0].start, entry.periods[0].end)}
            {entry.periods.length > 1 ? ` +${entry.periods.length - 1}` : ''}
          </span>
        ) : entry ? (
          <span className="mt-auto text-[10px] text-[#5A5048]">Open</span>
        ) : null}
      </button>
    );
  };

  const renderWeeklyDayBlock = (key: string) => {
    const entry = entries.find((e) => e.date === key);
    const date = dateKeyToDate(key);
    const isToday = key === todayKey;
    const isSel = key === selectedDate;
    const weekdayShort = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });

    const isWeekend = isWeekendDate(date);

    let detail = 'Add availability';
    if (entry?.dayOff) {
      detail = entry.note?.trim() ? entry.note : 'Day off';
    } else if (entry) {
      if (entry.periods.length === 0) detail = 'No times yet';
      else if (entry.periods.length === 1) {
        detail = formatTimeRange24(entry.periods[0].start, entry.periods[0].end);
      } else {
        detail = `${entry.periods.length} windows · ${formatTimeRange24(entry.periods[0].start, entry.periods[0].end)}`;
      }
    }

    return (
      <button
        key={key}
        type="button"
        onClick={() => openDate(key)}
        className={`group relative flex h-full min-h-[6.5rem] flex-col rounded-xl p-3 sm:px-3.5 sm:py-3.5 text-left transition-all ring-1 ring-inset ${
          isSel
            ? 'bg-[#1E2A35] text-white shadow-sm ring-[#1E2A35]'
            : `${staffAvailabilityCellClasses(entry, isToday, isWeekend)} ring-[#D4CDB5]/35 hover:ring-[#D4CDB5]`
        }`}
      >
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
            isSel ? 'text-white/55' : entry?.dayOff ? 'text-red-800/70' : entry ? 'text-[#4A6B55]' : 'text-[#B0A898]'
          }`}
        >
          {weekdayShort}
        </span>

        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className={`leading-none ${
              isSel
                ? 'text-white'
                : isToday
                  ? 'text-[#8A6520] font-bold'
                  : entry?.dayOff
                    ? 'text-red-900'
                    : 'text-[#1E2A35]'
            }`}
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.65rem',
              letterSpacing: '0.04em',
            }}
          >
            {date.getDate()}
          </span>
          <span
            className={`text-[11px] ${
              isSel ? 'text-white/45' : entry?.dayOff ? 'text-red-800/60' : 'text-[#7A7268]'
            }`}
          >
            {monthLabel}
          </span>
        </div>

        <p
          className={`mt-auto pt-2 text-[11px] leading-snug line-clamp-2 ${
            isSel
              ? 'text-white/75'
              : entry?.dayOff
                ? 'font-semibold text-red-900'
                : entry
                  ? 'text-[#2F4F3F]'
                  : 'text-[#B0A898] italic'
          }`}
        >
          {detail}
        </p>
      </button>
    );
  };

  // Period editor handlers
  const updatePeriod = (id: number, field: 'start' | 'end', val: string) => {
    setEditorPeriods((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (field === 'start') {
          const startMin = parseTime24String(val);
          const endMin = parseTime24String(p.end);
          let nextEnd = p.end;
          if (startMin !== null && (endMin === null || endMin <= startMin)) {
            nextEnd = formatMinutesToTime24(
              Math.min(DAY_MAX_MINUTES, startMin + CLOCK_MINUTE_STEP),
            );
          }
          return { ...p, start: val, end: nextEnd };
        }
        return { ...p, [field]: val };
      }),
    );
  };
  const removePeriod = (id: number) => {
    setEditorPeriods((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== id);
    });
  };
  const addPeriod = () => {
    setEditorPeriods((prev) => {
      const lastEnd = [...prev]
        .reverse()
        .find((p) => isValidRange(p.start, p.end))?.end;
      return [...prev, newPeriod(lastEnd)];
    });
  };

  const handleSave = () => {
    if (!selectedDate || saving) return;

    let periodsToSave: { start: string; end: string }[] = [];
    if (!editorDayOff) {
      const check = getEditorPeriodsForSave(editorPeriods);
      if (!check.canSave) {
        setSaveError(check.message ?? 'Fix time ranges before saving.');
        return;
      }
      periodsToSave = check.periods;
    }

    setSaving(true);
    setSaveError('');
    void upsertMyStaffAvailability({
      date: selectedDate,
      dayOff: editorDayOff,
      note: editorNote.trim(),
      periods: periodsToSave,
    }).then(({ entry, error }) => {
      setSaving(false);
      if (error || !entry) {
        const message = error ?? 'Could not save availability.';
        setSaveError(message);
        toastOperationFailed(message);
        return;
      }
      toastSaved('Availability');
      const uiEntry = mapSavedToUi(entry);
      setEntries((prev) => {
        const existing = prev.find((e) => e.date === selectedDate);
        if (existing) return prev.map((e) => (e.date === selectedDate ? uiEntry : e));
        return [...prev, uiEntry];
      });
      if (!editorDayOff) {
        setEditorPeriods(
          uiEntry.periods.length > 0
            ? uiEntry.periods.map((p) => ({ ...p }))
            : [newPeriod()],
        );
      }
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 2000);
    });
  };

  const handleDelete = (id: string) => {
    void deleteMyStaffAvailability(id).then(({ error }) => {
      if (error) {
        setLoadError(error);
        toastOperationFailed(error);
        setDeletingId(null);
        return;
      }
      toastDeleted('Availability entry');
      const entry = entries.find((e) => e.id === id);
      if (entry?.date === selectedDate) setSelectedDate(null);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setDeletingId(null);
    });
  };

  const selectedEntry  = selectedDate ? entries.find(e => e.date === selectedDate) : null;

  const editorSaveCheck = editorDayOff
    ? { canSave: true as const }
    : getEditorPeriodsForSave(editorPeriods);
  const editorCanSave = editorDayOff || editorSaveCheck.canSave;

  return (
    <>
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

      {selectedDate !== null && (
        <AvailabilityEditorModal
          selectedDate={selectedDate}
          selectedEntry={selectedEntry}
          editorDayOff={editorDayOff}
          editorPeriods={editorPeriods}
          editorNote={editorNote}
          saveFlash={saveFlash}
          saveError={saveError}
          saving={saving}
          editorSaveCheck={editorSaveCheck}
          editorCanSave={editorCanSave}
          onClose={() => setSelectedDate(null)}
          onToggleDayOff={() => setEditorDayOff((v) => !v)}
          onUpdatePeriod={updatePeriod}
          onRemovePeriod={removePeriod}
          onAddPeriod={addPeriod}
          onNoteChange={setEditorNote}
          onSave={handleSave}
          onRequestDelete={() => {
            if (selectedEntry) setDeletingId(selectedEntry.id);
          }}
        />
      )}

      <div className={`${STAFF_PAGE_CONTAINER} flex min-h-0 flex-1 flex-col overflow-hidden py-4 sm:py-5`}>
        {loadError && (
          <div className="mb-3 shrink-0 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {loadingEntries && (
          <div className="mb-3 shrink-0 flex items-center gap-2 text-sm text-[#8A7E6E]">
            <Loader2 size={16} className="animate-spin text-[#c49a3c]" />
            Loading your availability…
          </div>
        )}

        {/* ── Date range filter ── */}
        <div className="mb-3 shrink-0 bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <p className="text-[#8A7E6E] text-[10px] uppercase tracking-widest shrink-0">Show range</p>
              <div className="flex p-1 bg-[#F8F3E8] rounded-full border border-[#D4CDB5]/40 w-fit">
                {(['weekly', 'monthly', 'custom'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRangeModeAndSync(mode)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      rangeMode === mode
                        ? 'bg-[#1E2A35] text-white shadow-sm'
                        : 'text-[#5A5048] hover:text-[#1E2A35]'
                    }`}
                  >
                    {RANGE_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
            </div>

            {rangeMode === 'custom' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 flex-1 lg:max-w-md">
                <ClockDatePicker
                  label="From"
                  value={customRangeStart}
                  onChange={setCustomRangeStart}
                />
                <ClockDatePicker
                  label="To"
                  value={customRangeEnd}
                  onChange={setCustomRangeEnd}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={shiftRangePrev}
                  className="w-8 h-8 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
                  aria-label="Previous range"
                >
                  <ChevronLeft size={16} />
                </button>
                <span
                  className="text-[#1E2A35] text-center min-w-0 truncate px-1"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.06em' }}
                >
                  {rangeTitle}
                </span>
                <button
                  type="button"
                  onClick={shiftRangeNext}
                  className="w-8 h-8 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
                  aria-label="Next range"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
          <p className="mt-3 text-[#9A8E7E] text-xs">
            Stats, calendar, and entries reflect{' '}
            <span className="text-[#5A5048] font-medium">{rangeTitle}</span>.
          </p>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 py-1 sm:py-2 mb-3 shrink-0">
          {[
            { label: 'Available Days',   value: availableCount, color: 'text-green-600', bg: 'bg-green-50',       border: 'border-green-200',    icon: <CalendarDays size={14} className="text-green-600" /> },
            { label: 'Days Off',          value: dayOffCount,    color: 'text-red-500',   bg: 'bg-red-50',         border: 'border-red-200',      icon: <X size={14} className="text-red-500" /> },
            { label: 'Time Periods',      value: periodCount,    color: 'text-[#c49a3c]', bg: 'bg-[#c49a3c]/10',  border: 'border-[#c49a3c]/30', icon: <AlarmClock size={14} className="text-[#c49a3c]" /> },
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

        {/* ── Calendar + entries ── */}
        <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-3.5 sm:p-5 flex flex-1 min-h-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0">
              <div className="min-w-0">
                <h2
                  className="text-[#1E2A35]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.06em' }}
                >
                  {rangeMode === 'weekly' ? 'This week' : rangeMode === 'monthly' ? 'Month view' : 'Calendar'}
                </h2>
                {rangeMode === 'weekly' && (
                  <p className="text-[#9A8E7E] text-xs mt-0.5 truncate">{rangeTitle}</p>
                )}
                {rangeMode === 'monthly' && (
                  <p className="text-[#9A8E7E] text-xs mt-0.5 truncate">{rangeTitle}</p>
                )}
              </div>
              {rangeMode === 'custom' && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={prevMonth} className="w-7 h-7 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[#5A5048] text-sm font-medium tabular-nums">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </span>
                  <button type="button" onClick={nextMonth} className="w-7 h-7 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all">
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            {rangeMode === 'weekly' ? (
              <div className="flex flex-1 min-h-0 flex-col rounded-2xl border border-[#D4CDB5]/50 bg-[#F5F1E8]/35 p-2 sm:p-2.5">
                <div className="grid flex-1 min-h-0 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 auto-rows-fr">
                  {weekDayKeys.map((key) => renderWeeklyDayBlock(key))}
                </div>
              </div>
            ) : (
              <div className={`flex flex-1 min-h-0 flex-col overflow-hidden rounded-2xl border ${CALENDAR_BORDER_DIVIDER_SOFT}`}>
                <div className={`grid shrink-0 grid-cols-7 border-b ${CALENDAR_BORDER_DIVIDER} bg-[#F5F1E8]`}>
                  {DAY_LABELS_SHORT.map((d, colIdx) => (
                    <div
                      key={d}
                      className={`text-center text-[#5A5048] font-semibold py-2 px-0.5 ${
                        isWeekendMonthGridColumn(colIdx) ? WEEKEND_COLUMN_BG : ''
                      }`}
                      style={{
                        fontSize: '0.68rem',
                        letterSpacing: '0.08em',
                        fontFamily: "'Bebas Neue', sans-serif",
                      }}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div
                  className="grid min-h-0 flex-1 grid-cols-7"
                  style={{ gridTemplateRows: `repeat(${monthRowCount}, minmax(0, 1fr))` }}
                >
                  {grid.map((day, idx) => {
                    if (!day) {
                      return (
                        <div
                          key={`e-${idx}`}
                          className={`h-full min-h-0 border-r border-b ${CALENDAR_BORDER_DIVIDER_SOFT} ${
                            (idx + 1) % 7 === 0 ? 'border-r-0' : ''
                          } ${isWeekendMonthGridColumn(idx % 7) ? WEEKEND_COLUMN_BG_SOFT : 'bg-[#FAF8F3]'}`}
                        />
                      );
                    }
                    return renderMonthDayCell(day, idx);
                  })}
                </div>
              </div>
            )}
            </div>

            <div className="mt-3 pt-3 shrink-0 border-t border-[#E8E2D2]/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[#5A5048]">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-3 rounded-sm bg-green-100 ring-1 ring-green-200/80" />
                  Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-3 rounded-sm bg-red-100 ring-1 ring-red-200/80" />
                  Day off
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-3 rounded-sm bg-white ring-1 ring-[#D4CDB5]/80" />
                  Not set
                </span>
                {rangeMode === 'custom' && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-3 rounded-sm bg-[#F5F2E8]/80 ring-1 ring-[#C0B8A8]/50 opacity-60" />
                    Outside range
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => openDate(todayKey)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-[#c49a3c]/40 text-[#a67f2e] text-xs font-semibold hover:bg-[#c49a3c]/08 active:scale-[0.98] transition-all"
              >
                <Plus size={14} /> Add for today
              </button>
            </div>
          </div>
          </div>

          {/* ── Entries in range (sidebar) ── */}
          <div className="flex w-full shrink-0 flex-col min-h-0 max-h-[38vh] lg:max-h-none lg:w-80 xl:w-96 lg:self-stretch">
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm flex flex-1 min-h-0 flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className="text-[#1E2A35]"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.05em' }}
                  >
                    Entries in range
                  </h2>
                  <span className="text-[#5A5048] text-xs font-semibold tabular-nums shrink-0">
                    {sortedEntriesInRange.length}{' '}
                    <span className="font-normal text-[#9A8E7E]">
                      {sortedEntriesInRange.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </span>
                </div>
              </div>

              {sortedEntriesInRange.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center gap-2 min-h-[8rem]">
                  <div className="w-10 h-10 bg-[#EDE8D8] rounded-xl flex items-center justify-center">
                    <Clock size={18} className="text-[#B0A898]" />
                  </div>
                  <p className="text-[#B0A898] text-sm">No entries in this range.</p>
                  <p className="text-[#C0B8A8] text-xs">Pick a date on the calendar to add availability.</p>
                </div>
              ) : (
                <div
                  ref={entriesListRef}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-[#D4CDB5]/25 [scrollbar-gutter:stable]"
                >
                  {sortedEntriesInRange.map((entry) => {
                    const isActive = entry.date === selectedDate;
                    return (
                      <div
                        key={entry.id}
                        className={`px-4 py-3 transition-colors ${
                          isActive ? 'bg-[#1E2A35]/04' : 'hover:bg-[#F8F3E8]/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className={`text-sm font-semibold leading-tight ${
                                  isActive ? 'text-[#c49a3c]' : 'text-[#1E2A35]'
                                }`}
                              >
                                {formatDateShortFromKey(entry.date)}
                              </p>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                  entry.dayOff
                                    ? 'bg-red-50 text-red-600 border-red-200'
                                    : 'bg-green-50 text-green-700 border-green-200'
                                }`}
                              >
                                {entry.dayOff ? 'Day Off' : 'Open'}
                              </span>
                            </div>
                            {entry.note && (
                              <p className="text-[#9A8E7E] text-xs mt-0.5 italic line-clamp-2">{entry.note}</p>
                            )}
                            <div className="flex flex-col gap-0.5 mt-1.5 min-w-0">
                              {entry.dayOff ? (
                                <span className="text-[#C0B8A8] text-xs">Not available</span>
                              ) : entry.periods.length === 0 ? (
                                <span className="text-[#C0B8A8] text-xs">No times set</span>
                              ) : (
                                entry.periods.map((p) => (
                                  <span
                                    key={p.id}
                                    className="text-xs text-[#5A5048] tabular-nums leading-snug"
                                  >
                                    {formatTimeRange24(p.start, p.end)}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => openDate(entry.date)}
                              className="h-7 px-2 bg-[#F8F3E8] text-[#5A5048] border border-[#D4CDB5]/60 text-[11px] font-medium rounded-lg hover:bg-[#EDE8D8] active:scale-95 transition-all whitespace-nowrap flex items-center gap-1"
                            >
                              <Pencil size={10} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(entry.id)}
                              className="h-7 w-7 flex items-center justify-center rounded-lg text-[#C0B8A8] hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {sortedEntriesInRange.length > 0 && (
                <div className="shrink-0 border-t border-[#D4CDB5]/40 bg-[#FAF8F3]/80 px-4 py-2 text-center">
                  <p className="text-[#9A8E7E] text-[10px] sm:text-xs">
                    {entriesListOverflows
                      ? 'Scroll down for more data'
                      : `${sortedEntriesInRange.length} ${
                          sortedEntriesInRange.length === 1 ? 'entry' : 'entries'
                        } in this range`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
