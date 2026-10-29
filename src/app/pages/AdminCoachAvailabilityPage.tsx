import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronLeft, ChevronRight, ChevronDown, Info, Users, Clock, X,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { PageLoadingScreen } from '../components/layout/PageLoadingScreen';
import { fetchStaffDirectoryAccounts } from '../../lib/admin-service';
import {
  fetchStaffAvailabilityForAccounts,
  groupAvailabilityByAccount,
  type StaffAvailabilityEntry,
} from '../../lib/staff-availability-service';
import {
  MONTH_NAMES, DAY_LABELS_SHORT, buildMonthGrid, toDateKeyFromParts,
  getTodayDateKey, getInitialCalendarMonth, getTodayLocal,
  formatDateShortFromKey, formatTimeRange24, formatMonSunWeekRange,
  getMondayOfWeekContaining, toDateKey, dateKeyToDate, offsetDateKey,
  isWeekendMonthGridColumn, isWeekendDate, WEEKEND_COLUMN_BG, WEEKEND_COLUMN_BG_SOFT,
} from '../components/calendar/weekCalendarUtils';
import { CategorizedAddFilter, matchesAnySelected } from '../components/filters/CategorizedAddFilter';
import { AVAILABILITY_DAY_FILTER_GROUP } from '../components/filters/status-filter-groups';
import {
  ChronologicalSortSelect,
  sortChronologically,
  type ChronologicalOrder,
} from '../components/layout/ChronologicalSortSelect';
import {
  CALENDAR_BORDER_DIVIDER,
  CALENDAR_BORDER_DIVIDER_SOFT,
  CALENDAR_TODAY_COLUMN,
  CALENDAR_TODAY_RING,
} from '../components/calendar/calendarContrast';

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

interface Coach {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  availability: AvailabilityEntry[];
}

const COACH_ACCENT_COLORS = ['#5A8A7A', '#E8A87C', '#7A7EBC', '#A8806A', '#B07A9E', '#c49a3c', '#3A4A5A'];

