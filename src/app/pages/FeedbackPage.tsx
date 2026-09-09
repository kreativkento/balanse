import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowUpRight,
  Bug,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Film,
  ImagePlus,
  Inbox,
  Lightbulb,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Smile,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import {
  FEEDBACK_DESCRIPTION_MAX,
  FEEDBACK_MAX_BYTES,
  FEEDBACK_MAX_VIDEO_SECONDS,
  FEEDBACK_STATUSES,
  FEEDBACK_TITLE_MAX,
  canDeleteOwnFeedback,
  createFeedbackAttachmentUrl,
  deleteOwnFeedback,
  escalateFeedbackTicket,
  feedbackLevelLabel,
  fetchFeedbackInbox,
  fetchFeedbackSubmitter,
  fetchOwnFeedback,
  formatFeedbackFileSize,
  isFeedbackVideo,
  isFeedbackVideoMime,
  openFeedbackTicket,
  submitFeedback,
  validateFeedbackAttachment,
  type FeedbackDisplay,
  type FeedbackLabel,
  type FeedbackStatus,
  type FeedbackTicketLevel,
} from '../../lib/feedback-service';

const LABEL_OPTIONS: {
  value: FeedbackLabel;
  label: string;
  hint: string;
  icon: typeof Smile;
  tone: string;
}[] = [
  { value: 'positive', label: 'Positive', hint: 'Something that went well', icon: Smile, tone: 'text-emerald-600' },
  { value: 'bug', label: 'Bug', hint: 'Something is broken', icon: Bug, tone: 'text-red-600' },
  { value: 'feature', label: 'Feature', hint: 'A new capability to add', icon: Sparkles, tone: 'text-[#c49a3c]' },
  { value: 'question', label: 'Question', hint: 'Need an answer', icon: CircleHelp, tone: 'text-sky-600' },
  { value: 'improvement', label: 'Improvement', hint: 'An idea to improve / Your recommendation', icon: Lightbulb, tone: 'text-amber-600' },
];

const INP =
  'w-full rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-3 py-2.5 text-sm text-[#1E2A35] outline-none placeholder:text-[#B0A898] focus:border-[#c49a3c]/50 focus:ring-2 focus:ring-[#c49a3c]/25';

/** Keep the feedback list short enough to fit without page scroll. */
const PAGE_SIZE = 4;

type FeedbackPortal = 'member' | 'staff' | 'admin' | 'dev';

const PORTAL_PAGE_WRAP = 'min-h-full bg-[#F8F3E8]';
const PORTAL_PAGE_INNER = 'mx-auto w-full min-w-0 max-w-6xl px-4 pb-16 md:px-8';

function feedbackPortalFromPath(pathname: string): FeedbackPortal {
  if (pathname === '/staff-feedback') return 'staff';
  if (pathname === '/admin-feedback') return 'admin';
  if (pathname.startsWith('/development')) return 'dev';
  return 'member';
}

function loginPathForPortal(portal: FeedbackPortal): string {
  switch (portal) {
    case 'staff':
      return '/staff-login';
    case 'admin':
      return '/admin-login';
    case 'dev':
      return '/development';
    default:
      return '/login';
  }
}

function portalLabel(portal: FeedbackPortal): string {
  switch (portal) {
    case 'staff':
      return 'Staff Portal';
    case 'admin':
      return 'Admin Portal';
    case 'dev':
      return 'Development';
    default:
      return 'Account';
  }
}

type FeedbackListMode = 'inbox' | 'mine';

function inboxLevelsForPortal(portal: FeedbackPortal): FeedbackTicketLevel[] {
  if (portal === 'staff') return [0, 1];
  if (portal === 'admin') return [2];
  if (portal === 'dev') return [3];
  return [];
}

function portalHasInbox(portal: FeedbackPortal): boolean {
  return inboxLevelsForPortal(portal).length > 0;
}

function levelTone(level: number): string {
  if (level === 0) return 'bg-amber-50 text-amber-800 border-amber-200';
  if (level === 1) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (level === 2) return 'bg-violet-50 text-violet-700 border-violet-200';
  return 'bg-[#1E2A35]/10 text-[#1E2A35] border-[#D4CDB5]';
}

