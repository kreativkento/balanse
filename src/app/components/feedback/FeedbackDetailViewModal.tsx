import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ClipboardCheck,
  Copy,
  Film,
  ImagePlus,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FeedbackDetailMetaGrid } from './FeedbackDetailMetaGrid';
import {
  FEEDBACK_BTN_FORWARD,
  FEEDBACK_BTN_RECEIVE,
  FEEDBACK_DETAIL_FIELD_INP,
  FEEDBACK_DETAIL_MODAL_PANEL,
} from './feedback-detail-modal-styles';
import {
  canDeleteOwnFeedback,
  createFeedbackAttachmentUrl,
  feedbackDeleteBlockedMessage,
  feedbackPublicTicketId,
  isFeedbackVideoMime,
  type FeedbackDisplay,
  type FeedbackPriority,
  type FeedbackStatus,
} from '../../../lib/feedback-service';
import type { UserRole } from '../../../lib/database.types';
import { FeedbackCommentThread } from './FeedbackCommentThread';
import { markFeedbackTicketRead } from '../../../lib/feedback-comment-service';

const DEESCALATE_BTN =
  'action-button inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-slate-400 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60';

export function FeedbackDetailViewModal({
  item,
  submittedAtLabel,
  labelText,
  LabelIcon,
  labelTone,
  onClose,
  onDelete,
  showDelete = true,
  submitterRole = null,
  canEditStatus = false,
  canEditPriority = false,
  statusSaving = false,
  prioritySaving = false,
  onStatusSelect,
  onPrioritySelect,
  canReceive = false,
  receiveLabel = 'Receive',
  onReceive,
  showForward = false,
  forwardDisabled = false,
  forwardLabel = 'Forward',
  forwardDisabledTitle,
  onForward,
  showDeescalate = false,
  deescalateLabel = 'De-escalate to Frontdesk',
  onDeescalate,
  actionBusy = false,
  actionError = '',
  currentAccountId = null,
}: {
  item: FeedbackDisplay;
  submittedAtLabel: string;
  labelText: string;
  LabelIcon: LucideIcon;
  labelTone: string;
  onClose: () => void;
  onDelete: (item: FeedbackDisplay) => void;
  showDelete?: boolean;
  submitterRole?: UserRole | null;
  canEditStatus?: boolean;
  canEditPriority?: boolean;
  statusSaving?: boolean;
  prioritySaving?: boolean;
  onStatusSelect?: (status: FeedbackStatus) => void;
  onPrioritySelect?: (priority: FeedbackPriority) => void;
  canReceive?: boolean;
  receiveLabel?: string;
  onReceive?: () => void;
  showForward?: boolean;
  forwardDisabled?: boolean;
  forwardLabel?: string;
  forwardDisabledTitle?: string;
  onForward?: () => void;
  showDeescalate?: boolean;
  deescalateLabel?: string;
  onDeescalate?: () => void;
  actionBusy?: boolean;
  actionError?: string;
  currentAccountId?: string | null;
}) {
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
    void markFeedbackTicketRead(item.id);
  }, [item.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const copyTicketId = async () => {
    try {
      await navigator.clipboard.writeText(feedbackPublicTicketId(item));
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
        className={FEEDBACK_DETAIL_MODAL_PANEL}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#D4CDB5]/50 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8F3E8] ${labelTone}`}>
              <LabelIcon size={16} />
            </div>
            <div className="min-w-0">
              <h2
                id="feedback-detail-title"
                className="leading-none text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.05em' }}
              >
                Feedback details
              </h2>
              <p className="mt-1 text-[11px] text-[#8A7E6E]">{submittedAtLabel}</p>
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
          <FeedbackDetailMetaGrid
            labelText={labelText}
            LabelIcon={LabelIcon}
            labelTone={labelTone}
            status={item.status}
            priority={item.priority}
            canEditStatus={canEditStatus}
            canEditPriority={canEditPriority}
            statusSaving={statusSaving}
            prioritySaving={prioritySaving}
            fieldsDisabled={actionBusy}
            onStatusSelect={onStatusSelect}
            onPrioritySelect={onPrioritySelect}
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Title</span>
            <div className={FEEDBACK_DETAIL_FIELD_INP}>{item.title}</div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Description</span>
            <div className={`${FEEDBACK_DETAIL_FIELD_INP} min-h-[140px] whitespace-pre-wrap`}>{item.description}</div>
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
              <div className={`${FEEDBACK_DETAIL_FIELD_INP} text-[#8A7E6E]`}>No file attached</div>
            )}
          </div>

          <FeedbackCommentThread ticketId={item.id} currentAccountId={currentAccountId} />

          <div className="rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Ticket ID</p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all text-sm font-semibold text-[#1E2A35]">{feedbackPublicTicketId(item)}</code>
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

          {actionError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
          ) : null}

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              {canReceive && onReceive ? (
                <button type="button" disabled={actionBusy} onClick={onReceive} className={FEEDBACK_BTN_RECEIVE}>
                  {actionBusy ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                  {receiveLabel}
                </button>
              ) : null}
              {showForward && onForward ? (
                <button
                  type="button"
                  disabled={actionBusy || forwardDisabled}
                  title={forwardDisabled ? forwardDisabledTitle : undefined}
                  onClick={onForward}
                  className={FEEDBACK_BTN_FORWARD}
                >
                  {actionBusy ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                  {forwardLabel}
                </button>
              ) : null}
              {showDeescalate && onDeescalate ? (
                <button type="button" disabled={actionBusy} onClick={onDeescalate} className={DEESCALATE_BTN}>
                  {actionBusy ? <Loader2 size={14} className="animate-spin" /> : <ArrowDownLeft size={14} />}
                  {deescalateLabel}
                </button>
              ) : null}
            </div>

            {showDelete ? (
              <>
                <button
                  type="button"
                  disabled={!canDeleteOwnFeedback(item, submitterRole)}
                  title={canDeleteOwnFeedback(item, submitterRole) ? 'Delete ticket' : 'Delete unavailable'}
                  onClick={() => onDelete(item)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:border-[#D4CDB5]/70 disabled:bg-[#F8F3E8] disabled:text-[#C4B8A0] disabled:hover:bg-[#F8F3E8]"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                {!canDeleteOwnFeedback(item, submitterRole) ? (
                  <p className="text-center text-xs leading-relaxed text-[#8A7E6E]">
                    {feedbackDeleteBlockedMessage(submitterRole)}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
