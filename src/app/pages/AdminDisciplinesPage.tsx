import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Layers, Loader2, Plus, Search } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  AdminDisciplineCardsGrid,
  DisciplineLayoutToggle,
  type DisciplineLayoutMode,
} from '../components/disciplines/AdminDisciplineCardsGrid';
import { AdminDisciplineModal } from '../components/disciplines/AdminDisciplineModal';
import { AdminTablePagination, useFitPageSize, type FitLayout } from '../components/layout/AdminTablePagination';
import {
  createDiscipline,
  createEmptyDisciplineDraft,
  deleteDiscipline,
  fetchDisciplineStatuses,
  fetchDisciplinesForAdmin,
  updateDiscipline,
  type DisciplineDisplay,
  type DisciplineStatusDisplay,
} from '../../lib/discipline-service';

const FIT_LAYOUT: Record<DisciplineLayoutMode, FitLayout> = {
  list: 'discipline-list',
  compact: 'discipline-compact',
  large: 'discipline-large',
};

function AddDisciplineTrigger({
  onClick,
  variant,
  density = 'large',
}: {
  onClick: () => void;
  variant: 'button' | 'dashed';
  density?: 'compact' | 'large';
}) {
  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 flex items-center gap-2 bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all rounded-full px-5 py-2.5 text-sm font-bold shadow-sm h-[42px]"
        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
      >
        <Plus size={16} />
        Add Discipline
      </button>
    );
  }

  const isCompact = density === 'compact';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-3xl border-2 border-dashed border-[#D4CDB5] bg-white/50 hover:bg-[#F8F3E8] hover:border-[#c49a3c]/50 transition-all px-4 flex flex-col items-center justify-center gap-2 text-[#8A7E6E] hover:text-[#1E2A35] ${
        isCompact ? 'min-h-[10.5rem] md:min-h-[12rem] py-6' : 'min-h-[17.5rem] py-10'
      }`}
    >
      <div className={`rounded-2xl bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#c49a3c] ${isCompact ? 'w-10 h-10' : 'w-12 h-12'}`}>
        <Plus size={isCompact ? 18 : 22} />
      </div>
      <span
        className="text-[#1E2A35]"
        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: isCompact ? '1rem' : '1.2rem', letterSpacing: '0.06em' }}
      >
        Add Discipline
      </span>
      {!isCompact && (
        <span className="text-sm text-[#8A7E6E] text-center px-2">Create a new class discipline</span>
      )}
    </button>
  );
}

