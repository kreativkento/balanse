import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { formatClassBooking } from '../../../lib/class-service';
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

type FormStep = 'details' | 'confirm';

const requiredMark = <span className="text-red-400"> *</span>;

export type StaffCancellationRequestContext = {
  classId: string;
  className: string;
  startsAt: string;
  enrolledCount: number;
  /** `classes.status_class` — open vs closed for enrollment (same as side panel). */
  statusClass?: boolean;
};

function classBookingBadgeClass(open: boolean): string {
  return open
    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 ring-1 ring-emerald-300/40'
    : 'bg-[#1E2A35]/8 text-[#1E2A35] border-[#1E2A35]/15 ring-1 ring-[#1E2A35]/10';
}

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
  const [step, setStep] = useState<FormStep>('details');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const alreadyPending = Boolean(pendingRequestId) && pendingStatus === 'pending';
  const trimmedReason = reason.trim();
  const trimmedNote = note.trim();
  const canContinue = trimmedReason.length >= 3;

  useEffect(() => {
    if (!open || !context) return;
    setStep('details');
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
  const bookingLabel =
    typeof context.statusClass === 'boolean' ? formatClassBooking(context.statusClass) : null;

  const handleClose = () => {
    onClose();
  };

  const handleContinueToConfirm = () => {
    if (!canContinue || alreadyPending || success) return;
    setError('');
    setStep('confirm');
  };

  const handleSubmit = () => {
    if (submitting || alreadyPending || success || !canContinue) return;
    setSubmitting(true);
    setError('');
    void submitCancellationRequest({
      targetClassId: context.classId,
      reason: trimmedReason,
      note: trimmedNote,
    }).then(({ error: submitError }) => {
      setSubmitting(false);
      if (submitError) {
        setError(submitError);
        toastOperationFailed(submitError);
        return;
      }
      toastCreated('Schedule cancellation request');
      setSuccess(true);
      onSubmitted?.();
      setTimeout(handleClose, 1400);
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

  const formLocked = alreadyPending || success;

  return (
    <div
      className="fixed inset-0 z-[125] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) handleClose();
      }}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-cancel-request-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#D4CDB5]/50 px-6 sm:px-8 pt-6 pb-4 shrink-0">
          <div className="min-w-0">
            <p className="text-[#9A8E7E] text-[10px] uppercase tracking-widest">
              Schedule cancellation
            </p>
            <h2
              id="staff-cancel-request-title"
              className="text-[#1E2A35] leading-none mt-1 truncate"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.45rem', letterSpacing: '0.05em' }}
            >
              {context.className}
            </h2>
            <p className="text-[#8A7E6E] text-xs mt-1.5 leading-relaxed">
              {when.date} · {when.time}
              <span className="text-[#B0A898]"> · </span>
              <span className="text-[#5A5048] font-medium">
                {context.enrolledCount} enrolled
              </span>
              {bookingLabel ? (
                <>
                  <span className="text-[#B0A898]"> · </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-px text-[10px] font-bold align-middle ${classBookingBadgeClass(context.statusClass!)}`}
                  >
                    {bookingLabel}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#8A7E6E] transition-all hover:bg-[#EDE8D8] disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <CheckCircle size={40} className="text-green-500" />
            <p className="text-[#1E2A35] font-semibold">Request submitted</p>
            <p className="text-[#8A7E6E] text-sm max-w-xs">
              An admin will review your cancellation request. The class stays on the schedule until
              approved.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 px-6 sm:px-8 py-4 max-h-[min(70vh,560px)] overflow-y-auto">
              {alreadyPending && (
                <div className="sm:col-span-2 flex items-start gap-2 rounded-2xl border border-[#c49a3c]/45 bg-[#F8F0DC] px-3 py-2.5">
                  <CheckCircle size={14} className="text-[#a67f2e] shrink-0 mt-0.5" />
                  <p className="text-[#6B5420] text-xs leading-relaxed">
                    You already requested cancellation for this class. Waiting for admin approval.
                  </p>
                </div>
              )}

              {step === 'confirm' ? (
                <>
                  <div className="sm:col-span-2 rounded-2xl border border-red-200/80 bg-red-50/70 px-3 py-2.5">
                    <p className="text-[#1E2A35] text-sm font-semibold leading-snug">
                      Submit this schedule cancellation request?
                    </p>
                    <p className="text-[#5A5048] text-xs leading-relaxed mt-1">
                      Admin must approve before the class is removed. Enrolled members are notified
                      after approval.
                    </p>
                  </div>
                  <div className="sm:col-span-2 rounded-2xl border border-[#D4CDB5]/60 bg-[#FBF9F3]/80 px-3 py-2.5 flex flex-col gap-2">
                    <div>
                      <p className="text-[#8A7E6E] text-[10px] uppercase tracking-widest">
                        Cancellation reason
                      </p>
                      <p className="text-[#1E2A35] text-sm font-medium mt-1 whitespace-pre-wrap">
                        {trimmedReason}
                      </p>
                    </div>
                    {trimmedNote ? (
                      <div>
                        <p className="text-[#8A7E6E] text-[10px] uppercase tracking-widest">
                          Note to admin
                        </p>
                        <p className="text-[#5A5048] text-sm mt-1 whitespace-pre-wrap leading-relaxed">
                          {trimmedNote}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <p className="sm:col-span-2 text-[#9A8E7E] text-xs leading-relaxed">
                    Tell admin why you need to cancel this assignment. Your request stays pending
                    until reviewed.
                  </p>

                  <div className="min-w-0 sm:col-span-2">
                    <label
                      htmlFor="cancel-reason"
                      className="mb-1 block text-[#8A7E6E] text-[10px] uppercase tracking-widest"
                    >
                      Cancellation reason{requiredMark}
                    </label>
                    <input
                      id="cancel-reason"
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Medical leave, schedule conflict"
                      maxLength={200}
                      disabled={formLocked}
                      autoFocus
                    />
                    <p className="text-[#B0A898] text-[11px] mt-1 leading-relaxed">
                      At least 3 characters.
                    </p>
                  </div>

                  <div className="min-w-0 sm:col-span-2 flex flex-col">
                    <label
                      htmlFor="cancel-note"
                      className="mb-1 block text-[#8A7E6E] text-[10px] uppercase tracking-widest"
                    >
                      Note to admin{' '}
                      <span className="normal-case tracking-normal text-[#B0A898]">(optional)</span>
                    </label>
                    <textarea
                      id="cancel-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      className={`${inputClass} min-h-[5.25rem] resize-none`}
                      placeholder="Anything ops should know…"
                      maxLength={500}
                      disabled={formLocked}
                    />
                  </div>
                </>
              )}

              {error ? (
                <div className="sm:col-span-2 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-600 text-xs">{error}</p>
                </div>
              ) : null}
            </div>

            {alreadyPending ? (
              <div className="border-t border-[#D4CDB5]/50 px-6 sm:px-8 py-4 shrink-0">
                <PendingPortalRequestWithdrawActions
                  variant="panel"
                  closeLabel="Close"
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
              </div>
            ) : step === 'confirm' ? (
              <div className="grid grid-cols-2 gap-3 border-t border-[#D4CDB5]/50 px-6 sm:px-8 py-4 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep('details');
                  }}
                  disabled={submitting}
                  className="rounded-full border border-[#D4CDB5]/70 py-2.5 text-sm font-medium text-[#8A7E6E] transition-all hover:bg-[#EDE8D8] disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="action-button flex items-center justify-center gap-1.5 rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-600 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Submitting…
                    </>
                  ) : (
                    'Submit request'
                  )}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 border-t border-[#D4CDB5]/50 px-6 sm:px-8 py-4 shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full border border-[#D4CDB5]/70 py-2.5 text-sm font-medium text-[#8A7E6E] transition-all hover:bg-[#EDE8D8]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleContinueToConfirm}
                  disabled={!canContinue || formLocked}
                  className="action-button flex items-center justify-center gap-1.5 rounded-full bg-[#1E2A35] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#263545] disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
