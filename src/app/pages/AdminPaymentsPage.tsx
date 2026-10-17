import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  CreditCard, Check, X, Search, Receipt, Mail,
  AlertCircle, FileCheck,
  Smartphone, Eye, RefreshCcw,
  ChevronRight, Plus,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ProfileAvatar } from '../components/ProfileImages';
import { toast } from 'sonner';
import {
  adminReviewClassPayment,
  fetchClassPaymentsForAdmin,
  getPaymentProofSignedUrl,
  resolvePaymentProofDisplayName,
  type ClassPaymentDisplay,
} from '../../lib/class-payment-service';
import { fetchClientDirectory, type ClientDirectoryItem } from '../../lib/admin-service';
import { fetchClassesForAdmin, type ClassDisplay } from '../../lib/class-service';
import {
  fetchPaymentChannelsForAdmin,
  type PaymentChannelRecord,
} from '../../lib/payment-channel-service';
import { AdminManualPaymentModal } from '../components/payments/AdminManualPaymentModal';
import { ClassPaymentReceiptPrintModal } from '../components/payments/ClassPaymentReceiptPrintModal';
import { PaymentStudentContactPanel } from '../components/payments/PaymentStudentContactPanel';

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

function MethodIcon({ method }: { method: string }) {
  const m = method.toLowerCase();
  if (m.includes('gcash')) return <Smartphone size={13} style={{ color: '#007DFF' }} />;
  if (m.includes('maya')) return <Smartphone size={13} style={{ color: '#46BFA8' }} />;
  return <CreditCard size={13} className="text-[#3A4A5A]" />;
}

// ── Pending Payment Modal (row-click) ──────────────────────

