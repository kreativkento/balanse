import { formatHourLabel, parseTimeToMinutes, isSameDay, DAY_LABELS_LONG, SCHEDULE_START_HOUR, SCHEDULE_END_HOUR } from './weekCalendarUtils';

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
  rowHeight = 56,
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
    <div className="rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm overflow-x-auto">
      <div className="flex min-w-[640px]">
        {/* Time column */}
        <div className="w-14 md:w-16 shrink-0 sticky left-0 bg-white z-10 border-r border-[#D4CDB5]/40">
          <div className="h-14 border-b border-[#D4CDB5]/40 flex items-end justify-center pb-1">
            <span className="text-[9px] text-[#B0A898] uppercase tracking-wide">{timezoneLabel}</span>
          </div>
          <div className="relative" style={{ height: gridHeight }}>
            {hourMarks.map((hour, i) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[10px] text-[#9A8E7E]"
                style={{ top: i * rowHeight }}
              >
                {formatHourLabel(hour)}
              </span>
            ))}
          </div>
        </div>

        {/* Day columns */}
        <div className="flex-1 grid grid-cols-7">
          {weekDates.map((date, dayIdx) => {
            const isToday = isSameDay(date, today);
            const isSelected = selectedDayIndex === dayIdx;
            const dayEvents = eventsByDay[dayIdx] || [];
            return (
              <div key={dayIdx} className="relative border-r border-[#D4CDB5]/30 last:border-r-0">
                {/* Day header */}
                <button
                  type="button"
                  onClick={onDayHeaderClick ? () => onDayHeaderClick(date, dayIdx) : undefined}
                  className={`w-full h-14 flex flex-col items-center justify-center border-b border-[#D4CDB5]/40 transition-colors ${
                    isSelected ? 'bg-[#745b3c]/14' : isToday ? 'bg-[#745b3c]/8' : ''
                  } ${onDayHeaderClick ? 'hover:bg-[#745b3c]/10 cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="text-[10px] text-[#9A8E7E] tracking-wide">{dayLabels[dayIdx]}</span>
                  <span
                    className={isToday || isSelected ? 'text-[#745b3c]' : 'text-[#1E2A35]'}
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.03em' }}
                  >
                    {date.getDate()}
                  </span>
                </button>

                {/* Hour rows + events */}
                <div className="relative" style={{ height: gridHeight }}>
                  {hourMarks.map((hour, i) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-[#D4CDB5]/20"
                      style={{ top: i * rowHeight }}
                    />
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
                          backgroundColor: evt.muted ? '#EDE8D8' : `${evt.color}16`,
                          borderLeft: `3px solid ${evt.muted ? '#C0B8A8' : evt.color}`,
                        }}
                        className={`absolute left-1 right-1 rounded-lg px-2 py-1 text-left overflow-hidden transition-all hover:brightness-[0.97] active:scale-[0.98] ${
                          evt.muted ? 'opacity-80' : ''
                        }`}
                      >
                        <p
                          className="text-[11px] font-bold leading-tight truncate"
                          style={{ color: evt.muted ? '#9A8E7E' : evt.color }}
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
