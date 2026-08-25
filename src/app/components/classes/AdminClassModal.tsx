import { useEffect, useMemo, useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import {
  CLASS_STATUSES,
  formatClassDateTime,
  type ClassDisplay,
  type ClassStatus,
  type ClassUpsertInput,
} from '../../../lib/class-service';
import type { DisciplineDisplay } from '../../../lib/discipline-service';
import { isDisciplineActive } from '../../../lib/discipline-service';

export interface ClassPersonOption {
  accountId: string;
  name: string;
  email: string;
}

interface AdminClassModalProps {
  mode: 'create' | 'edit';
  initial: ClassUpsertInput;
  classItem?: ClassDisplay | null;
  disciplines: DisciplineDisplay[];
  coaches: ClassPersonOption[];
  students: ClassPersonOption[];
  onClose: () => void;
  onSave: (input: ClassUpsertInput) => Promise<{ success: boolean; error: string | null }>;
  onDelete?: () => Promise<{ success: boolean; error: string | null }>;
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50';

const STATUS_LABEL: Record<ClassStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export function AdminClassModal({
  mode,
  initial,
  classItem,
  disciplines,
  coaches,
  students,
  onClose,
  onSave,
  onDelete,
}: AdminClassModalProps) {
  const [form, setForm] = useState<ClassUpsertInput>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [coachQuery, setCoachQuery] = useState('');
  const [studentQuery, setStudentQuery] = useState('');

  useEffect(() => {
    setForm(initial);
    setShowConfirm(false);
    setShowDeleteConfirm(false);
    setError('');
    setCoachQuery('');
    setStudentQuery('');
  }, [initial, mode]);

  const activeDisciplines = useMemo(
    () => disciplines.filter((item) => isDisciplineActive(item) || item.id === form.disciplineId),
    [disciplines, form.disciplineId],
  );

  const filteredCoaches = useMemo(() => {
    const q = coachQuery.trim().toLowerCase();
    if (!q) return coaches;
    return coaches.filter(
      (coach) =>
        coach.name.toLowerCase().includes(q) || coach.email.toLowerCase().includes(q),
    );
  }, [coaches, coachQuery]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(q) || student.email.toLowerCase().includes(q),
    );
  }, [students, studentQuery]);

  const toggleId = (field: 'coachAccountIds' | 'studentAccountIds', accountId: string) => {
    setForm((current) => {
      const exists = current[field].includes(accountId);
      const next = exists
        ? current[field].filter((id) => id !== accountId)
        : [...current[field], accountId];
      return { ...current, [field]: next };
    });
  };

  const handleSaveClick = () => {
    setError('');
    if (!form.name.trim()) {
      setError('Class name is required.');
      return;
    }
    if (!form.disciplineId) {
      setError('Choose a discipline tag.');
      return;
    }
    if (form.coachAccountIds.length < 1) {
      setError('Assign at least one coach.');
      return;
    }
    if (form.studentAccountIds.length > form.classLimit) {
      setError(`Enrollment (${form.studentAccountIds.length}) exceeds class limit (${form.classLimit}).`);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setError('');
    const result = await onSave(form);
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? 'Failed to save class.');
      setShowConfirm(false);
      return;
    }
    onClose();
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    setError('');
    const result = await onDelete();
    setDeleting(false);
    if (!result.success) {
      setError(result.error ?? 'Failed to delete class.');
      setShowDeleteConfirm(false);
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-[#D4CDB5]/50 flex items-start justify-between gap-3 sticky top-0 bg-white z-10">
          <div>
            <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">
              {mode === 'create' ? 'New class' : 'Edit class'}
            </p>
            <h2
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '0.04em' }}
            >
              {form.name.trim() || (mode === 'create' ? 'Untitled Class' : classItem?.name || 'Class')}
            </h2>
            {mode === 'edit' && classItem && (
              <p className="text-[#8A7E6E] text-xs mt-2">
                Created {formatClassDateTime(classItem.createdAt)} by {classItem.createdByName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-[#D4CDB5]/70 text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Morning Yoga Flow"
              />
            </div>

            <div>
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">Discipline tag</label>
              <select
                value={form.disciplineId}
                onChange={(e) => setForm((c) => ({ ...c, disciplineId: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select discipline…</option>
                {activeDisciplines.map((discipline) => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as ClassStatus }))}
                className={inputClass}
              >
                {CLASS_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">Starts</label>
              <input
                type="datetime-local"
                value={toLocalInputValue(form.startsAt)}
                onChange={(e) => {
                  const next = fromLocalInputValue(e.target.value);
                  if (next) setForm((c) => ({ ...c, startsAt: next }));
                }}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">Ends (optional)</label>
              <input
                type="datetime-local"
                value={toLocalInputValue(form.endsAt)}
                onChange={(e) => setForm((c) => ({ ...c, endsAt: fromLocalInputValue(e.target.value) }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">Class limit</label>
              <input
                type="number"
                min={1}
                value={form.classLimit}
                onChange={(e) =>
                  setForm((c) => ({ ...c, classLimit: Math.max(1, Number(e.target.value) || 1) }))
                }
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                rows={3}
                className={`${inputClass} resize-y min-h-[88px]`}
                placeholder="Optional notes for this class…"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8]/50 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-[#9A8E7E] text-xs uppercase tracking-widest">Assigned coaches</p>
                  <p className="text-[#1E2A35] text-sm font-semibold mt-0.5">
                    {form.coachAccountIds.length} selected (min 1)
                  </p>
                </div>
              </div>
              <input
                value={coachQuery}
                onChange={(e) => setCoachQuery(e.target.value)}
                placeholder="Search coaches…"
                className={`${inputClass} mb-3`}
              />
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5">
                {filteredCoaches.length === 0 && (
                  <p className="text-[#8A7E6E] text-sm px-1 py-2">No coaches found.</p>
                )}
                {filteredCoaches.map((coach) => {
                  const checked = form.coachAccountIds.includes(coach.accountId);
                  return (
                    <label
                      key={coach.accountId}
                      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer border transition-colors ${
                        checked
                          ? 'bg-white border-[#745b3c]/40'
                          : 'bg-transparent border-transparent hover:bg-white/70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleId('coachAccountIds', coach.accountId)}
                        className="mt-1 accent-[#745b3c]"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#1E2A35] truncate">{coach.name}</span>
                        <span className="block text-xs text-[#8A7E6E] truncate">{coach.email}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8]/50 p-4">
              <div className="mb-3">
                <p className="text-[#9A8E7E] text-xs uppercase tracking-widest">Enrolled students</p>
                <p className="text-[#1E2A35] text-sm font-semibold mt-0.5">
                  {form.studentAccountIds.length} / {form.classLimit} seats
                </p>
              </div>
              <input
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Search students…"
                className={`${inputClass} mb-3`}
              />
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5">
                {filteredStudents.length === 0 && (
                  <p className="text-[#8A7E6E] text-sm px-1 py-2">No students found.</p>
                )}
                {filteredStudents.map((student) => {
                  const checked = form.studentAccountIds.includes(student.accountId);
                  const atLimit =
                    !checked && form.studentAccountIds.length >= form.classLimit;
                  return (
                    <label
                      key={student.accountId}
                      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
                        atLimit
                          ? 'opacity-50 cursor-not-allowed border-transparent'
                          : checked
                            ? 'bg-white border-[#745b3c]/40 cursor-pointer'
                            : 'bg-transparent border-transparent hover:bg-white/70 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={atLimit}
                        onChange={() => toggleId('studentAccountIds', student.accountId)}
                        className="mt-1 accent-[#745b3c]"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#1E2A35] truncate">{student.name}</span>
                        <span className="block text-xs text-[#8A7E6E] truncate">{student.email}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {showConfirm && (
            <div className="rounded-2xl border border-[#745b3c]/30 bg-[#745b3c]/08 px-4 py-4">
              <p className="text-[#1E2A35] text-sm font-semibold mb-1">
                {mode === 'create' ? 'Create this class?' : 'Save class changes?'}
              </p>
              <p className="text-[#8A7E6E] text-sm mb-4">
                {form.coachAccountIds.length} coach(es), {form.studentAccountIds.length} student(s), status{' '}
                {STATUS_LABEL[form.status].toLowerCase()}.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-all disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-full bg-[#745b3c] text-white text-sm font-bold hover:bg-[#5e4a30] transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  {saving ? 'Saving…' : mode === 'create' ? 'Confirm Create' : 'Confirm Save'}
                </button>
              </div>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
              <p className="text-red-700 text-sm font-semibold mb-1">Delete this class?</p>
              <p className="text-red-600 text-sm mb-4">
                This permanently removes the class, coach assignments, and student enrollments.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-full border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-100 transition-all disabled:opacity-60"
                >
                  Keep Class
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-1 border-t border-[#D4CDB5]/40">
            {mode === 'edit' && onDelete && (
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setShowDeleteConfirm(true);
                }}
                disabled={saving || deleting}
                className="sm:mr-auto py-3 px-5 rounded-full border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-all disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={saving || deleting}
              className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white text-sm font-bold hover:bg-[#263545] transition-all disabled:opacity-60"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
            >
              {mode === 'create' ? 'Create Class' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
