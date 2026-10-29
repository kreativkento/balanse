import { useEffect, useRef, useState } from 'react';
import { Check, ListFilter, Plus, X } from 'lucide-react';

export type CategorizedFilterOption = {
  value: string;
  label: string;
  count?: number;
  tone?: 'default' | 'warning';
};

export type CategorizedFilterGroup = {
  id: string;
  label: string;
  options: CategorizedFilterOption[];
};

type CategorizedAddFilterProps = {
  groups: CategorizedFilterGroup[];
  selected: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
  /** `toolbar` matches page-heading controls (search / primary actions). */
  size?: 'compact' | 'toolbar';
};

function selectedChips(
  groups: CategorizedFilterGroup[],
  selected: Record<string, string[]>,
) {
  return groups.flatMap((group) =>
    (selected[group.id] ?? []).map((value) => {
      const option = group.options.find((item) => item.value === value);
      return {
        groupId: group.id,
        groupLabel: group.label,
        value,
        label: option?.label ?? value,
        tone: option?.tone ?? 'default',
      };
    }),
  );
}

/** Empty selection means all values in that group. */
export function matchesAnySelected(selected: string[] | undefined, value: string): boolean {
  return !selected || selected.length === 0 || selected.includes(value);
}

export function CategorizedAddFilter({
  groups,
  selected,
  onChange,
  size = 'compact',
}: CategorizedAddFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const chips = selectedChips(groups, selected);
  const hasFilters = chips.length > 0;
  const toolbar = size === 'toolbar';

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

  const toggle = (groupId: string, value: string) => {
    const current = selected[groupId] ?? [];
    const nextValues = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...selected, [groupId]: nextValues });
  };

  const remove = (groupId: string, value: string) => {
    const current = selected[groupId] ?? [];
    onChange({ ...selected, [groupId]: current.filter((item) => item !== value) });
  };

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex shrink-0 items-center font-semibold transition-all ${
          toolbar
            ? 'h-11 gap-2 rounded-2xl border px-4 text-sm'
            : 'gap-1.5 rounded-full border px-3 py-1.5 text-xs'
        } ${
          open || hasFilters
            ? 'border-[#c49a3c]/50 bg-[#c49a3c]/10 text-[#1E2A35]'
            : 'border-[#D4CDB5]/60 bg-white text-[#5A5048] hover:border-[#c49a3c]/40 hover:text-[#1E2A35]'
        }`}
      >
        {hasFilters ? <ListFilter size={toolbar ? 16 : 12} /> : <Plus size={toolbar ? 16 : 12} />}
        Add filter
      </button>

      {chips.map((chip) => (
        <span
          key={`${chip.groupId}:${chip.value}`}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            chip.tone === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-[#D4CDB5]/60 bg-white text-[#1E2A35]'
          }`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8A7E6E]">
            {chip.groupLabel}
          </span>
          {chip.label}
          <button
            type="button"
            onClick={() => remove(chip.groupId, chip.value)}
            className="rounded-full p-0.5 text-[#8A7E6E] hover:bg-[#EDE8D8] hover:text-[#1E2A35]"
            aria-label={`Remove ${chip.groupLabel} ${chip.label} filter`}
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Bulletin filters"
          className="absolute left-0 top-[calc(100%+0.4rem)] z-30 max-h-[min(24rem,70vh)] w-[16.5rem] overflow-y-auto rounded-2xl border border-[#D4CDB5]/70 bg-white p-1.5 shadow-lg"
        >
          {hasFilters ? (
            <button
              type="button"
              onClick={() => onChange({})}
              className="mb-0.5 w-full rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-[#c49a3c] transition-colors hover:bg-[#F8F3E8]"
            >
              Clear all
            </button>
          ) : null}
          {groups.map((group) => (
            <div key={group.id} className="pt-1">
              <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#B0A898]">
                {group.label}
              </p>
              {group.options.map((option) => {
                const active = (selected[group.id] ?? []).includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => toggle(group.id, option.value)}
                    className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                      active ? 'bg-[#F8F3E8] text-[#1E2A35]' : 'text-[#5A5048] hover:bg-[#F8F3E8]'
                    }`}
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded ${active ? 'text-[#c49a3c]' : 'text-[#C0B8A8]'}`}>
                      {active ? <Check size={13} strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.count != null && option.count > 0 ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                          option.tone === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[#EDE8D8] text-[#5A5048]'
                        }`}
                      >
                        {option.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
