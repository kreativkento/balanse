import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { AdminTablePagination, useFitPageSize } from '../components/layout/AdminTablePagination';
import {
  AdminDisciplineCardsGrid,
  DisciplineDensityToggle,
  type DisciplineCardDensity,
} from '../components/disciplines/AdminDisciplineCardsGrid';
import { AdminDisciplineModal } from '../components/disciplines/AdminDisciplineModal';
import {
  fetchDisciplinesForPublic,
  type DisciplineDisplay,
} from '../../lib/discipline-service';

const LARGE_PAGE_SIZE = 6;

export default function MemberDisciplinesPage() {
  const navigate = useNavigate();
  const [disciplines, setDisciplines] = useState<DisciplineDisplay[]>([]);
  const [disciplinesLoading, setDisciplinesLoading] = useState(true);
  const [disciplinesError, setDisciplinesError] = useState<string | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineDisplay | null>(null);
  const [density, setDensity] = useState<DisciplineCardDensity>('large');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const isCompact = density === 'compact';
  const { containerRef, pageSize: fitPageSize } = useFitPageSize({
    layout: 'discipline-compact',
    fallback: 8,
  });

  useEffect(() => {
    let cancelled = false;
    setDisciplinesLoading(true);

    void fetchDisciplinesForPublic().then((result) => {
      if (cancelled) return;
      setDisciplines(result.data);
      setDisciplinesError(result.error);
      setDisciplinesLoading(false);
      setPage(1);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleDisciplines = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return disciplines;
    return disciplines.filter((item) => {
      const name = item.name?.toLowerCase() ?? '';
      const description = item.description?.toLowerCase() ?? '';
      return name.includes(query) || description.includes(query);
    });
  }, [disciplines, search]);

  const pageSize = isCompact ? fitPageSize : LARGE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(visibleDisciplines.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageDisciplines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleDisciplines.slice(start, start + pageSize);
  }, [visibleDisciplines, currentPage, pageSize]);

  const rangeStart = visibleDisciplines.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, visibleDisciplines.length);

  const handleDensityChange = (next: DisciplineCardDensity) => {
    setDensity(next);
    setPage(1);
  };

  const pageIntro = (
    <div
      className={`flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${
        isCompact ? 'mb-3 pt-4 md:mb-4' : 'mb-6 pt-6'
      }`}
    >
      <div className="min-w-0">
        <p className="mb-1 text-xs uppercase tracking-widest text-[#8A7E6E]">Studio</p>
        <h2
          className="leading-tight text-[#1E2A35]"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
            letterSpacing: '0.04em',
          }}
        >
          Disciplines
        </h2>
        <p className={`mt-1 max-w-xl text-sm text-[#8A7E6E] ${isCompact ? 'hidden md:block' : ''}`}>
          Explore the movement practices we offer at BALANSÉ.
        </p>
      </div>
      {!disciplinesLoading && visibleDisciplines.length > 0 && (
        <DisciplineDensityToggle density={density} onChange={handleDensityChange} />
      )}
    </div>
  );

  const paginationFooter = (
    <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-[#D4CDB5]/50 pt-4 sm:flex-row">
      <p className="text-xs text-[#8A7E6E]">
        Showing {rangeStart}–{rangeEnd} of {visibleDisciplines.length}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4CDB5]/60 bg-[#EDE8D8] text-[#1E2A35] transition-all hover:bg-[#E3DCC8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPage(n)}
            className={`min-w-9 h-9 rounded-full px-2.5 text-xs font-semibold transition-all ${
              n === currentPage
                ? 'bg-[#c49a3c] text-white'
                : 'border border-[#D4CDB5]/60 bg-white text-[#5A5048] hover:border-[#c49a3c]/40'
            }`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4CDB5]/60 bg-[#EDE8D8] text-[#1E2A35] transition-all hover:bg-[#E3DCC8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {selectedDiscipline && (
        <AdminDisciplineModal
          discipline={selectedDiscipline}
          readOnly
          onClose={() => setSelectedDiscipline(null)}
          onEnroll={() => navigate('/book')}
        />
      )}

      <MemberPageShell
        viewportBody="desktop"
        searchPlaceholder="Search disciplines…"
        onSearch={(query) => {
          setSearch(query);
          setPage(1);
        }}
      >
        <div className="md:flex md:h-full md:min-h-0 md:flex-col md:overflow-hidden">
          {pageIntro}

          {disciplinesLoading && (
            <div
              ref={isCompact ? containerRef : undefined}
              className={`flex items-center justify-center gap-2 text-[#8A7E6E] ${
                isCompact ? 'min-h-0 flex-1 py-8' : 'py-16'
              }`}
            >
              <Loader2 size={18} className="animate-spin text-[#c49a3c]" />
              <span className="text-sm">Loading disciplines…</span>
            </div>
          )}

          {!disciplinesLoading && disciplinesError && (
            <div className="flex shrink-0 items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-700">Could not load disciplines</p>
                <p className="mt-0.5 text-xs text-red-600/80">{disciplinesError}</p>
              </div>
            </div>
          )}

          {!disciplinesLoading && !disciplinesError && disciplines.length === 0 && (
            <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-5 py-10 text-center">
              <p className="text-sm font-semibold text-[#1E2A35]">No disciplines available yet</p>
              <p className="mt-1 text-xs text-[#8A7E6E]">Check back soon for our class catalog.</p>
            </div>
          )}

          {!disciplinesLoading && disciplines.length > 0 && visibleDisciplines.length === 0 && (
            <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-5 py-10 text-center">
              <p className="text-sm font-semibold text-[#1E2A35]">No matching disciplines</p>
              <p className="mt-1 text-xs text-[#8A7E6E]">Try a different search term.</p>
            </div>
          )}

          {!disciplinesLoading && visibleDisciplines.length > 0 && isCompact && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <AdminDisciplineCardsGrid
                variant="public"
                density="compact"
                hideCount
                fillContainer
                bodyRef={containerRef}
                disciplines={pageDisciplines}
                onSelect={setSelectedDiscipline}
              />
              <AdminTablePagination
                page={currentPage}
                totalPages={totalPages}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                total={visibleDisciplines.length}
                noun="disciplines"
                onPageChange={setPage}
              />
            </div>
          )}

          {!disciplinesLoading && visibleDisciplines.length > 0 && !isCompact && (
            <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
              <p className="mb-3 text-xs text-[#8A7E6E]">
                {visibleDisciplines.length} discipline{visibleDisciplines.length === 1 ? '' : 's'} available
              </p>

              <AdminDisciplineCardsGrid
                variant="public"
                density="large"
                hideCount
                disciplines={pageDisciplines}
                onSelect={setSelectedDiscipline}
              />

              {paginationFooter}
            </div>
          )}
        </div>
      </MemberPageShell>
    </>
  );
}
