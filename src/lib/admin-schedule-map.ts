import type { ClassBlockStatus, ClassDisplay, ClassOpenStatus } from './class-service';
import { normalizeDisciplineColorHex } from './default-assets';
import { statusColorFromHue, type DisciplineDisplay } from './discipline-service';

export interface AdminScheduleBlock {
  id: string;
  uid: string;
  dateKey: string;
  dayIndex: number;
  startHour: number;
  duration: number;
  className: string;
  title: string;
  coach: string;
  coachAccountId: string;
  disciplineId: string;
  capacity: number;
  enrolled: number;
  color: string;
  statusClass: ClassOpenStatus;
  statusBlock: ClassBlockStatus;
  startsAt: string;
  endsAt: string | null;
}

const DEFAULT_DURATION_MIN = 60;

export const BLOCK_STATUS_COLORS: Record<ClassBlockStatus, string> = {
  vacant: '#B0A898',
  occupied: '#3A4A5A',
  active: '#6B8E6B',
  closed: '#8A7E6E',
};

/** Admin time-blocking & staff slots — brand palette, not discipline calendar colors. */
export const OPERATIONS_BLOCK_FILLS = {
  active: '#c49a3c',
  open: '#DDB864',
  close: '#1E2A35',
  occupied: '#745b3c',
  pending: '#8A7E6E',
} as const;

export type ScheduleBlockColorMode = 'discipline' | 'operations';

export function operationsBlockFillFromStatus(
  statusBlock: ClassBlockStatus,
  statusClass: ClassOpenStatus,
): string {
  if (statusBlock === 'vacant') return BLOCK_STATUS_COLORS.vacant;
  if (statusBlock === 'closed' || statusClass === 'close') return OPERATIONS_BLOCK_FILLS.close;
  if (statusBlock === 'active') return OPERATIONS_BLOCK_FILLS.active;
  if (statusClass === 'open') return OPERATIONS_BLOCK_FILLS.open;
  if (statusBlock === 'occupied') return OPERATIONS_BLOCK_FILLS.occupied;
  return OPERATIONS_BLOCK_FILLS.pending;
}

export function operationsBlockFillColor(row: ClassDisplay): string {
  return operationsBlockFillFromStatus(row.statusBlock, row.statusClass);
}

