import { parseTime24String } from '../app/components/calendar/clock-time';
import { supabase } from './supabase';

export type CoachScheduleAvailabilityStatus = 'not_set' | 'available' | 'unavailable';

export function coachAvailabilityHint(status: CoachScheduleAvailabilityStatus): string {
  if (status === 'available') return 'Coach is available on this schedule';
  if (status === 'unavailable') return 'Coach is not available on this schedule';
  return 'Coach availability not set';
}

function periodCoversClassSlot(
  period: StaffAvailabilityPeriod,
  classStartMinutes: number,
  classEndMinutes: number,
): boolean {
  const periodStart = parseTime24String(period.start);
  const periodEnd = parseTime24String(period.end);
  if (periodStart == null || periodEnd == null) return false;
  return periodStart <= classStartMinutes && periodEnd >= classEndMinutes;
}

/** Whether staff marked themselves available for this date/time block. */
export function coachAvailabilityForScheduleSlot(
  entry: StaffAvailabilityEntry | undefined,
  classStartMinutes: number,
  classEndMinutes: number,
): CoachScheduleAvailabilityStatus {
  if (!entry) return 'not_set';
  if (entry.dayOff) return 'unavailable';
  const covers = entry.periods.some((period) =>
    periodCoversClassSlot(period, classStartMinutes, classEndMinutes),
  );
  return covers ? 'available' : 'unavailable';
}

export interface StaffAvailabilityPeriod {
  start: string;
  end: string;
}

export interface StaffAvailabilityEntry {
  id: string;
  accountId: string;
  date: string;
  dayOff: boolean;
  note: string;
  periods: StaffAvailabilityPeriod[];
}

type StaffAvailabilityRow = {
  id: string;
  account_id: string;
  availability_date: string;
  day_off: boolean;
  note: string;
  periods: unknown;
};

function normalizeDateKey(value: string): string {
  return value.slice(0, 10);
}

function parsePeriods(raw: unknown): StaffAvailabilityPeriod[] {
  if (!Array.isArray(raw)) return [];
  const out: StaffAvailabilityPeriod[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const start = (item as { start?: unknown }).start;
    const end = (item as { end?: unknown }).end;
    if (typeof start === 'string' && typeof end === 'string' && start && end) {
      out.push({ start, end });
    }
  }
  return out;
}

export function rowToStaffAvailabilityEntry(row: StaffAvailabilityRow): StaffAvailabilityEntry {
  return {
    id: row.id,
    accountId: row.account_id,
    date: normalizeDateKey(row.availability_date),
    dayOff: row.day_off,
    note: row.note ?? '',
    periods: parsePeriods(row.periods),
  };
}

export async function fetchMyStaffAvailability(): Promise<{
  entries: StaffAvailabilityEntry[];
  error?: string;
}> {
  const { data, error } = await supabase
    .from('staff_availability')
    .select('id, account_id, availability_date, day_off, note, periods')
    .order('availability_date', { ascending: true });

  if (error) {
    console.error('fetchMyStaffAvailability:', error.message);
    return { entries: [], error: error.message };
  }

  return {
    entries: (data ?? []).map((row) => rowToStaffAvailabilityEntry(row as StaffAvailabilityRow)),
  };
}

export async function upsertMyStaffAvailability(input: {
  date: string;
  dayOff: boolean;
  note: string;
  periods: StaffAvailabilityPeriod[];
}): Promise<{ entry?: StaffAvailabilityEntry; error?: string }> {
  const { data, error } = await supabase.rpc('upsert_staff_availability', {
    p_availability_date: input.date,
    p_day_off: input.dayOff,
    p_note: input.note.trim(),
    p_periods: input.periods,
  });

  if (error) {
    console.error('upsertMyStaffAvailability:', error.message);
    return { error: error.message };
  }

  if (!data) {
    return { error: 'Save failed — no row returned.' };
  }

  return { entry: rowToStaffAvailabilityEntry(data as StaffAvailabilityRow) };
}

export async function deleteMyStaffAvailability(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('delete_staff_availability', { p_id: id });

  if (error) {
    console.error('deleteMyStaffAvailability:', error.message);
    return { error: error.message };
  }

  return {};
}

/** Admin / dev: availability for one or more staff accounts. */
export async function fetchStaffAvailabilityForAccounts(accountIds: string[]): Promise<{
  entries: StaffAvailabilityEntry[];
  error?: string;
}> {
  if (accountIds.length === 0) {
    return { entries: [] };
  }

  const { data, error } = await supabase
    .from('staff_availability')
    .select('id, account_id, availability_date, day_off, note, periods')
    .in('account_id', accountIds)
    .order('availability_date', { ascending: true });

  if (error) {
    console.error('fetchStaffAvailabilityForAccounts:', error.message);
    return { entries: [], error: error.message };
  }

  return {
    entries: (data ?? []).map((row) => rowToStaffAvailabilityEntry(row as StaffAvailabilityRow)),
  };
}

/** Admin assign flow: availability rows for coaches on one calendar date. */
export async function fetchStaffAvailabilityForSchedule(
  accountIds: string[],
  dateKey: string,
): Promise<{ entries: StaffAvailabilityEntry[]; error?: string }> {
  if (accountIds.length === 0) {
    return { entries: [] };
  }

  const { data, error } = await supabase
    .from('staff_availability')
    .select('id, account_id, availability_date, day_off, note, periods')
    .in('account_id', accountIds)
    .eq('availability_date', normalizeDateKey(dateKey))
    .order('account_id', { ascending: true });

  if (error) {
    console.error('fetchStaffAvailabilityForSchedule:', error.message);
    return { entries: [], error: error.message };
  }

  return {
    entries: (data ?? []).map((row) => rowToStaffAvailabilityEntry(row as StaffAvailabilityRow)),
  };
}

export function groupAvailabilityByAccount(
  entries: StaffAvailabilityEntry[],
): Map<string, StaffAvailabilityEntry[]> {
  const map = new Map<string, StaffAvailabilityEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.accountId) ?? [];
    list.push(entry);
    map.set(entry.accountId, list);
  }
  return map;
}
