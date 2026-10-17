import {
  formatHourLabel,
  parseTimeToMinutes,
  isSameDay,
  DAY_LABELS_LONG,
  SCHEDULE_START_HOUR,
  SCHEDULE_END_HOUR,
  SCHEDULE_GRID_ROW_HEIGHT,
  isWeekendDate,
  WEEKEND_COLUMN_BG,
  WEEKEND_COLUMN_BG_SOFT,
} from './weekCalendarUtils';
import {
  CALENDAR_BORDER_DIVIDER,
  CALENDAR_DATE_MUTED,
  CALENDAR_GRID_HALF_HOUR_LINE,
  CALENDAR_GRID_HOUR_LINE,
  CALENDAR_TIME_GUTTER_BG,
  CALENDAR_TIME_LABEL,
  CALENDAR_TODAY_COLUMN,
  CALENDAR_TODAY_RING,
} from './calendarContrast';

// ─────────────────────────────────────────────
// GOOGLE-CALENDAR-INSPIRED WEEK GRID
// This is the same visual grid originally built for the "Upcoming Classes"
// weekly calendar on the Classes page, generalized so it can be reused
// anywhere a Balansé weekly schedule needs to be rendered (e.g. Book a Class).
// ─────────────────────────────────────────────

export interface WeekGridEvent {
  id: string | number;
  /** 0 = Sunday ... 6 = Saturday, position within the displayed week */
  dayIndex: number;
  time: string; // e.g. '9:00 AM'
  duration: number; // minutes
  title: string;
  subtitle?: string;
  color: string;
  /** Visually mutes the event (e.g. fully booked) without disabling interaction */
  muted?: boolean;
  mutedLabel?: string;
  onClick?: () => void;
}

export interface WeekCalendarGridProps {
  weekDates: Date[];
  events: WeekGridEvent[];
  today?: Date;
  startHour?: number;
  endHour?: number;
  rowHeight?: number;
  dayLabels?: string[];
  timezoneLabel?: string;
  selectedDayIndex?: number | null;
  onDayHeaderClick?: (date: Date, dayIndex: number) => void;
}

