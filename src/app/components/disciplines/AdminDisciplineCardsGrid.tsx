import type { ReactNode, Ref } from 'react';
import { ChevronRight, LayoutGrid, List, Rows3 } from 'lucide-react';
import type { DisciplineDisplay } from '../../../lib/discipline-service';
import { CARD_HOVER_GROW } from '../../../lib/motion-classes';
import { StatusDisciplineBadge } from './StatusDisciplineBadge';

export type DisciplineCardDensity = 'compact' | 'large';
export type DisciplineLayoutMode = DisciplineCardDensity | 'list';

interface AdminDisciplineCardsGridProps {
  disciplines: DisciplineDisplay[];
  onSelect: (discipline: DisciplineDisplay) => void;
  /** Public catalog: large cards keep See more; compact cards are logo + title only. */
  variant?: 'admin' | 'public';
  /** Card size, or list table on the admin catalog. */
  density?: DisciplineLayoutMode;
  /** @deprecated Public cards open the modal via onSelect. */
  onEnroll?: (discipline: DisciplineDisplay) => void;
  /** Hide the count line (e.g. when the parent page shows its own toolbar). */
  hideCount?: boolean;
  /** Compact/Large only: render as the last grid tile (e.g. Add Discipline). */
  trailingSlot?: ReactNode;
  /** Stretch to fill a flex parent (admin viewport-fit pages). */
  fillContainer?: boolean;
  /** Measured area used to compute how many rows/cards fit. */
  bodyRef?: Ref<HTMLDivElement>;
}

