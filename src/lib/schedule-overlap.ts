/** Default span when `ends_at` is null (matches Supabase overlap check). */
export const DEFAULT_CLASS_DURATION_MS = 60 * 60 * 1000;

export interface ScheduleTimedRow {
  id: string;
  startsAt: string;
  endsAt: string | null;
  uid?: string;
  name?: string;
}

export function classTimeRangeMs(row: {
  startsAt: string;
  endsAt: string | null;
}): { startMs: number; endMs: number } {
  const startMs = new Date(row.startsAt).getTime();
  const endMs = row.endsAt
    ? new Date(row.endsAt).getTime()
    : startMs + DEFAULT_CLASS_DURATION_MS;
  return { startMs, endMs };
}

/** Half-open overlap: [start, end) — touching edges (end === other start) do not overlap. */
export function timeRangesOverlapMs(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

export function findOverlappingScheduleRow(
  rows: Iterable<ScheduleTimedRow>,
  candidate: { startsAt: string; endsAt: string | null },
  excludeClassId?: string | null,
): ScheduleTimedRow | null {
  const { startMs: candStart, endMs: candEnd } = classTimeRangeMs(candidate);

  for (const row of rows) {
    if (excludeClassId && row.id === excludeClassId) continue;
    const { startMs, endMs } = classTimeRangeMs(row);
    if (timeRangesOverlapMs(candStart, candEnd, startMs, endMs)) {
      return row;
    }
  }
  return null;
}
