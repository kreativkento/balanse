import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Coins,
  Search,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  X,
  Plus,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminUrlSearchFilter } from '../hooks/useAdminUrlSearchFilter';
import { ProfileAvatar } from '../components/ProfileImages';
import { toast } from 'sonner';
import {
  creditKindLabel,
  fetchCreditTransactionsForAdmin,
  formatCreditDelta,
  formatCreditTransactionWhen,
  type CreditTransactionDisplay,
  type CreditTransactionKind,
} from '../../lib/credit-transaction-service';
import {
  PendingCreditPackModal,
  RequestStatusBadge,
} from '../components/payments/AdminCreditPackPaymentsSection';
import {
  adminReviewSubscriptionPackagePayment,
  fetchSubscriptionPackagePaymentsForAdmin,
  SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED,
  type SubscriptionPackagePaymentDisplay,
} from '../../lib/subscription-package-payment-service';
import { useAdminCreditCheckoutPendingCount } from '../hooks/useAdminCreditCheckoutPendingCount';
import { AdminCreditDesk } from '../components/credits/AdminCreditDesk';
import { AdminTablePagination, useFitPageSize } from '../components/layout/AdminTablePagination';

type CreditsTab = 'in' | 'out';

type CreditRowStatus = 'pending' | 'rejected' | 'approved' | 'posted';

type AdminCreditTableRow = {
  key: string;
  sortAt: string;
  student: string;
  email: string;
  studentPhotoUrl: string;
  reason: string;
  subline: string;
  typeLabel: string;
  typeStyle: string;
  delta: number;
  deltaMuted: boolean;
  reference: string;
  status: CreditRowStatus;
  ledgerTxn?: CreditTransactionDisplay;
  checkoutPayment?: SubscriptionPackagePaymentDisplay;
};

const CHECKOUT_TYPE_STYLE = 'bg-violet-50 text-violet-900 border-violet-200';

function ledgerRowFromTxn(txn: CreditTransactionDisplay, status: CreditRowStatus = 'posted'): AdminCreditTableRow {
  return {
    key: `ledger-${txn.id}`,
    sortAt: txn.createdAt,
    student: txn.student,
    email: txn.email,
    studentPhotoUrl: txn.studentPhotoUrl,
    reason: txn.reason,
    subline: txn.className !== '—' ? txn.className : txn.submittedAt,
    typeLabel: creditKindLabel(txn.kind),
    typeStyle: KIND_STYLE[txn.kind],
    delta: txn.delta,
    deltaMuted: false,
    reference: txn.reference,
    status,
    ledgerTxn: txn,
  };
}

function checkoutRowFromPayment(p: SubscriptionPackagePaymentDisplay): AdminCreditTableRow {
  return {
    key: `checkout-${p.id}`,
    sortAt: p.createdAt,
    student: p.buyerName,
    email: p.buyerEmail,
    studentPhotoUrl: p.studentPhotoUrl,
    reason: p.packageName,
    subline: `${p.creditsGranted} credits · ₱${p.amountPaid.toLocaleString()} · ${p.paymentMethodLabel}`,
    typeLabel: 'Checkout',
    typeStyle: CHECKOUT_TYPE_STYLE,
    delta: p.creditsGranted,
    deltaMuted: p.status !== 'approved',
    reference: p.uid,
    status: p.status,
    checkoutPayment: p,
  };
}

const KIND_STYLE: Record<CreditTransactionKind, string> = {
  grant: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  spend: 'bg-[#EDE8D8] text-[#5A5048] border-[#D4CDB5]/70',
  expire: 'bg-rose-50 text-rose-700 border-rose-200',
  admin_adjust: 'bg-amber-50 text-amber-900 border-amber-200',
  reversal: 'bg-sky-50 text-sky-800 border-sky-200',
};

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