export function WeekCalendarGrid({
  weekDates,
  events,
  today = new Date(),
  startHour = SCHEDULE_START_HOUR,
  endHour = SCHEDULE_END_HOUR,
  rowHeight = SCHEDULE_GRID_ROW_HEIGHT,
  dayLabels = DAY_LABELS_LONG,
  timezoneLabel = 'GMT+8',
  selectedDayIndex = null,
  onDayHeaderClick,
}: WeekCalendarGridProps) {
  const hourMarks = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const gridHeight = (endHour - startHour) * rowHeight;

  const eventsByDay: Record<number, WeekGridEvent[]> = {};
  events.forEach((evt) => {
    eventsByDay[evt.dayIndex] = eventsByDay[evt.dayIndex] || [];
    eventsByDay[evt.dayIndex].push(evt);
  });

  return (
    <div className="rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm overflow-x-auto mb-6">
      <div className="flex min-w-[640px]">
        {/* Time column */}
        <div className={`w-14 md:w-16 shrink-0 sticky left-0 z-10 border-r ${CALENDAR_BORDER_DIVIDER} ${CALENDAR_TIME_GUTTER_BG}`}>
          <div className={`h-14 border-b ${CALENDAR_BORDER_DIVIDER} flex items-end justify-center pb-1`}>
            <span className={`text-[9px] uppercase tracking-wide ${CALENDAR_DATE_MUTED}`}>{timezoneLabel}</span>
          </div>
          <div className="relative" style={{ height: gridHeight }}>
            {hourMarks.map((hour, i) => (
              <span
                key={hour}
                className={`absolute right-2 -translate-y-1/2 text-[10px] ${CALENDAR_TIME_LABEL}`}
                style={{ top: i * rowHeight }}
              >
                {formatHourLabel(hour)}
              </span>
            ))}
          </div>
        </div>

        {/* Day columns */}
        <div
          className="flex-1 grid"
          style={{ gridTemplateColumns: `repeat(${weekDates.length}, minmax(0, 1fr))` }}
        >
          {weekDates.map((date, dayIdx) => {
            const isToday = isSameDay(date, today);
            const isSelected = selectedDayIndex === dayIdx;
            const isWeekend = isWeekendDate(date);
            const dayEvents = eventsByDay[dayIdx] || [];
            const headerBg = isSelected
              ? 'bg-[#c49a3c]/16 ring-1 ring-inset ring-[#c49a3c]/30'
              : isWeekend
                ? WEEKEND_COLUMN_BG
                : 'bg-[#F5F1E8]';
            return (
              <div
                key={dayIdx}
                className={`relative border-r ${CALENDAR_BORDER_DIVIDER} last:border-r-0 ${
                  isToday ? `z-[2] ${CALENDAR_TODAY_COLUMN}` : ''
                }`}
              >
                {/* Day header */}
                <button
                  type="button"
                  onClick={onDayHeaderClick ? () => onDayHeaderClick(date, dayIdx) : undefined}
                  className={`w-full h-14 flex flex-col items-center justify-center border-b ${CALENDAR_BORDER_DIVIDER} transition-colors ${headerBg} ${
                    onDayHeaderClick ? 'hover:bg-[#c49a3c]/10 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span className={`text-[10px] tracking-wide font-semibold ${CALENDAR_DATE_MUTED}`}>
                    {dayLabels[dayIdx] ?? dayLabels[date.getDay()]}
                  </span>
                  <span
                    className={`${
                      isToday
                        ? `${CALENDAR_TODAY_RING} text-[#1E2A35]`
                        : isSelected
                          ? 'text-[#8A6520]'
                          : 'text-[#1E2A35]'
                    }`}
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.03em' }}
                  >
                    {date.getDate()}
                  </span>
                </button>

                {/* Hour rows + events */}
                <div
                  className={`relative ${isWeekend && !isSelected ? WEEKEND_COLUMN_BG_SOFT : 'bg-white'}`}
                  style={{ height: gridHeight }}
                >
                  {hourMarks.slice(0, -1).map((hour, i) => (
                    <div key={hour}>
                      <div
                        className={`absolute left-0 right-0 ${CALENDAR_GRID_HOUR_LINE}`}
                        style={{ top: i * rowHeight }}
                      />
                      <div
                        className={`absolute left-0 right-0 ${CALENDAR_GRID_HALF_HOUR_LINE}`}
                        style={{ top: i * rowHeight + rowHeight / 2 }}
                      />
                    </div>
                  ))}

                  {dayEvents.map((evt) => {
                    const startMin = parseTimeToMinutes(evt.time) - startHour * 60;
                    const top = (startMin / 60) * rowHeight;
                    const height = Math.max((evt.duration / 60) * rowHeight - 4, 30);
                    return (
                      <button
                        key={evt.id}
                        onClick={evt.onClick}
                        style={{
                          top,
                          height,
                          backgroundColor: evt.muted ? '#E8E4DA' : `${evt.color}22`,
                          borderLeft: `3px solid ${evt.muted ? '#8A7E6E' : evt.color}`,
                        }}
                        className="absolute left-1 right-1 rounded-lg px-2 py-1 text-left overflow-hidden transition-all shadow-sm ring-1 ring-[#B8AB93]/40 hover:ring-[#A89880]/60 active:scale-[0.99]"
                      >
                        <p
                          className="text-[11px] font-bold leading-tight truncate"
                          style={{ color: evt.muted ? '#4A443C' : evt.color }}
                        >
                          {evt.title}
                        </p>
                        {evt.subtitle && (
                          <p className="text-[9.5px] text-[#5A5048] truncate leading-tight">{evt.subtitle}</p>
                        )}
                        {evt.muted && evt.mutedLabel && (
                          <p className="text-[8.5px] text-red-500 font-bold leading-tight">{evt.mutedLabel}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
