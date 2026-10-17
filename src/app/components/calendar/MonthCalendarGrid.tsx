import {
  buildMonthGrid,
  toDateKeyFromParts,
  DAY_LABELS_FULL,
  DAY_LABELS_SHORT,
  isWeekendDate,
  isWeekendMonthGridColumn,
  WEEKEND_COLUMN_BG,
  WEEKEND_COLUMN_BG_SOFT,
} from './weekCalendarUtils';
import {
  CALENDAR_BORDER_DIVIDER,
  CALENDAR_BORDER_DIVIDER_SOFT,
  CALENDAR_DATE_MUTED,
  CALENDAR_TODAY_COLUMN,
  CALENDAR_TODAY_RING,
} from './calendarContrast';

// ─────────────────────────────────────────────
// GOOGLE-CALENDAR-INSPIRED MONTH GRID
// Larger sibling of the small month calendar — shows classes directly on
// each day cell so users don't have to click a date to see what's on.
// ─────────────────────────────────────────────

export interface MonthGridEvent {
  id: string | number;
  time: string;
  title: string;
  color: string;
  muted?: boolean;
}

export interface MonthCalendarGridProps {
  year: number;
  month: number; // 0-11
  eventsByDate: Record<string, MonthGridEvent[]>;
  todayKey?: string;
  selectedDateKey?: string | null;
  onSelectDate: (dateKey: string) => void;
  maxVisible?: number;
  className?: string;
  /** Default: Su–Sa abbreviations. Pass `DAY_LABELS_FULL` for Sunday–Saturday. */
  weekdayLabels?: readonly string[];
  /** Stretch grid rows to fill the parent height (admin schedule viewport-fit). */
  fillHeight?: boolean;
}

export function MonthCalendarGrid({
  year,
  month,
  eventsByDate,
  todayKey,
  selectedDateKey = null,
  onSelectDate,
  maxVisible = 3,
  className = '',
  weekdayLabels = DAY_LABELS_SHORT,
  fillHeight = false,
}: MonthCalendarGridProps) {
  const grid = buildMonthGrid(year, month);
  const useFullWeekdayLabels = weekdayLabels === DAY_LABELS_FULL;
  const rowCount = Math.max(1, Math.ceil(grid.length / 7));
  const cellMinH = fillHeight ? 'min-h-0 h-full' : 'min-h-[104px]';

  return (
    <div
      className={`rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm overflow-hidden ${
        fillHeight ? 'flex h-full min-h-0 flex-col' : ''
      } ${className}`}
    >
      <div
        className={`grid shrink-0 grid-cols-7 border-b ${CALENDAR_BORDER_DIVIDER} bg-[#F5F1E8]`}
      >
        {weekdayLabels.map((d, colIdx) => (
          <div
            key={d}
            className={`text-center text-[#5A5048] font-semibold py-2.5 px-0.5 ${isWeekendMonthGridColumn(colIdx) ? WEEKEND_COLUMN_BG : ''}`}
            style={
              useFullWeekdayLabels
                ? { fontSize: '0.62rem', letterSpacing: '0.02em', fontWeight: 600 }
                : { fontSize: '0.68rem', letterSpacing: '0.08em', fontFamily: "'Bebas Neue', sans-serif" }
            }
          >
            {d}
          </div>
        ))}
      </div>
      <div
        className={`grid min-h-0 grid-cols-7 ${fillHeight ? 'flex-1' : ''}`}
        style={
          fillHeight
            ? { gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {grid.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`e-${idx}`}
                className={`${cellMinH} border-r border-b ${CALENDAR_BORDER_DIVIDER_SOFT} last:border-r-0 ${
                  isWeekendMonthGridColumn(idx) ? WEEKEND_COLUMN_BG_SOFT : 'bg-white'
                }`}
              />
            );
          }
          const key = toDateKeyFromParts(year, month, day);
          const dayEvents = eventsByDate[key] || [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDateKey;
          const isWeekend = isWeekendDate(new Date(year, month, day));
          const visible = dayEvents.slice(0, maxVisible);
          const extra = dayEvents.length - visible.length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={`${cellMinH} flex flex-col items-stretch text-left px-1.5 py-1.5 border-r border-b ${CALENDAR_BORDER_DIVIDER_SOFT} transition-colors last:border-r-0 ${
                isToday
                  ? `${CALENDAR_TODAY_COLUMN} z-[1]`
                  : isSelected
                    ? 'bg-[#c49a3c]/14 ring-1 ring-inset ring-[#c49a3c]/35'
                    : isWeekend
                      ? `${WEEKEND_COLUMN_BG_SOFT} hover:bg-[#DDD6C8]/80`
                      : 'bg-white hover:bg-[#F5F2E8]'
              }`}
            >
              <span
                className={`self-start w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1 shrink-0 ${
                  isToday
                    ? `${CALENDAR_TODAY_RING} text-[#1E2A35] font-bold`
                    : isSelected
                      ? 'text-[#8A6520] font-bold'
                      : 'text-[#1E2A35]'
                }`}
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.02em' }}
              >
                {day}
              </span>
              <div
                className={`flex min-w-0 flex-col gap-0.5 ${fillHeight ? 'min-h-0 flex-1 overflow-hidden' : ''}`}
              >
                {visible.map((evt) => (
                  <span
                    key={evt.id}
                    className="text-[9.5px] leading-tight truncate rounded-sm px-1 py-0.5 border-l-2 font-medium"
                    style={{
                      backgroundColor: evt.muted ? '#E8E4DA' : `${evt.color}22`,
                      borderLeftColor: evt.muted ? '#8A7E6E' : evt.color,
                      color: evt.muted ? '#5A5048' : evt.color,
                    }}
                  >
                    {evt.time.replace(' ', '')} {evt.title}
                  </span>
                ))}
                {extra > 0 && <span className={`text-[9px] px-1 font-medium ${CALENDAR_DATE_MUTED}`}>+{extra} more</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