function CreditStudentAvatar({
  txn,
  size = 'md',
}: {
  txn: CreditTransactionDisplay;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 rounded-xl' : 'w-9 h-9 rounded-xl';
  return (
    <ProfileAvatar
      src={txn.studentPhotoUrl || undefined}
      initials={studentInitials(txn.student)}
      alt={txn.student}
      className={`${sizeClass} shrink-0 bg-[#c49a3c]/12 border border-[#c49a3c]/25`}
      initialsClassName="text-[#a67f2e] text-xs font-bold"
    />
  );
}

function CreditTransactionModal({
  txn,
  onClose,
}: {
  txn: CreditTransactionDisplay;
  onClose: () => void;
}) {
  const when = formatCreditTransactionWhen(txn.createdAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="credit-txn-title"
      >
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <h3
            id="credit-txn-title"
            className="text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
          >
            Credit transaction
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] hover:text-[#1E2A35] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-7 py-6 space-y-5">
          <div className="flex items-center gap-3">
            <CreditStudentAvatar txn={txn} />
            <div>
              <p className="text-[#1E2A35] font-semibold">{txn.student}</p>
              <p className="text-[#8A7E6E] text-sm">{txn.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Change</p>
              <p
                className={`font-bold tabular-nums ${txn.delta > 0 ? 'text-emerald-700' : 'text-[#5A5048]'}`}
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem' }}
              >
                {formatCreditDelta(txn.delta)}
              </p>
            </div>
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Balance after</p>
              <p
                className="text-[#1E2A35] font-bold tabular-nums"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem' }}
              >
                {txn.balanceAfter ?? '—'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Type</p>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${KIND_STYLE[txn.kind]}`}
            >
              {creditKindLabel(txn.kind)}
            </span>
          </div>
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Description</p>
            <p className="text-[#1E2A35] text-sm">{txn.reason}</p>
          </div>
          {txn.className !== '—' && (
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Class</p>
              <p className="text-[#1E2A35] text-sm font-medium">{txn.className}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Reference</p>
              <p className="text-[#1E2A35] font-mono text-xs">{txn.reference}</p>
            </div>
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Date</p>
              <p className="text-[#1E2A35] text-sm">{when.date}</p>
              <p className="text-[#B0A898] text-xs">{when.submittedAt}</p>
            </div>
          </div>
        </div>
        <div className="px-7 pb-7">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-full bg-[#1E2A35] text-white text-sm font-medium hover:bg-[#263545] hover:shadow-md transition-[background-color,box-shadow]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCreditsPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [transactions, setTransactions] = useState<CreditTransactionDisplay[]>([]);
  const [checkoutPayments, setCheckoutPayments] = useState<SubscriptionPackagePaymentDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CreditsTab>('in');
  const [search, setSearch] = useAdminUrlSearchFilter();
  const [selected, setSelected] = useState<CreditTransactionDisplay | null>(null);
  const [selectedCheckout, setSelectedCheckout] = useState<SubscriptionPackagePaymentDisplay | null>(null);
  const [checkoutRefreshSignal, setCheckoutRefreshSignal] = useState(0);
  const [grantSignal, setGrantSignal] = useState(0);
  const [page, setPage] = useState(1);
  const { containerRef, pageSize } = useFitPageSize({ layout: 'table', fallback: 6 });
  const checkoutPendingCount = useAdminCreditCheckoutPendingCount();

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (!adminUser) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [txnResult, payResult] = await Promise.all([
        fetchCreditTransactionsForAdmin(),
        fetchSubscriptionPackagePaymentsForAdmin(),
      ]);
      if (cancelled) return;
      if (txnResult.error) toast.error(txnResult.error);
      else setTransactions(txnResult.data);
      if (payResult.error) toast.error(payResult.error);
      else setCheckoutPayments(payResult.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [adminUser, checkoutRefreshSignal]);

  useEffect(() => {
    if (!adminUser) return;
    const onChange = () => {
      setCheckoutRefreshSignal((n) => n + 1);
    };
    window.addEventListener(SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED, onChange);
    return () => window.removeEventListener(SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED, onChange);
  }, [adminUser]);

  useEffect(() => {
    setPage(1);
  }, [search, activeTab]);

  const ledgerCreditsIn = transactions.filter(
    (t) =>
      (t.delta > 0 || (t.delta === 0 && t.kind === 'admin_adjust'))
      && !t.idempotencyKey?.startsWith('sub-pack-grant:'),
  );
  const creditsOut = transactions.filter((t) => t.delta < 0);

  const checkoutRows = checkoutPayments.map(checkoutRowFromPayment);
  const creditsInRows: AdminCreditTableRow[] = [
    ...checkoutRows,
    ...ledgerCreditsIn.map((t) => ledgerRowFromTxn(t, 'posted')),
  ].sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());

  const creditsOutRows: AdminCreditTableRow[] = creditsOut
    .map((t) => ledgerRowFromTxn(t, 'posted'))
    .sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());

  const totalGranted =
    ledgerCreditsIn.filter((t) => t.delta > 0).reduce((sum, t) => sum + t.delta, 0)
  const totalDeducted = creditsOut.reduce((sum, t) => sum + Math.abs(t.delta), 0);
  const expireCount = transactions.filter((t) => t.kind === 'expire').length;
  const spendCount = transactions.filter((t) => t.kind === 'spend').length;

  const filteredRows = (list: AdminCreditTableRow[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (row) =>
        row.student.toLowerCase().includes(q)
        || row.email.toLowerCase().includes(q)
        || row.reason.toLowerCase().includes(q)
        || row.reference.toLowerCase().includes(q)
        || row.subline.toLowerCase().includes(q)
        || row.typeLabel.toLowerCase().includes(q)
        || row.status.includes(q),
    );
  };

  const activeList = activeTab === 'in' ? creditsInRows : creditsOutRows;
  const visible = filteredRows(activeList);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, currentPage, pageSize]);
  const rangeStart = visible.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, visible.length);

  const approveCheckout = async (id: string) => {
    const result = await adminReviewSubscriptionPackagePayment(id, true);
    if (!result.success) {
      toast.error(result.error ?? 'Could not approve.');
      return;
    }
    toast.success('Approved — credits granted and validity started.');
    if (result.feedbackEmailSent) {
      toast.message('Status email sent to the member.');
    } else if (result.feedbackEmailError) {
      toast.error(`Member status email failed: ${result.feedbackEmailError}`);
    }
    if (result.receiptEmailError) {
      toast.error(result.receiptEmailError);
    } else if (result.receiptEmailSent) {
      toast.message('E-receipt emailed to the member.');
    }
    setSelectedCheckout(null);
    setCheckoutRefreshSignal((n) => n + 1);
  };

  const rejectCheckout = async (id: string, note = '') => {
    const result = await adminReviewSubscriptionPackagePayment(id, false, note);
    if (!result.success) {
      toast.error(result.error ?? 'Could not reject.');
      return;
    }
    if (result.feedbackEmailSent) {
      toast.success('Rejected — member notified by email.');
    } else {
      toast.success('Rejected.');
      if (result.feedbackEmailError) {
        toast.error(`Member status email failed: ${result.feedbackEmailError}`);
      }
    }
    setSelectedCheckout(null);
    setCheckoutRefreshSignal((n) => n + 1);
  };

  const INP =
    'w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]';

  const gridCols =
    'grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.75fr)_minmax(0,0.85fr)_minmax(0,1fr)]';

  if (!adminUser) return null;

  return (
    <>
      {selected && (
        <CreditTransactionModal txn={selected} onClose={() => setSelected(null)} />
      )}
      {selectedCheckout ? (
        <PendingCreditPackModal
          payment={selectedCheckout}
          onClose={() => setSelectedCheckout(null)}
          onApprove={approveCheckout}
          onReject={rejectCheckout}
        />
      ) : null}
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 min-h-0 flex-col px-6 py-6">
        <div className="mb-4 grid min-w-0 shrink-0 grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: 'Credits added',
              value: String(totalGranted),
              icon: <TrendingUp size={17} className="text-green-600" />,
              bg: 'bg-green-50',
              border: 'border-green-200',
            },
            {
              label: 'Credits deducted',
              value: String(totalDeducted),
              icon: <TrendingDown size={17} className="text-[#5A5048]" />,
              bg: 'bg-[#EDE8D8]',
              border: 'border-[#D4CDB5]/60',
            },
            {
              label: 'Class uses',
              value: String(spendCount),
              icon: <Coins size={17} className="text-[#c49a3c]" />,
              bg: 'bg-[#c49a3c]/10',
              border: 'border-[#c49a3c]/30',
            },
            {
              label: 'Expired batches',
              value: String(expireCount),
              icon: <AlertCircle size={17} className="text-rose-500" />,
              bg: 'bg-rose-50',
              border: 'border-rose-200',
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`min-w-0 bg-white rounded-2xl border shadow-sm px-3 py-3 flex items-center gap-3 transition-colors hover:bg-[#FBF9F3]/90 hover:border-[#c49a3c]/25 ${s.border}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{s.label}</p>
                <p
                  className="text-[#1E2A35] leading-none"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.5rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <AdminCreditDesk
          transactions={transactions}
          refreshKey={checkoutRefreshSignal}
          grantSignal={grantSignal}
          onChanged={() => setCheckoutRefreshSignal((n) => n + 1)}
        />

        <div className="mb-3 flex min-w-0 shrink-0 flex-nowrap items-center gap-3">
          <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm shrink-0">
            {(
              [
                ['in', 'Credits in', creditsInRows.length, checkoutPendingCount],
                ['out', 'Credits out', creditsOutRows.length, 0],
              ] as const
            ).map(([id, label, count, pendingBadge]) => {
              const requestsPending = id === 'in' && pendingBadge > 0;
              return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-[#1E2A35] text-white shadow-sm'
                    : 'text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8]/90'
                }`}
              >
                {label}
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    requestsPending
                      ? 'bg-red-500 text-white'
                      : activeTab === id
                        ? 'bg-white/20 text-white'
                        : 'bg-[#EDE8D8] text-[#5A5048]'
                  }`}
                >
                  {requestsPending ? pendingBadge : count}
                </span>
              </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0 min-w-0">
            <div className="relative w-52 sm:w-64 shrink min-w-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A898]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member, description, reference, status…"
                className={`${INP} w-full`}
              />
            </div>
            <button
              type="button"
              className="action-button flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] hover:shadow-md transition-[background-color,box-shadow] shadow-sm shrink-0 whitespace-nowrap"
              onClick={() => setGrantSignal((n) => n + 1)}
            >
              <Plus size={16} />
              Add Entry
            </button>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm">
          <div
            className={`grid ${gridCols} gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 shrink-0`}
          >
            {['Member', 'Description', 'Type', 'Change', 'Status', 'Reference'].map((h) => (
              <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">
                {h}
              </p>
            ))}
          </div>
          {loading ? (
            <div ref={containerRef} className="flex-1 min-h-0 px-6 py-12 text-center text-[#B0A898] text-sm">Loading credit transactions…</div>
          ) : visible.length === 0 ? (
            <div ref={containerRef} className="flex-1 min-h-0 px-6 py-12 text-center">
              <Coins size={24} className="mx-auto text-[#D4CDB5] mb-3" />
              <p className="text-[#B0A898] text-sm">
                {transactions.length === 0 && checkoutPayments.length === 0
                  ? 'No credit transactions yet.'
                  : 'No transactions match this tab or search.'}
              </p>
            </div>
          ) : (
            <div ref={containerRef} className="flex-1 min-h-0 divide-y divide-[#D4CDB5]/30">
              {pageRows.map((row) => {
                const isPendingCheckout = row.checkoutPayment?.status === 'pending';
                const clickable = Boolean(row.ledgerTxn) || isPendingCheckout;
                const RowTag = clickable ? 'button' : 'div';
                return (
                  <RowTag
                    key={row.key}
                    type={clickable ? 'button' : undefined}
                    onClick={() => {
                      if (row.ledgerTxn) setSelected(row.ledgerTxn);
                      else if (isPendingCheckout && row.checkoutPayment) setSelectedCheckout(row.checkoutPayment);
                    }}
                    className={`grid ${gridCols} gap-x-4 px-6 py-4 items-center min-h-[64px] w-full text-left transition-[background-color,box-shadow] ${
                      clickable
                        ? 'hover:bg-[#F8F3E8] hover:ring-1 hover:ring-inset hover:ring-[#c49a3c]/20 cursor-pointer group'
                        : row.checkoutPayment
                          ? 'bg-[#FBF9F3]/40 hover:bg-[#F8F3E8]/45'
                          : 'hover:bg-[#FBF9F3]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProfileAvatar
                        src={row.studentPhotoUrl || undefined}
                        initials={studentInitials(row.student)}
                        alt={row.student}
                        className="w-8 h-8 rounded-xl shrink-0 bg-[#c49a3c]/12 border border-[#c49a3c]/25"
                        initialsClassName="text-[#a67f2e] text-xs font-bold"
                      />
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-semibold truncate group-hover:text-[#c49a3c] transition-colors">
                          {row.student}
                        </p>
                        <p className="text-[#B0A898] text-xs truncate">{row.email}</p>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#1E2A35] text-sm font-medium truncate">{row.reason}</p>
                      <p className="text-[#9A8E7E] text-xs truncate">{row.subline}</p>
                    </div>
                    <span
                      className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${row.typeStyle}`}
                    >
                      {row.typeLabel}
                    </span>
                    <p
                      className={`font-bold tabular-nums ${
                        row.deltaMuted
                          ? 'text-[#9A8E7E]'
                          : row.delta > 0
                            ? 'text-emerald-700'
                            : 'text-[#5A5048]'
                      }`}
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '1.1rem',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {formatCreditDelta(row.delta)}
                    </p>
                    <div className="min-w-0">
                      {row.status === 'posted' ? (
                        <span className="inline-flex text-[10px] font-bold uppercase text-[#5A5048] bg-[#EDE8D8] border border-[#D4CDB5]/70 px-2 py-0.5 rounded-full">
                          Posted
                        </span>
                      ) : (
                        <RequestStatusBadge status={row.status} />
                      )}
                    </div>
                    <div className="flex items-center justify-between min-w-0">
                      <p className="text-[#8A7E6E] text-xs font-mono truncate">{row.reference}</p>
                      {clickable ? (
                        <ChevronRight
                          size={14}
                          className="text-[#C0B8A8] shrink-0 group-hover:text-[#c49a3c] transition-colors"
                        />
                      ) : null}
                    </div>
                  </RowTag>
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
          total={visible.length}
          noun="records"
          onPageChange={setPage}
        />
      </div>
      </div>
    </>
  );
}
