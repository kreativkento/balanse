export const CALENDAR_DAY_START_HOUR = 0;
export const CALENDAR_DAY_END_HOUR = 23;

/** Hour marks 12:00 AM (0) through 11:00 PM (23). */
export const CALENDAR_DAY_HOURS: number[] = Array.from({ length: 24 }, (_, i) => i);

export const CLOCK_MINUTE_STEP = 5;
export const CLOCK_MINUTES: number[] = Array.from({ length: 12 }, (_, i) => i * CLOCK_MINUTE_STEP);

/** 12-hour face labels in 4×3 order (12, 1 … 11). */
export const CLOCK_HOUR_LABELS: number[] = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export type ClockPeriod = 'AM' | 'PM';

export function formatMinutesOfDay(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h24 = Math.floor(clamped / 60);
  const min = clamped % 60;
  const period: ClockPeriod = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${period}`;
}

export function formatHour24(h: number): string {
  return formatMinutesOfDay(h * 60);
}

export function minutesFromIsoLocal(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function parseMinutesOfDay(totalMinutes: number): {
  period: ClockPeriod;
  hour12: number;
  minute: number;
  hour24: number;
} {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const hour24 = Math.floor(clamped / 60);
  const minute = clamped % 60;
  const period: ClockPeriod = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { period, hour12, minute, hour24 };
}

export function clockSelectionToMinutes(
  period: ClockPeriod,
  hour12: number,
  minute: number,
): number {
  let hour24: number;
  if (period === 'AM') {
    hour24 = hour12 === 12 ? 0 : hour12;
  } else {
    hour24 = hour12 === 12 ? 12 : hour12 + 12;
  }
  return hour24 * 60 + minute;
}

export function snapMinutesToStep(minutes: number, step = CLOCK_MINUTE_STEP): number {
  return Math.round(minutes / step) * step;
}

/** Parse studio "HH:MM" (24h) to minutes from midnight; null if invalid. */
export function parseTime24String(value: string): number | null {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

/** Minutes from midnight → "HH:MM" (24h). */
export function formatMinutesToTime24(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
