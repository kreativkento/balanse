import { buildMonthGrid, toDateKeyFromParts, DAY_LABELS_SHORT } from './weekCalendarUtils';

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
}: MonthCalendarGridProps) {
  const grid = buildMonthGrid(year, month);

  return (
    <div className={`rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="grid grid-cols-7 border-b border-[#D4CDB5]/40">
        {DAY_LABELS_SHORT.map((d) => (
          <div
            key={d}
            className="text-center text-[#9A8E7E] py-2.5"
            style={{ fontSize: '0.68rem', letterSpacing: '0.08em', fontFamily: "'Bebas Neue', sans-serif" }}
          >
            {d.toUpperCase()}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`e-${idx}`}
                className="min-h-[104px] border-r border-b border-[#D4CDB5]/20 bg-[#FBF9F3] last:border-r-0"
              />
            );
          }
          const key = toDateKeyFromParts(year, month, day);
          const dayEvents = eventsByDate[key] || [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDateKey;
          const visible = dayEvents.slice(0, maxVisible);
          const extra = dayEvents.length - visible.length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={`min-h-[104px] flex flex-col items-stretch text-left px-1.5 py-1.5 border-r border-b border-[#D4CDB5]/20 transition-colors last:border-r-0 ${
                isSelected ? 'bg-[#c49a3c]/10' : 'hover:bg-[#F5F2E8]'
              }`}
            >
              <span
                className={`self-start w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1 shrink-0 ${
                  isToday ? 'bg-[#c49a3c] text-white' : isSelected ? 'text-[#c49a3c] font-bold' : 'text-[#1E2A35]'
                }`}
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.02em' }}
              >
                {day}
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                {visible.map((evt) => (
                  <span
                    key={evt.id}
                    className="text-[9.5px] leading-tight truncate rounded px-1 py-0.5"
                    style={{
                      backgroundColor: evt.muted ? '#EDE8D8' : `${evt.color}18`,
                      color: evt.muted ? '#9A8E7E' : evt.color,
                    }}
                  >
                    {evt.time.replace(' ', '')} {evt.title}
                  </span>
                ))}
                {extra > 0 && <span className="text-[9px] text-[#B0A898] px-1">+{extra} more</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
