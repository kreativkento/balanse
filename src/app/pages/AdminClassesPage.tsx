import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertCircle,
  CalendarDays,
  Loader2,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import {
  AdminClassModal,
  type ClassPersonOption,
} from '../components/classes/AdminClassModal';
import { fetchDisciplinesForAdmin, isDisciplineActive, type DisciplineDisplay } from '../../lib/discipline-service';
import { fetchManagedAccountsWithProfiles } from '../../lib/admin-service';
import {
  createEmptyClassDraft,
  createClass,
  deleteClass,
  classToUpsertInput,
  fetchClassesForAdmin,
  formatClassDateTime,
  updateClass,
  type ClassDisplay,
  type ClassStatus,
  type ClassUpsertInput,
} from '../../lib/class-service';

const STATUS_STYLES: Record<ClassStatus, string> = {
  draft: 'bg-[#EDE8D8] text-[#5A5048] border border-[#D4CDB5]/70',
  published: 'bg-green-50 text-green-700 border border-green-200',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
  completed: 'bg-[#1E2A35]/08 text-[#1E2A35] border border-[#1E2A35]/15',
};

function toPersonOption(row: {
  account: { id: string; email: string };
  profile: { name: string; display_name?: string };
}): ClassPersonOption {
  return {
    accountId: row.account.id,
    name: row.profile.name || row.profile.display_name || row.account.email,
    email: row.account.email,
  };
}

