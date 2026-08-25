// ─────────────────────────────────────────────
// SHARED CALENDAR HELPERS
// Used by the "Upcoming Classes" weekly calendar (Classes page) and the
// Book a Class weekly/monthly calendar. Keep this file presentation-agnostic
// so both pages can render the same date math consistently.
// ─────────────────────────────────────────────

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const DAY_LABELS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const DAY_LABELS_LONG = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Studio hours shown on every calendar: 9:00 AM – 9:00 PM. */
export const SCHEDULE_START_HOUR = 9;
export const SCHEDULE_END_HOUR = 21;
export const SCHEDULE_START_TIME_24 = '09:00';
export const SCHEDULE_END_TIME_24 = '21:00';

/** Hour marks for week/admin grids (9 through 21 inclusive). */
export const SCHEDULE_HOURS: number[] = Array.from(
  { length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1 },
  (_, i) => SCHEDULE_START_HOUR + i,
);

/** 12-hour time labels from 9:00 AM through 9:00 PM. */
export function buildScheduleTimeSlots(stepMinutes = 30): string[] {
  const slots: string[] = [];
  const start = SCHEDULE_START_HOUR * 60;
  const end = SCHEDULE_END_HOUR * 60;
  for (let m = start; m <= end; m += stepMinutes) {
    const hour = Math.floor(m / 60);
    const minute = m % 60;
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    slots.push(`${hour12}:${String(minute).padStart(2, '0')} ${period}`);
  }
  return slots;
}

export function parseTimeToMinutes(time: string): number {
  const [clock, period] = time.split(' ');
  const [hourStr, minuteStr] = clock.split(':');
  let hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

export function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${period}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** Today's date at local midnight (no time component). */
export function getTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Today's date as YYYY-MM-DD in local time. */
export function getTodayDateKey(): string {
  return toDateKey(getTodayLocal());
}

/** Add calendar days to a date (local midnight preserved). */
export function addDaysToDate(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/** Date key offset by N days from today (or optional base date). */
export function dateKeyFromOffset(dayOffset: number, from?: Date): string {
  return toDateKey(addDaysToDate(from ?? getTodayLocal(), dayOffset));
}

/** Shift a date key by N calendar days. */
export function offsetDateKey(key: string, days: number): string {
  return toDateKey(addDaysToDate(dateKeyToDate(key), days));
}

/** Whole-day difference from `fromKey` to `toKey` (local dates). */
export function daysBetweenKeys(fromKey: string, toKeyStr: string): number {
  const from = dateKeyToDate(fromKey);
  const to = dateKeyToDate(toKeyStr);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** Re-key a record so every date key is shifted by `dayOffset` days. */
export function shiftDateKeyRecord<T>(record: Record<string, T>, dayOffset: number): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) {
    result[offsetDateKey(key, dayOffset)] = value;
  }
  return result;
}

/** Shift mock schedule keys so `anchorKey` lands on `targetDate`. */
export function shiftKeysToAnchor<T>(
  record: Record<string, T>,
  anchorKey: string,
  targetDate: Date = getTodayLocal(),
): Record<string, T> {
  return shiftDateKeyRecord(record, daysBetweenKeys(anchorKey, toDateKey(targetDate)));
}

export function formatDateShortFromKey(key: string): string {
  return dateKeyToDate(key).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export function formatDateLongFromKey(key: string): string {
  return dateKeyToDate(key).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

/** Monday of the week containing the given date. */
export function getMondayOfWeekContaining(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** e.g. "Aug 18 – Aug 24, 2026" for the Mon–Sun week containing `anchor`. */
export function formatMonSunWeekRange(anchor: Date = getTodayLocal()): string {
  const mon = getMondayOfWeekContaining(anchor);
  const sun = addDaysToDate(mon, 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${mon.toLocaleDateString('en-US', opts)} – ${sun.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

/** "HH:MM" (24h) → "h:MM AM/PM" with non-breaking space before period. */
export function formatTime24To12(hhmm: string): string {
  if (!hhmm) return '';
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}\u00a0${ampm}`;
}

/** Single-line time range for tables, e.g. "7:00 AM – 9:00 AM". */
export function formatTimeRange24(start: string, end: string): string {
  return `${formatTime24To12(start)}\u00a0–\u00a0${formatTime24To12(end)}`;
}

/** Shift every key in a Set of date keys. */
export function shiftDateKeySet(keys: Iterable<string>, dayOffset: number): Set<string> {
  return new Set([...keys].map((k) => offsetDateKey(k, dayOffset)));
}

/** Initial calendar month/year from local today. */
export function getInitialCalendarMonth(): { year: number; month: number } {
  const today = getTodayLocal();
  return { year: today.getFullYear(), month: today.getMonth() };
}

/** Sunday-start week for the given offset relative to the real "now" (used by the recurring Upcoming Classes schedule). */
export function getWeekDatesForOffset(weekOffset: number): Date[] {
  const now = new Date();
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

/** Sunday-start week that contains the given anchor date. */
export function getWeekDatesContaining(anchor: Date): Date[] {
  const sunday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

export function formatWeekRange(dates: Date[]): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = dates[0].toLocaleDateString('en-US', opts);
  const end = dates[6].toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${start} – ${end}`;
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateKeyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Calendar grid (with leading/trailing blanks) for a given month, matching the small month calendar layout. */
export function buildMonthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = [];
  for (let i = 0; i < first; i++) grid.push(null);
  for (let d = 1; d <= days; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

export function toDateKeyFromParts(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