export default function AdminDisciplinesPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [disciplines, setDisciplines] = useState<DisciplineDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineDisplay | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<DisciplineStatusDisplay | null>(null);
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState<DisciplineLayoutMode>('list');
  const [page, setPage] = useState(1);
  const { containerRef, pageSize: fitPageSize } = useFitPageSize({
    layout: FIT_LAYOUT[layout],
    fallback: layout === 'list' ? 9 : layout === 'compact' ? 8 : 6,
  });
  const pageSize = layout === 'list' ? 9 : fitPageSize;

  const loadDisciplines = useCallback(async () => {
    setLoading(true);
    const [disciplinesResult, statusesResult] = await Promise.all([
      fetchDisciplinesForAdmin(),
      fetchDisciplineStatuses(),
    ]);
    setDisciplines(disciplinesResult.data);
    setLoadError(disciplinesResult.error);
    setDefaultStatus(
      statusesResult.data.find((status) => status.slug === 'active') ?? statusesResult.data[0] ?? null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (adminUser) {
      void loadDisciplines();
    }
  }, [adminUser, loadDisciplines]);

  useEffect(() => {
    setPage(1);
  }, [search, layout]);

  const openCreateModal = () => {
    setSelectedDiscipline(createEmptyDisciplineDraft(defaultStatus ?? undefined));
    setIsCreateMode(true);
  };

  const closeModal = () => {
    setSelectedDiscipline(null);
    setIsCreateMode(false);
  };

  const openDisciplineModal = (discipline: DisciplineDisplay) => {
    setSelectedDiscipline(discipline);
    setIsCreateMode(false);
  };

  const handleSave = async (id: string, updates: { name: string; description: string; logoUrl: string; imageUrl: string }) => {
    const result = await updateDiscipline(id, updates);
    if (result.success) {
      const { data, error } = await fetchDisciplinesForAdmin();
      setDisciplines(data);
      setLoadError(error);
      setSelectedDiscipline((current) => {
        if (!current || current.id !== id) return current;
        return data.find((item) => item.id === id) ?? { ...current, ...updates };
      });
    }
    return result;
  };

  const handleCreate = async (updates: { name: string; description: string; logoUrl: string; imageUrl: string }) => {
    const nextSortOrder =
      disciplines.length > 0
        ? Math.max(...disciplines.map((item) => item.sortOrder)) + 10
        : 10;

    const result = await createDiscipline(updates, nextSortOrder);
    if (result.success) {
      const { data, error } = await fetchDisciplinesForAdmin();
      setDisciplines(data);
      setLoadError(error);
    }
    return { success: result.success, error: result.error };
  };

  const handleDelete = async (id: string) => {
    const result = await deleteDiscipline(id);
    if (result.success) {
      await loadDisciplines();
      closeModal();
    }
    return result;
  };

  const filteredDisciplines = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return disciplines;
    return disciplines.filter((discipline) =>
      discipline.name.toLowerCase().includes(query)
      || discipline.description.toLowerCase().includes(query)
      || discipline.slug.toLowerCase().includes(query)
      || discipline.status.name.toLowerCase().includes(query),
    );
  }, [disciplines, search]);

  const includeTrailingSlot = layout !== 'list' && filteredDisciplines.length > 0;
  const totalSlots = filteredDisciplines.length + (includeTrailingSlot ? 1 : 0);
  const totalPages = Math.max(1, Math.ceil(totalSlots / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;

  const pageDisciplines = useMemo(() => {
    return filteredDisciplines.slice(pageStart, pageStart + pageSize);
  }, [filteredDisciplines, pageStart, pageSize]);

  const showTrailingSlot =
    includeTrailingSlot
    && pageStart < totalSlots
    && pageStart + pageSize > filteredDisciplines.length;

  const rangeStart =
    pageDisciplines.length === 0
      ? (filteredDisciplines.length === 0 ? 0 : filteredDisciplines.length)
      : pageStart + 1;
  const rangeEnd =
    pageDisciplines.length === 0
      ? filteredDisciplines.length
      : pageStart + pageDisciplines.length;

  if (!adminUser) return null;

  return (
    <>
      {selectedDiscipline && (
        <AdminDisciplineModal
          discipline={
            !isCreateMode && selectedDiscipline.id
              ? disciplines.find((item) => item.id === selectedDiscipline.id) ?? selectedDiscipline
              : selectedDiscipline
          }
          isCreateMode={isCreateMode}
          defaultStatus={defaultStatus ?? undefined}
          onClose={closeModal}
          onSave={handleSave}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      )}

      <div className="h-full min-h-0 overflow-hidden flex flex-col">
      <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={18} className="text-[#c49a3c]" />
              <p className="text-[#9A8E7E] text-xs uppercase tracking-widest">Class Catalog</p>
            </div>
            <h1
              className="text-[#1E2A35] leading-none"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                letterSpacing: '0.04em',
              }}
            >
              Disciplines
            </h1>
          </div>

          {!loading && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 w-full sm:w-auto sm:justify-end">
              <DisciplineLayoutToggle layout={layout} onChange={setLayout} />
              <div className="relative flex-1 sm:w-56">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search disciplines…"
                  className="w-full h-[42px] pl-10 pr-4 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]"
                />
              </div>
              <AddDisciplineTrigger onClick={openCreateModal} variant="button" />
            </div>
          )}
        </div>

        {loading && (
          <div ref={containerRef} className="flex-1 min-h-0 flex items-center justify-center gap-2 text-[#8A7E6E]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading disciplines…</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3 mb-6 shrink-0">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 text-sm font-semibold">Could not load disciplines</p>
              <p className="text-red-600 text-sm mt-1">{loadError}</p>
            </div>
          </div>
        )}

        {!loading && !loadError && disciplines.length === 0 && (
          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-5 py-8 text-center shrink-0">
              <p className="text-[#1E2A35] text-sm font-semibold">No disciplines found</p>
              <p className="text-[#8A7E6E] text-sm mt-1">
                Add your first discipline below, or run{' '}
                <code className="text-[#5A5048]">supabase/migrations/008_disciplines.sql</code> to seed defaults.
              </p>
            </div>
            <div ref={containerRef} className="flex-1 min-h-0">
              <AddDisciplineTrigger onClick={openCreateModal} variant="dashed" density="large" />
            </div>
          </div>
        )}

        {!loading && disciplines.length > 0 && filteredDisciplines.length === 0 && (
          <div ref={containerRef} className="flex-1 min-h-0 bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm px-6 py-12 text-center text-[#B0A898] text-sm">
            No disciplines match your search.
          </div>
        )}

        {!loading && filteredDisciplines.length > 0 && (pageDisciplines.length > 0 || showTrailingSlot) && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <AdminDisciplineCardsGrid
              hideCount
              fillContainer
              bodyRef={containerRef}
              density={layout}
              disciplines={pageDisciplines}
              onSelect={openDisciplineModal}
              trailingSlot={
                showTrailingSlot ? (
                  <AddDisciplineTrigger
                    onClick={openCreateModal}
                    variant="dashed"
                    density={layout === 'compact' ? 'compact' : 'large'}
                  />
                ) : undefined
              }
            />
            <AdminTablePagination
              page={currentPage}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              total={filteredDisciplines.length}
              noun="disciplines"
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
      </div>
    </>
  );
}
