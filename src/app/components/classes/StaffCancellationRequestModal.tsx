import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { PendingPortalRequestWithdrawActions } from '../portal/PendingPortalRequestWithdrawActions';
import {
  toastCreated,
  toastDeleted,
  toastOperationFailed,
} from '../../../lib/operation-toast';
import {
  submitCancellationRequest,
  withdrawPortalRequest,
  type PortalRequestStatus,
} from '../../../lib/portal-request-service';

const PH_TZ = 'Asia/Manila';

export type StaffCancellationRequestContext = {
  classId: string;
  className: string;
  startsAt: string;
  enrolledCount: number;
};

function formatSessionWhen(startsAt: string): { date: string; time: string } {
  const startDate = new Date(startsAt);
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(startDate);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(startDate);
  return { date, time };
}

type StaffCancellationRequestModalProps = {
  open: boolean;
  context: StaffCancellationRequestContext | null;
  pendingRequestId?: string | null;
  pendingStatus?: PortalRequestStatus | null;
  onClose: () => void;
  onSubmitted?: () => void;
  onWithdrawn?: () => void;
};

export function StaffCancellationRequestModal({
  open,
  context,
  pendingRequestId = null,
  pendingStatus = null,
  onClose,
  onSubmitted,
  onWithdrawn,
}: StaffCancellationRequestModalProps) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const alreadyPending = Boolean(pendingRequestId) && pendingStatus === 'pending';

  useEffect(() => {
    if (!open || !context) return;
    setReason('');
    setNote('');
    setError('');
    setSuccess(false);
    setSubmitting(false);
    setConfirmWithdraw(false);
    setWithdrawing(false);
    setWithdrawError(null);
  }, [open, context?.classId]);

  if (!open || !context) return null;

  const when = formatSessionWhen(context.startsAt);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    if (submitting || alreadyPending || success) return;
    setSubmitting(true);
    setError('');
    void submitCancellationRequest({
      targetClassId: context.classId,
      reason,
      note,
    }).then(({ error: submitError }) => {
      setSubmitting(false);
      if (submitError) {
        setError(submitError);
        toastOperationFailed(submitError);
        return;
      }
      toastCreated('Cancellation request');
      setSuccess(true);
      onSubmitted?.();
      setTimeout(handleClose, 1200);
    });
  };

  const handleWithdraw = () => {
    if (!pendingRequestId || withdrawing) return;
    setWithdrawing(true);
    setWithdrawError(null);
    void withdrawPortalRequest(pendingRequestId).then(({ error: withdrawErr }) => {
      setWithdrawing(false);
      if (withdrawErr) {
        setWithdrawError(withdrawErr);
        toastOperationFailed(withdrawErr);
        return;
      }
      toastDeleted('Cancellation request');
      setConfirmWithdraw(false);
      onWithdrawn?.();
      handleClose();
    });
  };

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 transition-all placeholder-[#C0B8A8]';

  return (
    <div
      className="fixed inset-0 z-[125] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-2xl max-h-[min(92vh,36rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-cancel-request-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#D4CDB5]/50 px-6 pt-6 pb-4 shrink-0">
          <div className="min-w-0">
            <p className="text-[#8A7E6E] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
              Request cancellation
            </p>
            <h2
              id="staff-cancel-request-title"
              className="text-[#1E2A35] leading-tight truncate"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.45rem', letterSpacing: '0.05em' }}
            >
              {context.className}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          <div className="rounded-2xl border border-[#D4CDB5]/55 bg-[#F8F3E8]/60 px-4 py-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#9A8E7E]">Date</p>
              <p className="text-[#1E2A35] font-semibold mt-0.5">{when.date}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#9A8E7E]">Time</p>
              <p className="text-[#1E2A35] font-semibold mt-0.5">{when.time}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#9A8E7E]">Enrolled</p>
              <p className="text-[#1E2A35] font-semibold mt-0.5">{context.enrolledCount} students</p>
            </div>
          </div>

          {alreadyPending ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs leading-relaxed">
                You already have a pending cancellation request for this class. Admin will review it, or you can
                withdraw the request below.
              </p>
            </div>
          ) : success ? (
            <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-800 text-sm">
              <CheckCircle size={18} className="shrink-0" />
              Cancellation request submitted.
            </div>
          ) : (
            <>
              <p className="text-[#5A5048] text-xs leading-relaxed">
                Submit a request for admin to cancel this session. Enrolled members will be notified after approval.
              </p>
              <div>
                <label htmlFor="cancel-reason" className="text-[#8A7E6E] text-xs font-bold uppercase tracking-widest">
                  Reason (optional)
                </label>
                <input
                  id="cancel-reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={`${inputClass} mt-1.5`}
                  placeholder="e.g. Coach unavailable"
                  maxLength={200}
                />
              </div>
              <div>
                <label htmlFor="cancel-note" className="text-[#8A7E6E] text-xs font-bold uppercase tracking-widest">
                  Note to admin (optional)
                </label>
                <textarea
                  id="cancel-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={`${inputClass} mt-1.5 resize-none`}
                  placeholder="Any details for the admin team…"
                  maxLength={500}
                />
              </div>
              {error ? (
                <p className="text-red-600 text-xs rounded-xl border border-red-200 bg-red-50 px-3 py-2">{error}</p>
              ) : null}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-[#D4CDB5]/50 px-6 py-4">
          {alreadyPending ? (
            <PendingPortalRequestWithdrawActions
              confirmingWithdraw={confirmWithdraw}
              withdrawing={withdrawing}
              withdrawError={withdrawError}
              onClose={handleClose}
              onStartWithdraw={() => {
                setWithdrawError(null);
                setConfirmWithdraw(true);
              }}
              onConfirmWithdraw={handleWithdraw}
              onKeepRequest={() => {
                setConfirmWithdraw(false);
                setWithdrawError(null);
              }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || success}
                className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Submitting…
                  </span>
                ) : (
                  'Submit request'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