function initialsFromName(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

type CalendarView = 'weekly' | 'monthly';

function availabilityCellClasses(
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

function mapSavedEntry(entry: StaffAvailabilityEntry): AvailabilityEntry {
  return {
    id: entry.id,
    date: entry.date,
    dayOff: entry.dayOff,
    note: entry.note,
    periods: entry.periods.map((p, index) => ({
      id: index + 1,
      start: p.start,
      end: p.end,
    })),
  };
}

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
            className="action-button w-full py-2.5 rounded-full bg-[#1E2A35] text-white text-sm hover:bg-[#263545] transition-all"
           >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────

export function AdminCoachAvailabilityPanel() {
  const todayKey = getTodayDateKey();
  const initialCal = getInitialCalendarMonth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [calYear, setCalYear]   = useState(initialCal.year);
  const [calMonth, setCalMonth] = useState(initialCal.month);
  const [calendarView, setCalendarView] = useState<CalendarView>('monthly');
  const [chronoOrder, setChronoOrder] = useState<ChronologicalOrder>('latest');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [weekStartKey, setWeekStartKey] = useState(() =>
    toDateKey(getMondayOfWeekContaining(getTodayLocal())),
  );
  const [viewingEntry, setViewingEntry] = useState<AvailabilityEntry | null>(null);
  const [coachMenuOpen, setCoachMenuOpen] = useState(false);
  const coachMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    void (async () => {
      const rows = await fetchStaffDirectoryAccounts();
      const coachRows = rows.filter((row) => row.account.role === 'coach');
      const ids = coachRows.map((row) => row.account.id);
      const { entries, error } = await fetchStaffAvailabilityForAccounts(ids);
      if (cancelled) return;
      if (error) {
        setLoadError(error);
        setCoaches([]);
        setLoading(false);
        return;
      }
      const byAccount = groupAvailabilityByAccount(entries);
      const mapped: Coach[] = coachRows.map((row, index) => {
        const name =
          row.profile.display_name?.trim()
          || row.profile.name?.trim()
          || row.account.email.split('@')[0];
        const specialty = row.profile.experience?.trim() || row.profile.classes?.join(' · ') || 'Coach';
        const availability = (byAccount.get(row.account.id) ?? []).map(mapSavedEntry);
        return {
          id: row.account.id,
          name,
          initials: initialsFromName(name),
          color: COACH_ACCENT_COLORS[index % COACH_ACCENT_COLORS.length],
          role: specialty,
          availability,
        };
      });
      setCoaches(mapped);
      setSelectedCoachId((prev) => {
        if (prev && mapped.some((c) => c.id === prev)) return prev;
        return mapped[0]?.id ?? null;
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!coachMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!coachMenuRef.current?.contains(event.target as Node)) {
        setCoachMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [coachMenuOpen]);

  const coach = useMemo(
    () => coaches.find((c) => c.id === selectedCoachId) ?? null,
    [coaches, selectedCoachId],
  );
  const grid  = buildMonthGrid(calYear, calMonth);
  const monthRowCount = Math.max(1, Math.ceil(grid.length / 7));
  const weekDayKeys = Array.from({ length: 7 }, (_, i) => offsetDateKey(weekStartKey, i));
  const monthKeyPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
  const weekEndKey = offsetDateKey(weekStartKey, 6);

  const entriesInView = useMemo(() => {
    if (!coach) return [];
    const sorted = [...coach.availability].sort((a, b) => a.date.localeCompare(b.date));
    if (calendarView === 'monthly') {
      return sorted.filter((e) => e.date.startsWith(monthKeyPrefix));
    }
    return sorted.filter((e) => e.date >= weekStartKey && e.date <= weekEndKey);
  }, [coach, calendarView, monthKeyPrefix, weekStartKey, weekEndKey]);

  const orderedEntriesInView = useMemo(
    () =>
      sortChronologically(
        entriesInView.filter((entry) =>
          matchesAnySelected(statusFilters, entry.dayOff ? 'day_off' : 'open'),
        ),
        (entry) => entry.date,
        chronoOrder,
      ),
    [entriesInView, chronoOrder, statusFilters],
  );

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };
  const prevWeek = () => setWeekStartKey((k) => offsetDateKey(k, -7));
  const nextWeek = () => setWeekStartKey((k) => offsetDateKey(k, 7));

  const shiftCalendarPrev = () => {
    if (calendarView === 'monthly') prevMonth();
    else prevWeek();
  };
  const shiftCalendarNext = () => {
    if (calendarView === 'monthly') nextMonth();
    else nextWeek();
  };

  const calendarTitle =
    calendarView === 'monthly'
      ? `${MONTH_NAMES[calMonth]} ${calYear}`
      : formatMonSunWeekRange(dateKeyToDate(weekStartKey));

  const availableCount   = coach?.availability.filter(e => !e.dayOff).length ?? 0;
  const unavailableCount = coach?.availability.filter(e => e.dayOff).length ?? 0;
  const periodCount      = coach?.availability.reduce((n, e) => n + e.periods.length, 0) ?? 0;

  return (
    <>
      {viewingEntry && (
        <EntryDetailPanel entry={viewingEntry} onClose={() => setViewingEntry(null)} />
      )}

      <div className="relative">
      {loading && (
        <PageLoadingScreen overlay variant="calendar" message="Loading coach availability" />
      )}
      <div className="flex items-center gap-2 mb-5">
        <Info size={13} className="text-[#B0A898] shrink-0" />
        <p className="text-[#9A8E7E] text-sm">Read-only view. Coaches manage their own availability from the Staff Portal.</p>
      </div>

      {loadError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {!loading && coaches.length === 0 && !loadError && (
        <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-5 py-10 text-center text-sm text-[#8A7E6E]">
          No coaches in the staff directory yet.
        </div>
      )}

      {coach && (
      <div className="flex gap-5 items-start">
            {/* Calendar */}
            <div className="w-full min-w-[18rem] max-w-md shrink-0">
              <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
                <div ref={coachMenuRef} className="relative mb-4 pb-4 border-b border-[#E8E2D2]/70">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={coachMenuOpen}
                    aria-label="Select coach"
                    onClick={() => setCoachMenuOpen((open) => !open)}
                    className="flex w-full items-center gap-3 rounded-2xl text-left transition-colors hover:bg-[#F8F3E8]/70 -mx-1 px-1 py-1"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: coach.color + '25' }}>
                      <span className="text-sm font-bold" style={{ color: coach.color }}>{coach.initials}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[#1E2A35] text-sm font-semibold truncate">{coach.name}</p>
                      <p className="text-[#9A8E7E] text-xs truncate">{coach.role}</p>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-[#B0A898] transition-transform ${coachMenuOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>
                  {coachMenuOpen && (
                    <div
                      role="listbox"
                      className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-[#D4CDB5]/70 bg-white p-1 shadow-lg"
                    >
                      {coaches.map((c) => {
                        const avail = c.availability.filter((e) => !e.dayOff).length;
                        const unavail = c.availability.filter((e) => e.dayOff).length;
                        const isActive = c.id === selectedCoachId;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onClick={() => {
                              setSelectedCoachId(c.id);
                              setCoachMenuOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                              isActive ? 'bg-[#F8F3E8]' : 'hover:bg-[#FDFAF5]'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: c.color + '25' }}>
                              <span className="text-xs font-bold" style={{ color: c.color }}>{c.initials}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-tight truncate text-[#1E2A35]">{c.name}</p>
                              <p className="text-xs mt-0.5 text-[#B0A898]">
                                {avail > 0 ? `${avail} available` : ''}
                                {avail > 0 && unavail > 0 ? ' · ' : ''}
                                {unavail > 0 ? `${unavail} off` : ''}
                                {avail === 0 && unavail === 0 && 'No entries set'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex p-1 mb-4 bg-[#F8F3E8] rounded-full border border-[#D4CDB5]/40 w-fit">
                  {([['monthly', 'Monthly'], ['weekly', 'Weekly']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCalendarView(val)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        calendarView === val
                          ? 'bg-[#1E2A35] text-white shadow-sm'
                          : 'text-[#5A5048] hover:text-[#1E2A35]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 mb-3">
                  <button
                    type="button"
                    onClick={shiftCalendarPrev}
                    className="w-8 h-8 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
                    aria-label="Previous range"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span
                    className="text-[#1E2A35] text-center min-w-0 truncate px-1"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.05em' }}
                  >
                    {calendarTitle}
                  </span>
                  <button
                    type="button"
                    onClick={shiftCalendarNext}
                    className="w-8 h-8 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
                    aria-label="Next range"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {calendarView === 'monthly' ? (
                  <div className={`overflow-hidden rounded-2xl border ${CALENDAR_BORDER_DIVIDER_SOFT}`}>
                    <div className={`grid grid-cols-7 border-b ${CALENDAR_BORDER_DIVIDER} bg-[#F5F1E8]`}>
                      {DAY_LABELS_SHORT.map((d, colIdx) => (
                        <div
                          key={d}
                          className={`text-center text-[#5A5048] font-semibold py-2 px-0.5 ${
                            isWeekendMonthGridColumn(colIdx) ? WEEKEND_COLUMN_BG : ''
                          }`}
                          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.68rem',
                            letterSpacing: '0.05em' }}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                    <div
                      className="grid grid-cols-7"
                      style={{ gridTemplateRows: `repeat(${monthRowCount}, minmax(3.25rem, auto))` }}
                    >
                      {grid.map((day, idx) => {
                        if (!day) {
                          return (
                            <div
                              key={`e-${idx}`}
                              className={`min-h-[3.25rem] border-r border-b ${CALENDAR_BORDER_DIVIDER_SOFT} ${
                                (idx + 1) % 7 === 0 ? 'border-r-0' : ''
                              } ${isWeekendMonthGridColumn(idx % 7) ? WEEKEND_COLUMN_BG_SOFT : 'bg-[#FAF8F3]'}`}
                            />
                          );
                        }
                        const key = toDateKeyFromParts(calYear, calMonth, day);
                        const entry = coach.availability.find((e) => e.date === key);
                        const isToday = key === todayKey;
                        const isWeekend = isWeekendDate(new Date(calYear, calMonth, day));
                        const hasEntry = Boolean(entry);
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={!hasEntry}
                            onClick={() => entry && setViewingEntry(entry)}
                            className={`relative min-h-[3.25rem] sm:min-h-[3.75rem] flex flex-col items-stretch text-left p-1.5 border-r border-b ${CALENDAR_BORDER_DIVIDER_SOFT} transition-colors ${
                              (idx + 1) % 7 === 0 ? 'border-r-0' : ''
                            } ${availabilityCellClasses(entry, isToday, isWeekend)} ${
                              hasEntry ? 'cursor-pointer' : 'cursor-default'
                            }`}
                          >
                            <span
                              className={`self-start w-8 h-8 flex items-center justify-center rounded-lg text-sm leading-none shrink-0 ${
                                isToday
                                  ? `${CALENDAR_TODAY_RING} font-bold text-[#1E2A35] bg-white/80`
                                  : entry?.dayOff
                                    ? 'font-bold text-red-900'
                                    : entry
                                      ? 'font-bold text-[#1E3A2F]'
                                      : 'font-semibold text-[#1E2A35]'
                              }`}
                              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
                            >
                              {day}
                            </span>
                            {entry?.dayOff ? (
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
                      })}
                    </div>
                  </div>
                ) : (
                  <div className={`overflow-hidden rounded-2xl border ${CALENDAR_BORDER_DIVIDER_SOFT}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-[#F5F1E8]/50">
                      {weekDayKeys.map((key) => {
                        const entry = coach.availability.find((e) => e.date === key);
                        const date = dateKeyToDate(key);
                        const isToday = key === todayKey;
                        const hasEntry = Boolean(entry);
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={!hasEntry}
                            onClick={() => entry && setViewingEntry(entry)}
                            className={`rounded-xl p-3 text-left transition-colors min-h-[4.5rem] ${availabilityCellClasses(entry, isToday, isWeekendDate(date))} ${
                              hasEntry ? 'cursor-pointer' : 'cursor-default'
                            } ring-1 ring-inset ring-[#D4CDB5]/35`}
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#7A7268]">
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </p>
                            <p
                              className="text-[#1E2A35] leading-none mt-1"
                              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.05em' }}
                            >
                              {date.getDate()}
                            </p>
                            {entry?.dayOff ? (
                              <p className="text-xs font-semibold text-red-800 mt-1">Day off</p>
                            ) : entry && entry.periods[0] ? (
                              <p className="text-[11px] text-[#2F4F3F] tabular-nums mt-1 line-clamp-2">
                                {formatTimeRange24(entry.periods[0].start, entry.periods[0].end)}
                              </p>
                            ) : entry ? (
                              <p className="text-[11px] text-[#5A5048] mt-1">Available</p>
                            ) : (
                              <p className="text-[11px] text-[#B0A898] mt-1 italic">Not set</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-[#E8E2D2]/70 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[#5A5048]">
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
                </div>
              </div>
              <p className="text-[#C0B8A8] text-xs mt-2.5 text-center">Click a shaded date to view details</p>
            </div>

            {/* Availability list */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Available Days',  value: availableCount,   color: 'text-green-600', bg: 'bg-green-50',       border: 'border-green-200'     },
                  { label: 'Days Off',         value: unavailableCount, color: 'text-red-600',   bg: 'bg-red-50',         border: 'border-red-200'       },
                  { label: 'Time Periods',     value: periodCount,      color: 'text-[#c49a3c]', bg: 'bg-[#c49a3c]/10',  border: 'border-[#c49a3c]/30'  },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-2xl border ${s.border} px-4 py-3 shadow-sm`}>
                    <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={`font-bold ${s.color}`} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40 flex flex-wrap items-center justify-end gap-2">
                  <CategorizedAddFilter
                    groups={[AVAILABILITY_DAY_FILTER_GROUP]}
                    selected={{ status: statusFilters }}
                    onChange={(next) => setStatusFilters(next.status ?? [])}
                  />
                  <ChronologicalSortSelect value={chronoOrder} onChange={setChronoOrder} />
                </div>
                <div className="grid grid-cols-[minmax(0,1.2fr)_72px_minmax(9rem,1.5fr)_64px] gap-x-3 px-4 py-2 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 items-center">
                  {['Date', 'Status', 'Time Ranges', 'Actions'].map(h => (
                    <p key={h} className="text-[#9A8E7E] text-[10px] uppercase tracking-widest font-medium">{h}</p>
                  ))}
                </div>

                {coach.availability.length === 0 ? (
                  <div className="px-5 py-14 text-center">
                    <Users size={24} className="mx-auto text-[#D4CDB5] mb-3" />
                    <p className="text-[#B0A898] text-sm">No availability recorded for {coach.name.split(' ')[0]}.</p>
                    <p className="text-[#C0B8A8] text-xs mt-1">The coach has not set any availability yet.</p>
                  </div>
                ) : orderedEntriesInView.length === 0 ? (
                  <div className="px-5 py-14 text-center">
                    <p className="text-[#B0A898] text-sm">No entries in this {calendarView === 'monthly' ? 'month' : 'week'}.</p>
                    <p className="text-[#C0B8A8] text-xs mt-1">Try another range or check other dates on the calendar.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#D4CDB5]/30">
                    {orderedEntriesInView.map(entry => (
                      <div key={entry.id} className="grid grid-cols-[minmax(0,1.2fr)_72px_minmax(9rem,1.5fr)_64px] gap-x-3 px-4 py-1.5 items-center hover:bg-[#F8F3E8]/40 transition-colors">
                        <p className="text-[#1E2A35] text-xs font-semibold truncate">{formatDateShortFromKey(entry.date)}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit border leading-none ${!entry.dayOff ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {!entry.dayOff ? 'Open' : 'Day Off'}
                        </span>
                        <p className="text-[11px] text-[#5A5048] truncate tabular-nums min-w-0">
                          {entry.dayOff
                            ? 'Not available'
                            : entry.periods.length === 0
                              ? 'No time ranges set'
                              : `${formatTimeRange24(entry.periods[0].start, entry.periods[0].end)}${entry.periods.length > 1 ? ` +${entry.periods.length - 1}` : ''}`}
                        </p>
                        <button
                          onClick={() => setViewingEntry(entry)}
                          className="h-6 px-2.5 bg-[#F8F3E8] text-[#5A5048] border border-[#D4CDB5]/60 text-[11px] font-medium rounded-md hover:bg-[#EDE8D8] active:scale-95 transition-all whitespace-nowrap w-fit"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[#C0B8A8] text-xs mt-3 text-right">
                {entriesInView.length} in view · {coach.availability.length} total · Staff Portal
              </p>
            </div>
        </div>
      )}
      </div>
    </>
  );
}

export default function AdminCoachAvailabilityPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  if (!adminUser) return null;

  return (
    <div className="h-full min-h-0 overflow-hidden flex flex-col">
      <div className="max-w-8xl mx-auto px-6 py-8 w-full flex-1 min-h-0 flex flex-col overflow-y-auto">
        <AdminCoachAvailabilityPanel />
      </div>
    </div>
  );
}
