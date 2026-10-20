import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Award,
  Check,
  ChevronDown,
  Layers,
  SlidersHorizontal,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import {
  BLOCK_STATUS_COLORS,
  CLASS_BLOCK_STATUS_LEGEND,
} from '../../../lib/admin-schedule-map';
import {
  CLASS_BOOKING_OPTIONS,
  type ClassBlockStatus,
} from '../../../lib/class-service';
import { fetchManagedAccountsWithProfiles } from '../../../lib/admin-service';
import { normalizeDisciplineColorHex } from '../../../lib/default-assets';
import { statusColorFromHue, type DisciplineDisplay } from '../../../lib/discipline-service';

export type ClassScheduleCalendarFilters = {
  disciplineIds: string[];
  coachAccountIds: string[];
  statusBlocks: ClassBlockStatus[];
  /** Selected `status_class` values (true = open, false = closed). */
  statusClasses: boolean[];
};

export type ClassScheduleCoachOption = {
  accountId: string;
  name: string;
};

export function emptyClassScheduleCalendarFilters(): ClassScheduleCalendarFilters {
  return { disciplineIds: [], coachAccountIds: [], statusBlocks: [], statusClasses: [] };
}

export function countClassScheduleFilterSelections(filters: ClassScheduleCalendarFilters): number {
  return (
    filters.disciplineIds.length
    + filters.coachAccountIds.length
    + filters.statusBlocks.length
    + filters.statusClasses.length
  );
}

const ENROLLMENT_STATUS_COLORS: Record<'false' | 'true', string> = {
  false: BLOCK_STATUS_COLORS.completed,
  true: '#6B8E6B',
};

const ACCORDION_KEYS = ['discipline', 'coach', 'block', 'enrollment'] as const;
type AccordionKey = (typeof ACCORDION_KEYS)[number];

function disciplineDotColor(discipline: DisciplineDisplay): string {
  const hex = normalizeDisciplineColorHex(discipline.colorHex);
  return hex || statusColorFromHue(discipline.status.hue);
}

function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function sortSelectedFirst<T>(items: T[], selectedKeys: string[], getKey: (item: T) => string): T[] {
  const selectedSet = new Set(selectedKeys);
  const picked: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (selectedSet.has(getKey(item))) picked.push(item);
    else rest.push(item);
  }
  return [...picked, ...rest];
}

