import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Check, X, Search, Receipt,
  AlertCircle, FileCheck,
  RefreshCcw,
  ChevronRight, Plus, Lock, Timer, Wallet,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminUrlSearchFilter } from '../hooks/useAdminUrlSearchFilter';
import { ProfileAvatar } from '../components/ProfileImages';
import { toast } from 'sonner';
import {
  adminForceLockEscrowPayment,
  adminMarkCashRefundDisbursed,
  adminRefundClassPaymentEscrow,
  adminReviewClassPayment,
  fetchClassPaymentsForAdmin,
  getPaymentProofSignedUrl,
  resolvePaymentProofDisplayName,
  type ClassPaymentDisplay,
  type PaymentEscrowState,
} from '../../lib/class-payment-service';
import { fetchSubscriptionPackagePaymentsForAdmin } from '../../lib/subscription-package-payment-service';
import { fetchClientDirectory, type ClientDirectoryItem } from '../../lib/admin-service';
import { fetchClassesForAdmin, type ClassDisplay } from '../../lib/class-service';
import {
  fetchPaymentChannelsForAdmin,
  type PaymentChannelRecord,
} from '../../lib/payment-channel-service';
import { AdminManualPaymentModal } from '../components/payments/AdminManualPaymentModal';
import { ClassPaymentReceiptPrintModal } from '../components/payments/ClassPaymentReceiptPrintModal';
import { PaymentStudentContactPanel } from '../components/payments/PaymentStudentContactPanel';
import { AdminCreditPackPaymentsSection } from '../components/payments/AdminCreditPackPaymentsSection';

// ── Types ──────────────────────────────────────────────────────

type PaymentStatus = 'pending' | 'approved' | 'rejected';

interface Payment {
  id: string;
  paymentUid: string;
  accountId: string;
  student: string;
  studentPhotoUrl: string;
  email: string;
  class: string;
  date: string;
  time: string;
  coach: string;
  amount: number;
  method: string;
  ref: string;
  proof: string | null;
  proofOriginalFilename: string;
  proofStoragePath?: string;
  submittedAt: string;
  status: PaymentStatus;
  escrowState: PaymentEscrowState | null;
  refundableUntil: string | null;
  finalTransactionId: string | null;
  finalizedAt: string | null;
  cashRefundDisbursedAt: string | null;
  classStartsAt: string | null;
  emailSent: boolean;
  receiptPrinted: boolean;
  receiptIssuedAt?: string;
  notes?: string;
}

const PH_TZ = 'Asia/Manila';

function formatPaymentSchedule(
  startsAt: string | null,
  endsAt: string | null,
): { date: string; time: string } {
  if (!startsAt) return { date: '—', time: '—' };
  const start = new Date(startsAt);
  const date = new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(start);
  const timeStart = new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);
  if (!endsAt) return { date, time: timeStart };
  const timeEnd = new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(endsAt));
  return { date, time: `${timeStart} – ${timeEnd}` };
}

function formatSubmittedAt(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return 'Just now';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)} hrs ago`;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

function classPaymentToPayment(row: ClassPaymentDisplay): Payment {
  const { date, time } = formatPaymentSchedule(row.classStartsAt, row.classEndsAt);
  const method = row.paymentMethodLabel.trim() || '—';
  const storedOriginal = row.proofOriginalFilename?.trim() ?? '';
  const fileName = storedOriginal || row.proofStoragePath?.split('/').pop() || null;
  let receiptIssuedAt: string | undefined;
  if (row.receiptIssuedAt) {
    receiptIssuedAt = new Intl.DateTimeFormat('en-PH', {
      timeZone: PH_TZ,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(row.receiptIssuedAt));
  }
  return {
    id: row.id,
    paymentUid: row.uid,
    accountId: row.accountId,
    student: row.buyerName,
    studentPhotoUrl: row.studentPhotoUrl,
    email: row.buyerEmail,
    class: row.className,
    date,
    time,
    coach: row.coachNames,
    amount: row.amountPaid,
    method,
    ref: row.paymentReference.trim() || row.uid,
    proof: fileName,
    proofOriginalFilename: row.proofOriginalFilename?.trim() ?? '',
    proofStoragePath: row.proofStoragePath,
    submittedAt: formatSubmittedAt(row.createdAt),
    status: row.status,
    escrowState: row.escrowState,
    refundableUntil: row.refundableUntil,
    finalTransactionId: row.finalTransactionId,
    finalizedAt: row.finalizedAt,
    cashRefundDisbursedAt: row.cashRefundDisbursedAt,
    classStartsAt: row.classStartsAt,
    emailSent: row.emailReceiptSent,
    receiptPrinted: row.receiptPrinted,
    receiptIssuedAt,
    notes: row.reviewNote?.trim() || undefined,
  };
}

// ── Helpers ──────────────────────────────────────────────────

function studentInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

function PaymentStudentAvatar({
  payment,
  size = 'md',
}: {
  payment: Payment;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 rounded-xl' : 'w-9 h-9 rounded-xl';
  return (
    <ProfileAvatar
      src={payment.studentPhotoUrl || undefined}
      initials={studentInitials(payment.student)}
      alt={payment.student}
      className={`${sizeClass} shrink-0 bg-[#c49a3c]/12 border border-[#c49a3c]/25`}
      initialsClassName="text-[#a67f2e] text-xs font-bold"
    />
  );
}

