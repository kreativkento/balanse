import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Check, ListFilter, Plus, X } from 'lucide-react';
import type { FeedbackLabel } from '../../../lib/feedback-service';

export type FeedbackTypeFilterOption = {
  value: FeedbackLabel;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone: string;
};

type FeedbackTypeFilterProps = {
  options: FeedbackTypeFilterOption[];
  selected: FeedbackLabel[];
  onChange: (next: FeedbackLabel[]) => void;
};

export function FeedbackTypeFilter({ options, selected, onChange }: FeedbackTypeFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const showingAll = selected.length === 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggleType = (value: FeedbackLabel) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    const next = [...selected, value];
    onChange(next.length === options.length ? [] : next);
  };

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
          open || !showingAll
            ? 'border-[#c49a3c]/50 bg-[#c49a3c]/10 text-[#1E2A35]'
            : 'border-[#D4CDB5]/60 bg-white text-[#5A5048] hover:border-[#c49a3c]/40 hover:text-[#1E2A35]'
        }`}
      >
        {showingAll ? <Plus size={12} /> : <ListFilter size={12} />}
        Add filter
      </button>

      {!showingAll
        ? selected.map((value) => {
            const option = options.find((item) => item.value === value);
            if (!option) return null;
            const Icon = option.icon;
            return (
              <span
                key={value}
                className="inline-flex items-center gap-1 rounded-full border border-[#D4CDB5]/60 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1E2A35]"
              >
                <Icon size={11} className={option.tone} />
                {option.label}
                <button
                  type="button"
                  onClick={() => onChange(selected.filter((item) => item !== value))}
                  className="rounded-full p-0.5 text-[#8A7E6E] hover:bg-[#EDE8D8] hover:text-[#1E2A35]"
                  aria-label={`Remove ${option.label} filter`}
                >
                  <X size={10} />
                </button>
              </span>
            );
          })
        : null}

      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Filter by type"
          className="absolute left-0 top-[calc(100%+0.4rem)] z-30 min-w-[13.5rem] rounded-2xl border border-[#D4CDB5]/70 bg-white p-1.5 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={showingAll}
            onClick={() => {
              onChange([]);
            }}
            className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
              showingAll ? 'bg-[#1E2A35] text-white' : 'text-[#5A5048] hover:bg-[#F8F3E8]'
            }`}
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded ${showingAll ? 'text-[#c49a3c]' : 'text-[#C0B8A8]'}`}>
              {showingAll ? <Check size={13} strokeWidth={3} /> : null}
            </span>
            All types
          </button>
          {options.map((option) => {
            const Icon = option.icon;
            const active = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => toggleType(option.value)}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                  active ? 'bg-[#F8F3E8] text-[#1E2A35]' : 'text-[#5A5048] hover:bg-[#F8F3E8]'
                }`}
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded ${active ? 'text-[#c49a3c]' : 'text-[#C0B8A8]'}`}>
                  {active ? <Check size={13} strokeWidth={3} /> : null}
                </span>
                <Icon size={13} className={option.tone} />
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function feedbackTypeFilterEmptyLabel(selected: FeedbackLabel[], options: FeedbackTypeFilterOption[]): string {
  if (selected.length === 0) return '';
  if (selected.length === 1) {
    const label = options.find((option) => option.value === selected[0])?.label.toLowerCase() ?? 'filtered';
    return `${label} `;
  }
  return 'matching ';
}
