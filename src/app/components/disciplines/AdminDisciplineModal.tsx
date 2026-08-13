import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import {
  getDisciplinePlaceholderImage,
  getDisciplinePlaceholderLogo,
} from '../../data/disciplines';
import {
  slugifyDisciplineName,
  type DisciplineDisplay,
  type DisciplineStatusDisplay,
} from '../../../lib/discipline-service';
import { StatusDisciplineBadge } from './StatusDisciplineBadge';

export interface DisciplineFormValues {
  name: string;
  description: string;
  logoUrl: string;
  imageUrl: string;
}

interface AdminDisciplineModalProps {
  discipline: DisciplineDisplay;
  defaultStatus?: DisciplineStatusDisplay;
  isCreateMode?: boolean;
  onClose: () => void;
  onSave: (id: string, updates: DisciplineFormValues) => Promise<{ success: boolean; error: string | null }>;
  onCreate?: (updates: DisciplineFormValues) => Promise<{ success: boolean; error: string | null }>;
  onDelete?: (id: string) => Promise<{ success: boolean; error: string | null }>;
}

function normalizeMediaUrl(url: string, previewName: string, type: 'logo' | 'image'): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  const placeholder =
    type === 'logo'
      ? getDisciplinePlaceholderLogo(previewName)
      : getDisciplinePlaceholderImage(previewName);

  if (trimmed === placeholder || trimmed.includes('placehold.co/')) {
    return '';
  }

  return trimmed;
}

