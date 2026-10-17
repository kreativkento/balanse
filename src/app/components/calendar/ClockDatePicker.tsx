import { useId, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  buildMonthGrid,
  dateKeyToDate,
  DAY_LABELS_SHORT,
  getTodayDateKey,
  isWeekendMonthGridColumn,
  MONTH_NAMES,
  toDateKeyFromParts,
} from './weekCalendarUtils';
import {
  PICKER_LABEL_CLASS,
  PICKER_PANEL_CLASS,
  PICKER_TRIGGER_CLASS,
  pickerGridCellClass,
} from './picker-panel-styles';

type ClockDatePickerProps = {
  value: string;
  onChange: (dateKey: string) => void;
  label?: string;
  disabled?: boolean;
};

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function formatDateButtonLabel(dateKey: string): string {
  return dateKeyToDate(dateKey).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ClockDatePicker({
  value,
  onChange,
  label = 'Date',
  disabled = false,
}: ClockDatePickerProps) {
  const titleId = useId();
  const todayKey = getTodayDateKey();
  const parsed = dateKeyToDate(value || todayKey);
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());
  const [open, setOpen] = useState(false);

  const syncViewToValue = () => {
    const d = dateKeyToDate(value || todayKey);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const grid = buildMonthGrid(viewYear, viewMonth);

  const selectDay = (day: number) => {
    onChange(toDateKeyFromParts(viewYear, viewMonth, day));
    setOpen(false);
  };

  return (
    <div className="relative min-w-0 w-full">
      <span className={PICKER_LABEL_CLASS}>{label}</span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) syncViewToValue();
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={PICKER_TRIGGER_CLASS}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="truncate">{formatDateButtonLabel(value || todayKey)}</span>
          <Calendar size={16} className="text-[#B0A898] shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className={PICKER_PANEL_CLASS}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => {
              const next = shiftMonth(viewYear, viewMonth, -1);
              setViewYear(next.year);
              setViewMonth(next.month);
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A7E6E] hover:bg-[#EDE8D8]"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <p
            id={titleId}
            className="flex-1 text-center text-[#1E2A35] text-sm font-semibold tracking-wide"
          >
            {MONTH_NAMES[viewMonth]} {viewYear}
          </p>
          <button
            type="button"
            onClick={() => {
              const next = shiftMonth(viewYear, viewMonth, 1);
              setViewYear(next.year);
              setViewMonth(next.month);
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A7E6E] hover:bg-[#EDE8D8]"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="h-px bg-[#D4CDB5]/60 mb-3" />

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAY_LABELS_SHORT.map((d, colIdx) => (
            <span
              key={d}
              className={`text-center text-[10px] font-semibold tracking-wide text-[#9A8E7E] py-1 ${
                isWeekendMonthGridColumn(colIdx) ? 'text-[#8A7E6E]' : ''
              }`}
            >
              {d.toUpperCase()}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((day, idx) => {
            if (day === null) {
              return <span key={`e-${idx}`} className="h-9" aria-hidden />;
            }
            const key = toDateKeyFromParts(viewYear, viewMonth, day);
            const selected = key === value;
            const isToday = key === todayKey;
            const weekend = isWeekendMonthGridColumn(idx % 7);
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectDay(day)}
                className={`h-9 rounded-lg text-sm font-semibold transition-all ${pickerGridCellClass(selected)} ${
                  !selected && weekend ? 'bg-[#F8F3E8]/80' : ''
                } ${!selected && isToday ? 'ring-2 ring-[#c49a3c]/45 ring-inset' : ''}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </PopoverContent>
      </Popover>
    </div>
  );
}