// ── Pending Payment Modal (row-click) ──────────────────────

function PendingPaymentModal({ payment, onClose, onApprove, onReject }: {
  payment: Payment; onClose: () => void;
  onApprove: (id: string) => void | Promise<void>;
  onReject: (id: string, reviewNote?: string) => void | Promise<void>;
}) {
  const [confirmReject, setConfirmReject] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofDisplayName, setProofDisplayName] = useState('Payment proof');
  const [reviewBusy, setReviewBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const path = payment.proofStoragePath;
    if (!path) {
      setProofUrl(null);
      setProofDisplayName('Payment proof');
      return;
    }
    void (async () => {
      const [url, label] = await Promise.all([
        getPaymentProofSignedUrl(path),
        resolvePaymentProofDisplayName({
          storagePath: path,
          originalFilename: payment.proofOriginalFilename,
        }),
      ]);
      if (!cancelled) {
        setProofUrl(url);
        setProofDisplayName(label);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payment.proofOriginalFilename, payment.proofStoragePath]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg my-4">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Pending Payment</p>
            <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
              {payment.paymentUid}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
              Pending Review
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full border bg-[#F8F3E8] text-[#1E2A35] border-[#D4CDB5]/70">
              {payment.method}
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
          </div>
        </div>

        <div className="px-7 py-6 flex flex-col gap-5">
          {/* Student + Class */}
          <div className="grid grid-cols-2 gap-4">
            <PaymentStudentContactPanel payment={payment} />
            <div className="bg-[#F8F3E8] rounded-2xl p-4 border border-[#D4CDB5]/40">
              <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">Class</p>
              <p className="text-[#1E2A35] text-sm font-semibold">{payment.class}</p>
              <p className="text-[#9A8E7E] text-xs mt-0.5">{payment.date} · {payment.time}</p>
              <p className="text-[#9A8E7E] text-xs">Coach: {payment.coach}</p>
            </div>
          </div>

          {/* Payment info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Amount', value: `₱${payment.amount.toLocaleString()}`, bold: true },
              { label: 'Method', value: payment.method },
              { label: 'Reference', value: payment.ref },
              { label: 'Submitted', value: payment.submittedAt },
            ].map(item => (
              <div key={item.label} className="bg-white border border-[#D4CDB5]/50 rounded-xl p-3">
                <p className="text-[#9A8E7E] text-xs mb-1">{item.label}</p>
                <p className={`text-[#1E2A35] text-sm ${item.bold ? 'font-bold' : 'font-medium'} truncate`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Proof preview */}
          {(payment.proof ?? payment.proofStoragePath) && (
            <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 p-4">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Payment Proof</p>
              <div className="flex items-center gap-3 bg-white rounded-xl border border-[#D4CDB5]/50 p-3">
                <div className="w-10 h-10 bg-[#EDE8D8] rounded-lg flex items-center justify-center shrink-0">
                  <FileCheck size={18} className="text-[#8A7E6E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#1E2A35] text-sm font-semibold truncate">{proofDisplayName}</p>
                  <p className="text-[#9A8E7E] text-xs">Uploaded · {payment.submittedAt}</p>
                </div>
                <button
                  type="button"
                  disabled={!proofUrl}
                  onClick={() => {
                    if (proofUrl) window.open(proofUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#1E2A35] text-white text-xs rounded-xl hover:bg-[#263545] transition-all disabled:opacity-50"
                >
                  <Eye size={11} /> View
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {confirmReject ? (
          <div className="px-7 pb-7">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-sm font-semibold">Reject this payment?</p>
                  <p className="text-red-500 text-xs mt-0.5">This will mark the payment as rejected and email the student. They may resubmit with corrected information.</p>
                </div>
              </div>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E] mb-1.5 block">
                  Message to student (optional)
                </span>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Proof amount does not match — please resubmit."
                  className="w-full rounded-xl border border-red-200/80 bg-white px-3 py-2 text-sm text-[#1E2A35] placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-red-200 resize-none"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReject(false)}
                  className="flex-1 py-2.5 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={async () => {
                    setReviewBusy(true);
                    try {
                      await onReject(payment.id, rejectNote.trim());
                      onClose();
                    } finally {
                      setReviewBusy(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-60"
                >
                  Yes, Reject
                </button>
              </div>
            </div>
          </div>
        ) : confirmApprove ? (
          <div className="px-7 pb-7">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-800 text-sm font-semibold">Approve this payment?</p>
                  <p className="text-green-700 text-xs mt-0.5 leading-relaxed">
                    This action is <span className="font-semibold">irreversible</span>. The student will be enrolled in{' '}
                    <span className="font-semibold">{payment.class}</span>, a confirmation email and official e-receipt will be sent
                    to <span className="font-semibold">{payment.email}</span>, and you can print a copy next.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={() => setConfirmApprove(false)}
                  className="flex-1 py-2.5 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={async () => {
                    setReviewBusy(true);
                    try {
                      await onApprove(payment.id);
                      onClose();
                    } finally {
                      setReviewBusy(false);
                    }
                  }}
                  className="action-button flex-1 py-2.5 rounded-full bg-green-600 text-white text-sm font-bold hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Check size={14} /> {reviewBusy ? 'Approving…' : 'Yes, Approve'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-7 pb-7 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirmApprove(false);
                setConfirmReject(true);
              }}
              className="flex-1 py-3 rounded-full bg-red-50 text-red-600 border border-red-200 text-sm font-bold hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <X size={14} /> Reject
            </button>
            <button
              type="button"
              disabled={reviewBusy}
              onClick={() => {
                setConfirmReject(false);
                setConfirmApprove(true);
              }}
              className="action-button flex-1 py-3 rounded-full bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              <Check size={14} /> Approve Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── History Payment Modal (row-click) ─────────────────────

function peso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString()}`;
}

function manilaMonthBounds(now = new Date()): { start: number; end: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const start = Date.UTC(year, month - 1, 1, -8, 0, 0);
  const end = Date.UTC(year, month, 1, -8, 0, 0);
  return { start, end };
}

function inManilaThisMonth(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return false;
  const { start, end } = manilaMonthBounds();
  return time >= start && time < end;
}

function lockTimerLabel(refundableUntil: string | null): string {
  if (!refundableUntil) return 'Lock time unavailable';
  const ms = new Date(refundableUntil).getTime() - Date.now();
  if (!Number.isFinite(ms)) return 'Lock time unavailable';
  if (ms <= 0) return 'Lock due';
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `Locks in ${Math.max(1, Math.ceil(ms / 60_000))}m`;
  if (hours < 48) return `Locks in ${hours}h`;
  return `Locks in ${Math.floor(hours / 24)}d`;
}

function isHeld(payment: Payment): boolean {
  return payment.escrowState === 'in_escrow' && payment.status === 'approved';
}

function isCleared(payment: Payment): boolean {
  return payment.escrowState === 'finalized' || Boolean(payment.finalTransactionId);
}

function isVoided(payment: Payment): boolean {
  return payment.escrowState === 'refunded'
    || payment.escrowState === 'rejected'
    || payment.status === 'rejected';
}

function escrowBadgeLabel(payment: Payment): string | null {
  if (payment.status !== 'approved') return null;
  if (payment.escrowState === 'refunded') {
    return payment.cashRefundDisbursedAt ? 'Cash sent' : 'Awaiting disbursement';
  }
  if (payment.escrowState === 'finalized' || payment.finalTransactionId) return 'Cleared';
  if (payment.escrowState === 'in_escrow') return 'Held';
  return null;
}

type EscrowConfirmKind = 'refund' | 'lock';

function EscrowActionConfirmModal({
  kind,
  paymentUid,
  busy,
  onCancel,
  onConfirm,
}: {
  kind: EscrowConfirmKind;
  paymentUid: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isRefund = kind === 'refund';
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md overflow-hidden"
        role="dialog"
        aria-labelledby="escrow-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-[#D4CDB5]/50">
          <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Irreversible action</p>
          <h3
            id="escrow-confirm-title"
            className="text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.05em' }}
          >
            {isRefund ? 'Manual refund' : 'Issue OR'}
          </h3>
          <p className="text-[#5A5048] text-sm mt-2 leading-relaxed">
            Payment <span className="font-mono text-xs">{paymentUid}</span>
          </p>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <p className="text-amber-950 text-sm leading-relaxed">
              This cannot be undone. Confirm only if you intend to proceed.
            </p>
          </div>
          {isRefund ? (
            <ul className="text-[#5A5048] text-sm leading-relaxed list-disc pl-5 space-y-1">
              <li>Escrow will be released and the payment marked refunded.</li>
              <li>The member may be unenrolled from the class if still enrolled.</li>
              <li>Cash refund will wait for manual disbursement tracking.</li>
            </ul>
          ) : (
            <ul className="text-[#5A5048] text-sm leading-relaxed list-disc pl-5 space-y-1">
              <li>The held payment will be locked and finalized early.</li>
              <li>An official receipt (OR) will be issued.</li>
              <li>The member refund / cancellation window for this payment will close.</li>
            </ul>
          )}
        </div>
        <div className="px-6 pb-6 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-full text-white text-sm font-bold transition-colors disabled:opacity-50 ${
              isRefund ? 'bg-amber-700 hover:bg-amber-800' : 'bg-[#1E2A35] hover:bg-[#263545]'
            }`}
          >
            {busy ? 'Processing…' : isRefund ? 'Confirm manual refund' : 'Confirm issue OR'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryPaymentModal({
  payment,
  onClose,
  onOpenReceipt,
  canRefundEscrow,
  onRequestRefundEscrow,
  refundBusy,
}: {
  payment: Payment;
  onClose: () => void;
  onOpenReceipt: () => void;
  canRefundEscrow: boolean;
  onRequestRefundEscrow: () => void;
  refundBusy: boolean;
}) {
  const escrowLabel = escrowBadgeLabel(payment);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg my-4">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Payment Record</p>
            <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
              {payment.paymentUid}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                payment.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
              }`}>{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
              {escrowLabel ? (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8A7E6E]">{escrowLabel}</span>
              ) : null}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
          </div>
        </div>

        <div className="px-7 py-6 flex flex-col gap-5">
          {/* Student + Class */}
          <div className="grid grid-cols-2 gap-4">
            <PaymentStudentContactPanel payment={payment} />
            <div className="bg-[#F8F3E8] rounded-2xl p-4 border border-[#D4CDB5]/40">
              <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">Class</p>
              <p className="text-[#1E2A35] text-sm font-semibold">{payment.class}</p>
              <p className="text-[#9A8E7E] text-xs mt-0.5">{payment.date} · {payment.time}</p>
              <p className="text-[#9A8E7E] text-xs">Coach: {payment.coach}</p>
            </div>
          </div>

          {/* Payment info */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Amount',       value: `₱${payment.amount.toLocaleString()}`, bold: true },
              { label: 'Method',       value: payment.method },
              { label: 'Reference',    value: payment.ref },
              { label: 'Submitted',    value: payment.submittedAt },
              { label: 'Receipt Sent', value: payment.emailSent ? '✓ Email sent' : '—' },
              { label: 'Issued At',    value: payment.receiptIssuedAt ?? '—' },
            ].map(item => (
              <div key={item.label} className="bg-white border border-[#D4CDB5]/50 rounded-xl p-3">
                <p className="text-[#9A8E7E] text-xs mb-1">{item.label}</p>
                <p className={`text-[#1E2A35] text-sm ${item.bold ? 'font-bold' : 'font-medium'} truncate`}>{item.value}</p>
              </div>
            ))}
          </div>

          {payment.notes && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{payment.notes}</p>
            </div>
          )}
        </div>

        {payment.status === 'approved' && (
          <div className="px-7 pb-7 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOpenReceipt}
                disabled={!payment.finalTransactionId && payment.escrowState !== 'finalized'}
                title={
                  payment.finalTransactionId || payment.escrowState === 'finalized'
                    ? undefined
                    : 'Receipt is available after escrow finalizes (refund window).'
                }
                className="action-button flex-1 py-2.5 rounded-full bg-[#1E2A35] text-white text-sm font-semibold hover:bg-[#263545] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Receipt size={13} /> View / Print Receipt
              </button>
            </div>
            {canRefundEscrow && payment.escrowState === 'in_escrow' ? (
              <button
                type="button"
                disabled={refundBusy}
                onClick={onRequestRefundEscrow}
                className="w-full py-2.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900 text-sm font-semibold hover:bg-amber-100 transition-all disabled:opacity-60"
              >
                {refundBusy ? 'Processing refund…' : 'Manual Refund'}
              </button>
            ) : null}
          </div>
        )}
        {payment.status !== 'approved' && (
          <div className="px-7 pb-7">
            <button onClick={onClose}
              className="w-full py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

type LedgerTab = 'all' | 'held' | 'cleared' | 'voided';

export default function AdminPaymentsPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [payments, setPayments]           = useState<Payment[]>([]);
  const [packPayments, setPackPayments]   = useState<{ amountPaid: number; status: string; createdAt: string }[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentDomain, setPaymentDomain] = useState<'class' | 'credits'>('class');
  const [ledgerTab, setLedgerTab]         = useState<LedgerTab>('all');
  const [search, setSearch] = useAdminUrlSearchFilter();
  const [selectedPending, setSelectedPending] = useState<Payment | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<Payment | null>(null);
  const [printPayment, setPrintPayment]   = useState<Payment | null>(null);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [manualFormClients, setManualFormClients] = useState<ClientDirectoryItem[]>([]);
  const [manualFormClasses, setManualFormClasses] = useState<ClassDisplay[]>([]);
  const [manualFormChannels, setManualFormChannels] = useState<PaymentChannelRecord[]>([]);
  const [manualFormLoading, setManualFormLoading] = useState(false);
  const [refundBusyId, setRefundBusyId] = useState<string | null>(null);
  const [lockBusyId, setLockBusyId] = useState<string | null>(null);
  const [escrowConfirm, setEscrowConfirm] = useState<{
    kind: EscrowConfirmKind;
    paymentId: string;
    paymentUid: string;
  } | null>(null);

  const isStudioAdmin = adminUser?.role === 'admin' || adminUser?.role === 'dev';

  useEffect(() => { if (!adminUser) navigate('/admin-login'); }, [adminUser, navigate]);

  const openAddRecordModal = useCallback(() => {
    setShowAddRecord(true);
    setManualFormLoading(true);
    void (async () => {
      const [clients, { data: classes }, { data: channels }] = await Promise.all([
        fetchClientDirectory(),
        fetchClassesForAdmin(),
        fetchPaymentChannelsForAdmin(),
      ]);
      setManualFormClients(clients);
      setManualFormClasses(classes);
      setManualFormChannels(channels);
      setManualFormLoading(false);
    })();
  }, []);

  const reloadPayments = useCallback(async () => {
    const [classResult, packResult] = await Promise.all([
      fetchClassPaymentsForAdmin(),
      fetchSubscriptionPackagePaymentsForAdmin(),
    ]);
    if (classResult.error) {
      toast.error(classResult.error);
      return;
    }
    setPayments(classResult.data.map(classPaymentToPayment));
    if (!packResult.error) {
      setPackPayments(packResult.data.map((row) => ({
        amountPaid: row.amountPaid,
        status: row.status,
        createdAt: row.createdAt,
      })));
    }
  }, []);

  useEffect(() => {
    if (!adminUser) return;
    let cancelled = false;
    void (async () => {
      setPaymentsLoading(true);
      const [classResult, packResult] = await Promise.all([
        fetchClassPaymentsForAdmin(),
        fetchSubscriptionPackagePaymentsForAdmin(),
      ]);
      if (cancelled) return;
      if (classResult.error) toast.error(classResult.error);
      else setPayments(classResult.data.map(classPaymentToPayment));
      if (!packResult.error) {
        setPackPayments(packResult.data.map((row) => ({
          amountPaid: row.amountPaid,
          status: row.status,
          createdAt: row.createdAt,
        })));
      }
      setPaymentsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [adminUser]);

  if (!adminUser) return null;

  const filtered = (list: Payment[]) =>
    list.filter(p =>
      p.student.toLowerCase().includes(search.toLowerCase()) ||
      p.class.toLowerCase().includes(search.toLowerCase()) ||
      p.ref.toLowerCase().includes(search.toLowerCase())
    );

  const approvePayment = async (id: string) => {
    const result = await adminReviewClassPayment(id, true);
    if (!result.success) {
      toast.error(result.error ?? 'Could not approve payment.');
      return;
    }
    if (result.feedbackEmailSent && result.receiptEmailSent) {
      toast.success('Payment approved. Confirmation and e-receipt emailed to the student.');
    } else if (result.feedbackEmailSent) {
      toast.success('Payment approved. Student notified by email.');
      if (result.receiptEmailError) {
        toast.error(`E-receipt not sent: ${result.receiptEmailError}`);
      }
    } else if (result.receiptEmailSent) {
      toast.success('Payment approved. E-receipt sent to the student.');
      if (result.feedbackEmailError) {
        toast.error(`Confirmation email not sent: ${result.feedbackEmailError}`);
      }
    } else {
      toast.success('Payment approved. Student enrolled in class.');
      if (result.feedbackEmailError) {
        toast.error(`Confirmation email not sent: ${result.feedbackEmailError}`);
      }
      if (result.receiptEmailError) {
        toast.error(`E-receipt not sent: ${result.receiptEmailError}`);
      }
    }
    const { data, error } = await fetchClassPaymentsForAdmin();
    if (error) toast.error(error);
    else {
      const mapped = data.map(classPaymentToPayment);
      setPayments(mapped);
      let approved = mapped.find((p) => p.id === id);
      if (approved && result.receiptEmailSent) {
        approved = { ...approved, emailSent: true };
      }
      if (approved) setPrintPayment(approved);
    }
  };

  const rejectPayment = async (id: string, reviewNote = '') => {
    const result = await adminReviewClassPayment(id, false, reviewNote);
    if (!result.success) {
      toast.error(result.error ?? 'Could not reject payment.');
      return;
    }
    if (result.feedbackEmailSent) {
      toast.success('Payment rejected. The student was notified by email.');
    } else {
      toast.success('Payment rejected.');
      if (result.feedbackEmailError) {
        toast.error(`Email not sent: ${result.feedbackEmailError}`);
      }
    }
    await reloadPayments();
  };

  const markPrinted = (id: string) => {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, receiptPrinted: true } : p)));
    setPrintPayment(null);
  };

  const refundEscrowPayment = async (id: string) => {
    setRefundBusyId(id);
    const result = await adminRefundClassPaymentEscrow(id, 'Refunded by admin from Payments.');
    setRefundBusyId(null);
    if (!result.success) {
      toast.error(result.error ?? 'Could not refund escrow.');
      return;
    }
    toast.success('Escrow released. Cash refund is waiting for manual disbursement.');
    setSelectedHistory(null);
    await reloadPayments();
  };

  const forceLockPayment = async (id: string) => {
    setLockBusyId(id);
    const result = await adminForceLockEscrowPayment(id);
    setLockBusyId(null);
    if (!result.success) {
      toast.error(result.error ?? 'Could not lock this payment.');
      return;
    }
    if (result.error) toast.error(result.error);
    else toast.success('Payment locked. Official receipt issued.');
    setSelectedHistory(null);
    await reloadPayments();
  };

  const markCashSent = async (id: string) => {
    setRefundBusyId(id);
    const result = await adminMarkCashRefundDisbursed(id);
    setRefundBusyId(null);
    if (!result.success) {
      toast.error(result.error ?? 'Could not mark the cash refund as sent.');
      return;
    }
    toast.success('Marked as disbursed.');
    await reloadPayments();
  };

  const INP = 'w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]';

  const escrowConfirmBusy =
    escrowConfirm != null
      && (refundBusyId === escrowConfirm.paymentId || lockBusyId === escrowConfirm.paymentId);

  return (
    <>
      {escrowConfirm ? (
        <EscrowActionConfirmModal
          kind={escrowConfirm.kind}
          paymentUid={escrowConfirm.paymentUid}
          busy={escrowConfirmBusy}
          onCancel={() => {
            if (!escrowConfirmBusy) setEscrowConfirm(null);
          }}
          onConfirm={() => {
            const { kind, paymentId } = escrowConfirm;
            if (kind === 'refund') void refundEscrowPayment(paymentId);
            else void forceLockPayment(paymentId);
            setEscrowConfirm(null);
          }}
        />
      ) : null}
      {selectedPending && (
        <PendingPaymentModal
          payment={selectedPending}
          onClose={() => setSelectedPending(null)}
          onApprove={async (id) => {
            await approvePayment(id);
            setSelectedPending(null);
          }}
          onReject={async (id, reviewNote) => {
            await rejectPayment(id, reviewNote);
            setSelectedPending(null);
          }}
        />
      )}
      {selectedHistory && (
        <HistoryPaymentModal
          payment={selectedHistory}
          onClose={() => setSelectedHistory(null)}
          onOpenReceipt={() => {
            if (selectedHistory) {
              setPrintPayment(selectedHistory);
              setSelectedHistory(null);
            }
          }}
          canRefundEscrow={isStudioAdmin}
          refundBusy={refundBusyId === selectedHistory.id}
          onRequestRefundEscrow={() =>
            setEscrowConfirm({
              kind: 'refund',
              paymentId: selectedHistory.id,
              paymentUid: selectedHistory.paymentUid,
            })
          }
        />
      )}
      {printPayment && (
        <ClassPaymentReceiptPrintModal
          paymentId={printPayment.id}
          paymentUid={printPayment.paymentUid}
          studentEmail={printPayment.email}
          emailSent={printPayment.emailSent}
          onClose={() => setPrintPayment(null)}
          onPrinted={markPrinted}
        />
      )}
      {showAddRecord && isStudioAdmin && (
        <AdminManualPaymentModal
          clients={manualFormClients}
          classes={manualFormClasses}
          channels={manualFormChannels}
          loadingOptions={manualFormLoading}
          onClose={() => setShowAddRecord(false)}
          onCreated={reloadPayments}
        />
      )}
      <div className="flex h-full min-h-0 flex-col">
      <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col px-6 py-8">

        <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="flex w-fit max-w-full gap-1 rounded-2xl border border-[#D4CDB5]/60 bg-white p-1 shadow-sm">
          {(
            [
              ['class', 'Class enrollments'],
              ['credits', 'Credit packs'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPaymentDomain(id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                paymentDomain === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
              }`}
            >
              {label}
            </button>
          ))}
          </div>
        </div>

        {paymentDomain === 'credits' ? (
          <div className="min-w-0 bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-6">
            <AdminCreditPackPaymentsSection search={search} />
          </div>
        ) : null}

        {paymentDomain === 'class' ? (
        <>
        <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              label: 'Recognized revenue',
              hint: 'Cleared packs + locked drop-ins this month',
              value: peso(
                payments
                  .filter((payment) => isCleared(payment) && inManilaThisMonth(payment.finalizedAt))
                  .reduce((sum, payment) => sum + payment.amount, 0)
                + packPayments
                  .filter((payment) => payment.status === 'approved' && inManilaThisMonth(payment.createdAt))
                  .reduce((sum, payment) => sum + payment.amountPaid, 0),
              ),
              icon: <Wallet size={17} className="text-green-700" />,
              bg: 'bg-green-50',
              border: 'border-green-200',
            },
            {
              label: 'Escrow / deferred liability',
              hint: 'Cash held until the cancellation window',
              value: peso(payments.filter(isHeld).reduce((sum, payment) => sum + payment.amount, 0)),
              icon: <Timer size={17} className="text-sky-700" />,
              bg: 'bg-sky-50',
              border: 'border-sky-200',
            },
            {
              label: 'Pending refunds',
              hint: 'Approved voids waiting for manual cash',
              value: peso(
                payments
                  .filter((payment) => payment.escrowState === 'refunded' && !payment.cashRefundDisbursedAt)
                  .reduce((sum, payment) => sum + payment.amount, 0),
              ),
              icon: <AlertCircle size={17} className="text-amber-700" />,
              bg: 'bg-amber-50',
              border: 'border-amber-200',
            },
          ].map((card) => (
            <div key={card.label} className={`bg-white rounded-2xl border shadow-sm px-4 py-4 ${card.border}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.bg}`}>{card.icon}</div>
                <div className="min-w-0">
                  <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{card.label}</p>
                  <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{card.value}</p>
                </div>
              </div>
              <p className="text-[#9A8E7E] text-[11px] mt-2">{card.hint}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex min-w-0 flex-nowrap items-center gap-3">
          <div className="flex min-w-0 gap-1 overflow-x-auto rounded-2xl border border-[#D4CDB5]/60 bg-white p-1 shadow-sm">
            {(
              [
                ['all', 'All payments'],
                ['held', 'Held in escrow'],
                ['cleared', 'Locked / cleared'],
                ['voided', 'Voided / refunded'],
              ] as const
            ).map(([id, label]) => {
              const count = payments.filter((payment) => {
                if (id === 'all') return true;
                if (id === 'held') return isHeld(payment);
                if (id === 'cleared') return isCleared(payment);
                return isVoided(payment);
              }).length;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLedgerTab(id)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                    ledgerTab === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                  }`}
                >
                  {label}
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    ledgerTab === id ? 'bg-white/20 text-white' : 'bg-[#EDE8D8] text-[#5A5048]'
                  }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {isStudioAdmin ? (
              <button
                type="button"
                onClick={openAddRecordModal}
                className="action-button inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#c49a3c] text-white text-sm font-bold shadow-[0_4px_14px_rgba(196,154,60,0.28)] hover:bg-[#a67f2e] active:scale-[0.98] transition-all"
              >
                <Plus size={16} />
                Add record
              </button>
            ) : null}
            <div className="relative w-52 min-w-0 sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A898]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, class, reference…"
                className={INP}
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm">
          <div className={`hidden md:grid gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 ${
            ledgerTab === 'held'
              ? 'grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_6rem_8rem_7rem_minmax(0,1.4fr)]'
              : 'grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_6rem_minmax(0,1fr)_minmax(0,1.5fr)]'
          }`}
          >
            {(ledgerTab === 'held'
              ? ['Student', 'Class', 'Amount', 'Class date', 'Auto-lock', 'Actions']
              : ['Student', 'Class / date', 'Amount', 'Status', 'Actions']
            ).map((header) => (
              <p key={header} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{header}</p>
            ))}
          </div>
          {paymentsLoading ? (
            <div className="px-6 py-14 text-center text-[#B0A898] text-sm">Loading payments…</div>
          ) : filtered(payments.filter((payment) => {
            if (ledgerTab === 'held') return isHeld(payment);
            if (ledgerTab === 'cleared') return isCleared(payment);
            if (ledgerTab === 'voided') return isVoided(payment);
            return true;
          })).length === 0 ? (
            <div className="px-6 py-14 text-center">
              <RefreshCcw size={24} className="mx-auto text-[#D4CDB5] mb-3" />
              <p className="text-[#B0A898] text-sm">No payments in this ledger.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#D4CDB5]/30">
              {filtered(payments.filter((payment) => {
                if (ledgerTab === 'held') return isHeld(payment);
                if (ledgerTab === 'cleared') return isCleared(payment);
                if (ledgerTab === 'voided') return isVoided(payment);
                return true;
              })).map((payment) => (
                <div
                  key={payment.id}
                  onClick={() => {
                    if (payment.status === 'pending') setSelectedPending(payment);
                    else setSelectedHistory(payment);
                  }}
                  className={`grid gap-x-4 gap-y-2 px-6 py-4 items-center hover:bg-[#F8F3E8]/70 transition-colors cursor-pointer group ${
                    ledgerTab === 'held'
                      ? 'md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_6rem_8rem_7rem_minmax(0,1.4fr)]'
                      : 'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_6rem_minmax(0,1fr)_minmax(0,1.5fr)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PaymentStudentAvatar payment={payment} size="sm" />
                    <div className="min-w-0">
                      <p className="text-[#1E2A35] text-sm font-semibold truncate group-hover:text-[#c49a3c] transition-colors">{payment.student}</p>
                      <p className="text-[#B0A898] text-xs truncate">{payment.email}</p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#1E2A35] text-sm font-medium truncate">{payment.class}</p>
                    {ledgerTab !== 'held' ? (
                      <p className="text-[#9A8E7E] text-xs truncate">{payment.date} · {payment.time}</p>
                    ) : (
                      <p className="text-[#9A8E7E] text-xs truncate">{payment.method}</p>
                    )}
                  </div>
                  <p className="text-[#1E2A35] font-bold tabular-nums" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.04em' }}>
                    {peso(payment.amount)}
                  </p>
                  {ledgerTab === 'held' ? (
                    <p className="text-[#1E2A35] text-sm whitespace-nowrap">{payment.date}</p>
                  ) : (
                    <div className="flex flex-col gap-0.5 items-start">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize w-fit ${
                        payment.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : payment.status === 'rejected'
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                      >
                        {payment.status === 'rejected' ? 'Returned' : payment.status}
                      </span>
                      {escrowBadgeLabel(payment) ? (
                        <span className="text-[9px] font-semibold uppercase text-[#9A8E7E]">{escrowBadgeLabel(payment)}</span>
                      ) : null}
                    </div>
                  )}
                  {ledgerTab === 'held' ? (
                    <p className="text-sky-800 text-xs font-semibold whitespace-nowrap">{lockTimerLabel(payment.refundableUntil)}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-1.5 justify-start md:justify-end" onClick={(event) => event.stopPropagation()}>
                    {isStudioAdmin && isHeld(payment) ? (
                      <>
                        <button
                          type="button"
                          disabled={lockBusyId === payment.id}
                          onClick={() =>
                            setEscrowConfirm({
                              kind: 'lock',
                              paymentId: payment.id,
                              paymentUid: payment.paymentUid,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-[#1E2A35] bg-[#1E2A35] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#263545] disabled:opacity-60"
                        >
                          <Lock size={11} />
                          {lockBusyId === payment.id ? 'Issuing…' : 'Issue OR'}
                        </button>
                        <button
                          type="button"
                          disabled={refundBusyId === payment.id}
                          onClick={() =>
                            setEscrowConfirm({
                              kind: 'refund',
                              paymentId: payment.id,
                              paymentUid: payment.paymentUid,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                        >
                          {refundBusyId === payment.id ? 'Refunding…' : 'Manual Refund'}
                        </button>
                      </>
                    ) : null}
                    {isStudioAdmin && payment.escrowState === 'refunded' && !payment.cashRefundDisbursedAt ? (
                      <button
                        type="button"
                        disabled={refundBusyId === payment.id}
                        onClick={() => void markCashSent(payment.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-800 hover:bg-green-100 disabled:opacity-60"
                      >
                        {refundBusyId === payment.id ? 'Saving…' : 'Mark cash sent'}
                      </button>
                    ) : null}
                    {isCleared(payment) ? (
                      <button
                        type="button"
                        onClick={() => setPrintPayment(payment)}
                        className="inline-flex items-center gap-1 rounded-full border border-[#D4CDB5] px-2.5 py-1 text-[10px] font-bold text-[#5A5048] hover:bg-[#F8F3E8]"
                      >
                        <Receipt size={11} />
                        Receipt
                      </button>
                    ) : null}
                    <ChevronRight size={14} className="text-[#C0B8A8] shrink-0 group-hover:text-[#c49a3c]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[#B0A898] text-xs mt-4 text-right">
          Click a row for proof and review. Held rows can use Issue OR or Manual Refund (each requires confirmation).
        </p>
        </>
        ) : null}
      </div>
      </div>
    </>
  );
}