function PendingPaymentModal({ payment, onClose, onApprove, onReject }: {
  payment: Payment; onClose: () => void;
  onApprove: (id: string) => void; onReject: (id: string) => void;
}) {
  const [confirmReject, setConfirmReject] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
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
                  <p className="text-red-500 text-xs mt-0.5">This will mark the payment as rejected. The student may resubmit with corrected information.</p>
                </div>
              </div>
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
                      await onReject(payment.id);
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
                    <span className="font-semibold">{payment.class}</span>, an official e-receipt will be generated and emailed
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

function HistoryPaymentModal({ payment, onClose, onOpenReceipt }: {
  payment: Payment; onClose: () => void;
  onOpenReceipt: () => void;
}) {

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
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              payment.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
            }`}>{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
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
          <div className="px-7 pb-7 flex gap-2">
            <button
              type="button"
              onClick={onOpenReceipt}
              className="action-button flex-1 py-2.5 rounded-full bg-[#1E2A35] text-white text-sm font-semibold hover:bg-[#263545] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Receipt size={13} /> View / Print Receipt
            </button>
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

export default function AdminPaymentsPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [payments, setPayments]           = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [activeTab, setActiveTab]         = useState<'pending' | 'history'>('pending');
  const [search, setSearch]               = useState('');
  const [selectedPending, setSelectedPending] = useState<Payment | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<Payment | null>(null);
  const [printPayment, setPrintPayment]   = useState<Payment | null>(null);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [manualFormClients, setManualFormClients] = useState<ClientDirectoryItem[]>([]);
  const [manualFormClasses, setManualFormClasses] = useState<ClassDisplay[]>([]);
  const [manualFormChannels, setManualFormChannels] = useState<PaymentChannelRecord[]>([]);
  const [manualFormLoading, setManualFormLoading] = useState(false);

  const isStudioAdmin = adminUser?.role === 'admin';

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
    const { data, error } = await fetchClassPaymentsForAdmin();
    if (error) {
      toast.error(error);
      return;
    }
    setPayments(data.map(classPaymentToPayment));
  }, []);

  useEffect(() => {
    if (!adminUser) return;
    let cancelled = false;
    void (async () => {
      setPaymentsLoading(true);
      const { data, error } = await fetchClassPaymentsForAdmin();
      if (cancelled) return;
      if (error) toast.error(error);
      else setPayments(data.map(classPaymentToPayment));
      setPaymentsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [adminUser]);

  if (!adminUser) return null;

  const pending = payments.filter(p => p.status === 'pending');
  const history = payments.filter(p => p.status !== 'pending');

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
    if (result.receiptEmailSent) {
      toast.success('Payment approved. E-receipt sent to the student.');
    } else if (result.receiptEmailError) {
      toast.success('Payment approved. Student enrolled.');
      toast.error(`E-receipt not sent: ${result.receiptEmailError}`);
    } else {
      toast.success('Payment approved. Student enrolled in class.');
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

  const rejectPayment = async (id: string) => {
    const result = await adminReviewClassPayment(id, false);
    if (!result.success) {
      toast.error(result.error ?? 'Could not reject payment.');
      return;
    }
    toast.success('Payment rejected.');
    await reloadPayments();
  };

  const markPrinted = (id: string) => {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, receiptPrinted: true } : p)));
    setPrintPayment(null);
  };

  const INP = 'w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]';

  return (
    <>
      {selectedPending && (
        <PendingPaymentModal
          payment={selectedPending}
          onClose={() => setSelectedPending(null)}
          onApprove={async (id) => {
            await approvePayment(id);
            setSelectedPending(null);
          }}
          onReject={async (id) => {
            await rejectPayment(id);
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
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending Review',  value: String(pending.length),                                    icon: <AlertCircle size={17} className="text-amber-500" />,    bg: 'bg-amber-50',         border: 'border-amber-200'       },
            { label: 'Approved',        value: String(history.filter(p => p.status === 'approved').length), icon: <Check size={17} className="text-green-600" />,          bg: 'bg-green-50',         border: 'border-green-200'       },
            { label: 'Rejected',        value: String(history.filter(p => p.status === 'rejected').length), icon: <X size={17} className="text-red-500" />,               bg: 'bg-red-50',           border: 'border-red-200'         },
            { label: 'E-Receipts Sent', value: String(history.filter(p => p.emailSent).length),            icon: <Mail size={17} className="text-[#c49a3c]" />,           bg: 'bg-[#c49a3c]/10',    border: 'border-[#c49a3c]/30'   },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-2xl border shadow-sm px-4 py-4 flex items-center gap-3 ${s.border}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>{s.icon}</div>
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{s.label}</p>
                <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm">
            {([['pending', 'Pending Payments'], ['history', 'Payment History']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}>
                {label}
                {id === 'pending' && pending.length > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    {pending.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
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
            <div className="relative max-w-xs w-full min-w-[200px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A898]" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search student, class, reference…" className={INP} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
          {activeTab === 'pending' ? (
            <>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.5fr)] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
                {['Student', 'Class / Date', 'Method', 'Amount', 'Reference'].map(h => (
                  <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                ))}
              </div>
              {paymentsLoading ? (
                <div className="px-6 py-14 text-center text-[#B0A898] text-sm">Loading payments…</div>
              ) : filtered(pending).length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <RefreshCcw size={24} className="mx-auto text-[#D4CDB5] mb-3" />
                  <p className="text-[#B0A898] text-sm">No pending payments</p>
                </div>
              ) : (
                <div className="divide-y divide-[#D4CDB5]/30">
                  {filtered(pending).map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPending(p)}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.5fr)] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/70 transition-colors min-h-[64px] cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PaymentStudentAvatar payment={p} size="sm" />
                        <div className="min-w-0">
                          <p className="text-[#1E2A35] text-sm font-semibold truncate group-hover:text-[#c49a3c] transition-colors">{p.student}</p>
                          <p className="text-[#B0A898] text-xs truncate">{p.email}</p>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-medium truncate">{p.class}</p>
                        <p className="text-[#9A8E7E] text-xs truncate">{p.date} · {p.time}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MethodIcon method={p.method} />
                        <span className="text-[#5A5048] text-xs truncate">{p.method}</span>
                      </div>
                      <p className="text-[#1E2A35] font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.04em' }}>₱{p.amount.toLocaleString()}</p>
                      <div className="flex items-center justify-between min-w-0">
                        <p className="text-[#8A7E6E] text-xs font-mono truncate">{p.ref}</p>
                        <ChevronRight size={14} className="text-[#C0B8A8] shrink-0 group-hover:text-[#c49a3c] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.5fr)_80px] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
                {['Student', 'Class / Date', 'Method', 'Amount', 'Reference', 'Status'].map(h => (
                  <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                ))}
              </div>
              {paymentsLoading ? (
                <div className="px-6 py-14 text-center text-[#B0A898] text-sm">Loading payments…</div>
              ) : filtered(history).length === 0 ? (
                <div className="px-6 py-14 text-center text-[#B0A898] text-sm">No payment history found.</div>
              ) : (
                <div className="divide-y divide-[#D4CDB5]/30">
                  {filtered(history).map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedHistory(p)}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.5fr)_80px] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/70 transition-colors min-h-[64px] cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PaymentStudentAvatar payment={p} size="sm" />
                        <div className="min-w-0">
                          <p className="text-[#1E2A35] text-sm font-semibold truncate group-hover:text-[#c49a3c] transition-colors">{p.student}</p>
                          <p className="text-[#B0A898] text-xs truncate">{p.email}</p>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-medium truncate">{p.class}</p>
                        <p className="text-[#9A8E7E] text-xs truncate">{p.date} · {p.time}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MethodIcon method={p.method} />
                        <span className="text-[#5A5048] text-xs truncate">{p.method}</span>
                      </div>
                      <p className="text-[#1E2A35] font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.04em' }}>₱{p.amount.toLocaleString()}</p>
                      <div className="flex items-center justify-between min-w-0">
                        <p className="text-[#8A7E6E] text-xs font-mono truncate">{p.ref}</p>
                        <ChevronRight size={14} className="text-[#C0B8A8] shrink-0 group-hover:text-[#c49a3c] transition-colors" />
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize w-fit ${
                        p.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                      }`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-[#B0A898] text-xs mt-4 text-right">
          {filtered(activeTab === 'pending' ? pending : history).length} record{filtered(activeTab === 'pending' ? pending : history).length !== 1 ? 's' : ''} shown · Click any row to view details
        </p>
      </div>
    </>
  );
}
