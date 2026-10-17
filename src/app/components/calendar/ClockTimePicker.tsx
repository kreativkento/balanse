import { useId, useState } from 'react';
import { ChevronLeft, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  CLOCK_HOUR_LABELS,
  CLOCK_MINUTES,
  type ClockPeriod,
  clockSelectionToMinutes,
  formatMinutesOfDay,
  parseMinutesOfDay,
} from './clock-time';
import {
  PICKER_LABEL_CLASS,
  PICKER_PANEL_CLASS,
  PICKER_TRIGGER_CLASS,
  pickerGridCellClass,
} from './picker-panel-styles';

type Step = 'period' | 'hour' | 'minute';

type ClockTimePickerProps = {
  value: number;
  onChange: (minutes: number) => void;
  label: string;
  /** Earliest selectable time (exclusive end times should pass start + step). */
  minMinutes?: number;
  /** Latest selectable time (e.g. studio close). */
  maxMinutes?: number;
  disabled?: boolean;
  headerDateLabel?: string;
};

export function ClockTimePicker({
  value,
  onChange,
  label,
  minMinutes = 0,
  maxMinutes = 23 * 60 + 59,
  disabled = false,
  headerDateLabel,
}: ClockTimePickerProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('period');
  const [period, setPeriod] = useState<ClockPeriod>('AM');
  const [hour12, setHour12] = useState<number>(9);
  const [minute, setMinute] = useState<number>(0);

  const resetDraftFromValue = () => {
    const parsed = parseMinutesOfDay(value);
    setPeriod(parsed.period);
    setHour12(parsed.hour12);
    setMinute(parsed.minute);
    setStep('period');
  };

  const commit = (p: ClockPeriod, h12: number, min: number) => {
    const next = clockSelectionToMinutes(p, h12, min);
    if (next < minMinutes || next > maxMinutes) return;
    onChange(next);
    setOpen(false);
  };

  const isOutOfRange = (candidate: number) =>
    candidate < minMinutes || candidate > maxMinutes;

  const stepTitle =
    step === 'period' ? 'Select period' : step === 'hour' ? period : `${hour12} · ${period}`;

  return (
    <div className="relative min-w-0 w-full">
      <span className={PICKER_LABEL_CLASS}>{label}</span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) resetDraftFromValue();
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
          <span className="truncate">{formatMinutesOfDay(value)}</span>
          <Clock size={16} className="text-[#B0A898] shrink-0" />
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
        {headerDateLabel ? (
          <p className="text-center text-[#8A7E6E] text-xs font-medium mb-2">{headerDateLabel}</p>
        ) : null}

        <div className="flex items-center gap-2 mb-2">
          {step !== 'period' ? (
            <button
              type="button"
              onClick={() => setStep(step === 'minute' ? 'hour' : 'period')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A7E6E] hover:bg-[#EDE8D8]"
              aria-label="Back"
            >
              <ChevronLeft size={16} />
            </button>
          ) : (
            <span className="w-8" />
          )}
          <p
            id={`${listboxId}-title`}
            className="flex-1 text-center text-[#1E2A35] text-sm font-semibold tracking-wide"
          >
            {stepTitle}
          </p>
          <span className="w-8" />
        </div>

        <div className="h-px bg-[#D4CDB5]/60 mb-3" />

        {step === 'period' && (
          <div className="grid grid-cols-2 gap-2">
            {(['AM', 'PM'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPeriod(p);
                  setStep('hour');
                }}
                className="py-4 rounded-xl text-lg font-bold transition-all bg-[#F8F3E8] text-[#1E2A35] hover:bg-[#EDE8D8] border border-[#D4CDB5]/50"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {step === 'hour' && (
          <div className="grid grid-cols-4 gap-1.5">
            {CLOCK_HOUR_LABELS.map((h) => {
              const candidate = clockSelectionToMinutes(period, h, minute);
              const disabledHour = isOutOfRange(candidate);
              return (
                <button
                  key={h}
                  type="button"
                  disabled={disabledHour}
                  onClick={() => {
                    setHour12(h);
                    setStep('minute');
                  }}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${pickerGridCellClass(hour12 === h)}`}
                >
                  {String(h).padStart(2, '0')}
                </button>
              );
            })}
          </div>
        )}

        {step === 'minute' && (
          <div className="grid grid-cols-4 gap-1.5">
            {CLOCK_MINUTES.map((m) => {
              const candidate = clockSelectionToMinutes(period, hour12, m);
              const disabledMinute = isOutOfRange(candidate);
              const selected = minute === m;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabledMinute}
                  onClick={() => commit(period, hour12, m)}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${pickerGridCellClass(selected)}`}
                >
                  {String(m).padStart(2, '0')}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
      </Popover>
    </div>
  );
}
