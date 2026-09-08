import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { MemberPageShell } from '../components/layout/MemberPageShell';
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

const PAGE_SIZE: Record<DisciplineCardDensity, number> = {
  compact: 8,
  large: 6,
};

export default function MemberDisciplinesPage() {
  const navigate = useNavigate();
  const [disciplines, setDisciplines] = useState<DisciplineDisplay[]>([]);
  const [disciplinesLoading, setDisciplinesLoading] = useState(true);
  const [disciplinesError, setDisciplinesError] = useState<string | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineDisplay | null>(null);
  const [density, setDensity] = useState<DisciplineCardDensity>('large');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

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

  const pageSize = PAGE_SIZE[density];
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
        searchPlaceholder="Search disciplines…"
        onSearch={(query) => {
          setSearch(query);
          setPage(1);
        }}
      >
        <div className="pt-6 mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Studio</p>
            <h2
              className="text-[#1E2A35] leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
            >
              Disciplines
            </h2>
            <p className="text-[#8A7E6E] text-sm mt-1 max-w-xl">
              Explore the movement practices we offer at BALANSÉ.
            </p>
          </div>
          {!disciplinesLoading && visibleDisciplines.length > 0 && (
            <DisciplineDensityToggle density={density} onChange={handleDensityChange} />
          )}
        </div>

        {disciplinesLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-[#8A7E6E]">
            <Loader2 size={18} className="animate-spin text-[#c49a3c]" />
            <span className="text-sm">Loading disciplines…</span>
          </div>
        )}

        {!disciplinesLoading && disciplinesError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 text-sm font-semibold">Could not load disciplines</p>
              <p className="text-red-600/80 text-xs mt-0.5">{disciplinesError}</p>
            </div>
          </div>
        )}

        {!disciplinesLoading && !disciplinesError && disciplines.length === 0 && (
          <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-5 py-10 text-center">
            <p className="text-[#1E2A35] text-sm font-semibold">No disciplines available yet</p>
            <p className="text-[#8A7E6E] text-xs mt-1">Check back soon for our class catalog.</p>
          </div>
        )}

        {!disciplinesLoading && disciplines.length > 0 && visibleDisciplines.length === 0 && (
          <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-5 py-10 text-center">
            <p className="text-[#1E2A35] text-sm font-semibold">No matching disciplines</p>
            <p className="text-[#8A7E6E] text-xs mt-1">Try a different search term.</p>
          </div>
        )}

        {!disciplinesLoading && visibleDisciplines.length > 0 && (
          <>
            <p className="text-[#8A7E6E] text-xs mb-3">
              {visibleDisciplines.length} discipline{visibleDisciplines.length === 1 ? '' : 's'} available
            </p>

            <AdminDisciplineCardsGrid
              variant="public"
              density={density}
              hideCount
              disciplines={pageDisciplines}
              onSelect={setSelectedDiscipline}
            />

            <div className="mt-6 pt-4 border-t border-[#D4CDB5]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[#8A7E6E] text-xs">
                Showing {rangeStart}–{rangeEnd} of {visibleDisciplines.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="w-9 h-9 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`min-w-9 h-9 px-2.5 rounded-full text-xs font-semibold transition-all ${
                      n === currentPage
                        ? 'bg-[#c49a3c] text-white'
                        : 'bg-white border border-[#D4CDB5]/60 text-[#5A5048] hover:border-[#c49a3c]/40'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="w-9 h-9 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </MemberPageShell>
    </>
  );
}