function FilterAccordion({
  sectionKey,
  title,
  icon: Icon,
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSection,
  open,
  onToggle,
  children,
}: {
  sectionKey: string;
  title: string;
  icon: typeof Layers;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSection: () => void;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const panelId = `schedule-filter-panel-${sectionKey}`;

  return (
    <div className="border-b border-[#D4CDB5]/35 last:border-b-0">
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          id={`schedule-filter-trigger-${sectionKey}`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-[#F8F3E8]/90"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#D4CDB5]/50 bg-white text-[#c49a3c] shadow-sm">
            <Icon size={14} strokeWidth={2.25} aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[0.08em] text-[#5A5048]">
            {title}
          </span>
          {selectedCount > 0 ? (
            <span className="rounded-full bg-[#c49a3c]/15 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-[#8A6520]">
              {selectedCount}
            </span>
          ) : null}
          <ChevronDown
            size={14}
            className={`shrink-0 text-[#9A8E7E] transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (allSelected) onClearSection();
            else onSelectAll();
          }}
          disabled={totalCount === 0}
          className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold text-[#c49a3c] transition-colors hover:bg-[#c49a3c]/10 hover:text-[#a67f2e] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {allSelected ? 'Clear' : 'All'}
        </button>
      </div>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={`schedule-filter-trigger-${sectionKey}`}
          className="space-y-0.5 px-2 pb-3 pt-0.5"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function FilterSelectionBadge({
  label,
  swatch,
  swatchShape = 'round',
  onRemove,
}: {
  label: string;
  swatch?: string;
  swatchShape?: 'round' | 'square';
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#c49a3c]/30 bg-[#c49a3c]/10 py-1 pl-2 pr-1 text-[10px] font-semibold text-[#8A6520]">
      {swatch ? (
        <span
          className={`h-2 w-2 shrink-0 ring-1 ring-black/10 ${swatchShape === 'square' ? 'rounded-sm' : 'rounded-full'}`}
          style={{ backgroundColor: swatch }}
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#8A6520]/80 transition-colors hover:bg-[#c49a3c]/20 hover:text-[#5A5048]"
        aria-label={`Remove ${label}`}
      >
        <X size={10} strokeWidth={2.5} />
      </button>
    </span>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
  leading,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  leading?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all ${
        checked
          ? 'border-[#c49a3c]/40 bg-[#c49a3c]/8 shadow-[inset_0_0_0_1px_rgba(196,154,60,0.1)]'
          : 'border-transparent hover:border-[#D4CDB5]/50 hover:bg-[#F8F3E8]/90'
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
          checked
            ? 'border-[#c49a3c] bg-[#c49a3c] text-white'
            : 'border-[#D4CDB5] bg-white text-transparent'
        }`}
        aria-hidden
      >
        <Check size={10} strokeWidth={3} />
      </span>
      {leading}
      <span className={`min-w-0 flex-1 truncate text-[11px] ${checked ? 'font-semibold text-[#1E2A35]' : 'text-[#5A5048]'}`}>
        {label}
      </span>
    </button>
  );
}

function sanitizeStatusBlockFilters(
  filters: ClassScheduleCalendarFilters,
  allowed: ClassBlockStatus[] | undefined,
): ClassScheduleCalendarFilters {
  if (!allowed?.length) return filters;
  const allowedSet = new Set(allowed);
  return {
    ...filters,
    statusBlocks: filters.statusBlocks.filter((status) => allowedSet.has(status)),
  };
}

export function ClassScheduleCalendarFilter({
  disciplines,
  coaches: coachesProp,
  applied,
  onApply,
  statusBlockFilterOptions,
}: {
  disciplines: DisciplineDisplay[];
  /** When omitted, coaches are loaded from Supabase on first open. */
  coaches?: ClassScheduleCoachOption[];
  applied: ClassScheduleCalendarFilters;
  onApply: (next: ClassScheduleCalendarFilters) => void;
  /** When set, Time Block Status lists only these values (e.g. member portal). */
  statusBlockFilterOptions?: ClassBlockStatus[];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ClassScheduleCalendarFilters>(applied);
  const [expanded, setExpanded] = useState<Record<AccordionKey, boolean>>({
    discipline: false,
    coach: false,
    block: false,
    enrollment: false,
  });
  const [fetchedCoaches, setFetchedCoaches] = useState<ClassScheduleCoachOption[]>([]);
  const [coachesLoading, setCoachesLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setDraft(applied);
  }, [open, applied]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || coachesProp != null) return;
    if (fetchedCoaches.length > 0) return;
    let cancelled = false;
    setCoachesLoading(true);
    void fetchManagedAccountsWithProfiles('coach').then((rows) => {
      if (cancelled) return;
      setFetchedCoaches(
        rows.map((row) => ({
          accountId: row.account.id,
          name: row.profile.name?.trim() || row.profile.display_name?.trim() || row.account.email,
        })).sort((a, b) => a.name.localeCompare(b.name)),
      );
      setCoachesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, coachesProp, fetchedCoaches.length]);

  const coaches = coachesProp ?? fetchedCoaches;

  const appliedCount = useMemo(() => countClassScheduleFilterSelections(applied), [applied]);
  const draftCount = useMemo(() => countClassScheduleFilterSelections(draft), [draft]);
  const filtersActive = appliedCount > 0;
  const draftDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(applied),
    [draft, applied],
  );

  const apply = () => {
    onApply(sanitizeStatusBlockFilters(draft, statusBlockFilterOptions));
    setOpen(false);
  };

  const clearAll = () => {
    const empty = sanitizeStatusBlockFilters(
      emptyClassScheduleCalendarFilters(),
      statusBlockFilterOptions,
    );
    setDraft(empty);
    onApply(empty);
    setOpen(false);
  };

  const toggleSection = (key: AccordionKey) => {
    setExpanded((current) => ({ ...current, [key]: !current[key] }));
  };

  const disciplineIds = useMemo(() => disciplines.map((d) => d.id), [disciplines]);
  const coachIds = useMemo(() => coaches.map((c) => c.accountId), [coaches]);
  const blockStatusLegend = useMemo(() => {
    if (!statusBlockFilterOptions?.length) return CLASS_BLOCK_STATUS_LEGEND;
    const allowed = new Set(statusBlockFilterOptions);
    return CLASS_BLOCK_STATUS_LEGEND.filter((row) => allowed.has(row.status));
  }, [statusBlockFilterOptions]);

  const allBlockStatuses = useMemo(
    () => blockStatusLegend.map((row) => row.status),
    [blockStatusLegend],
  );

  const disciplineById = useMemo(
    () => new Map(disciplines.map((d) => [d.id, d])),
    [disciplines],
  );
  const coachById = useMemo(
    () => new Map(coaches.map((c) => [c.accountId, c])),
    [coaches],
  );
  const blockLegendByStatus = useMemo(
    () => new Map(blockStatusLegend.map((row) => [row.status, row])),
    [blockStatusLegend],
  );

  const sortedDisciplines = useMemo(
    () => sortSelectedFirst(disciplines, draft.disciplineIds, (d) => d.id),
    [disciplines, draft.disciplineIds],
  );
  const sortedCoaches = useMemo(
    () => sortSelectedFirst(coaches, draft.coachAccountIds, (c) => c.accountId),
    [coaches, draft.coachAccountIds],
  );
  const sortedBlockLegend = useMemo(
    () => sortSelectedFirst(blockStatusLegend, draft.statusBlocks, (row) => row.status),
    [blockStatusLegend, draft.statusBlocks],
  );
  const sortedEnrollmentOptions = useMemo(
    () =>
      sortSelectedFirst(
        [...CLASS_BOOKING_OPTIONS],
        draft.statusClasses.map(String),
        (option) => String(option.value),
      ),
    [draft.statusClasses],
  );

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
          filtersActive || open
            ? 'border-[#c49a3c]/45 bg-[#c49a3c]/10 text-[#8A6520] shadow-sm'
            : 'border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#5A5048] hover:border-[#c49a3c]/30'
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal size={12} className="shrink-0 opacity-80" />
        <span>Filters</span>
        {filtersActive ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#c49a3c] text-[9px] font-bold text-white tabular-nums">
            {appliedCount}
          </span>
        ) : null}
        <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Schedule filters"
          className="absolute left-0 top-full z-50 mt-1.5 flex w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#D4CDB5]/60 bg-white shadow-[0_8px_28px_rgba(30,42,53,0.16)] sm:w-80"
        >
          {draftCount > 0 ? (
            <div className="shrink-0 border-b border-[#D4CDB5]/40 bg-[#FBF9F3]/80 px-3 py-2.5">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8A7E6E]">
                Selected
              </p>
              <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto overscroll-contain">
                {draft.disciplineIds.map((id) => {
                  const d = disciplineById.get(id);
                  if (!d) return null;
                  return (
                    <FilterSelectionBadge
                      key={`badge-d-${id}`}
                      label={d.name}
                      swatch={disciplineDotColor(d)}
                      onRemove={() =>
                        setDraft((current) => ({
                          ...current,
                          disciplineIds: current.disciplineIds.filter((x) => x !== id),
                        }))
                      }
                    />
                  );
                })}
                {draft.coachAccountIds.map((id) => {
                  const coach = coachById.get(id);
                  if (!coach) return null;
                  return (
                    <FilterSelectionBadge
                      key={`badge-c-${id}`}
                      label={coach.name}
                      onRemove={() =>
                        setDraft((current) => ({
                          ...current,
                          coachAccountIds: current.coachAccountIds.filter((x) => x !== id),
                        }))
                      }
                    />
                  );
                })}
                {draft.statusBlocks.map((status) => {
                  const row = blockLegendByStatus.get(status);
                  if (!row) return null;
                  return (
                    <FilterSelectionBadge
                      key={`badge-b-${status}`}
                      label={row.label}
                      swatch={row.color}
                      swatchShape="square"
                      onRemove={() =>
                        setDraft((current) => ({
                          ...current,
                          statusBlocks: current.statusBlocks.filter((x) => x !== status),
                        }))
                      }
                    />
                  );
                })}
                {CLASS_BOOKING_OPTIONS.filter((option) =>
                  draft.statusClasses.includes(option.value),
                ).map((option) => (
                  <FilterSelectionBadge
                    key={`badge-e-${option.value}`}
                    label={option.label}
                    swatch={ENROLLMENT_STATUS_COLORS[String(option.value) as 'true' | 'false']}
                    onRemove={() =>
                      setDraft((current) => ({
                        ...current,
                        statusClasses: current.statusClasses.filter((x) => x !== option.value),
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="max-h-[min(26rem,70vh)] overflow-y-auto overscroll-contain py-1">
            <FilterAccordion
              sectionKey="discipline"
              title="Discipline"
              icon={Layers}
              selectedCount={draft.disciplineIds.length}
              totalCount={disciplines.length}
              open={expanded.discipline}
              onToggle={() => toggleSection('discipline')}
              onSelectAll={() => setDraft((c) => ({ ...c, disciplineIds: [...disciplineIds] }))}
              onClearSection={() => setDraft((c) => ({ ...c, disciplineIds: [] }))}
            >
              {disciplines.length === 0 ? (
                <p className="px-2 py-1.5 text-[11px] text-[#8A7E6E]">No disciplines loaded.</p>
              ) : (
                sortedDisciplines.map((d) => (
                  <CheckboxRow
                    key={d.id}
                    checked={draft.disciplineIds.includes(d.id)}
                    onChange={() =>
                      setDraft((current) => ({
                        ...current,
                        disciplineIds: toggleInList(current.disciplineIds, d.id),
                      }))
                    }
                    label={d.name}
                    leading={
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: disciplineDotColor(d) }}
                      />
                    }
                  />
                ))
              )}
            </FilterAccordion>

            <FilterAccordion
              sectionKey="coach"
              title="Coach"
              icon={Award}
              selectedCount={draft.coachAccountIds.length}
              totalCount={coaches.length}
              open={expanded.coach}
              onToggle={() => toggleSection('coach')}
              onSelectAll={() => setDraft((c) => ({ ...c, coachAccountIds: [...coachIds] }))}
              onClearSection={() => setDraft((c) => ({ ...c, coachAccountIds: [] }))}
            >
              {coachesLoading ? (
                <p className="px-2 py-1.5 text-[11px] text-[#8A7E6E]">Loading coaches…</p>
              ) : coaches.length === 0 ? (
                <p className="px-2 py-1.5 text-[11px] text-[#8A7E6E]">No coaches found.</p>
              ) : (
                sortedCoaches.map((coach) => (
                  <CheckboxRow
                    key={coach.accountId}
                    checked={draft.coachAccountIds.includes(coach.accountId)}
                    onChange={() =>
                      setDraft((current) => ({
                        ...current,
                        coachAccountIds: toggleInList(current.coachAccountIds, coach.accountId),
                      }))
                    }
                    label={coach.name}
                  />
                ))
              )}
            </FilterAccordion>

            <FilterAccordion
              sectionKey="block"
              title="Time Block Status"
              icon={Ticket}
              selectedCount={draft.statusBlocks.length}
              totalCount={allBlockStatuses.length}
              open={expanded.block}
              onToggle={() => toggleSection('block')}
              onSelectAll={() => setDraft((c) => ({ ...c, statusBlocks: [...allBlockStatuses] }))}
              onClearSection={() => setDraft((c) => ({ ...c, statusBlocks: [] }))}
            >
              {sortedBlockLegend.map(({ status, label, color }) => (
                <CheckboxRow
                  key={status}
                  checked={draft.statusBlocks.includes(status)}
                  onChange={() =>
                    setDraft((current) => ({
                      ...current,
                      statusBlocks: toggleInList(current.statusBlocks, status),
                    }))
                  }
                  label={label}
                  leading={
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-black/10"
                      style={{ backgroundColor: color }}
                    />
                  }
                />
              ))}
            </FilterAccordion>

            <FilterAccordion
              sectionKey="enrollment"
              title="Enrollments"
              icon={Users}
              selectedCount={draft.statusClasses.length}
              totalCount={CLASS_BOOKING_OPTIONS.length}
              open={expanded.enrollment}
              onToggle={() => toggleSection('enrollment')}
              onSelectAll={() =>
                setDraft((c) => ({
                  ...c,
                  statusClasses: CLASS_BOOKING_OPTIONS.map((option) => option.value),
                }))
              }
              onClearSection={() => setDraft((c) => ({ ...c, statusClasses: [] }))}
            >
              {sortedEnrollmentOptions.map((option) => (
                <CheckboxRow
                  key={String(option.value)}
                  checked={draft.statusClasses.includes(option.value)}
                  onChange={() =>
                    setDraft((current) => ({
                      ...current,
                      statusClasses: toggleInList(current.statusClasses, option.value),
                    }))
                  }
                  label={option.label}
                  leading={
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{
                        backgroundColor:
                          ENROLLMENT_STATUS_COLORS[String(option.value) as 'true' | 'false'],
                      }}
                    />
                  }
                />
              ))}
            </FilterAccordion>
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-[#D4CDB5]/50 bg-[#FBF9F3]/95 px-3 py-2.5">
            <button
              type="button"
              onClick={clearAll}
              className="flex-1 rounded-xl border border-[#D4CDB5]/70 bg-white px-3 py-2 text-[11px] font-semibold text-[#5A5048] transition-colors hover:border-[#c49a3c]/25 hover:bg-[#F8F3E8]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={apply}
              className={`action-button flex-[1.2] rounded-xl px-3 py-2 text-[11px] font-semibold text-white transition-all ${
                draftDirty
                  ? 'bg-[#c49a3c] hover:bg-[#a67f2e] shadow-sm'
                  : 'bg-[#1E2A35] hover:bg-[#263545]'
              }`}
            >
              Apply
              {draftCount > 0 ? (
                <span className="ml-1 tabular-nums opacity-90">({draftCount})</span>
              ) : null}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function blockCoachAccountIds(block: {
  coachAccountId: string;
  coachAccountIds?: string[];
}): string[] {
  if (block.coachAccountIds?.length) return block.coachAccountIds;
  return block.coachAccountId ? [block.coachAccountId] : [];
}

/** Apply calendar filters to schedule blocks (empty selection in a category = no constraint). */
export function blockMatchesClassScheduleFilters(
  block: {
    disciplineId: string;
    coachAccountId: string;
    coachAccountIds?: string[];
    statusBlock: ClassBlockStatus;
    statusClass: boolean;
  },
  filters: ClassScheduleCalendarFilters,
): boolean {
  if (
    filters.disciplineIds.length > 0
    && (!block.disciplineId || !filters.disciplineIds.includes(block.disciplineId))
  ) {
    return false;
  }
  if (filters.coachAccountIds.length > 0) {
    const assigned = blockCoachAccountIds(block);
    if (!assigned.some((id) => filters.coachAccountIds.includes(id))) return false;
  }
  if (filters.statusBlocks.length > 0 && !filters.statusBlocks.includes(block.statusBlock)) {
    return false;
  }
  if (filters.statusClasses.length > 0 && !filters.statusClasses.includes(block.statusClass)) {
    return false;
  }
  return true;
}
