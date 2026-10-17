import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TABLE_ROW_HEIGHT = 68;

export type FitLayout =
  | 'table'
  | 'staff-card'
  | 'discipline-list'
  | 'discipline-compact'
  | 'discipline-large'
  | 'bulletin-card'
  | 'gallery-card';

export type FitPageSizeOptions = {
  fallback?: number;
  layout?: FitLayout;
  /** Vertical padding inside the measured container (e.g. grid `py-6` → 48). */
  verticalInset?: number;
  /** Measured row height (overrides layout default when set). */
  itemHeightOverride?: number;
};

const LAYOUT_METRICS: Record<
  FitLayout,
  { itemHeight: number; gap: number; columns: (width: number) => number }
> = {
  table: { itemHeight: TABLE_ROW_HEIGHT, gap: 0, columns: () => 1 },
  /** Matches fixed list row height in AdminDisciplineList (h-[72px]). */
  'discipline-list': { itemHeight: 72, gap: 0, columns: () => 1 },
  'staff-card': {
    itemHeight: 300,
    gap: 16,
    columns: (width) => (width >= 1024 ? 3 : width >= 640 ? 2 : 1),
  },
  'discipline-compact': {
    itemHeight: 192,
    gap: 16,
    columns: (width) => (width >= 1024 ? 4 : width >= 768 ? 3 : 2),
  },
  'discipline-large': {
    itemHeight: 320,
    gap: 20,
    columns: (width) => (width >= 1024 ? 3 : width >= 768 ? 2 : 1),
  },
  'bulletin-card': {
    itemHeight: 92,
    gap: 10,
    columns: () => 1,
  },
  'gallery-card': {
    itemHeight: 188,
    gap: 12,
    columns: (width) => (width >= 1280 ? 4 : width >= 768 ? 3 : 2),
  },
};

/** How many items fit in the measured container without scrolling. */
export function useFitPageSize(options: number | FitPageSizeOptions = {}) {
  const fallback = typeof options === 'number' ? options : (options.fallback ?? 8);
  const layout: FitLayout = typeof options === 'number' ? 'table' : (options.layout ?? 'table');
  const verticalInset = typeof options === 'number' ? 0 : (options.verticalInset ?? 0);
  const itemHeightOverride =
    typeof options === 'number' ? undefined : options.itemHeightOverride;
  const metrics = LAYOUT_METRICS[layout];

  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState(fallback);

  useEffect(() => {
    if (!node) return;

    const update = () => {
      const width = node.clientWidth;
      const height = node.clientHeight - verticalInset;
      if (height <= 0) return;

      const columns = Math.max(1, metrics.columns(width));
      const itemHeight = itemHeightOverride ?? metrics.itemHeight;
      const rowPitch = itemHeight + metrics.gap;
      const rows = Math.max(1, Math.floor((height + metrics.gap) / rowPitch));
      const next = Math.max(1, rows * columns);
      setPageSize((prev) => (prev === next ? prev : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, metrics, fallback, verticalInset, itemHeightOverride]);

  return { containerRef: setNode, pageSize };
}

export type PaginationItem = number | 'ellipsis';

const MAX_PAGE_BUTTONS = 5;

/**
 * At most five page numbers. Once the list is longer:
 * 1 … previous current next … last
 * Near either end the ellipsis drops so neighboring pages stay visible.
 */
export function getPaginationItems(page: number, totalPages: number): PaginationItem[] {
  const total = Math.max(0, Math.floor(totalPages));
  if (total <= 0) return [];

  const current = Math.min(Math.max(1, Math.floor(page)), total);
  if (total <= MAX_PAGE_BUTTONS) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 4, 'ellipsis', total];
  }

  if (current >= total - 2) {
    return [1, 'ellipsis', total - 3, total - 2, total - 1, total];
  }

  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
}

export function PaginationPageButtons({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      {getPaginationItems(page, totalPages).map((item, index) =>
        item === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="flex h-9 min-w-6 items-center justify-center px-0.5 text-xs font-semibold text-[#8A7E6E] select-none"
            aria-hidden="true"
          >
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={`min-w-9 h-9 px-2.5 rounded-full text-xs font-semibold transition-all ${
              item === page
                ? 'bg-[#c49a3c] text-white'
                : 'bg-white border border-[#D4CDB5]/60 text-[#5A5048] hover:border-[#c49a3c]/40'
            }`}
          >
            {item}
          </button>
        ),
      )}
    </>
  );
}

export function AdminTablePagination({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  total,
  noun,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  noun: string;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;

  return (
    <div className="shrink-0 mt-3 pt-3 border-t border-[#D4CDB5]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-[#8A7E6E] text-xs">
        Showing {rangeStart}–{rangeEnd} of {total} {noun}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="w-9 h-9 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <PaginationPageButtons page={page} totalPages={totalPages} onPageChange={onPageChange} />
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="w-9 h-9 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
