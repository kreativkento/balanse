import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar as CalendarIcon, Check, ChevronDown, Clock, Eye, Newspaper, Paperclip, Pause, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { CategorizedAddFilter, type CategorizedFilterGroup } from '../components/filters/CategorizedAddFilter';
import { useAdminAuth } from '../context/AdminAuthContext';
import { PortalTitleToolbar } from '../context/PortalChromeContext';
import { useAdminUrlSearchQuery } from '../hooks/useAdminUrlSearchFilter';
import { ContentSkeleton } from '../components/layout/PageLoadingScreen';
import {
  toastCreated,
  toastDeleted,
  toastOperationFailed,
  toastUpdated,
} from '../../lib/operation-toast';
import { AdminTablePagination, useFitPageSize } from '../components/layout/AdminTablePagination';
import {
  ChronologicalSortSelect,
  sortChronologically,
  type ChronologicalOrder,
} from '../components/layout/ChronologicalSortSelect';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Switch } from '../components/ui/switch';
import {
  BULLETIN_POST_TYPES,
  BULLETIN_VISIBILITIES,
  BULLETIN_VISIBILITY_META,
  bulletinDisplayImageUrl,
  bulletinScheduleState,
  approveBulletinPost,
  createBulletinPost,
  deleteBulletinPost,
  formatBulletinDateTime,
  holdBulletinPost,
  updateBulletinPost,
  useBulletinPosts,
  type BulletinPost,
  type BulletinPostType,
  type BulletinVisibility,
} from '../../lib/bulletin';

type StatusFilter = 'active' | 'inactive' | 'scheduled' | 'featured' | 'pending';

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  active: 'Active',
  inactive: 'Inactive',
  scheduled: 'Scheduled',
  featured: 'Featured',
  pending: 'Pending approval',
};

const TABLE_GRID =
  'grid-cols-[5.75rem_minmax(0,2.4fr)_minmax(0,0.9fr)_minmax(0,0.95fr)_minmax(0,1.35fr)_minmax(0,1.1fr)]';

function postMatchesStatus(post: BulletinPost, status: StatusFilter) {
  if (status === 'featured') return Boolean(post.pinned);
  if (status === 'pending') return !post.adminApproved;
  return bulletinScheduleState(post) === status;
}

function postLifecycleLabel(post: BulletinPost) {
  if (!post.adminApproved) return 'Pending approval';
  const state = bulletinScheduleState(post);
  if (state === 'scheduled') return 'Scheduled';
  if (state === 'active') return 'Active';
  return 'Inactive';
}

function postLifecycleClass(post: BulletinPost) {
  if (!post.adminApproved) return 'border-amber-200 bg-amber-50 text-amber-800';
  const state = bulletinScheduleState(post);
  if (state === 'scheduled') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (state === 'active') return 'border-green-200 bg-green-50 text-green-700';
  return 'border-[#D4CDB5]/70 bg-[#EDE8D8] text-[#5A5048]';
}

function matchesSelected<T>(selected: T[], predicate: (value: T) => boolean) {
  if (selected.length === 0) return true;
  return selected.some(predicate);
}

const FORM_AUDIENCES: BulletinVisibility[] = ['public', 'private', 'staff', 'user', 'coach'];

function formAudienceOptions(current?: BulletinVisibility): BulletinVisibility[] {
  if (current && !FORM_AUDIENCES.includes(current)) return [...FORM_AUDIENCES, current];
  return FORM_AUDIENCES;
}

