import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Layers, Loader2, Plus } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { AdminDisciplineCardsGrid } from '../components/disciplines/AdminDisciplineCardsGrid';
import { AdminDisciplineModal } from '../components/disciplines/AdminDisciplineModal';
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

function AddDisciplineTrigger({
  onClick,
  variant,
}: {
  onClick: () => void;
  variant: 'button' | 'dashed';
}) {
  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 flex items-center gap-2 bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all rounded-full px-5 py-2.5 text-sm font-bold shadow-sm"
        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
      >
        <Plus size={16} />
        Add Discipline
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-3xl border-2 border-dashed border-[#D4CDB5] bg-white/50 hover:bg-[#F8F3E8] hover:border-[#C49A3C]/50 transition-all px-6 py-10 flex flex-col items-center justify-center gap-2 text-[#8A7E6E] hover:text-[#1E2A35] min-h-[220px]"
    >
      <div className="w-12 h-12 rounded-2xl bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#C49A3C]">
        <Plus size={22} />
      </div>
      <span
        className="text-[#1E2A35]"
        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.06em' }}
      >
        Add Discipline
      </span>
      <span className="text-sm text-[#8A7E6E]">Create a new class discipline for the studio catalog</span>
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

  if (!adminUser) return null;

  return (
    <AdminSidebar>
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

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={18} className="text-[#C49A3C]" />
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
            <p className="text-[#8A7E6E] text-sm mt-2 max-w-xl">
              Discipline cards are loaded from Supabase. Titles and descriptions use saved data when available,
              with current copy as fallback. Logo and cover images use placeholders until URLs are stored.
            </p>
          </div>
          {!loading && (
            <AddDisciplineTrigger onClick={openCreateModal} variant="button" />
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-[#8A7E6E]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading disciplines…</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3 mb-6">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 text-sm font-semibold">Could not load disciplines</p>
              <p className="text-red-600 text-sm mt-1">{loadError}</p>
            </div>
          </div>
        )}

        {!loading && !loadError && disciplines.length === 0 && (
          <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-5 py-8 text-center mb-6">
            <p className="text-[#1E2A35] text-sm font-semibold">No disciplines found</p>
            <p className="text-[#8A7E6E] text-sm mt-1">
              Add your first discipline below, or run{' '}
              <code className="text-[#5A5048]">supabase/migrations/008_disciplines.sql</code> to seed defaults.
            </p>
          </div>
        )}

        {!loading && disciplines.length > 0 && (
          <AdminDisciplineCardsGrid
            disciplines={disciplines}
            onSelect={openDisciplineModal}
          />
        )}

        {!loading && !loadError && (
          <div className="mt-6">
            <AddDisciplineTrigger onClick={openCreateModal} variant="dashed" />
          </div>
        )}
      </div>
    </AdminSidebar>
  );
}