export function coachDisplayShort(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return '—';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function resolveColor(classColors: Record<string, string>, disciplineName: string): string {
  if (!disciplineName || disciplineName === '—') return BLOCK_STATUS_COLORS.vacant;
  return classColors[disciplineName] ?? '#c49a3c';
}

/** Admin-assigned discipline colors for schedule blocks (name → fill). */
export function buildDisciplineClassColors(
  disciplines: Pick<DisciplineDisplay, 'name' | 'colorHex' | 'status'>[],
  fallback: Record<string, string> = {},
): Record<string, string> {
  const map: Record<string, string> = { ...fallback };
  for (const discipline of disciplines) {
    const hex = normalizeDisciplineColorHex(discipline.colorHex);
    map[discipline.name] =
      hex || statusColorFromHue(discipline.status.hue) || map[discipline.name] || '#c49a3c';
  }
  return map;
}

function blockDisplayColor(
  row: ClassDisplay,
  classColors: Record<string, string>,
  colorMode: ScheduleBlockColorMode,
): string {
  if (row.statusBlock === 'vacant') return BLOCK_STATUS_COLORS.vacant;
  if (colorMode === 'operations') return operationsBlockFillColor(row);
  if (row.disciplineName && row.disciplineName !== '—') {
    return resolveColor(classColors, row.disciplineName);
  }
  return BLOCK_STATUS_COLORS[row.statusBlock] ?? BLOCK_STATUS_COLORS.active;
}

function localStartHour(iso: string): number {
  return new Date(iso).getHours();
}

function durationMinutes(startsAt: string, endsAt: string | null): number {
  if (!endsAt) return DEFAULT_DURATION_MIN;
  const diff = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  if (!Number.isFinite(diff) || diff <= 0) return DEFAULT_DURATION_MIN;
  return Math.round(diff / 60_000);
}

export function dateKeyFromIso(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildStartsAtIso(
  dateKey: string,
  startHour: number,
  durationMin: number,
): { startsAt: string; endsAt: string } {
  const [y, m, d] = dateKey.split('-').map(Number);
  const start = new Date(y, m - 1, d, startHour, 0, 0, 0);
  const end = new Date(start.getTime() + durationMin * 60_000);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

/** Local wall-clock start/end on dateKey (minute precision). */
export function buildStartEndFromMinutes(
  dateKey: string,
  startMinutes: number,
  endMinutes: number,
): { startsAt: string; endsAt: string } {
  const [y, m, d] = dateKey.split('-').map(Number);
  const startH = Math.floor(startMinutes / 60);
  const startM = startMinutes % 60;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const start = new Date(y, m - 1, d, startH, startM, 0, 0);
  const end = new Date(y, m - 1, d, endH, endM, 0, 0);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

/** @deprecated Use buildStartEndFromMinutes */
export function buildStartEndIso(
  dateKey: string,
  startHour: number,
  endHour: number,
): { startsAt: string; endsAt: string } {
  return buildStartEndFromMinutes(dateKey, startHour * 60, endHour * 60);
}

export function localMinutesFromIso(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function rowToBlock(
  row: ClassDisplay,
  classColors: Record<string, string>,
  colorMode: ScheduleBlockColorMode,
  dayIndex = 0,
): AdminScheduleBlock {
  const dateKey = dateKeyFromIso(row.startsAt);
  const primaryCoach = row.coaches[0];
  const coachName = primaryCoach ? coachDisplayShort(primaryCoach.name) : '—';

  return {
    id: row.id,
    uid: row.uid,
    dateKey,
    dayIndex,
    startHour: localStartHour(row.startsAt),
    duration: durationMinutes(row.startsAt, row.endsAt),
    className: row.disciplineName !== '—' ? row.disciplineName : 'Time block',
    title: row.name.trim() || (row.uid ? `#${row.uid}` : 'Vacant slot'),
    coach: coachName,
    coachAccountId: primaryCoach?.accountId ?? '',
    disciplineId: row.disciplineId ?? '',
    capacity: row.classLimit ?? 0,
    enrolled: row.enrolledCount,
    color: blockDisplayColor(row, classColors, colorMode),
    statusClass: row.statusClass,
    statusBlock: row.statusBlock,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  };
}

export function classDisplayToScheduleBlock(
  row: ClassDisplay,
  classColors: Record<string, string>,
  weekDateKeys: string[],
  colorMode: ScheduleBlockColorMode = 'discipline',
): AdminScheduleBlock | null {
  const dateKey = dateKeyFromIso(row.startsAt);
  const dayIndex = weekDateKeys.indexOf(dateKey);
  return rowToBlock(row, classColors, colorMode, dayIndex >= 0 ? dayIndex : 0);
}

export function allClassesToBlocks(
  rows: ClassDisplay[],
  classColors: Record<string, string>,
  colorMode: ScheduleBlockColorMode = 'discipline',
): AdminScheduleBlock[] {
  return rows.map((row) => rowToBlock(row, classColors, colorMode));
}

/** Immediate calendar paint after create/update before the next full fetch. */
export function provisionalScheduleBlock(params: {
  id: string;
  dateKey: string;
  startsAt: string;
  endsAt: string | null;
  startHour: number;
  statusClass?: ClassOpenStatus;
  statusBlock?: ClassBlockStatus;
  statusClass?: ClassOpenStatus;
  classLimit?: number;
  uid?: string;
  name?: string;
  enrolled?: number;
  colorMode?: ScheduleBlockColorMode;
}): AdminScheduleBlock {
  const duration = params.endsAt
    ? Math.max(
        15,
        Math.round(
          (new Date(params.endsAt).getTime() - new Date(params.startsAt).getTime()) / 60_000,
        ),
      )
    : 60;

  const statusBlock = params.statusBlock ?? 'vacant';
  const statusClass = params.statusClass ?? 'pending';
  const colorMode = params.colorMode ?? 'operations';

  return {
    id: params.id,
    uid: params.uid ?? '',
    dateKey: params.dateKey,
    dayIndex: 0,
    startHour: params.startHour,
    duration,
    className: 'Time block',
    title: params.name?.trim() || (params.uid ? `#${params.uid}` : 'Vacant slot'),
    coach: '—',
    coachAccountId: '',
    disciplineId: '',
    capacity: params.classLimit ?? 0,
    enrolled: params.enrolled ?? 0,
    color:
      colorMode === 'operations'
        ? operationsBlockFillFromStatus(statusBlock, statusClass)
        : BLOCK_STATUS_COLORS[statusBlock],
    statusClass,
    statusBlock,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
  };
}

export function mergeScheduleBlock(
  blocks: AdminScheduleBlock[],
  next: AdminScheduleBlock,
): AdminScheduleBlock[] {
  const filtered = blocks.filter((b) => b.id !== next.id);
  return [...filtered, next];
}
