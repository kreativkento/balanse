import { useState, useMemo, useEffect } from 'react';
import { Users, Clock, X, ChevronRight, ChevronLeft, Globe, Loader2, AlertCircle } from 'lucide-react';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { fetchPublicCoaches, type PublicCoachProfile } from '../../lib/admin-service';
import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';

type Coach = PublicCoachProfile;

const PAGE_SIZE = 6;

function CoachCard({ coach, onClick }: { coach: Coach; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden text-left hover:shadow-md hover:border-[#745b3c]/30 active:scale-[0.97] group h-full ${CARD_HOVER_GROW}`}
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
        <div className="flex items-center gap-1 text-[#745b3c] text-[11px] font-semibold group-hover:gap-2 transition-all">
          View Profile <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </button>
  );
}

function CoachPhotoModal({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo of Coach ${coach.name}`}
    >
      <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo"
          className="absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#8A7E6E] shadow-md transition-all hover:bg-[#F8F3E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#745b3c]/50"
        >
          <X size={16} />
        </button>
        <div className="overflow-hidden rounded-2xl border-4 border-white bg-white shadow-2xl">
          {!imgError && coach.photo ? (
            <img
              src={coach.photo}
              alt={`Coach ${coach.name}`}
              className="aspect-square w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="flex aspect-square w-full items-center justify-center"
              style={{ backgroundColor: `${coach.color}18` }}
            >
              <span
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '4rem',
                  letterSpacing: '0.08em',
                  color: coach.color,
                }}
              >
                {coach.initials}
              </span>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-white/80">{coach.name}</p>
      </div>
    </div>
  );
}

function CoachModal({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  return (
    <>
      {photoOpen && <CoachPhotoModal coach={coach} onClose={() => setPhotoOpen(false)} />}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden">
          <div className="relative">
            <div className="relative h-36 md:h-40 overflow-hidden" style={{ backgroundColor: `${coach.color}20` }}>
              {coach.coverImage ? (
                <img src={coach.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${coach.color}35 0%, ${coach.color}08 100%)` }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile"
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#8A7E6E] shadow-sm backdrop-blur-sm transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#745b3c]/50"
              >
                <X size={16} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: coach.color }} />
            </div>

            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              aria-label={`View full photo of Coach ${coach.name}`}
              className="absolute bottom-0 left-6 md:left-8 z-10 h-24 w-24 md:h-28 md:w-28 translate-y-1/2 overflow-hidden rounded-2xl border-4 border-white shadow-lg transition-all hover:brightness-95 hover:ring-2 hover:ring-[#745b3c]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#745b3c] active:scale-[0.98] cursor-pointer"
            >
              {!imgError && coach.photo ? (
                <img
                  src={coach.photo}
                  alt={`Coach ${coach.name}`}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ backgroundColor: `${coach.color}18` }}
                >
                  <span
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '2rem',
                      letterSpacing: '0.08em',
                      color: coach.color,
                    }}
                  >
                    {coach.initials}
                  </span>
                </div>
              )}
            </button>
          </div>

          <div className="border-b border-[#D4CDB5]/50 px-6 pb-5 pt-14 md:px-8 md:pt-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.04em' }}>{coach.name}</h2>
                <p className="mt-0.5 text-sm font-semibold text-[#8A7E6E]">{coach.role}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {coach.experience && (
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: `${coach.color}18`, color: coach.color }}>{coach.experience} experience</span>
                  )}
                  {coach.nationality && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#D4CDB5]/60 bg-[#F8F3E8] px-2.5 py-1 text-xs font-medium text-[#5A5048]">
                      <Globe size={11} className="text-[#745b3c]" />
                      {coach.nationality}
                    </span>
                  )}
                </div>
              </div>
              {coach.classes.length > 0 && (
                <div className="flex shrink-0 flex-wrap justify-start gap-2 sm:justify-end">
                  {coach.classes.map((cls) => (
                    <span key={cls} className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: coach.color }}>{cls}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-8 py-6 grid md:grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto pb-8">
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">About</p>
                <p className="text-[#5A5048] text-sm leading-relaxed">
                  {coach.bio || 'This coach has not added a bio yet.'}
                </p>
              </div>

              {coach.nationality && (
                <div>
                  <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Globe size={11} /> Nationality
                  </p>
                  <p className="text-[#5A5048] text-sm">{coach.nationality}</p>
                </div>
              )}

              {coach.experience && (
                <div>
                  <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Clock size={11} /> Experience
                  </p>
                  <p className="text-[#5A5048] text-sm">{coach.experience}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Disciplines</p>
                {coach.specialties.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {coach.specialties.map((s) => (
                      <span key={s} className="px-3 py-1 rounded-full text-xs font-medium border border-[#D4CDB5]/60 bg-[#F8F3E8] text-[#5A5048]">{s}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#9A8E7E] text-sm">No disciplines tagged yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
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
      {selectedCoach && <CoachModal coach={selectedCoach} onClose={() => setSelectedCoach(null)} />}

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
              <Loader2 size={18} className="animate-spin text-[#745b3c]" />
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
              <Users size={28} className="text-[#745b3c]/40 mx-auto mb-2" />
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
                          ? 'bg-[#745b3c] text-white'
                          : 'bg-white border border-[#D4CDB5]/60 text-[#5A5048] hover:border-[#745b3c]/40'
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
