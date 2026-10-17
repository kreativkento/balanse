import { useMemo, useState } from 'react';
import { Check, LayoutGrid, Search, X } from 'lucide-react';
import { statusColorFromHue, type DisciplineDisplay } from '../../../lib/discipline-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

type CoachDisciplineMultiSelectProps = {
  disciplines: DisciplineDisplay[];
  selectedIds: string[];
  onToggle: (disciplineId: string) => void;
  disabled?: boolean;
};

function DisciplineSelectionGrid({
  disciplines,
  filtered,
  selectedSet,
  disabled,
  onToggle,
  query,
}: {
  disciplines: DisciplineDisplay[];
  filtered: DisciplineDisplay[];
  selectedSet: Set<string>;
  disabled?: boolean;
  onToggle: (disciplineId: string) => void;
  query: string;
}) {
  if (disciplines.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#D4CDB5]/70 bg-[#F8F3E8]/50 px-4 py-10 text-center text-sm text-[#8A7E6E]">
        No disciplines available.
      </p>
    );
  }
  if (filtered.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#D4CDB5]/70 bg-[#F8F3E8]/50 px-4 py-10 text-center text-sm text-[#8A7E6E]">
        No disciplines match &ldquo;{query.trim()}&rdquo;.
      </p>
    );
  }

  return (
    <div
      className="grid max-h-[min(22rem,50vh)] grid-cols-1 gap-2 overflow-y-auto overscroll-contain p-0.5 sm:grid-cols-2 lg:grid-cols-3 [scrollbar-width:thin] [scrollbar-color:#C4B8A0_transparent]"
      role="listbox"
      aria-multiselectable="true"
      aria-label="Discipline options"
    >
      {filtered.map((discipline) => {
        const selected = selectedSet.has(discipline.id);
        const hue = statusColorFromHue(discipline.status.hue);
        return (
          <button
            key={discipline.id}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onToggle(discipline.id)}
            className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? 'border-[#c49a3c] bg-[#c49a3c]/10 shadow-[inset_0_0_0_1px_rgba(196,154,60,0.35)]'
                : 'border-[#D4CDB5]/70 bg-white hover:border-[#c49a3c]/35 hover:bg-[#F8F3E8]'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/5 ${
                selected ? 'bg-white' : 'bg-[#F8F3E8]'
              }`}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: hue }} aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold text-[#1E2A35]">{discipline.name}</span>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                selected
                  ? 'border-[#c49a3c] bg-[#c49a3c] text-white'
                  : 'border-[#D4CDB5] bg-white text-transparent'
              }`}
              aria-hidden
            >
              <Check size={14} strokeWidth={2.5} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Popup grid picker for coach profile discipline tags. */
export function CoachDisciplineMultiSelect({
  disciplines,
  selectedIds,
  onToggle,
  disabled,
}: CoachDisciplineMultiSelectProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const sorted = useMemo(
    () =>
      [...disciplines].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    [disciplines],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (d) => d.name.toLowerCase().includes(q) || d.slug.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  const selectedDisciplines = useMemo(
    () =>
      selectedIds
        .map((id) => disciplines.find((d) => d.id === id))
        .filter((d): d is DisciplineDisplay => Boolean(d))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [disciplines, selectedIds],
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const clearAll = () => {
    for (const id of [...selectedIds]) onToggle(id);
  };

  const openPicker = () => {
    if (disabled || disciplines.length === 0) return;
    setQuery('');
    setPickerOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A7E6E]">
            {selectedIds.length === 0
              ? 'None selected'
              : `${selectedIds.length} selected`}
          </p>
          {selectedIds.length > 0 && !disabled && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-semibold text-[#a67f2e] underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {selectedDisciplines.length > 0 ? (
          <div
            className="flex flex-wrap gap-2 rounded-2xl border border-[#D4CDB5]/50 bg-[#F8F3E8]/80 p-3"
            aria-label="Selected disciplines"
          >
            {selectedDisciplines.map((d) => (
              <span
                key={d.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#1E2A35] bg-[#1E2A35] px-2.5 py-1.5 text-xs font-semibold text-white"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/25"
                  style={{ backgroundColor: statusColorFromHue(d.status.hue) }}
                  aria-hidden
                />
                <span className="truncate">{d.name}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#B0A898]">No disciplines selected yet.</p>
        )}

        <button
          type="button"
          disabled={disabled || disciplines.length === 0}
          onClick={openPicker}
          className="action-button inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#D4CDB5]/70 bg-white py-3 text-sm font-semibold text-[#1E2A35] transition-all hover:border-[#c49a3c]/45 hover:bg-[#F8F3E8] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
        >
          <LayoutGrid size={16} className="text-[#c49a3c]" />
          {selectedIds.length === 0 ? 'Choose disciplines…' : 'Edit selection…'}
        </button>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent
          className="max-w-2xl gap-0 overflow-hidden rounded-3xl border-[#D4CDB5]/60 bg-[#F8F3E8] p-0 sm:max-w-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="border-b border-[#D4CDB5]/50 bg-white px-6 py-5 text-left">
            <DialogTitle
              className="text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.05em' }}
            >
              Select disciplines
            </DialogTitle>
            <DialogDescription className="text-[#8A7E6E] text-xs leading-relaxed">
              Tap disciplines you teach. Selections apply immediately — close when finished.
            </DialogDescription>
            <div className="relative mt-3">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A898]"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search disciplines…"
                className="w-full rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] py-2.5 pl-10 pr-4 text-sm text-[#1E2A35] placeholder-[#C0B8A8] outline-none focus:border-[#c49a3c]/50 focus:ring-2 focus:ring-[#c49a3c]/25"
                aria-label="Search disciplines"
              />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A7E6E] pt-1">
              {selectedIds.length} selected
            </p>
          </DialogHeader>

          <div className="px-6 py-4">
            <DisciplineSelectionGrid
              disciplines={disciplines}
              filtered={filtered}
              selectedSet={selectedSet}
              disabled={disabled}
              onToggle={onToggle}
              query={query}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#D4CDB5]/50 bg-white px-6 py-4 sm:flex-row sm:justify-between sm:items-center">
            <button
              type="button"
              disabled={disabled || selectedIds.length === 0}
              onClick={clearAll}
              className="text-sm font-semibold text-[#a67f2e] underline-offset-2 hover:underline disabled:opacity-40"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="action-button rounded-full bg-[#1E2A35] px-8 py-2.5 text-sm font-semibold text-white hover:bg-[#263545]"
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
