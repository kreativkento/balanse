import { ChevronRight } from 'lucide-react';
import type { DisciplineDisplay } from '../../../lib/discipline-service';
import { CARD_HOVER_GROW } from '../../../lib/motion-classes';
import { StatusDisciplineBadge } from './StatusDisciplineBadge';

interface AdminDisciplineCardsGridProps {
  disciplines: DisciplineDisplay[];
  onSelect: (discipline: DisciplineDisplay) => void;
  /** Public classes page: Enroll CTA + softer count label. */
  variant?: 'admin' | 'public';
  onEnroll?: (discipline: DisciplineDisplay) => void;
}

export function AdminDisciplineCardsGrid({
  disciplines,
  onSelect,
  variant = 'admin',
  onEnroll,
}: AdminDisciplineCardsGridProps) {
  const isPublic = variant === 'public';

  return (
    <>
      <p className="text-[#8A7E6E] text-xs mb-4 -mt-1">
        {disciplines.length} discipline{disciplines.length === 1 ? '' : 's'}{' '}
        {isPublic ? 'available' : 'in catalog'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {disciplines.map((discipline) => (
          <div
            key={discipline.id}
            className={`rounded-3xl overflow-hidden bg-white border border-[#D4CDB5]/60 shadow-sm flex flex-col text-left ${CARD_HOVER_GROW} hover:shadow-md`}
          >
            <button
              type="button"
              onClick={() => onSelect(discipline)}
              className="flex flex-col flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C49A3C]/50"
            >
              <div className="relative h-48 overflow-hidden shrink-0">
                <img
                  src={discipline.imageUrl}
                  alt={discipline.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E2A35]/60 to-transparent" />
                <div className="absolute top-3 left-3">
                  <img
                    src={discipline.logoUrl}
                    alt=""
                    aria-hidden="true"
                    className="w-10 h-10 rounded-xl border border-white/30 bg-white/90 object-cover shadow-sm"
                  />
                </div>
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                  <h2
                    className="text-white leading-none min-w-0"
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '1.6rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {discipline.name}
                  </h2>
                  {!isPublic && (
                    <StatusDisciplineBadge status={discipline.status} className="shrink-0" />
                  )}
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1">
                <p className="text-[#8A7E6E] text-sm leading-relaxed flex-1 line-clamp-3">
                  {discipline.description || 'No description yet.'}
                </p>
                {!isPublic && (
                  <p className="text-[#C49A3C] text-xs font-semibold mt-4">View details</p>
                )}
              </div>
            </button>

            {isPublic && onEnroll && (
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEnroll(discipline);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#C49A3C] text-white font-bold text-sm rounded-full py-3.5 min-h-[48px] shadow-[0_4px_16px_rgba(196,154,60,0.3)] active:scale-[0.97] transition-all hover:bg-[#A67E2A]"
                >
                  Enroll <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
