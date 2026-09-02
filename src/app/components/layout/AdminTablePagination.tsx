import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TABLE_ROW_HEIGHT = 68;

export type FitLayout =
  | 'table'
  | 'staff-card'
  | 'discipline-list'
  | 'discipline-compact'
  | 'discipline-large';

export type FitPageSizeOptions = {
  fallback?: number;
  layout?: FitLayout;
};

const LAYOUT_METRICS: Record<
  FitLayout,
  { itemHeight: number; gap: number; columns: (width: number) => number }
> = {
  table: { itemHeight: TABLE_ROW_HEIGHT, gap: 0, columns: () => 1 },
  'discipline-list': { itemHeight: TABLE_ROW_HEIGHT, gap: 0, columns: () => 1 },
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
};

/** How many items fit in the measured container without scrolling. */
export function useFitPageSize(options: number | FitPageSizeOptions = {}) {
  const fallback = typeof options === 'number' ? options : (options.fallback ?? 8);
  const layout: FitLayout = typeof options === 'number' ? 'table' : (options.layout ?? 'table');
  const metrics = LAYOUT_METRICS[layout];

  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState(fallback);

  useEffect(() => {
    if (!node) return;

    const update = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (height <= 0) return;

      const columns = Math.max(1, metrics.columns(width));
      const rowPitch = metrics.itemHeight + metrics.gap;
      const rows = Math.max(1, Math.floor((height + metrics.gap) / rowPitch));
      const next = Math.max(1, rows * columns);
      setPageSize((prev) => (prev === next ? prev : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, metrics, fallback]);

  return { containerRef: setNode, pageSize };
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
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPageChange(n)}
            className={`min-w-9 h-9 px-2.5 rounded-full text-xs font-semibold transition-all ${
              n === page
                ? 'bg-[#745b3c] text-white'
                : 'bg-white border border-[#D4CDB5]/60 text-[#5A5048] hover:border-[#745b3c]/40'
            }`}
          >
            {n}
          </button>
        ))}
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
