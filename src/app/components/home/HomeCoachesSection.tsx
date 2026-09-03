import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Search, Star, Users } from 'lucide-react';
import { fetchPublicCoaches, type PublicCoachProfile } from '../../../lib/admin-service';
import { CoachProfileModal } from '../coaches/CoachProfileModal';
import { DisciplineChip, DisciplineCountChip } from '../disciplines/DisciplineChip';

function firstNameFrom(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? '';
}

function coachLabel(name: string): string {
  const first = firstNameFrom(name);
  return first ? `Coach ${first}` : 'Coach';
}

const PANEL_GRID =
  'grid grid-cols-1 items-stretch gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-5';

const COACHES_PER_PAGE = 6;
const AUTOPLAY_MS = 5000;
const PHOTO_FADE_S = 0.7;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Info block leaves, then re-enters with its columns staggered. */
function infoMotion(reduce: boolean) {
  return {
    group: {
      hidden: {},
      show: { transition: reduce ? {} : { staggerChildren: 0.08, delayChildren: 0.05 } },
      hide: { transition: reduce ? {} : { staggerChildren: 0.05, staggerDirection: -1 } },
    },
    item: {
      hidden: { opacity: 0, y: reduce ? 0 : 12 },
      show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.45, ease: EASE_OUT } },
      hide: {
        opacity: 0,
        y: reduce ? 0 : -8,
        transition: { duration: reduce ? 0 : 0.3, ease: 'easeIn' as const },
      },
    },
  };
}

function ratingFromCoachId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const score = 4.3 + (hash % 70) / 100;
  return Math.min(5, score).toFixed(1);
}