function FormSelectDropdown<T extends string>({
  value,
  options,
  onChange,
  getLabel = (option) => option,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  getLabel?: (value: T) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-4 py-3 text-left text-sm text-[#1E2A35] outline-none transition-all focus:border-[#c49a3c]/50 focus:ring-2 focus:ring-[#c49a3c]/25"
      >
        <span className="min-w-0 truncate">{getLabel(value)}</span>
        <ChevronDown size={15} className={`shrink-0 text-[#8A7E6E] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-2xl border border-[#D4CDB5]/60 bg-white p-1.5 shadow-[0_8px_28px_rgba(30,42,53,0.16)]"
        >
          {options.map((option) => {
            const selected = option === value;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  selected ? 'bg-[#c49a3c]/12 text-[#1E2A35]' : 'text-[#5A5048] hover:bg-[#F5F2E8]'
                }`}
              >
                {getLabel(option)}
                {selected && <span className="h-1.5 w-1.5 rounded-full bg-[#c49a3c]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TIME_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const TIME_MINUTES = [0, 15, 30, 45];

function padTime(value: number) {
  return String(value).padStart(2, '0');
}

function parseIsoDate(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(iso: string | null) {
  const date = parseIsoDate(iso);
  if (!date) return 'Pick a date';
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeLabel(iso: string | null) {
  const date = parseIsoDate(iso);
  if (!date) return 'Pick a time';
  return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

function setDatePart(iso: string | null, nextDate: Date): string {
  const current = parseIsoDate(iso) ?? new Date();
  const combined = new Date(nextDate);
  combined.setHours(current.getHours(), current.getMinutes(), 0, 0);
  return combined.toISOString();
}

function setTimePart(iso: string | null, hours: number, minutes: number): string {
  const current = parseIsoDate(iso) ?? new Date();
  const combined = new Date(current);
  combined.setHours(hours, minutes, 0, 0);
  return combined.toISOString();
}

function DateTimeSplitField({
  value,
  onChange,
  datePlaceholder = 'Pick a date',
  timePlaceholder = 'Pick a time',
  allowClear = false,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  datePlaceholder?: string;
  timePlaceholder?: string;
  allowClear?: boolean;
}) {
  const selected = parseIsoDate(value);
  const hours = selected?.getHours() ?? 9;
  const minutes = selected?.getMinutes() ?? 0;
  const minuteOptions = TIME_MINUTES.includes(minutes) ? TIME_MINUTES : [...TIME_MINUTES, minutes].sort((a, b) => a - b);

  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-3 text-left text-sm text-[#1E2A35] outline-none transition-all hover:border-[#c49a3c]/40 focus:border-[#c49a3c]/50 focus:ring-2 focus:ring-[#c49a3c]/25"
          >
            <CalendarIcon size={14} className="shrink-0 text-[#c49a3c]" />
            <span className={`truncate ${selected ? '' : 'text-[#C0B8A8]'}`}>
              {selected ? formatDateLabel(value) : datePlaceholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="z-[80] w-auto border-[#D4CDB5]/60 bg-white p-2 shadow-lg">
          <Calendar
            mode="single"
            selected={selected ?? undefined}
            onSelect={(date) => {
              if (date) onChange(setDatePart(value, date));
            }}
            initialFocus
          />
          {allowClear && value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="mt-1 w-full rounded-xl px-3 py-2 text-xs font-semibold text-[#8A7E6E] hover:bg-[#F5F2E8]"
            >
              Clear date
            </button>
          )}
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-11 w-[7.25rem] shrink-0 items-center gap-2 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-3 text-left text-sm text-[#1E2A35] outline-none transition-all hover:border-[#c49a3c]/40 focus:border-[#c49a3c]/50 focus:ring-2 focus:ring-[#c49a3c]/25"
          >
            <Clock size={14} className="shrink-0 text-[#c49a3c]" />
            <span className={`truncate ${selected ? '' : 'text-[#C0B8A8]'}`}>
              {selected ? formatTimeLabel(value) : timePlaceholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="z-[80] w-56 border-[#D4CDB5]/60 bg-white p-2 shadow-lg">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#B0A898]">Hour</p>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-[#D4CDB5]/50">
                {TIME_HOURS.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => onChange(setTimePart(value ?? new Date().toISOString(), hour, minutes))}
                    className={`flex w-full px-3 py-1.5 text-left text-xs ${
                      hours === hour ? 'bg-[#c49a3c]/12 font-semibold text-[#1E2A35]' : 'text-[#5A5048] hover:bg-[#F5F2E8]'
                    }`}
                  >
                    {padTime(hour)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#B0A898]">Minute</p>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-[#D4CDB5]/50">
                {minuteOptions.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => onChange(setTimePart(value ?? new Date().toISOString(), hours, minute))}
                    className={`flex w-full px-3 py-1.5 text-left text-xs ${
                      minutes === minute ? 'bg-[#c49a3c]/12 font-semibold text-[#1E2A35]' : 'text-[#5A5048] hover:bg-[#F5F2E8]'
                    }`}
                  >
                    {padTime(minute)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type FormState = {
  title: string;
  description: string;
  category: BulletinPostType;
  visibility: BulletinVisibility;
  pinned: boolean;
  isActive: boolean;
  schedulePost: boolean;
  postedAt: string;
  activeUntil: string | null;
  imagePreview: string;
  imageFile: File | null;
  removeImage: boolean;
  attachmentName: string;
  attachmentFile: File | null;
  removeAttachment: boolean;
};

function emptyForm(): FormState {
  return {
  title: '',
  description: '',
    category: 'Announcement',
    visibility: 'private',
    pinned: false,
    isActive: true,
    schedulePost: false,
    postedAt: new Date().toISOString(),
    activeUntil: null,
    imagePreview: '',
    imageFile: null,
    removeImage: false,
    attachmentName: '',
    attachmentFile: null,
    removeAttachment: false,
  };
}

function formFromPost(post: BulletinPost): FormState {
  return {
    title: post.title,
    description: post.body,
    category: post.category,
    visibility: post.visibility,
    pinned: Boolean(post.pinned),
    isActive: post.isActive,
    schedulePost: new Date(post.postedAt).getTime() > Date.now(),
    postedAt: post.postedAt,
    activeUntil: post.activeUntil,
    imagePreview: post.imageUrl ?? '',
    imageFile: null,
    removeImage: false,
    attachmentName: post.attachmentName ?? '',
    attachmentFile: null,
    removeAttachment: false,
  };
}

const BULLETIN_PAGE_CONTAINER = 'mx-auto w-full min-w-0 max-w-8xl px-4 md:px-6';

function ReadOnlyField({
  label,
  value,
  span = false,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">{label}</label>
      <div className="w-full rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-4 py-3 text-sm text-[#1E2A35]">
        {value}
      </div>
    </div>
  );
}

function PendingPostViewModal({
  post,
  actionBusy,
  canApprove,
  onClose,
  onEdit,
  onApprovalAction,
}: {
  post: BulletinPost;
  actionBusy: ApprovalAction | null;
  canApprove: boolean;
  onClose: () => void;
  onEdit: () => void;
  onApprovalAction: (action: ApprovalAction) => void;
}) {
  const [pendingAction, setPendingAction] = useState<ApprovalAction | null>(null);
  const audience = BULLETIN_VISIBILITY_META[post.visibility];
  const displayImage = bulletinDisplayImageUrl(post);
  const scheduled = new Date(post.postedAt).getTime() > Date.now();
  const headerBusy = Boolean(actionBusy);

  useEffect(() => {
    if (!actionBusy) setPendingAction(null);
  }, [actionBusy]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#D4CDB5]/50 bg-white px-6 pb-4 pt-5">
          <h3
            className="flex min-w-0 flex-wrap items-center gap-2.5 text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}
          >
            <span>{post.uid}</span>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#EDE8D8] px-2 py-0.5 text-[10px] font-semibold tracking-normal text-[#5A5048]"
              style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', letterSpacing: '0.05em' }}
            >
              <Eye size={11} />
              View Mode
            </span>
          </h3>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={headerBusy}
              onClick={onEdit}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#D4CDB5]/70 px-3 text-xs font-semibold text-[#1E2A35] transition-all hover:border-[#c49a3c]/40 hover:bg-[#F8F3E8] disabled:opacity-60"
            >
              <Pencil size={12} />
              Edit
            </button>
            <div className="flex items-center gap-1 rounded-full border border-[#D4CDB5]/60 bg-[#F8F3E8] p-1">
              {canApprove && (
                <button
                  type="button"
                  disabled={headerBusy}
                  onClick={() => setPendingAction('approve')}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#1E2A35] px-3 text-xs font-semibold text-white transition-all hover:bg-[#263545] disabled:opacity-60"
                >
                  <Check size={12} />
                  Approve
                </button>
              )}
              <button
                type="button"
                disabled={headerBusy}
                onClick={() => setPendingAction('reject')}
                className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 size={12} />
                Reject
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#8A7E6E] transition-all hover:bg-[#EDE8D8]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-6 py-4">
          <ReadOnlyField label="Title" value={post.title} span />
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Content</label>
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-4 py-3 text-sm leading-relaxed text-[#1E2A35]">
              {post.body}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ReadOnlyField label="Category" value={post.category} />
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Reach</label>
              <div className="w-full rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-4 py-3 text-sm text-[#1E2A35]">
                {audience.label}
              </div>
              <p className="mt-1.5 text-[11px] text-[#B0A898]">{audience.hint}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ReadOnlyField label="Featured" value={post.pinned ? 'Yes' : 'No'} />
            <ReadOnlyField label="Scheduled" value={scheduled ? 'Yes' : 'No'} />
            <ReadOnlyField label="Published on" value={formatBulletinDateTime(post.postedAt)} />
            <ReadOnlyField
              label="Active until"
              value={post.activeUntil ? formatBulletinDateTime(post.activeUntil) : 'No end date'}
            />
            <ReadOnlyField label="Submitted" value={formatBulletinDateTime(post.createdAt)} />
          </div>
          <div className="flex items-stretch">
            <div className="w-[60%] min-w-0">
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Preview image</label>
              <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8]/50">
                {displayImage ? (
                  <img src={displayImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <p className="text-xs text-[#B0A898]">No preview image</p>
                )}
              </div>
            </div>
            <div className="w-[5%] shrink-0" aria-hidden="true" />
            <div className="flex min-w-0 w-[35%] flex-col">
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Attachment</label>
              {post.attachmentUrl ? (
                <a
                  href={post.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-28 flex-1 items-center gap-2 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-3 py-2.5 text-sm font-semibold text-[#1E2A35] transition-colors hover:border-[#c49a3c]/40"
                >
                  <Paperclip size={14} className="shrink-0 text-[#c49a3c]" />
                  <span className="min-w-0 truncate">{post.attachmentName || 'Download attachment'}</span>
                </a>
              ) : (
                <div className="flex min-h-28 flex-1 items-center justify-center rounded-2xl border border-dashed border-[#D4CDB5]/70 bg-[#F8F3E8]/50 px-3 text-xs text-[#B0A898]">
                  No attachment
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {pendingAction && (
        <ConfirmActionDialog
          action={pendingAction}
          busy={actionBusy === pendingAction}
          onCancel={() => {
            if (!actionBusy) setPendingAction(null);
          }}
          onConfirm={() => onApprovalAction(pendingAction)}
        />
      )}
    </div>
  );
}

type ApprovalAction = 'approve' | 'hold' | 'reject';

const APPROVAL_ACTION_COPY: Record<
  ApprovalAction,
  { title: string; body: string; confirm: string; danger?: boolean }
> = {
  approve: {
    title: 'Approve this post?',
    body: 'This will set admin approval to true and allow the post to go live for its audience.',
    confirm: 'Approve',
  },
  hold: {
    title: 'Hold this post?',
    body: 'This will set admin approval back to false. The post will leave live pages until it is approved again.',
    confirm: 'Hold',
  },
  reject: {
    title: 'Reject this post?',
    body: 'This will permanently delete the post. This cannot be undone.',
    confirm: 'Reject',
    danger: true,
  },
};

function ConfirmActionDialog({
  action,
  busy,
  onCancel,
  onConfirm,
  approved = false,
}: {
  action: ApprovalAction;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  approved?: boolean;
}) {
  const copy =
    action === 'reject' && approved
      ? {
          title: 'Delete this post?',
          body: 'This will permanently delete the post. This cannot be undone.',
          confirm: 'Delete',
          danger: true as const,
        }
      : APPROVAL_ACTION_COPY[action];
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className={`w-full max-w-sm rounded-3xl border bg-white p-8 text-center shadow-2xl ${
          copy.danger ? 'border-red-200' : 'border-[#D4CDB5]/60'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${
            copy.danger ? 'border-red-200 bg-red-50' : 'border-[#D4CDB5]/60 bg-[#F8F3E8]'
          }`}
        >
          {action === 'approve' && <Check size={22} className="text-[#c49a3c]" />}
          {action === 'hold' && <Pause size={22} className="text-[#a67f2e]" />}
          {action === 'reject' && <Trash2 size={22} className="text-red-500" />}
        </div>
        <h3
          className="mb-2 text-[#1E2A35]"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.04em' }}
        >
          {copy.title}
        </h3>
        <p className="mb-7 text-sm leading-relaxed text-[#8A7E6E]">{copy.body}</p>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex-1 rounded-full border border-[#D4CDB5]/70 py-3 text-sm text-[#8A7E6E] transition-all hover:bg-[#EDE8D8] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`action-button flex-1 rounded-full py-3 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.97] disabled:opacity-60 ${
              copy.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1E2A35] hover:bg-[#263545]'
            }`}
          >
            {busy ? 'Working…' : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionNotice({
  notice,
  onClose,
}: {
  notice: { type: 'success' | 'error'; message: string };
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4">
      <div
        className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
          notice.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}
      >
        <p className="flex-1 text-sm">{notice.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-md text-current/70 hover:bg-black/5"
          aria-label="Dismiss"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

function PostFormModal({
  initial,
  saving,
  submitError,
  actionBusy,
  startEditing = false,
  onClose,
  onSave,
  onApprovalAction,
  canApprove = false,
}: {
  initial?: BulletinPost | null;
  saving: boolean;
  submitError?: string;
  actionBusy: ApprovalAction | null;
  startEditing?: boolean;
  onClose: () => void;
  onSave: (data: FormState) => void;
  onApprovalAction?: (action: ApprovalAction) => void;
  canApprove?: boolean;
}) {
  const [form, setForm] = useState<FormState>(() => (initial ? formFromPost(initial) : emptyForm()));
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [pendingAction, setPendingAction] = useState<ApprovalAction | null>(null);
  const isExisting = Boolean(initial);
  const [editingActive, setEditingActive] = useState(() => !initial || startEditing);
  const isApproved = Boolean(initial?.adminApproved);
  const hasPreviewImage = form.imagePreview.trim().length > 0;
  const headerBusy = Boolean(actionBusy);
  const fieldsLocked = isExisting && !editingActive;

  const applyPreviewImage = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
      && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
      setError('Preview image must be a JPG, PNG, WEBP, or GIF.');
      return;
    }
    setError('');
    setForm((current) => {
      if (current.imagePreview.startsWith('blob:')) URL.revokeObjectURL(current.imagePreview);
      return {
        ...current,
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
        removeImage: false,
      };
    });
  };

  const clearPreviewImage = () => {
    setForm((current) => {
      if (current.imagePreview.startsWith('blob:')) URL.revokeObjectURL(current.imagePreview);
      return {
        ...current,
        imagePreview: '',
        imageFile: null,
        removeImage: true,
      };
    });
  };

  useEffect(() => {
    const field = contentRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.max(field.scrollHeight, 112)}px`;
  }, [form.description]);

  useEffect(() => {
    if (!actionBusy) setPendingAction(null);
  }, [actionBusy]);

  const handleSave = () => {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!form.description.trim()) {
      setError('Content is required.');
      return;
    }
    const postedAt = form.schedulePost ? form.postedAt : new Date().toISOString();
    if (form.schedulePost && new Date(postedAt).getTime() <= Date.now()) {
      setError('Scheduled post datetime must be in the future.');
      return;
    }
    if (form.activeUntil && new Date(form.activeUntil).getTime() <= new Date(postedAt).getTime()) {
      setError('Active until must be after the post datetime.');
      return;
    }
    onSave({ ...form, postedAt });
  };

  const cancelEdit = () => {
    if (!initial) return;
    setForm((current) => {
      if (current.imagePreview.startsWith('blob:')) URL.revokeObjectURL(current.imagePreview);
      return formFromPost(initial);
    });
    setError('');
    setEditingActive(false);
  };

  const INP =
    'w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#D4CDB5]/50 bg-white px-6 pb-4 pt-5">
          <h3
            className="flex min-w-0 flex-wrap items-center gap-2.5 text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}
          >
            <span>{isExisting ? initial?.uid : 'Add Post'}</span>
            {isExisting && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-normal ${
                  editingActive
                    ? 'bg-[#c49a3c]/15 text-[#a67f2e]'
                    : 'bg-[#EDE8D8] text-[#5A5048]'
                }`}
                style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', letterSpacing: '0.05em' }}
              >
                {editingActive ? <Pencil size={11} /> : <Eye size={11} />}
                {editingActive ? 'Edit Mode' : 'View Mode'}
              </span>
            )}
          </h3>
          <div className="flex shrink-0 items-center gap-2">
            {isExisting && onApprovalAction && (
              <>
                <button
                  type="button"
                  disabled={headerBusy}
                  aria-pressed={editingActive}
                  onClick={() => {
                    if (editingActive) cancelEdit();
                    else setEditingActive(true);
                  }}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all disabled:opacity-60 ${
                    editingActive
                      ? 'border border-[#D4CDB5]/70 text-[#8A7E6E] hover:bg-[#EDE8D8]'
                      : 'border border-[#D4CDB5]/70 text-[#1E2A35] hover:border-[#c49a3c]/40 hover:bg-[#F8F3E8]'
                  }`}
                >
                  {editingActive ? <X size={12} /> : <Pencil size={12} />}
                  {editingActive ? 'Cancel Edit' : 'Edit'}
                </button>
                <div className="flex items-center gap-1 rounded-full border border-[#D4CDB5]/60 bg-[#F8F3E8] p-1">
                  {canApprove && isApproved && (
                    <button
                      type="button"
                      disabled={headerBusy}
                      onClick={() => setPendingAction('hold')}
                      className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[#1E2A35] transition-all hover:bg-white disabled:opacity-60"
                    >
                      <Pause size={12} />
                      Hold
                    </button>
                  )}
                  {canApprove && !isApproved && (
                    <button
                      type="button"
                      disabled={headerBusy}
                      onClick={() => setPendingAction('approve')}
                      className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#1E2A35] px-3 text-xs font-semibold text-white transition-all hover:bg-[#263545] disabled:opacity-60"
                    >
                      <Check size={12} />
                      Approve
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={headerBusy}
                    onClick={() => setPendingAction('reject')}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 size={12} />
                    {isApproved ? 'Delete' : 'Reject'}
                  </button>
                </div>
              </>
            )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#8A7E6E] transition-all hover:bg-[#EDE8D8]"
          >
            <X size={16} />
          </button>
          </div>
        </div>

        <div className={`flex flex-col gap-3 px-6 py-4 ${fieldsLocked ? 'pointer-events-none' : ''}`}>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Post title…"
              className={INP}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Content</label>
            <textarea
              ref={contentRef}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Write the post content…"
              rows={4}
              className={`${INP} max-h-64 resize-y overflow-y-auto`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Category</label>
              <FormSelectDropdown
                value={form.category}
                options={BULLETIN_POST_TYPES}
                onChange={(category) => setForm((current) => ({ ...current, category }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Reach</label>
              <FormSelectDropdown
                value={form.visibility}
                options={formAudienceOptions(initial?.visibility)}
                onChange={(visibility) => setForm((current) => ({ ...current, visibility }))}
                getLabel={(visibility) => BULLETIN_VISIBILITY_META[visibility].label}
              />
              <p className="mt-1.5 text-[11px] text-[#B0A898]">{BULLETIN_VISIBILITY_META[form.visibility].hint}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-sm text-[#5A5048]">
              <Switch
                checked={form.schedulePost}
                onCheckedChange={(checked) => {
                  setForm((current) => ({
                    ...current,
                    schedulePost: checked,
                    postedAt: checked
                      ? (new Date(current.postedAt).getTime() > Date.now()
                        ? current.postedAt
                        : new Date(Date.now() + 60 * 60 * 1000).toISOString())
                      : current.postedAt,
                  }));
                }}
                className="data-[state=checked]:bg-[#c49a3c] data-[state=unchecked]:bg-[#D4CDB5]"
              />
              Schedule post
            </label>
            <label className="flex items-center gap-2 text-sm text-[#5A5048]">
              <Switch
                checked={form.pinned}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, pinned: checked }))}
                className="data-[state=checked]:bg-[#c49a3c] data-[state=unchecked]:bg-[#D4CDB5]"
              />
              Feature post
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {form.schedulePost && (
          <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Published on</label>
                <DateTimeSplitField
                  value={form.postedAt}
                  onChange={(next) => {
                    if (next) setForm((current) => ({ ...current, postedAt: next }));
                  }}
                />
              </div>
            )}
            <div className={form.schedulePost ? '' : 'sm:col-span-2'}>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Active until</label>
              <DateTimeSplitField
                value={form.activeUntil}
                onChange={(next) => setForm((current) => ({ ...current, activeUntil: next }))}
                allowClear
              />
            </div>
          </div>

          <div className="flex items-stretch">
            <div className="w-[60%] min-w-0">
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Preview image</label>
            <input
                ref={previewInputRef}
              type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                  if (file) applyPreviewImage(file);
                event.target.value = '';
              }}
            />
            <div
              role="button"
              tabIndex={0}
                onClick={() => previewInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                    previewInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file) applyPreviewImage(file);
              }}
                className={`relative flex h-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-3 py-2.5 transition-all ${
                dragOver
                    ? 'border-[#c49a3c] bg-[#c49a3c]/08'
                      : 'border-[#D4CDB5]/70 bg-[#F8F3E8]/50 hover:border-[#c49a3c]/40 hover:bg-[#c49a3c]/04'
              }`}
            >
                {hasPreviewImage ? (
                <>
                  <img
                      src={form.imagePreview}
                      alt="Preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1E2A35]/0 opacity-0 transition-colors hover:bg-[#1E2A35]/35 hover:opacity-100">
                      <p className="px-3 text-center text-xs text-white">
                        {isExisting ? 'Click to replace preview image' : 'Click to change preview image'}
                      </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                        clearPreviewImage();
                    }}
                    className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-xl bg-white/90 text-[#8A7E6E] shadow-sm backdrop-blur-sm transition-all hover:bg-red-50 hover:text-red-500"
                      aria-label="Remove preview image"
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4CDB5]/60 bg-[#EDE8D8]">
                    <Upload size={16} className="text-[#9A8E7E]" />
                  </div>
                    <p className="text-xs text-[#1E2A35]">
                      {isExisting ? 'Add or replace preview image' : 'Add preview image'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#B0A898]">JPG, PNG, WEBP, or GIF</p>
                </>
              )}
            </div>
          </div>

            <div className="w-[5%] shrink-0" aria-hidden="true" />

            <div className="flex min-w-0 w-[35%] flex-col">
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Attachment</label>
              <input
                ref={attachmentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setForm((current) => ({
                    ...current,
                    attachmentFile: file,
                    attachmentName: file.name,
                    removeAttachment: false,
                  }));
                  event.target.value = '';
                }}
              />
              {form.attachmentName ? (
                <div className="flex min-h-28 flex-1 items-center gap-2 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-3 py-2.5">
                  <Paperclip size={14} className="shrink-0 text-[#c49a3c]" />
                  <p className="min-w-0 flex-1 truncate text-sm text-[#1E2A35]">{form.attachmentName}</p>
          <button
            type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        attachmentFile: null,
                        attachmentName: '',
                        removeAttachment: true,
                      }))
                    }
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#8A7E6E] hover:bg-red-50 hover:text-red-500"
                    aria-label="Remove attachment"
                  >
                    <X size={12} />
          </button>
                </div>
              ) : (
          <button
            type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  className="flex min-h-28 flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#D4CDB5]/70 bg-[#F8F3E8]/50 px-3 py-2.5 text-center transition-all hover:border-[#c49a3c]/40"
                >
                  <Paperclip size={14} className="text-[#9A8E7E]" />
                  <span className="text-xs text-[#1E2A35]">Add file</span>
                  <span className="text-[11px] text-[#B0A898]">PDF, Word, or image</span>
                </button>
              )}
            </div>
          </div>

          {(error || submitError) && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{error || submitError}</p>
            </div>
          )}
        </div>

        {pendingAction && (
          <ConfirmActionDialog
            action={pendingAction}
            busy={actionBusy === pendingAction}
            approved={isApproved}
            onCancel={() => {
              if (!actionBusy) setPendingAction(null);
            }}
            onConfirm={() => onApprovalAction?.(pendingAction)}
          />
        )}

        {(!isExisting || editingActive) && (
        <div className="sticky bottom-0 border-t border-[#D4CDB5]/40 bg-white px-6 pb-5 pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="action-button w-full rounded-full bg-[#1E2A35] py-2.5 text-sm text-white transition-all hover:bg-[#263545] active:scale-[0.97] disabled:opacity-60"
           
          >
            {saving ? 'Saving…' : isExisting ? 'Save Changes' : form.schedulePost ? 'Schedule' : 'Publish'}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}

export default function AdminBulletinPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const urlSearchQuery = useAdminUrlSearchQuery();
  const { posts, loading, refresh } = useBulletinPosts();
  const [selectedCategories, setSelectedCategories] = useState<BulletinPostType[]>([]);
  const [selectedVisibilities, setSelectedVisibilities] = useState<BulletinVisibility[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusFilter[]>([]);
  const [page, setPage] = useState(1);
  const [chronoOrder, setChronoOrder] = useState<ChronologicalOrder>('latest');
  const [editingPost, setEditingPost] = useState<BulletinPost | null>(null);
  const [viewingPost, setViewingPost] = useState<BulletinPost | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formStartEditing, setFormStartEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState<ApprovalAction | null>(null);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { containerRef, pageSize } = useFitPageSize({ layout: 'table', fallback: 8 });

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategories, selectedVisibilities, selectedStatuses, urlSearchQuery]);

  const canApprovePosts = adminUser?.role === 'admin';

  const pendingCount = useMemo(
    () => posts.filter((post) => !post.adminApproved).length,
    [posts],
  );

  const filterGroups = useMemo<CategorizedFilterGroup[]>(() => {
    const statusCounts: Record<StatusFilter, number> = {
      active: 0,
      inactive: 0,
      scheduled: 0,
      featured: 0,
      pending: pendingCount,
    };
    for (const post of posts) {
      if (post.pinned) statusCounts.featured += 1;
      const state = bulletinScheduleState(post);
      if (state === 'active' || state === 'inactive' || state === 'scheduled') {
        statusCounts[state] += 1;
      }
    }
    return [
      {
        id: 'type',
        label: 'Type',
        options: BULLETIN_POST_TYPES.map((type) => ({ value: type, label: type })),
      },
      {
        id: 'audience',
        label: 'Audience',
        options: BULLETIN_VISIBILITIES.map((visibility) => ({
          value: visibility,
          label: BULLETIN_VISIBILITY_META[visibility].label,
        })),
      },
      {
        id: 'status',
        label: 'Status',
        options: (Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((status) => ({
          value: status,
          label: STATUS_FILTER_LABELS[status],
          count: statusCounts[status],
          tone: status === 'pending' ? 'warning' : 'default',
        })),
      },
    ];
  }, [pendingCount, posts]);

  const selectedFilters: Record<string, string[]> = {
    type: selectedCategories,
    audience: selectedVisibilities,
    status: selectedStatuses,
  };

  const hasActiveFilters =
    selectedCategories.length > 0 || selectedVisibilities.length > 0 || selectedStatuses.length > 0;

  const filtered = useMemo(() => {
    const q = urlSearchQuery.trim().toLowerCase();
    const matched = posts.filter((post) => {
      if (q && !post.title.toLowerCase().includes(q) && !post.body.toLowerCase().includes(q)) {
        return false;
      }
      return (
        matchesSelected(selectedCategories, (category) => post.category === category)
        && matchesSelected(selectedVisibilities, (visibility) => post.visibility === visibility)
        && matchesSelected(selectedStatuses, (status) => postMatchesStatus(post, status))
      );
    });
    return sortChronologically(matched, (post) => post.postedAt, chronoOrder);
  }, [posts, selectedCategories, selectedVisibilities, selectedStatuses, urlSearchQuery, chronoOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagePosts = filtered.slice(pageStart, pageStart + pageSize);
  const rangeStart = filtered.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = filtered.length === 0 ? 0 : pageStart + pagePosts.length;

  const applyFilterChange = (next: Record<string, string[]>) => {
    setSelectedCategories((next.type ?? []) as BulletinPostType[]);
    setSelectedVisibilities((next.audience ?? []) as BulletinVisibility[]);
    setSelectedStatuses((next.status ?? []) as StatusFilter[]);
  };

  const togglePendingFilter = () => {
    setSelectedStatuses((current) => (
      current.includes('pending')
        ? current.filter((status) => status !== 'pending')
        : [...current, 'pending']
    ));
  };

  const openPost = (post: BulletinPost) => {
    if (!post.adminApproved) {
      setViewingPost(post);
      return;
    }
    setFormStartEditing(false);
    setEditingPost(post);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingPost(null);
    setViewingPost(null);
    setFormStartEditing(false);
    setFormError('');
    setActionBusy(null);
  };

  const handleSavePost = async (data: FormState) => {
    setSaving(true);
    setFormError('');
    const payload = {
      title: data.title,
      body: data.description,
      category: data.category,
      visibility: data.visibility,
      pinned: data.pinned,
      isActive: data.isActive,
      adminApproved: canApprovePosts,
      postedAt: data.postedAt,
      activeUntil: data.activeUntil,
      imageFile: data.imageFile,
      removeImage: data.removeImage,
      attachmentFile: data.attachmentFile,
      removeAttachment: data.removeAttachment,
    };

    const result = editingPost
      ? await updateBulletinPost(editingPost.id, payload, {
          imagePath: editingPost.imagePath,
          attachmentPath: editingPost.attachmentPath,
        })
      : await createBulletinPost(payload);

    setSaving(false);
    if (result.error) {
      setFormError(result.error);
      setNotice({ type: 'error', message: result.error });
      toastOperationFailed(result.error);
      return;
    }
    closeModal();
    const successMessage = editingPost
      ? (canApprovePosts ? 'Post updated.' : 'Post updated and sent for admin approval.')
      : (canApprovePosts ? 'Post saved.' : 'Post submitted for admin approval.');
    setNotice({ type: 'success', message: successMessage });
    if (editingPost) {
      toastUpdated('Bulletin post');
    } else {
      toastCreated('Bulletin post');
    }
    await refresh();
  };

  const handleApprovalAction = async (action: ApprovalAction, post?: BulletinPost | null) => {
    const target = post ?? editingPost ?? viewingPost;
    if (!target) return;
    if ((action === 'approve' || action === 'hold') && !canApprovePosts) return;
    setActionBusy(action);
    setFormError('');

    if (action === 'approve') {
      const result = await approveBulletinPost(target.id);
      setActionBusy(null);
      if (result.error || !result.data) {
        const message = result.error ?? 'Could not approve the post.';
        setNotice({ type: 'error', message });
        toastOperationFailed(message);
        return;
      }
      if (editingPost?.id === target.id) setEditingPost(result.data);
      if (viewingPost?.id === target.id) setViewingPost(null);
      setNotice({ type: 'success', message: 'Post approved.' });
      toastUpdated('Post approved');
      await refresh();
      return;
    }

    if (action === 'hold') {
      const result = await holdBulletinPost(target.id);
      setActionBusy(null);
      if (result.error || !result.data) {
        const message = result.error ?? 'Could not hold the post.';
        setNotice({ type: 'error', message });
        toastOperationFailed(message);
        return;
      }
      if (editingPost?.id === target.id) setEditingPost(result.data);
      if (viewingPost?.id === target.id) setViewingPost(result.data);
      setNotice({ type: 'success', message: 'Post put on hold.' });
      toastUpdated('Post on hold');
      await refresh();
      return;
    }

    const result = await deleteBulletinPost(target);
    setActionBusy(null);
    if (result.error) {
      setNotice({ type: 'error', message: result.error });
      toastOperationFailed(result.error);
      return;
    }
    closeModal();
    setNotice({ type: 'success', message: 'Post rejected and deleted.' });
    toastDeleted('Bulletin post');
    await refresh();
  };

  const openAddPost = useCallback(() => {
    setFormStartEditing(false);
    setEditingPost(null);
    setShowAddModal(true);
  }, []);

  if (!adminUser) return null;

  return (
    <>
      {notice && <ActionNotice notice={notice} onClose={() => setNotice(null)} />}

      {viewingPost && (
        <PendingPostViewModal
          post={viewingPost}
          actionBusy={actionBusy}
          canApprove={canApprovePosts}
          onClose={() => setViewingPost(null)}
          onEdit={() => {
            setFormStartEditing(true);
            setEditingPost(viewingPost);
            setViewingPost(null);
          }}
          onApprovalAction={(action) => {
            void handleApprovalAction(action, viewingPost);
          }}
        />
      )}

      {(showAddModal || editingPost) && (
        <PostFormModal
          key={editingPost?.id ?? 'new'}
          initial={editingPost}
          saving={saving}
          submitError={formError}
          actionBusy={actionBusy}
          startEditing={formStartEditing}
          onClose={closeModal}
          onSave={(data) => {
            void handleSavePost(data);
          }}
          onApprovalAction={editingPost ? (action) => { void handleApprovalAction(action); } : undefined}
          canApprove={canApprovePosts}
        />
      )}

      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className={`${BULLETIN_PAGE_CONTAINER} flex flex-1 min-h-0 flex-col overflow-hidden pb-5 pt-1`}>
          {formError && (
            <div className="mb-3 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {formError}
            </div>
          )}

          <PortalTitleToolbar>
            <CategorizedAddFilter
              groups={filterGroups}
              selected={selectedFilters}
              onChange={applyFilterChange}
            />
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={togglePendingFilter}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedStatuses.includes('pending')
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-50'
                }`}
              >
                Pending approval
                <span className="rounded-full bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-900">
                  {pendingCount}
                </span>
              </button>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-3">
              <ChronologicalSortSelect
                value={chronoOrder}
                onChange={(order) => {
                  setChronoOrder(order);
                  setPage(1);
                }}
              />
              <span className="text-sm text-[#8A7E6E] whitespace-nowrap">
                {filtered.length} of {posts.length} posts
              </span>
              <button
                type="button"
                onClick={openAddPost}
                className="action-button flex shrink-0 items-center gap-2 rounded-full bg-[#1E2A35] px-5 py-2.5 text-white shadow-sm transition-all hover:bg-[#263545] active:scale-[0.97]"
              >
                <Plus size={15} />
                Add Post
              </button>
            </div>
          </PortalTitleToolbar>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm">
            <div className={`grid gap-x-4 ${TABLE_GRID} shrink-0 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 px-6 py-3`}>
              {['UID', 'Title', 'Type', 'Audience', 'Status', 'Posted'].map((heading) => (
                <p key={heading} className="text-xs font-medium uppercase tracking-widest text-[#8A7E6E]">
                  {heading}
                </p>
              ))}
            </div>

            {loading ? (
              <div
                ref={containerRef}
                className="min-h-0 flex-1 overflow-auto px-6 py-4"
                role="status"
                aria-live="polite"
                aria-label="Loading bulletin posts"
              >
                <ContentSkeleton variant="list" />
              </div>
            ) : filtered.length === 0 ? (
              <div
                ref={containerRef}
                className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4CDB5]/60 bg-[#F8F3E8]">
                  <Newspaper size={18} className="text-[#c49a3c]" />
                </div>
                <p className="text-sm font-semibold text-[#1E2A35]">No posts found</p>
                <p className="max-w-sm text-xs text-[#8A7E6E]">
                  {hasActiveFilters
                    ? 'No posts match the selected filters. Clear a chip or try another combination.'
                    : 'Create your first bulletin post for members and the public site.'}
                </p>
                {!hasActiveFilters && (
                  <button
                    type="button"
                    onClick={openAddPost}
                    className="mt-1 inline-flex items-center gap-2 rounded-full border border-[#D4CDB5]/70 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1E2A35] transition-all hover:border-[#c49a3c]/40 hover:bg-[#F8F3E8]"
                  >
                    <Plus size={13} />
                    Add Post
                  </button>
                )}
              </div>
            ) : (
              <div ref={containerRef} className="min-h-0 flex-1 divide-y divide-[#D4CDB5]/30">
                {pagePosts.map((post) => {
                  const audience = BULLETIN_VISIBILITY_META[post.visibility];
                  return (
                    <div
                      key={post.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openPost(post)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openPost(post);
                        }
                      }}
                      className={`grid min-h-[64px] cursor-pointer items-center gap-x-4 ${TABLE_GRID} px-6 py-3.5 transition-colors hover:bg-[#F8F3E8]/50`}
                    >
                      <span className="truncate text-xs font-semibold tracking-wide text-[#5A5048]">{post.uid}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1E2A35]">{post.title}</p>
                        <p className="truncate text-xs text-[#8A7E6E]">{post.excerpt}</p>
                      </div>
                      <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${post.badgeColor}`}>
                        {post.badgeText}
                      </span>
                      <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${audience.badgeClass}`}>
                        {audience.label}
                      </span>
                      <div className="flex min-w-0 flex-wrap items-center gap-1">
                        <span className={`w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold ${postLifecycleClass(post)}`}>
                          {postLifecycleLabel(post)}
                        </span>
                        {post.pinned && (
                          <span className="w-fit rounded-full bg-[#c49a3c]/12 px-2 py-0.5 text-[10px] font-bold text-[#a67f2e]">
                            Featured
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-[#5A5048]">{post.date}</span>
                    </div>
                  );
                })}
        </div>
            )}
          </div>

          <AdminTablePagination
            page={currentPage}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            total={filtered.length}
            noun="posts"
            onPageChange={setPage}
          />
        </div>
      </div>
    </>
  );
}
