import { ChevronDown } from 'lucide-react';

export type ChronologicalOrder = 'latest' | 'oldest';
export type AlphabeticalOrder = 'az' | 'za';

const SORT_SELECT_CLASS =
  'rounded-full border border-[#D4CDB5]/70 bg-white px-3 py-1.5 text-xs font-semibold text-[#1E2A35] outline-none transition-colors hover:border-[#c49a3c]/50 focus:border-[#c49a3c]/60 focus:ring-2 focus:ring-[#c49a3c]/25';

function timeValue(value: string | number | Date | null | undefined): number {
  if (value == null || value === '') return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function sortChronologically<T>(
  items: readonly T[],
  getTime: (item: T) => string | number | Date | null | undefined,
  order: ChronologicalOrder,
): T[] {
  const direction = order === 'latest' ? -1 : 1;
  return [...items].sort(
    (a, b) => (timeValue(getTime(a)) - timeValue(getTime(b))) * direction,
  );
}

export function ChronologicalSortSelect({
  value,
  onChange,
  size = 'compact',
}: {
  value: ChronologicalOrder;
  onChange: (order: ChronologicalOrder) => void;
  size?: 'compact' | 'toolbar';
}) {
  const toolbar = size === 'toolbar';
  return (
    <label className={`relative inline-flex shrink-0 items-center ${toolbar ? '' : 'gap-2'}`}>
      <span className="sr-only">Sort by date</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ChronologicalOrder)}
        aria-label="Sort by date"
        className={
          toolbar
            ? 'h-11 appearance-none rounded-2xl border border-[#D4CDB5]/70 bg-white pl-4 pr-10 text-sm font-semibold text-[#1E2A35] outline-none transition-colors hover:border-[#c49a3c]/50 focus:border-[#c49a3c]/60 focus:ring-2 focus:ring-[#c49a3c]/25'
            : SORT_SELECT_CLASS
        }
      >
        <option value="latest">Latest first</option>
        <option value="oldest">Oldest first</option>
      </select>
      {toolbar ? (
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898]"
          aria-hidden
        />
      ) : null}
    </label>
  );
}

export function sortAlphabetically<T>(
  items: readonly T[],
  getLabel: (item: T) => string,
  order: AlphabeticalOrder,
): T[] {
  const direction = order === 'az' ? 1 : -1;
  return [...items].sort((a, b) => {
    const cmp = getLabel(a).localeCompare(getLabel(b), undefined, {
      sensitivity: 'base',
      numeric: true,
    });
    return cmp * direction;
  });
}

export function AlphabeticalSortSelect({
  value,
  onChange,
}: {
  value: AlphabeticalOrder;
  onChange: (order: AlphabeticalOrder) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">Sort by name</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as AlphabeticalOrder)}
        aria-label="Sort by name"
        className={SORT_SELECT_CLASS}
      >
        <option value="az">A to Z</option>
        <option value="za">Z to A</option>
      </select>
    </label>
  );
}