export function AdminDisciplineCardsGrid({
  disciplines,
  onSelect,
  variant = 'admin',
  density = 'large',
  hideCount = false,
  trailingSlot,
  fillContainer = false,
  bodyRef,
}: AdminDisciplineCardsGridProps) {
  const isPublic = variant === 'public';
  const isCompact = density === 'compact';
  const isList = density === 'list';

  return (
    <>
      {!hideCount && (
        <p className="text-[#8A7E6E] text-xs mb-4 -mt-1">
          {disciplines.length} discipline{disciplines.length === 1 ? '' : 's'}{' '}
          {isPublic ? 'available' : 'in catalog'}
        </p>
      )}
      {isList ? (
        <AdminDisciplineList
          disciplines={disciplines}
          onSelect={onSelect}
          fillContainer={fillContainer}
          bodyRef={bodyRef}
        />
      ) : (
      <div
        ref={bodyRef}
        className={
          (isCompact
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 content-start'
            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 content-start')
          + (fillContainer ? ' flex-1 min-h-0 overflow-hidden' : '')
        }
      >
        {disciplines.map((discipline) =>
          isCompact ? (
            <button
              key={discipline.id}
              type="button"
              onClick={() => onSelect(discipline)}
              className={`relative overflow-hidden rounded-3xl border border-[#D4CDB5]/60 shadow-sm flex flex-col items-center justify-center text-center px-4 py-6 md:py-8 min-h-[10.5rem] md:min-h-[12rem] ${CARD_HOVER_GROW} hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50`}
            >
              <img
                src={discipline.imageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[#1E2A35]/45" />
              {!isPublic && (
                <div className="absolute top-2 right-2 z-10">
                  <StatusDisciplineBadge status={discipline.status} />
                </div>
              )}
              <img
                src={discipline.logoUrl}
                alt=""
                aria-hidden="true"
                className="relative z-10 w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] rounded-2xl border border-white/40 bg-white/90 object-contain p-1.5 shadow-sm"
              />
              <h2
                className="relative z-10 text-white leading-none mt-3"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '1.15rem',
                  letterSpacing: '0.04em',
                }}
              >
                {discipline.name}
              </h2>
            </button>
          ) : (
            <button
              key={discipline.id}
              type="button"
              onClick={() => onSelect(discipline)}
              className={`rounded-3xl overflow-hidden bg-white border border-[#D4CDB5]/60 shadow-sm flex flex-col text-left ${CARD_HOVER_GROW} hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50`}
            >
              <div className="relative overflow-hidden shrink-0 h-44 md:h-48">
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
                    className="rounded-xl border border-white/30 bg-white/90 object-cover shadow-sm w-10 h-10"
                  />
                </div>
                <div className="absolute flex items-end justify-between gap-2 bottom-3 left-4 right-4">
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

              <div className="flex flex-col flex-1 p-4">
                <p className="text-[#8A7E6E] leading-relaxed flex-1 text-sm line-clamp-3">
                  {discipline.description || 'No description yet.'}
                </p>
                <p className="text-[#c49a3c] font-semibold flex items-center gap-1 text-xs mt-4">
                  See more <ChevronRight size={14} />
                </p>
              </div>
            </button>
          ),
        )}
        {trailingSlot}
      </div>
      )}
    </>
  );
}

function formatDisciplineUpdatedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function AdminDisciplineList({
  disciplines,
  onSelect,
  fillContainer = false,
  bodyRef,
}: {
  disciplines: DisciplineDisplay[];
  onSelect: (discipline: DisciplineDisplay) => void;
  fillContainer?: boolean;
  bodyRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${
        fillContainer ? 'flex-1 min-h-0 flex flex-col' : ''
      }`}
    >
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-x-4 px-5 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 shrink-0">
        {['Discipline', 'Description', 'Status', 'Updated'].map((heading) => (
          <p key={heading} className="text-[#9A8E7E] text-[0.65rem] uppercase tracking-widest font-semibold">
            {heading}
          </p>
        ))}
      </div>

      <div
        ref={bodyRef}
        className={fillContainer ? 'flex-1 min-h-0 divide-y divide-[#D4CDB5]/30 overflow-hidden' : 'divide-y divide-[#D4CDB5]/30'}
      >
        {disciplines.map((discipline) => (
          <div
            key={discipline.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(discipline)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(discipline);
              }
            }}
            className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-x-4 px-5 py-4 items-center hover:bg-[#F8F3E8]/70 cursor-pointer transition-colors min-h-[64px]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#F8F3E8] border border-[#D4CDB5]/60 flex items-center justify-center shrink-0 overflow-hidden">
                <img src={discipline.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[#1E2A35] text-sm font-semibold truncate">{discipline.name}</p>
                <p className="text-[#8A7E6E] text-xs mt-0.5 truncate">{discipline.slug}</p>
              </div>
            </div>
            <p className="text-[#8A7E6E] text-sm line-clamp-2">
              {discipline.description || 'No description yet.'}
            </p>
            <div>
              <StatusDisciplineBadge status={discipline.status} tone="plain" />
            </div>
            <span className="text-[#8A7E6E] text-sm">{formatDisciplineUpdatedAt(discipline.updatedAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DisciplineDensityToggle({
  density,
  onChange,
}: {
  density: DisciplineCardDensity;
  onChange: (density: DisciplineCardDensity) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-[#D4CDB5]/70 bg-white p-1 gap-0.5">
      <button
        type="button"
        onClick={() => onChange('compact')}
        aria-pressed={density === 'compact'}
        title="Compact cards"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
          density === 'compact'
            ? 'bg-[#c49a3c] text-white'
            : 'text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#F8F3E8]'
        }`}
      >
        <LayoutGrid size={13} />
        Compact
      </button>
      <button
        type="button"
        onClick={() => onChange('large')}
        aria-pressed={density === 'large'}
        title="Large cards"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
          density === 'large'
            ? 'bg-[#c49a3c] text-white'
            : 'text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#F8F3E8]'
        }`}
      >
        <Rows3 size={13} />
        Large
      </button>
    </div>
  );
}

const LAYOUT_OPTIONS: { id: DisciplineLayoutMode; label: string; icon: typeof Rows3 }[] = [
  { id: 'list', label: 'List', icon: List },
  { id: 'compact', label: 'Compact', icon: LayoutGrid },
  { id: 'large', label: 'Large', icon: Rows3 },
];

export function DisciplineLayoutToggle({
  layout,
  onChange,
}: {
  layout: DisciplineLayoutMode;
  onChange: (layout: DisciplineLayoutMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm shrink-0 h-[42px]">
      {LAYOUT_OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-label={`${label} view`}
          aria-pressed={layout === id}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            layout === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
          }`}
        >
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  );
}