function labelMeta(value: FeedbackLabel) {
  return LABEL_OPTIONS.find((option) => option.value === value) ?? LABEL_OPTIONS[0];
}

function statusTone(status: FeedbackStatus) {
  if (status === 'resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'in_progress') return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

function statusLabel(status: FeedbackStatus) {
  return FEEDBACK_STATUSES.find((item) => item.value === status)?.label ?? status;
}

function formatSubmittedAt(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function LabelPicker({
  value,
  onChange,
}: {
  value: FeedbackLabel;
  onChange: (next: FeedbackLabel) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = labelMeta(value);
  const SelectedIcon = selected.icon;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`${INP} flex items-center gap-2.5 text-left`}
      >
        <SelectedIcon size={16} className={selected.tone} />
        <span className="flex-1 font-medium">{selected.label}</span>
        <ChevronDown size={14} className={`text-[#8A7E6E] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-2xl border border-[#D4CDB5]/70 bg-white py-1 shadow-xl"
        >
          {LABEL_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-[#F8F3E8]' : 'hover:bg-[#F8F3E8]/80'
                  }`}
                >
                  <Icon size={16} className={`mt-0.5 shrink-0 ${option.tone}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#1E2A35]">{option.label}</span>
                    <span className="block text-[11px] text-[#8A7E6E]">{option.hint}</span>
                  </span>
                  {active && <Check size={14} className="mt-0.5 text-[#c49a3c]" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FeedbackRowCard({
  item,
  onOpen,
  onDelete,
  showDelete = true,
}: {
  item: FeedbackDisplay;
  onOpen: (item: FeedbackDisplay) => void;
  onDelete: (item: FeedbackDisplay) => void;
  showDelete?: boolean;
}) {
  const meta = labelMeta(item.label);
  const Icon = meta.icon;
  const shortId = item.id.slice(0, 8).toUpperCase();
  const canDelete = showDelete && canDeleteOwnFeedback(item);

  return (
    <article
      className={`flex w-full flex-col gap-3 rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:gap-4 ${CARD_HOVER_GROW}`}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex min-w-0 flex-1 flex-col gap-3 text-left sm:flex-row sm:items-center sm:gap-4"
      >
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F8F3E8] ${meta.tone}`}>
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[#1E2A35]">{item.title}</h3>
            <span className="rounded-full border border-[#D4CDB5]/70 bg-[#F8F3E8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5A5048]">
              {meta.label}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${levelTone(item.ticketLevel)}`}>
              {feedbackLevelLabel(item.ticketLevel)}
            </span>
            {item.attachmentPath && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#8A7E6E]">
                <Paperclip size={11} />
                Attachment
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#8A7E6E]">{item.description}</p>
          <p className="mt-1.5 text-[11px] text-[#B0A898]">
            Ticket <span className="font-mono text-[#5A5048]">#{shortId}</span>
            <span className="mx-1.5 text-[#D4CDB5]">·</span>
            {formatSubmittedAt(item.createdAt)}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(item.status)}`}>
          {statusLabel(item.status)}
        </span>
        {showDelete && (
          <button
            type="button"
            disabled={!canDelete}
            title={canDelete ? 'Delete ticket' : 'Only unopened tickets can be deleted'}
            onClick={() => onDelete(item)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-[#C4B8A0] disabled:hover:bg-transparent"
            aria-label={canDelete ? 'Delete feedback' : 'Delete unavailable'}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </article>
  );
}

function FeedbackDetailModal({
  item,
  onClose,
  onDelete,
  showDelete = true,
  canEscalate = false,
  onEscalate,
  escalating = false,
  actionError = '',
}: {
  item: FeedbackDisplay;
  onClose: () => void;
  onDelete: (item: FeedbackDisplay) => void;
  showDelete?: boolean;
  canEscalate?: boolean;
  onEscalate?: () => void;
  escalating?: boolean;
  actionError?: string;
}) {
  const meta = labelMeta(item.label);
  const Icon = meta.icon;
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [attachmentLoading, setAttachmentLoading] = useState(Boolean(item.attachmentPath));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!item.attachmentPath) {
      setAttachmentUrl(null);
      setAttachmentError('');
      setAttachmentLoading(false);
      return;
    }

    setAttachmentLoading(true);
    createFeedbackAttachmentUrl(item.attachmentPath).then((result) => {
      if (cancelled) return;
      setAttachmentUrl(result.url);
      setAttachmentError(result.error ?? '');
      setAttachmentLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [item.attachmentPath]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const copyTicketId = async () => {
    try {
      await navigator.clipboard.writeText(item.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-detail-title"
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-[#D4CDB5]/60 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#D4CDB5]/50 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8F3E8] ${meta.tone}`}>
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <h2
                id="feedback-detail-title"
                className="leading-none text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.05em' }}
              >
                Feedback details
              </h2>
              <p className="mt-1 text-[11px] text-[#8A7E6E]">{formatSubmittedAt(item.createdAt)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#8A7E6E] transition-colors hover:bg-[#EDE8D8] hover:text-[#1E2A35]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4CDB5]/70 bg-[#F8F3E8] px-2.5 py-1 text-[11px] font-semibold text-[#1E2A35]">
              <Icon size={12} className={meta.tone} />
              {meta.label}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(item.status)}`}>
              {statusLabel(item.status)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${levelTone(item.ticketLevel)}`}>
              {feedbackLevelLabel(item.ticketLevel)}
            </span>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Label</span>
            <div className={`${INP} flex items-center gap-2.5`}>
              <Icon size={16} className={meta.tone} />
              <span className="font-medium">{meta.label}</span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Title</span>
            <div className={INP}>{item.title}</div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Description</span>
            <div className={`${INP} min-h-[140px] whitespace-pre-wrap`}>{item.description}</div>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Attachment</span>
            {item.attachmentPath ? (
              <div className="rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-4 py-4">
                {attachmentLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#8A7E6E]">
                    <Loader2 size={16} className="animate-spin text-[#c49a3c]" />
                    Loading attachment…
                  </div>
                ) : attachmentError || !attachmentUrl ? (
                  <p className="text-sm text-[#8A7E6E]">{attachmentError || 'Attachment is unavailable.'}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="overflow-hidden rounded-xl border border-[#D4CDB5]/60 bg-white">
                      {isFeedbackVideoMime(item.attachmentMime) ? (
                        <video src={attachmentUrl} controls className="max-h-56 w-full bg-black object-contain" />
                      ) : (
                        <img src={attachmentUrl} alt={item.attachmentName ?? 'Attachment'} className="max-h-56 w-full object-contain" />
                      )}
                    </div>
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-[#1E2A35]">
                      {isFeedbackVideoMime(item.attachmentMime) ? <Film size={14} /> : <ImagePlus size={14} />}
                      {item.attachmentName || 'Attachment'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className={`${INP} text-[#8A7E6E]`}>No file attached</div>
            )}
          </div>

          <div className="rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Ticket ID</p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all text-sm font-semibold text-[#1E2A35]">{item.id}</code>
              <button
                type="button"
                onClick={() => void copyTicketId()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#D4CDB5]/80 bg-white px-2.5 py-1 text-xs font-semibold text-[#5A5048] transition-colors hover:bg-[#EDE8D8]"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {actionError && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {canEscalate && onEscalate && (
              <button
                type="button"
                disabled={escalating}
                onClick={onEscalate}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1E2A35] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#263545] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {escalating ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                {item.ticketLevel === 1 ? 'Pass to admin' : 'Pass to dev'}
              </button>
            )}

            {showDelete && (
              <>
                <button
                  type="button"
                  disabled={!canDeleteOwnFeedback(item)}
                  title={canDeleteOwnFeedback(item) ? 'Delete ticket' : 'Only unopened tickets can be deleted'}
                  onClick={() => onDelete(item)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:border-[#D4CDB5]/70 disabled:bg-[#F8F3E8] disabled:text-[#C4B8A0] disabled:hover:bg-[#F8F3E8]"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                {!canDeleteOwnFeedback(item) && (
                  <p className="text-center text-xs leading-relaxed text-[#8A7E6E]">
                    Staff have opened this ticket, so it can&apos;t be deleted anymore. Thank you for your feedback!
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const portal = feedbackPortalFromPath(pathname);
  const loginPath = loginPathForPortal(portal);

  const hasInbox = portalHasInbox(portal);
  const inboxLevels = inboxLevelsForPortal(portal);

  const [ready, setReady] = useState(false);
  const [listMode, setListMode] = useState<FeedbackListMode>(hasInbox ? 'inbox' : 'mine');
  const [items, setItems] = useState<FeedbackDisplay[]>([]);
  const [inboxItems, setInboxItems] = useState<FeedbackDisplay[]>([]);
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<FeedbackLabel | 'all'>('all');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<FeedbackDisplay | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FeedbackDisplay | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [actionError, setActionError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [label, setLabel] = useState<FeedbackLabel>('positive');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    setListLoading(true);
    const [ownResult, inboxResult] = await Promise.all([
      fetchOwnFeedback(),
      hasInbox ? fetchFeedbackInbox(inboxLevels) : Promise.resolve({ data: [], error: null }),
    ]);
    setListError(ownResult.error ?? inboxResult.error ?? '');
    setItems(ownResult.data);
    setInboxItems(inboxResult.data);
    setListLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    fetchFeedbackSubmitter().then((submitter) => {
      if (cancelled) return;
      if (!submitter) {
        navigate(loginPath);
        return;
      }
      setReady(true);
      void loadItems();
    });
    return () => {
      cancelled = true;
    };
  }, [navigate, loginPath]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) closeModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, saving]);

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetFormFields = () => {
    setLabel('positive');
    setTitle('');
    setDescription('');
    clearFile();
    setFormError('');
    setTicketId(null);
    setCopied(false);
  };

  const openModal = () => {
    setViewing(null);
    resetFormFields();
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    resetFormFields();
  };

  const applyFile = async (next: File | null) => {
    if (!next) {
      clearFile();
      return;
    }
    const error = await validateFeedbackAttachment(next);
    if (error) {
      setFileError(error);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setFileError('');
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) void applyFile(dropped);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!description.trim()) {
      setFormError('Description is required.');
      return;
    }

    setSaving(true);
    const result = await submitFeedback({ title, description, label, file });
    setSaving(false);

    if (result.error || !result.data) {
      setFormError(result.error ?? 'Could not send feedback. Try again.');
      return;
    }

    setTicketId(result.data.id);
    setItems((prev) => [result.data!, ...prev]);
    setPage(1);
  };

  const copyTicketId = async () => {
    if (!ticketId) return;
    try {
      await navigator.clipboard.writeText(ticketId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !canDeleteOwnFeedback(pendingDelete)) return;

    setDeleting(true);
    setDeleteError('');
    const result = await deleteOwnFeedback(pendingDelete.id);
    setDeleting(false);

    if (result.error) {
      setDeleteError(result.error);
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== pendingDelete.id));
    if (viewing?.id === pendingDelete.id) setViewing(null);
    setPendingDelete(null);
  };

  const handleOpenItem = async (item: FeedbackDisplay) => {
    setActionError('');
    if (portal === 'staff' && listMode === 'inbox' && item.ticketLevel === 0) {
      const result = await openFeedbackTicket(item.id);
      if (result.error) {
        setActionError(result.error);
        setViewing(item);
        return;
      }
      if (result.data) {
        setInboxItems((prev) => prev.map((row) => (row.id === item.id ? result.data! : row)));
        setViewing(result.data);
        return;
      }
    }
    setViewing(item);
  };

  const handleEscalate = async () => {
    if (!viewing) return;
    setEscalating(true);
    setActionError('');
    const result = await escalateFeedbackTicket(viewing.id);
    setEscalating(false);

    if (result.error) {
      setActionError(result.error);
      return;
    }

    setViewing(null);
    await loadItems();
  };

  const activeItems = listMode === 'inbox' ? inboxItems : items;
  const showDeleteControls = listMode === 'mine';

  const filteredItems = useMemo(
    () => (typeFilter === 'all' ? activeItems : activeItems.filter((item) => item.label === typeFilter)),
    [activeItems, typeFilter],
  );

  const canEscalateViewing = Boolean(
    viewing
    && listMode === 'inbox'
    && ((portal === 'staff' && viewing.ticketLevel === 1) || (portal === 'admin' && viewing.ticketLevel === 2)),
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);
  const rangeStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredItems.length);

  const setTypeFilterAndReset = (next: FeedbackLabel | 'all') => {
    setTypeFilter(next);
    setPage(1);
  };

  const setListModeAndReset = (next: FeedbackListMode) => {
    setListMode(next);
    setTypeFilter('all');
    setPage(1);
    setViewing(null);
  };

  if (!ready) {
    return (
      <div className="flex min-h-full min-h-dvh items-center justify-center bg-[#F8F3E8]">
        <Loader2 size={20} className="animate-spin text-[#c49a3c]" />
      </div>
    );
  }

  const selectedLabel = labelMeta(label);
  const descriptionCount = description.length;
  const descriptionNearLimit = descriptionCount > FEEDBACK_DESCRIPTION_MAX * 0.9;

  const feedbackPageContent = (
        <>
        <div className="pt-6 mb-6">
          <p className="mb-1 text-xs uppercase tracking-widest text-[#8A7E6E]">
            {portalLabel(portal)}
          </p>
          <h2
            className="leading-tight text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
          >
            System Feedback
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[#8A7E6E]">
            {hasInbox
              ? 'Review incoming tickets, escalate when needed, or send feedback directly to dev.'
              : 'Review your tickets and send a new note anytime. Every submission gets a ticket id.'}
          </p>
        </div>

        {hasInbox && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setListModeAndReset('inbox')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                listMode === 'inbox'
                  ? 'bg-[#1E2A35] text-white'
                  : 'border border-[#D4CDB5]/60 bg-white text-[#5A5048] hover:border-[#c49a3c]/40'
              }`}
            >
              <Inbox size={14} />
              Inbox
              {!listLoading && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${listMode === 'inbox' ? 'bg-white/15' : 'bg-[#EDE8D8]'}`}>
                  {inboxItems.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setListModeAndReset('mine')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                listMode === 'mine'
                  ? 'bg-[#1E2A35] text-white'
                  : 'border border-[#D4CDB5]/60 bg-white text-[#5A5048] hover:border-[#c49a3c]/40'
              }`}
            >
              <Send size={14} />
              My submissions
              {!listLoading && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${listMode === 'mine' ? 'bg-white/15' : 'bg-[#EDE8D8]'}`}>
                  {items.length}
                </span>
              )}
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8A7E6E]">
            {listMode === 'inbox' ? 'Incoming queue' : 'Your submissions'}
            {!listLoading && (
              <span className="ml-2 normal-case tracking-normal text-[#B0A898]">
                {filteredItems.length} of {activeItems.length} {activeItems.length === 1 ? 'ticket' : 'tickets'}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#c49a3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#a67f2e]"
          >
            <Plus size={15} />
            Submit a Feedback
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Type</span>
          <button
            type="button"
            onClick={() => setTypeFilterAndReset('all')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              typeFilter === 'all'
                ? 'bg-[#1E2A35] text-white'
                : 'border border-[#D4CDB5]/60 bg-white text-[#8A7E6E] hover:border-[#c49a3c]/40 hover:text-[#1E2A35]'
            }`}
          >
            All
          </button>
          {LABEL_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = typeFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilterAndReset(option.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'bg-[#1E2A35] text-white'
                    : 'border border-[#D4CDB5]/60 bg-white text-[#8A7E6E] hover:border-[#c49a3c]/40 hover:text-[#1E2A35]'
                }`}
              >
                <Icon size={12} className={active ? 'text-[#c49a3c]' : option.tone} />
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-[#FAFAF7] shadow-sm">
          <div className="border-b border-[#D4CDB5]/50 bg-white px-4 py-3 sm:px-5">
            <div className="hidden grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-4 text-[10px] font-semibold uppercase tracking-widest text-[#B0A898] sm:grid">
              <span>Type</span>
              <span>Details</span>
              <span>Status</span>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B0A898] sm:hidden">
              Feedback list
            </p>
          </div>

          <div className="flex flex-col gap-3 p-3 sm:p-4">
            {listLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#8A7E6E]">
                <Loader2 size={16} className="animate-spin text-[#c49a3c]" />
                Loading feedback…
              </div>
            ) : listError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
                {listError}
              </div>
            ) : activeItems.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-14 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#c49a3c] shadow-sm">
                  {listMode === 'inbox' ? <Inbox size={22} /> : <MessageSquare size={22} />}
                </div>
                <p className="text-sm font-semibold text-[#1E2A35]">
                  {listMode === 'inbox' ? 'Inbox is clear' : 'No feedback yet'}
                </p>
                <p className="mt-1 max-w-sm text-sm text-[#8A7E6E]">
                  {listMode === 'inbox'
                    ? 'No tickets are waiting in this queue right now.'
                    : 'Submit your first note and it will show up here with its ticket id.'}
                </p>
                {listMode === 'mine' && (
                  <button
                    type="button"
                    onClick={openModal}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1E2A35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#263545]"
                  >
                    <Plus size={14} />
                    Submit a Feedback
                  </button>
                )}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-14 text-center">
                <p className="text-sm font-semibold text-[#1E2A35]">
                  No {typeFilter === 'all' ? '' : `${labelMeta(typeFilter).label.toLowerCase()} `}tickets
                </p>
                <p className="mt-1 max-w-sm text-sm text-[#8A7E6E]">
                  You have no feedback of this type yet. Try another filter or submit a new note.
                </p>
                <button
                  type="button"
                  onClick={() => setTypeFilterAndReset('all')}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#D4CDB5]/70 px-4 py-2.5 text-sm font-semibold text-[#1E2A35] hover:bg-white"
                >
                  Show all tickets
                </button>
              </div>
            ) : (
              pageItems.map((item) => (
                <FeedbackRowCard
                  key={item.id}
                  item={item}
                  onOpen={(row) => { void handleOpenItem(row); }}
                  onDelete={setPendingDelete}
                  showDelete={showDeleteControls}
                />
              ))
            )}
          </div>

          {!listLoading && !listError && filteredItems.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#D4CDB5]/50 bg-white px-4 py-3 sm:flex-row sm:px-5">
              <p className="text-xs text-[#8A7E6E]">
                Showing {rangeStart}–{rangeEnd} of {filteredItems.length}{' '}
                {filteredItems.length === 1 ? 'ticket' : 'tickets'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4CDB5]/60 bg-[#EDE8D8] text-[#1E2A35] transition-all hover:bg-[#E3DCC8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`min-w-9 h-9 rounded-full px-2.5 text-xs font-semibold transition-all ${
                      n === currentPage
                        ? 'bg-[#c49a3c] text-white'
                        : 'border border-[#D4CDB5]/60 bg-white text-[#5A5048] hover:border-[#c49a3c]/40'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4CDB5]/60 bg-[#EDE8D8] text-[#1E2A35] transition-all hover:bg-[#E3DCC8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
        </>
  );

  return (
    <>
    {portal === 'member' ? (
      <MemberPageShell searchPlaceholder="Search feedback…">
        {feedbackPageContent}
      </MemberPageShell>
    ) : (
      <div className={PORTAL_PAGE_WRAP}>
        <div className={PORTAL_PAGE_INNER}>
          {feedbackPageContent}
        </div>
      </div>
    )}

      {viewing && (
        <FeedbackDetailModal
          item={viewing}
          onClose={() => {
            setViewing(null);
            setActionError('');
          }}
          onDelete={setPendingDelete}
          showDelete={showDeleteControls}
          canEscalate={canEscalateViewing}
          onEscalate={() => { void handleEscalate(); }}
          escalating={escalating}
          actionError={actionError}
        />
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div className="w-full max-w-sm rounded-3xl border border-[#D4CDB5]/60 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
            >
              Delete ticket?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#8A7E6E]">
              This will permanently remove <span className="font-semibold text-[#1E2A35]">{pendingDelete.title}</span>.
              You can only do this before staff opens the ticket.
            </p>
            {deleteError && (
              <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setPendingDelete(null);
                  setDeleteError('');
                }}
                className="flex-1 rounded-full border border-[#D4CDB5]/70 py-2.5 text-sm font-semibold text-[#5A5048] hover:bg-[#EDE8D8] disabled:opacity-50"
              >
                Keep
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-[#D4CDB5]/60 bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#D4CDB5]/50 px-5 py-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c49a3c]/10 text-[#c49a3c]">
                  <MessageSquare size={16} />
                </div>
                <div className="min-w-0">
                  <h2
                    id="feedback-modal-title"
                    className="text-[#1E2A35] leading-none"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.05em' }}
                  >
                    Submit a Feedback
                  </h2>
                  <p className="mt-1 text-[11px] text-[#8A7E6E]">New tickets start as Unresolved</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#8A7E6E] transition-colors hover:bg-[#EDE8D8] hover:text-[#1E2A35] disabled:opacity-50"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5">
              {ticketId ? (
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                    <p className="text-sm font-semibold text-emerald-800">Thanks — we received your feedback.</p>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                      Your ticket is now in the list. Save this id if you need to follow up.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Ticket ID</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="min-w-0 flex-1 break-all text-sm font-semibold text-[#1E2A35]">{ticketId}</code>
                      <button
                        type="button"
                        onClick={() => void copyTicketId()}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#D4CDB5]/80 bg-white px-2.5 py-1 text-xs font-semibold text-[#5A5048] transition-colors hover:bg-[#EDE8D8]"
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-[#8A7E6E]">
                      Label: {selectedLabel.label} · Status: Unresolved
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={resetFormFields}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#D4CDB5]/70 px-4 py-2.5 text-sm font-semibold text-[#1E2A35] hover:bg-[#F8F3E8]"
                    >
                      Send another
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1E2A35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#263545]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Label</span>
                    <LabelPicker value={label} onChange={setLabel} />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
                      Title <span className="text-red-500">*</span>
                    </span>
                    <input
                      required
                      value={title}
                      maxLength={FEEDBACK_TITLE_MAX}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Short summary"
                      className={INP}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
                      <span>
                        Description <span className="text-red-500">*</span>
                      </span>
                      <span className={descriptionNearLimit ? 'normal-case tracking-normal text-amber-700' : 'normal-case tracking-normal text-[#B0A898]'}>
                        {descriptionCount}/{FEEDBACK_DESCRIPTION_MAX}
                      </span>
                    </span>
                    <textarea
                      required
                      value={description}
                      maxLength={FEEDBACK_DESCRIPTION_MAX}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={5}
                      placeholder="What should we know?"
                      className={`${INP} min-h-[140px] resize-y`}
                    />
                  </label>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
                      Attachment
                    </span>
                    <div
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setDragOver(true);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                          setDragOver(false);
                        }
                      }}
                      onDrop={handleDrop}
                      className={`rounded-2xl border-2 border-dashed px-4 py-5 transition-colors ${
                        dragOver
                          ? 'border-[#c49a3c] bg-[#c49a3c]/08'
                          : 'border-[#D4CDB5]/80 bg-[#F8F3E8]'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
                        className="sr-only"
                        onChange={(event) => void applyFile(event.target.files?.[0] ?? null)}
                      />

                      {file && previewUrl ? (
                        <div className="flex flex-col gap-3">
                          <div className="overflow-hidden rounded-xl border border-[#D4CDB5]/60 bg-white">
                            {isFeedbackVideo(file) ? (
                              <video src={previewUrl} controls className="max-h-56 w-full bg-black object-contain" />
                            ) : (
                              <img src={previewUrl} alt="Attachment preview" className="max-h-56 w-full object-contain" />
                            )}
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-[#1E2A35]">
                                {isFeedbackVideo(file) ? <Film size={14} /> : <ImagePlus size={14} />}
                                {file.name}
                              </p>
                              <p className="text-[11px] text-[#8A7E6E]">{formatFeedbackFileSize(file.size)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={clearFile}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-[#8A7E6E] transition-colors hover:bg-white hover:text-red-600"
                            >
                              <X size={12} />
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex w-full flex-col items-center gap-2 text-center"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#c49a3c] shadow-sm">
                            <ImagePlus size={18} />
                          </div>
                          <p className="text-sm font-semibold text-[#1E2A35]">
                            Drag and drop an image or video
                          </p>
                          <p className="text-[11px] leading-relaxed text-[#8A7E6E]">
                            or click to browse · JPG, PNG, WEBP, GIF, MP4, WEBM, MOV
                            <br />
                            Max {FEEDBACK_MAX_BYTES / (1024 * 1024)} MB · videos up to {FEEDBACK_MAX_VIDEO_SECONDS}s
                          </p>
                        </button>
                      )}
                    </div>
                    {fileError && <p className="text-xs text-red-600">{fileError}</p>}
                  </div>

                  {formError && (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#1E2A35] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#263545] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {saving ? 'Sending…' : 'Send feedback'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
