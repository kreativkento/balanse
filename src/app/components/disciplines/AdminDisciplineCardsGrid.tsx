import type { DisciplineDisplay } from '../../../lib/discipline-service';
import { StatusDisciplineBadge } from './StatusDisciplineBadge';

interface AdminDisciplineCardsGridProps {
  disciplines: DisciplineDisplay[];
  onSelect: (discipline: DisciplineDisplay) => void;
}

export function AdminDisciplineCardsGrid({ disciplines, onSelect }: AdminDisciplineCardsGridProps) {
  return (
    <>
      <p className="text-[#8A7E6E] text-xs mb-4 -mt-1">{disciplines.length} disciplines in catalog</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {disciplines.map((discipline) => (
          <button
            key={discipline.id}
            type="button"
            onClick={() => onSelect(discipline)}
            className="rounded-3xl overflow-hidden bg-white border border-[#D4CDB5]/60 shadow-sm flex flex-col text-left transition-[transform,box-shadow] duration-300 ease-out hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A3C]/50"
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
                <StatusDisciplineBadge status={discipline.status} className="shrink-0" />
              </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
              <p className="text-[#8A7E6E] text-sm leading-relaxed flex-1 line-clamp-3">
                {discipline.description || 'No description yet.'}
              </p>
              <p className="text-[#C49A3C] text-xs font-semibold mt-4">View details</p>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
