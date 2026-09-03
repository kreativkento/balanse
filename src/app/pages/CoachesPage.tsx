import { useState, useMemo, useEffect } from 'react';
import { Users, ChevronRight, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { fetchPublicCoaches, type PublicCoachProfile } from '../../lib/admin-service';
import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';
import { CoachProfileModal } from '../components/coaches/CoachProfileModal';

type Coach = PublicCoachProfile;

const PAGE_SIZE = 6;

function CoachCard({ coach, onClick }: { coach: Coach; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden text-left hover:shadow-md hover:border-[#c49a3c]/30 active:scale-[0.97] group h-full ${CARD_HOVER_GROW}`}
    >
      <div className="relative h-20 md:h-24 overflow-hidden" style={{ backgroundColor: `${coach.color}15` }}>
        {!imgErr && coach.photo ? (
          <img
            src={coach.photo}
            alt={`Coach ${coach.name}`}
            className="w-full h-full object-cover object-top"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.1em', color: coach.color, opacity: 0.4 }}>{coach.initials}</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: 'linear-gradient(to top, white, transparent)' }} />
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: coach.color }} />
        </div>
      </div>
      <div className="px-3.5 py-2.5 md:px-4 md:py-3">
        <h3 className="text-[#1E2A35] leading-none mb-0.5" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.04em' }}>{coach.name}</h3>
        <p className="text-[#8A7E6E] text-[11px] font-semibold mb-2 line-clamp-1">{coach.role}</p>
        <div className="flex flex-wrap gap-1 mb-2 min-h-[18px]">
          {coach.classes.slice(0, 2).map((cls) => (
            <span key={cls} className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: coach.color }}>{cls}</span>
          ))}
          {coach.classes.length > 2 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDE8D8] text-[#7A6A52]">+{coach.classes.length - 2}</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[#c49a3c] text-[11px] font-semibold group-hover:gap-2 transition-all">
          View Profile <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </button>
  );
}

export default function CoachesPage() {
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchPublicCoaches().then((result) => {
      if (cancelled) return;
      setCoaches(result.data);
      setError(result.error);
      setLoading(false);
      setPage(1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(coaches.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageCoaches = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return coaches.slice(start, start + PAGE_SIZE);
  }, [coaches, currentPage]);

  const rangeStart = coaches.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, coaches.length);

  return (
    <div className="h-full overflow-hidden bg-[#F8F3E8] flex flex-col">
      {selectedCoach && <CoachProfileModal coach={selectedCoach} onClose={() => setSelectedCoach(null)} />}

      <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-4 md:py-5 flex flex-col flex-1 min-h-0">
        <div className="shrink-0 mb-3 md:mb-4">
          <PublicBreadcrumb parent="Our Community" current="Coaches" parentTo="/bulletin" />
          <h1
            className="text-[#1E2A35] leading-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', letterSpacing: '0.04em' }}
          >
            Our Coaches
          </h1>
          <p className="text-[#8A7E6E] text-xs md:text-sm mt-1 max-w-xl line-clamp-2">
            World-class coaches dedicated to helping you move better, feel stronger, and live well.
            Tap any coach card to view their full profile.
          </p>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {loading && (
            <div className="flex-1 flex items-center justify-center gap-2 text-[#8A7E6E]">
              <Loader2 size={18} className="animate-spin text-[#c49a3c]" />
              <span className="text-sm">Loading coaches…</span>
            </div>
          )}

          {!loading && error && coaches.length === 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 text-sm font-semibold">Could not load coaches</p>
                <p className="text-red-600/80 text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && coaches.length === 0 && (
            <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-5 py-10 text-center">
              <Users size={28} className="text-[#c49a3c]/40 mx-auto mb-2" />
              <p className="text-[#1E2A35] text-sm font-semibold">No coaches listed yet</p>
              <p className="text-[#8A7E6E] text-xs mt-1">Check back soon as coach profiles are published.</p>
            </div>
          )}

          {!loading && coaches.length > 0 && (
            <>
              {error && (
                <div className="mb-3 shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-800 text-xs">
                  {error}
                </div>
              )}

              <div className="flex-1 min-h-0 grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 content-start">
                {pageCoaches.map((coach) => (
                  <CoachCard key={coach.id} coach={coach} onClick={() => setSelectedCoach(coach)} />
                ))}
              </div>

              <div className="shrink-0 mt-3 md:mt-4 pt-3 border-t border-[#D4CDB5]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[#8A7E6E] text-xs">
                  Showing {rangeStart}–{rangeEnd} of {coaches.length} coaches
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
        </div>
      </div>
    </div>
  );
}
