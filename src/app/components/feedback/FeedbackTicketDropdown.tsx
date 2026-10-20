import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { FEEDBACK_DETAIL_FIELD_INP } from './feedback-detail-modal-styles';

export type FeedbackDropdownOption<T extends string> = {
  value: T;
  label: string;
  toneClass: string;
  icon?: ReactNode;
};

export function FeedbackTicketDropdown<T extends string>({
  fieldLabel,
  value,
  options,
  placeholder = 'Select…',
  disabled = false,
  saving = false,
  readOnly = false,
  onSelect,
}: {
  fieldLabel: string;
  value: T | null;
  options: FeedbackDropdownOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  saving?: boolean;
  readOnly?: boolean;
  onSelect?: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = value != null ? options.find((o) => o.value === value) : undefined;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const displayLabel = selected?.label ?? placeholder;
  const displayTone = selected?.toneClass ?? 'bg-[#F8F3E8] text-[#8A7E6E] border-[#D4CDB5]/70';

  if (readOnly || !onSelect) {
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">{fieldLabel}</span>
        <div className={`${FEEDBACK_DETAIL_FIELD_INP} flex min-h-[42px] items-center gap-2`}>
          {selected?.icon}
          <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${displayTone}`}>{displayLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-w-0 flex-col gap-1.5" ref={rootRef}>
      <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
        <span>{fieldLabel}</span>
        {saving ? (
          <span className="inline-flex items-center gap-1 normal-case tracking-normal text-[#8A7E6E]">
            <Loader2 size={12} className="animate-spin" />
            Saving…
          </span>
        ) : null}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || saving}
        onClick={() => setOpen((c) => !c)}
        className={`${FEEDBACK_DETAIL_FIELD_INP} flex min-h-[42px] items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {selected?.icon}
        <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${displayTone}`}>{displayLabel}</span>
        <ChevronDown
          size={14}
          className={`ml-auto shrink-0 text-[#8A7E6E] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-[#D4CDB5]/70 bg-white py-1 shadow-xl"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                    active ? 'bg-[#F8F3E8]' : 'hover:bg-[#F8F3E8]/80'
                  }`}
                >
                  {option.icon}
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${option.toneClass}`}>
                    {option.label}
                  </span>
                  {active ? <Check size={14} className="ml-auto text-[#c49a3c]" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
