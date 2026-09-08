import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  AdminDisciplineCardsGrid,
  DisciplineDensityToggle,
  type DisciplineCardDensity,
} from '../components/disciplines/AdminDisciplineCardsGrid';
import { AdminDisciplineModal } from '../components/disciplines/AdminDisciplineModal';
import { AdminTablePagination } from '../components/layout/AdminTablePagination';
import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';
import {
  fetchDisciplinesForPublic,
  type DisciplineDisplay,
} from '../../lib/discipline-service';

/** Two rows per page: compact = 4 cols × 2, large = 3 cols × 2 */
const PAGE_SIZE: Record<DisciplineCardDensity, number> = {
  compact: 8,
  large: 6,
};

export default function DisciplinesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [disciplines, setDisciplines] = useState<DisciplineDisplay[]>([]);
  const [disciplinesLoading, setDisciplinesLoading] = useState(true);
  const [disciplinesError, setDisciplinesError] = useState<string | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineDisplay | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [density, setDensity] = useState<DisciplineCardDensity>('large');
  const [page, setPage] = useState(1);

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

  const pageSize = PAGE_SIZE[density];
  const totalPages = Math.max(1, Math.ceil(disciplines.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageDisciplines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return disciplines.slice(start, start + pageSize);
  }, [disciplines, currentPage, pageSize]);

  const rangeStart = disciplines.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, disciplines.length);

  const handleDensityChange = (next: DisciplineCardDensity) => {
    setDensity(next);
    setPage(1);
  };

  const handleEnroll = () => {
    if (isAuthenticated) {
      navigate('/book');
      return;
    }
    setShowSignInPrompt(true);
  };

  return (
    <div className="min-h-full bg-[#F8F3E8] flex flex-col">
      {selectedDiscipline && (
        <AdminDisciplineModal
          discipline={selectedDiscipline}
          readOnly
          onClose={() => setSelectedDiscipline(null)}
          onEnroll={handleEnroll}
        />
      )}

      {showSignInPrompt && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowSignInPrompt(false)}
        >
          <div
            className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-sm p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#c49a3c]/12 border border-[#c49a3c]/25 flex items-center justify-center mb-4">
              <LogIn size={20} className="text-[#c49a3c]" />
            </div>
            <h2
              className="text-[#1E2A35] leading-none mb-2"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em' }}
            >
              Sign in required
            </h2>
            <p className="text-[#8A7E6E] text-sm leading-relaxed mb-6">
              Sign-in to manage your class schedules.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSignInPrompt(false)}
                className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 bg-white text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-all"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignInPrompt(false);
                  navigate('/auth');
                }}
                className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white text-sm font-bold hover:bg-[#263545] transition-all"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="shrink-0 border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-3 md:pt-5 md:pb-4">
          <PublicBreadcrumb parent="Our Classes" current="Disciplines" parentTo="/classes" />
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="min-w-0">
              <h1
                className="text-[#1E2A35] leading-none"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 'clamp(1.7rem, 3.5vw, 2.4rem)',
                  letterSpacing: '0.05em',
                }}
              >
                Disciplines
              </h1>
              <p className="text-[#8A7E6E] text-xs md:text-sm mt-1.5">
                Explore the movement practices we offer at BALANSÉ.
              </p>
            </div>
            {!disciplinesLoading && disciplines.length > 0 && (
              <DisciplineDensityToggle density={density} onChange={handleDensityChange} />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-3 md:py-4 flex flex-col pb-10">
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

        {!disciplinesLoading && disciplines.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-[#8A7E6E] text-xs">
                {disciplines.length} discipline{disciplines.length === 1 ? '' : 's'} available
              </p>
            </div>

            <AdminDisciplineCardsGrid
              variant="public"
              density={density}
              hideCount
              disciplines={pageDisciplines}
              onSelect={setSelectedDiscipline}
            />

            <AdminTablePagination
              page={currentPage}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              total={disciplines.length}
              noun="disciplines"
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