function EditableMedia({
  isEditing,
  label,
  onEdit,
  children,
  className = '',
}: {
  isEditing: boolean;
  label: string;
  onEdit: () => void;
  children: ReactNode;
  className?: string;
}) {
  if (!isEditing) {
    return <div className={className}>{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={label}
      className={`relative group ${className}`}
    >
      {children}
      <div className="absolute inset-0 flex items-center justify-center bg-[#1E2A35]/0 group-hover:bg-[#1E2A35]/55 opacity-0 group-hover:opacity-100 transition-all">
        <div className="w-10 h-10 rounded-full bg-white/95 border border-white/40 flex items-center justify-center text-[#1E2A35] shadow-sm">
          <Pencil size={16} />
        </div>
      </div>
    </button>
  );
}

export function AdminDisciplineModal({
  discipline,
  defaultStatus,
  isCreateMode = false,
  onClose,
  onSave,
  onCreate,
  onDelete,
}: AdminDisciplineModalProps) {
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [name, setName] = useState(discipline.name);
  const [description, setDescription] = useState(discipline.description);
  const [logoUrl, setLogoUrl] = useState(discipline.logoUrl);
  const [imageUrl, setImageUrl] = useState(discipline.imageUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(discipline.name);
    setDescription(discipline.description);
    setLogoUrl(discipline.logoUrl);
    setImageUrl(discipline.imageUrl);
    setIsEditing(isCreateMode);
    setShowConfirm(false);
    setShowConfirmDelete(false);
    setError('');
  }, [discipline, isCreateMode]);

  const previewName = name.trim() || 'New Discipline';
  const previewSlug = slugifyDisciplineName(name.trim()) || 'new-discipline';
  const defaultLogoUrl = useMemo(() => getDisciplinePlaceholderLogo(previewName), [previewName]);
  const defaultImageUrl = useMemo(() => getDisciplinePlaceholderImage(previewName), [previewName]);

  const displayLogoUrl = logoUrl.trim() || defaultLogoUrl;
  const displayImageUrl = imageUrl.trim() || defaultImageUrl;

  const hasChanges =
    isCreateMode ||
    name.trim() !== discipline.name.trim() ||
    description.trim() !== discipline.description.trim() ||
    displayLogoUrl !== discipline.logoUrl ||
    displayImageUrl !== discipline.imageUrl;

  const displayStatus = isCreateMode && defaultStatus ? defaultStatus : discipline.status;

  const handleStartEdit = () => {
    setIsEditing(true);
    setShowConfirm(false);
    setError('');
  };

  const handleCancelEdit = () => {
    if (isCreateMode) {
      onClose();
      return;
    }
    setName(discipline.name);
    setDescription(discipline.description);
    setLogoUrl(discipline.logoUrl);
    setImageUrl(discipline.imageUrl);
    setIsEditing(false);
    setShowConfirm(false);
    setShowConfirmDelete(false);
    setError('');
  };

  const handleEditLogo = () => {
    const next = window.prompt('Enter logo image URL', displayLogoUrl);
    if (next === null) return;
    setLogoUrl(next.trim() || defaultLogoUrl);
  };

  const handleEditCover = () => {
    const next = window.prompt('Enter cover image URL', displayImageUrl);
    if (next === null) return;
    setImageUrl(next.trim() || defaultImageUrl);
  };

  const buildPayload = (): DisciplineFormValues => ({
    name: name.trim(),
    description: description.trim(),
    logoUrl: normalizeMediaUrl(displayLogoUrl, previewName, 'logo'),
    imageUrl: normalizeMediaUrl(displayImageUrl, previewName, 'image'),
  });

  const handleSaveClick = () => {
    if (!name.trim()) {
      setError('Discipline name is required.');
      return;
    }
    if (!hasChanges) {
      if (isCreateMode) {
        setError('Enter a discipline name and description before saving.');
        return;
      }
      setIsEditing(false);
      return;
    }
    setShowConfirm(true);
    setShowConfirmDelete(false);
  };

  const handleDeleteClick = () => {
    setShowConfirmDelete(true);
    setShowConfirm(false);
    setError('');
  };

  const handleConfirmDelete = async () => {
    if (!onDelete || !discipline.id) return;

    setSaving(true);
    setError('');
    const result = await onDelete(discipline.id);
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? 'Failed to delete discipline.');
      setShowConfirmDelete(false);
      return;
    }

    onClose();
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setError('');

    const payload = buildPayload();
    const result = isCreateMode
      ? await (onCreate?.(payload) ?? Promise.resolve({ success: false, error: 'Create handler is missing.' }))
      : await onSave(discipline.id, payload);

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? 'Failed to save changes.');
      setShowConfirm(false);
      return;
    }

    setShowConfirm(false);
    if (isCreateMode) {
      onClose();
      return;
    }
    setIsEditing(false);
  };

  const formattedUpdatedAt = discipline.updatedAt
    ? new Date(discipline.updatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-52 overflow-hidden">
          <EditableMedia
            isEditing={isEditing}
            label="Edit cover image"
            onEdit={handleEditCover}
            className="block w-full h-full"
          >
            <img src={displayImageUrl} alt={previewName} className="w-full h-full object-cover" />
          </EditableMedia>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1E2A35]/75 via-[#1E2A35]/20 to-transparent" />

          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/90 border border-white/40 flex items-center justify-center text-[#1E2A35] hover:bg-white transition-colors shadow-sm"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            {!isEditing && !isCreateMode && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="w-9 h-9 rounded-full bg-[#C49A3C] border border-[#A67E2A] flex items-center justify-center text-white hover:bg-[#A67E2A] transition-colors shadow-md"
                aria-label="Edit discipline"
              >
                <Pencil size={18} />
              </button>
            )}
            {isEditing && !isCreateMode && onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={saving}
                className="w-9 h-9 rounded-full bg-red-600 border border-red-700 flex items-center justify-center text-white hover:bg-red-700 transition-colors shadow-md disabled:opacity-60"
                aria-label="Delete discipline"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3 z-10">
            <div className="flex items-end gap-3 min-w-0 flex-1">
              <EditableMedia
                isEditing={isEditing}
                label="Edit logo"
                onEdit={handleEditLogo}
                className="shrink-0 rounded-2xl overflow-hidden"
              >
                <img
                  src={displayLogoUrl}
                  alt=""
                  aria-hidden="true"
                  className="w-14 h-14 rounded-2xl border border-white/30 bg-white object-cover shadow-sm"
                />
              </EditableMedia>
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Discipline name"
                    className="w-full px-3 py-2 rounded-xl bg-white/95 border border-[#D4CDB5]/70 text-[#1E2A35] text-lg font-semibold outline-none focus:ring-2 focus:ring-[#C49A3C]/30"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em' }}
                  />
                ) : (
                  <h2
                    className="text-white leading-none truncate"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.04em' }}
                  >
                    {discipline.name}
                  </h2>
                )}
                <p className="text-white/70 text-xs mt-1">/{isCreateMode || isEditing ? previewSlug : discipline.slug}</p>
              </div>
            </div>
            <StatusDisciplineBadge status={displayStatus} className="shrink-0 mb-0.5" />
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div>
            <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">Description</p>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                placeholder="Describe this discipline…"
                className="w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm leading-relaxed outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 resize-y min-h-[120px]"
              />
            ) : (
              <p className="text-[#5A5048] text-sm leading-relaxed whitespace-pre-wrap">
                {discipline.description || 'No description yet.'}
              </p>
            )}
          </div>

          {!isCreateMode && (
            <p className="text-[#B0A898] text-xs">Last updated {formattedUpdatedAt}</p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {showConfirmDelete && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
              <p className="text-[#1E2A35] text-sm font-semibold mb-1">Delete this discipline?</p>
              <p className="text-[#8A7E6E] text-sm mb-4">
                This will permanently remove <span className="font-semibold text-[#1E2A35]">{discipline.name}</span> from the catalog. This cannot be undone if events are linked to it.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-full border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  {saving ? 'Deleting…' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          )}

          {showConfirm && (
            <div className="rounded-2xl border border-[#C49A3C]/30 bg-[#C49A3C]/08 px-4 py-4">
              <p className="text-[#1E2A35] text-sm font-semibold mb-1">
                {isCreateMode ? 'Add this discipline?' : 'Save changes?'}
              </p>
              <p className="text-[#8A7E6E] text-sm mb-4">
                {isCreateMode
                  ? 'This new discipline will be visible on the Balanse website.'
                  : 'These changes will be visible on the Balanse website.'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-full border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-full bg-[#C49A3C] text-white text-sm font-bold hover:bg-[#A67E2A] transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  {saving ? 'Saving…' : isCreateMode ? 'Confirm Add' : 'Confirm Save'}
                </button>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="flex gap-3 pt-1 border-t border-[#D4CDB5]/40">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="flex-1 py-3 rounded-full border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-60"
              >
                {isCreateMode ? 'Cancel' : 'Cancel Edit'}
              </button>
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={saving}
                className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white text-sm font-bold hover:bg-[#263545] transition-all disabled:opacity-60"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
              >
                {isCreateMode ? 'Add Discipline' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