export function HomeCoachesSection() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [coaches, setCoaches] = useState<PublicCoachProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [autoplayPaused, setAutoplayPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchPublicCoaches().then((result) => {
      if (cancelled) return;
      setCoaches(result.data);
      setSelectedId(result.data[0]?.id ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const info = infoMotion(!!reduceMotion);

  const selected = coaches.find((coach) => coach.id === selectedId) ?? coaches[0] ?? null;
  const selectedRating = selected ? ratingFromCoachId(selected.id) : '0.0';
  const selectedIndex = selected ? coaches.findIndex((coach) => coach.id === selected.id) : -1;

  const pageCount = Math.max(1, Math.ceil(coaches.length / COACHES_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * COACHES_PER_PAGE;
  const visibleCoaches = coaches.slice(pageStart, pageStart + COACHES_PER_PAGE);

  // Follow the featured coach so autoplay never leaves the roster on another page.
  useEffect(() => {
    if (selectedIndex < 0) return;
    setPage(Math.floor(selectedIndex / COACHES_PER_PAGE));
  }, [selectedIndex]);

  // Restarts on every change, so a manual pick also gets a full interval.
  useEffect(() => {
    if (reduceMotion || autoplayPaused || profileOpen || coaches.length < 2) return;

    const timer = window.setTimeout(() => {
      const next = coaches[(selectedIndex + 1) % coaches.length];
      if (next) setSelectedId(next.id);
    }, AUTOPLAY_MS);

    return () => window.clearTimeout(timer);
  }, [coaches, selectedIndex, reduceMotion, autoplayPaused, profileOpen]);

  return (
    <section id="our-coaches" className="px-4 md:px-8 pt-10 md:pt-14 pb-10 md:pb-16 scroll-mt-24">
      {profileOpen && selected && (
        <CoachProfileModal coach={selected} onClose={() => setProfileOpen(false)} />
      )}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6 md:mb-8">
        <div>
          <p className="text-[#c49a3c] text-xs uppercase tracking-[0.22em] font-semibold mb-2">Our coaches</p>
          <h2
            className="text-[#1E2A35] leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
              letterSpacing: '0.05em',
            }}
          >
            Choose your guide
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/coaches')}
          className="self-start md:self-auto flex items-center gap-1 text-[#c49a3c] text-sm font-semibold hover:gap-2 transition-all"
        >
          Meet all coaches <ChevronRight size={16} />
        </button>
      </div>

      {loading && (
        <div className={`${PANEL_GRID} animate-pulse`} role="status">
          <span className="sr-only">Loading coaches…</span>
          <div className="flex flex-col">
            <div className="aspect-square w-full rounded-[1.75rem] bg-[#EDE8D8]" />
            <div className="mt-4 flex items-start justify-between gap-4 px-1 md:mt-5">
              <div className="flex w-full max-w-xs flex-col gap-3">
                <div className="h-8 w-44 rounded-lg bg-[#EDE8D8]" />
                <div className="h-9 w-56 rounded-full bg-[#EDE8D8]" />
                <div className="h-8 w-36 rounded-full bg-[#EDE8D8]" />
              </div>
              <div className="h-[4.25rem] w-20 shrink-0 rounded-2xl bg-[#EDE8D8]" />
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-[#D4CDB5]/60 bg-white/80 p-3 shadow-sm md:p-4">
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="h-3 w-28 rounded-full bg-[#EDE8D8]" />
              <div className="h-3 w-10 rounded-full bg-[#EDE8D8]" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-2 md:gap-3 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-[#EDE8D8]" />
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && coaches.length === 0 && (
        <div className="rounded-[1.75rem] border border-[#D4CDB5]/60 bg-white px-6 py-14 text-center shadow-sm">
          <Users size={28} className="text-[#c49a3c]/40 mx-auto mb-2" />
          <p className="text-[#1E2A35] text-sm font-semibold">No coaches listed yet</p>
          <p className="text-[#8A7E6E] text-xs mt-1">Coach profiles will appear here once published.</p>
        </div>
      )}

      {!loading && selected && (
        <div className={PANEL_GRID}>
          {/* Selected character panel */}
          <div className="flex flex-col">
            <div className="relative aspect-square w-full overflow-hidden rounded-[1.75rem] bg-[#1E2A35] shadow-md">
              {/* The outgoing photo lingers under the incoming one so no backdrop shows through */}
              <AnimatePresence initial={false}>
                <motion.div
                  key={selected.id}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    transition: reduceMotion
                      ? { duration: 0 }
                      : { duration: PHOTO_FADE_S, delay: PHOTO_FADE_S * 0.4 },
                  }}
                  transition={{ duration: reduceMotion ? 0 : PHOTO_FADE_S, ease: [0.22, 1, 0.36, 1] }}
                >
                  {selected.photo ? (
                    <img
                      src={selected.photo}
                      alt={selected.name}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{ background: `linear-gradient(145deg, ${selected.color}55, #1E2A35)` }}
                    >
                      <span
                        className="text-white/35"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '6rem', letterSpacing: '0.08em' }}
                      >
                        {selected.initials}
                      </span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              <div
                className="absolute inset-x-0 top-0 h-1 transition-colors duration-700"
                style={{ backgroundColor: selected.color }}
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-[1.75rem] transition-shadow duration-700"
                style={{ boxShadow: `inset 0 0 0 1px ${selected.color}55` }}
              />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected.id}
                className="mt-4 flex items-start justify-between gap-4 px-1 md:mt-5"
                variants={info.group}
                initial="hidden"
                animate="show"
                exit="hide"
              >
                <motion.div variants={info.item} className="flex min-w-0 flex-col items-start gap-3">
                  <h3
                    className="text-[#1E2A35] leading-none"
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {coachLabel(selected.name)}
                  </h3>
                  {selected.classes.length > 0 && (
                    <div className="flex flex-wrap justify-start gap-2">
                      {selected.classes.slice(0, 4).map((discipline) => (
                        <DisciplineChip key={discipline} name={discipline} color={selected.color} />
                      ))}
                      {selected.classes.length > 4 && (
                        <DisciplineCountChip count={selected.classes.length - 4} />
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setProfileOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1E2A35] text-white px-4 py-2 text-xs font-semibold hover:bg-[#263545] transition-colors"
                  >
                    <Search size={14} />
                    Coach's Profile
                  </button>
                </motion.div>

                <motion.div
                  variants={info.item}
                  className="flex shrink-0 flex-col items-center"
                  aria-label={`Rated ${selectedRating} out of 5`}
                >
                  <div className="flex min-w-[4.75rem] items-center justify-center rounded-2xl border-2 border-[#D4CDB5] bg-white/60 px-3.5 py-5 md:min-w-[5.25rem] md:px-4">
                    <span
                      className="tabular-nums leading-none text-[#1E2A35]"
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 'clamp(2.5rem, 6vw, 3.4rem)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {selectedRating}
                    </span>
                  </div>
                  <span className="mt-2 flex items-center gap-1.5 text-[0.8125rem] font-bold uppercase tracking-[0.12em] text-[#8A7E6E]">
                    <Star size={14} className="fill-[#C49A3C] text-[#C49A3C]" strokeWidth={0} />
                    Rating
                  </span>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Coach select grid — hovering or focusing it holds the featured coach */}
          <div
            className="flex min-h-0 flex-col rounded-[1.75rem] border border-[#D4CDB5]/60 bg-white/80 p-3 shadow-sm md:p-4"
            onMouseEnter={() => setAutoplayPaused(true)}
            onMouseLeave={() => setAutoplayPaused(false)}
            onFocus={() => setAutoplayPaused(true)}
            onBlur={() => setAutoplayPaused(false)}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-[#8A7E6E] text-[0.65rem] uppercase tracking-[0.18em] font-semibold">
                Select Coach
              </p>
              <p className="text-[#B0A898] text-[11px] tabular-nums">
                {String(selectedIndex + 1).padStart(2, '0')} /{' '}
                {String(coaches.length).padStart(2, '0')}
              </p>
            </div>

            <div className="relative min-h-[22rem] flex-1 md:min-h-0">
              <div className="absolute inset-0 grid grid-cols-2 content-start gap-2.5 overflow-y-auto py-0.5 pl-0.5 pr-1.5 sm:grid-cols-3 md:grid-cols-2 md:gap-3 lg:grid-cols-3">
                {visibleCoaches.map((coach, pageIndex) => {
                  const index = pageStart + pageIndex;
                  const isSelected = coach.id === selected.id;
                  return (
                    <button
                      key={coach.id}
                      type="button"
                      onClick={() => setSelectedId(coach.id)}
                      aria-pressed={isSelected}
                      className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50 ${
                        isSelected
                          ? 'border-[#1E2A35] shadow-md'
                          : 'border-[#D4CDB5]/60 opacity-90 hover:border-[#c49a3c]/40 hover:opacity-100 hover:shadow-sm'
                      }`}
                    >
                      <div className="relative aspect-[3/4] bg-[#EDE8D8]">
                        {coach.photo ? (
                          <img
                            src={coach.photo}
                            alt=""
                            className={`absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 ${
                              isSelected ? 'scale-[1.03]' : 'group-hover:scale-[1.03]'
                            }`}
                          />
                        ) : (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ backgroundColor: `${coach.color}22` }}
                          >
                            <span
                              style={{
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: '1.6rem',
                                letterSpacing: '0.06em',
                                color: coach.color,
                              }}
                            >
                              {coach.initials}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1E2A35]/80 via-transparent to-transparent" />
                        <span
                          className={`absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${
                            isSelected ? 'bg-[#c49a3c] text-white' : 'bg-black/40 text-white/85'
                          }`}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {isSelected && (
                          <span
                            className="absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-white"
                            style={{ backgroundColor: coach.color }}
                          />
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-2.5">
                          <p
                            className="truncate leading-none text-white"
                            style={{
                              fontFamily: "'Bebas Neue', sans-serif",
                              fontSize: '1.05rem',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {coachLabel(coach.name)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {pageCount > 1 && (
              <div className="mt-3 flex items-center justify-between gap-2 px-1">
                <button
                  type="button"
                  onClick={() => setPage((prev) => (prev - 1 + pageCount) % pageCount)}
                  aria-label="Previous page of coaches"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4CDB5]/70 text-[#c49a3c] transition-colors hover:bg-[#F8F3E8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: pageCount }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setPage(index)}
                      aria-label={`Page ${index + 1} of ${pageCount}`}
                      aria-current={index === currentPage ? true : undefined}
                      className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50 ${
                        index === currentPage
                          ? 'w-5 bg-[#c49a3c]'
                          : 'w-2 bg-[#D4CDB5] hover:bg-[#B0A898]'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((prev) => (prev + 1) % pageCount)}
                  aria-label="Next page of coaches"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4CDB5]/70 text-[#c49a3c] transition-colors hover:bg-[#F8F3E8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