export default function AdminClassesPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [events, setEvents] = useState<ClassDisplay[]>([]);
  const [disciplines, setDisciplines] = useState<DisciplineDisplay[]>([]);
  const [coaches, setCoaches] = useState<ClassPersonOption[]>([]);
  const [students, setStudents] = useState<ClassPersonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClassStatus>('all');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ClassDisplay | null>(null);
  const [draft, setDraft] = useState<ClassUpsertInput | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [eventsResult, disciplinesResult, coachRows, studentRows] = await Promise.all([
      fetchClassesForAdmin(),
      fetchDisciplinesForAdmin(),
      fetchManagedAccountsWithProfiles('coach'),
      fetchManagedAccountsWithProfiles('user'),
    ]);

    setEvents(eventsResult.data);
    setDisciplines(disciplinesResult.data);
    setCoaches(coachRows.map(toPersonOption));
    setStudents(studentRows.map(toPersonOption));
    setLoadError(eventsResult.error ?? disciplinesResult.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (adminUser) void loadAll();
  }, [adminUser, loadAll]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((event) => {
      if (statusFilter !== 'all' && event.status !== statusFilter) return false;
      if (!q) return true;
      return (
        event.name.toLowerCase().includes(q)
        || event.disciplineName.toLowerCase().includes(q)
        || event.coaches.some((coach) => coach.name.toLowerCase().includes(q))
      );
    });
  }, [events, query, statusFilter]);

  const openCreate = () => {
    const next = createEmptyClassDraft();
    const firstActive = disciplines.find((item) => isDisciplineActive(item));
    if (firstActive) next.disciplineId = firstActive.id;
    setDraft(next);
    setSelectedEvent(null);
    setModalMode('create');
  };

  const openEdit = (event: ClassDisplay) => {
    setSelectedEvent(event);
    setDraft(classToUpsertInput(event));
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedEvent(null);
    setDraft(null);
  };

  const handleSave = async (input: ClassUpsertInput) => {
    if (modalMode === 'create') {
      const result = await createClass(input);
      if (result.success) await loadAll();
      return { success: result.success, error: result.error };
    }

    if (!selectedEvent) {
      return { success: false, error: 'No class selected.' };
    }

    const result = await updateClass(selectedEvent.id, input);
    if (result.success) await loadAll();
    return result;
  };

  const handleDelete = async () => {
    if (!selectedEvent) {
      return { success: false, error: 'No class selected.' };
    }
    const result = await deleteClass(selectedEvent.id);
    if (result.success) await loadAll();
    return result;
  };

  if (!adminUser) return null;

  return (
    <AdminSidebar>
      {modalMode && draft && (
        <AdminClassModal
          mode={modalMode}
          initial={draft}
          classItem={selectedEvent}
          disciplines={disciplines}
          coaches={coaches}
          students={students}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={modalMode === 'edit' ? handleDelete : undefined}
        />
      )}

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={14} className="text-[#C49A3C]" />
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Class Management</p>
            </div>
            <h1
              className="text-[#1E2A35] leading-none"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
                letterSpacing: '0.04em',
              }}
            >
              Classes
            </h1>
            <p className="text-[#8A7E6E] text-sm mt-2 max-w-xl">
              Create classes with a discipline tag, assign at least one coach, set capacity, and enroll students.
              Only admins can create, update, or delete classes.
            </p>
          </div>
          {!loading && (
            <button
              type="button"
              onClick={openCreate}
              className="shrink-0 flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
            >
              <Plus size={16} />
              Add Class
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7E6E]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, discipline, or coach…"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | ClassStatus)}
            className="sm:w-44 px-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-[#8A7E6E]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading classes…</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3 mb-6">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 text-sm font-semibold">Could not load classes</p>
              <p className="text-red-600 text-sm mt-1">{loadError}</p>
              <p className="text-red-600/80 text-xs mt-2">
                Make sure you ran <code>supabase/migrations/013_rename_events_to_classes.sql</code> after disciplines.
              </p>
            </div>
          </div>
        )}

        {!loading && !loadError && filteredEvents.length === 0 && (
          <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-5 py-10 text-center">
            <p className="text-[#1E2A35] text-sm font-semibold">No classes found</p>
            <p className="text-[#8A7E6E] text-sm mt-1 mb-5">
              {events.length === 0
                ? 'Create your first class to assign coaches and enroll students.'
                : 'Try a different search or status filter.'}
            </p>
            {events.length === 0 && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all rounded-full px-5 py-2.5 shadow-sm leading-none"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
              >
                <Plus size={16} className="shrink-0" />
                <span>Add Class</span>
              </button>
            )}
          </div>
        )}

        {!loading && filteredEvents.length > 0 && (
          <div className={`bg-white rounded-3xl border border-[#D4CDB5]/60 overflow-hidden ${CARD_HOVER_GROW}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
                    <th className="text-left text-[#9A8E7E] text-[0.65rem] uppercase tracking-widest font-semibold px-5 py-3">Class</th>
                    <th className="text-left text-[#9A8E7E] text-[0.65rem] uppercase tracking-widest font-semibold px-5 py-3">When</th>
                    <th className="text-left text-[#9A8E7E] text-[0.65rem] uppercase tracking-widest font-semibold px-5 py-3">Coaches</th>
                    <th className="text-left text-[#9A8E7E] text-[0.65rem] uppercase tracking-widest font-semibold px-5 py-3">Seats</th>
                    <th className="text-left text-[#9A8E7E] text-[0.65rem] uppercase tracking-widest font-semibold px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      onClick={() => openEdit(event)}
                      className="border-b border-[#D4CDB5]/35 last:border-0 hover:bg-[#F8F3E8]/70 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="text-[#1E2A35] text-sm font-semibold">{event.name}</p>
                        <p className="text-[#8A7E6E] text-xs mt-0.5">{event.disciplineName}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[#1E2A35] text-sm">{formatClassDateTime(event.startsAt)}</p>
                        {event.endsAt && (
                          <p className="text-[#8A7E6E] text-xs mt-0.5">to {formatClassDateTime(event.endsAt)}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[#1E2A35] text-sm">
                          {event.coaches.map((coach) => coach.name).join(', ') || '—'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-[#1E2A35]">
                          <Users size={14} className="text-[#C49A3C]" />
                          {event.enrolledCount}/{event.classLimit}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[event.status]}`}>
                          {event.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminSidebar>
  );
}
