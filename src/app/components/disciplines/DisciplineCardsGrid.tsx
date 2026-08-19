import { ChevronRight } from 'lucide-react';
import { DISCIPLINES, type Discipline } from '../../data/disciplines';
import { CARD_HOVER_GROW } from '../../../lib/motion-classes';

interface DisciplineCardsGridProps {
  disciplines?: Discipline[];
  showBookAction?: boolean;
  onBook?: () => void;
}

export function DisciplineCardsGrid({
  disciplines = DISCIPLINES,
  showBookAction = false,
  onBook,
}: DisciplineCardsGridProps) {
  return (
    <>
      <p className="text-[#8A7E6E] text-xs mb-4 -mt-1">{disciplines.length} disciplines available</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {disciplines.map((discipline) => (
          <div
            key={discipline.id}
            className={`rounded-3xl overflow-hidden bg-white border border-[#D4CDB5]/60 shadow-sm flex flex-col ${CARD_HOVER_GROW} hover:shadow-md`}
          >
            <div className="relative h-48 overflow-hidden shrink-0">
              <img
                src={discipline.img}
                alt={discipline.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1E2A35]/60 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <h2
                  className="text-white leading-none"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.6rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {discipline.name}
                </h2>
              </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
              <p className="text-[#8A7E6E] text-sm leading-relaxed flex-1">
                {discipline.description}
              </p>

              {showBookAction && onBook && (
                <button
                  onClick={onBook}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-[#C49A3C] text-white font-bold text-sm rounded-full py-3.5 min-h-[48px] shadow-[0_4px_16px_rgba(196,154,60,0.3)] active:scale-[0.97] transition-all hover:bg-[#A67E2A]"
                >
                  Book Now <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
