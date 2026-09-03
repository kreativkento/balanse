import { useState } from 'react';
import { Clock, Globe, X } from 'lucide-react';
import type { PublicCoachProfile } from '../../../lib/admin-service';
import { DisciplineChip, DisciplineLogo } from '../disciplines/DisciplineChip';

function CoachPhotoModal({
  coach,
  onClose,
}: {
  coach: PublicCoachProfile;
  onClose: () => void;
}) {
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
          className="absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#8A7E6E] shadow-md transition-all hover:bg-[#F8F3E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
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

export function CoachProfileModal({
  coach,
  onClose,
}: {
  coach: PublicCoachProfile;
  onClose: () => void;
}) {
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
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#8A7E6E] shadow-sm backdrop-blur-sm transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
              >
                <X size={16} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: coach.color }} />
            </div>

            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              aria-label={`View full photo of Coach ${coach.name}`}
              className="absolute bottom-0 left-6 md:left-8 z-10 h-24 w-24 md:h-28 md:w-28 translate-y-1/2 overflow-hidden rounded-2xl border-4 border-white shadow-lg transition-all hover:brightness-95 hover:ring-2 hover:ring-[#c49a3c]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c] active:scale-[0.98] cursor-pointer"
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
                      <Globe size={11} className="text-[#c49a3c]" />
                      {coach.nationality}
                    </span>
                  )}
                </div>
              </div>
              {coach.classes.length > 0 && (
                <div className="flex shrink-0 flex-wrap justify-start gap-2 sm:justify-end">
                  {coach.classes.map((cls) => (
                    <DisciplineLogo key={cls} name={cls} color={coach.color} />
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
                      <DisciplineChip key={s} name={s} color={coach.color} variant="outline" />
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
