import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, BadgeCheck, CalendarDays, Coins, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { MemberReturnedPaymentResubmitModal } from '../components/payments/MemberReturnedPaymentResubmitModal';
import {
  creditAllotmentStatus,
  formatCreditActivityType,
  type CreditAllotmentStatus,
  type CreditTransactionDisplay,
} from '../../lib/credit-transaction-service';
import { toast } from 'sonner';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { AdminTablePagination, useFitPageSize } from '../components/layout/AdminTablePagination';
import { useAuth } from '../context/AuthContext';
import {
  fetchMemberCreditsOverview,
  type ExpiringCreditsCallout,
  type MemberSubscriptionRow,
} from '../../lib/member-credits-service';
import {
  fetchActiveSubscriptionPackagesForMember,
  type SubscriptionPackageRecord,
} from '../../lib/subscription-package-service';
import {
  fetchSubscriptionPackagePaymentsForMember,
  type SubscriptionPackagePaymentDisplay,
} from '../../lib/subscription-package-payment-service';

type CreditTxnFilter = 'all' | 'pending' | 'approved' | 'returned';
type LedgerStatusTag = CreditAllotmentStatus | 'Pending' | 'Returned';

const PH_TZ = 'Asia/Manila';

type MemberCreditTableRow = {
  key: string;
  sortAt: string;
  date: string;
  activityType: string;
  expiresAt: string;
  statusTag: LedgerStatusTag;
  refId: string;
  payment?: SubscriptionPackagePaymentDisplay;
};

function formatCreditTableDate(iso: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatExpirationCell(iso: string | null): string {
  if (!iso) return '—';
  return formatCreditTableDate(iso);
}

function checkoutPaymentToTableRow(p: SubscriptionPackagePaymentDisplay): MemberCreditTableRow {
  const statusTag: LedgerStatusTag =
    p.status === 'pending'
      ? 'Pending'
      : p.status === 'rejected'
        ? 'Returned'
        : 'Active';
  return {
    key: `checkout-${p.id}`,
    sortAt: p.createdAt,
    date: formatCreditTableDate(p.createdAt),
    activityType: `+${p.creditsGranted} ${p.packageName}`,
    expiresAt: '—',
    statusTag,
    refId: p.uid,
    payment: p,
  };
}

function ledgerTxnToTableRow(txn: CreditTransactionDisplay): MemberCreditTableRow {
  return {
    key: `ledger-${txn.id}`,
    sortAt: txn.createdAt,
    date: formatCreditTableDate(txn.createdAt),
    activityType: formatCreditActivityType(txn),
    expiresAt: formatExpirationCell(txn.lotExpiresAt),
    statusTag: creditAllotmentStatus(txn),
    refId: txn.reference,
  };
}

const LEDGER_STATUS_STYLE: Record<LedgerStatusTag, string> = {
  Active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Consumed: 'bg-[#EDE8D8] text-[#5A5048] border-[#D4CDB5]/70',
  Expired: 'bg-rose-50 text-rose-700 border-rose-200',
  Pending: 'bg-amber-50 text-amber-900 border-amber-200',
  Returned: 'bg-red-50 text-red-700 border-red-200',
};

const HEADER_OUTLINE_BTN =
  'inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#D4CDB5]/70 bg-white text-[#5A5048] text-sm font-medium hover:bg-[#F8F3E8] transition-all';

export default function MemberCreditsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [creditTxnFilter, setCreditTxnFilter] = useState<CreditTxnFilter>('all');
  const [returnedCheckout, setReturnedCheckout] = useState<SubscriptionPackagePaymentDisplay | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creditBalance, setCreditBalance] = useState(0);
  const [ledgerTransactions, setLedgerTransactions] = useState<CreditTransactionDisplay[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<MemberSubscriptionRow | null>(null);
  const [expiringCredits, setExpiringCredits] = useState<ExpiringCreditsCallout | null>(null);
  const [showAddCredits, setShowAddCredits] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [availablePackages, setAvailablePackages] = useState<SubscriptionPackageRecord[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<SubscriptionPackagePaymentDisplay[]>([]);

  const openAddCredits = useCallback(() => {
    setShowAddCredits(true);
    setPackagesLoading(true);
    void (async () => {
      const { data, error } = await fetchActiveSubscriptionPackagesForMember();
      if (error) toast.error(error);
      setAvailablePackages(data);
      setPackagesLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data, error } = await fetchMemberCreditsOverview();
      if (cancelled) return;
      if (error) {
        toast.error(error);
        setLoading(false);
        return;
      }
      if (data) {
        setCreditBalance(data.balance);
        setLedgerTransactions(
          data.transactions.filter((t) => !t.idempotencyKey?.startsWith('sub-pack-grant:')),
        );
        setActiveSubscription(data.activeSubscription);
        setExpiringCredits(data.expiringCredits);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const [payResult, pkgResult] = await Promise.all([
        fetchSubscriptionPackagePaymentsForMember(),
        fetchActiveSubscriptionPackagesForMember(),
      ]);
      if (cancelled) return;
      if (payResult.error) toast.error(payResult.error);
      else setPurchaseRequests(payResult.data);
      if (!pkgResult.error) setAvailablePackages(pkgResult.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const goCheckout = useCallback(
    (pkg: SubscriptionPackageRecord) => {
      setShowAddCredits(false);
      navigate('/credits/checkout', { state: { pkg } });
    },
    [navigate],
  );

  const reloadPurchaseRequests = useCallback(async () => {
    const { data, error } = await fetchSubscriptionPackagePaymentsForMember();
    if (error) toast.error(error);
    else setPurchaseRequests(data);
    const overview = await fetchMemberCreditsOverview();
    if (overview.data) {
      setLedgerTransactions(
        overview.data.transactions.filter((t) => !t.idempotencyKey?.startsWith('sub-pack-grant:')),
      );
      setCreditBalance(overview.data.balance);
      setActiveSubscription(overview.data.activeSubscription);
      setExpiringCredits(overview.data.expiringCredits);
    }
  }, []);

  const creditTableRows = useMemo(() => {
    const rows: MemberCreditTableRow[] = [
      ...purchaseRequests.map(checkoutPaymentToTableRow),
      ...ledgerTransactions.map(ledgerTxnToTableRow),
    ];
    rows.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());
    return rows;
  }, [purchaseRequests, ledgerTransactions]);

  const filteredCredits = useMemo(() => {
    let rows = creditTableRows;
    if (creditTxnFilter === 'pending') {
      rows = rows.filter((row) => row.statusTag === 'Pending');
    } else if (creditTxnFilter === 'approved') {
      rows = rows.filter((row) =>
        row.statusTag === 'Active' || row.statusTag === 'Consumed' || row.statusTag === 'Expired',
      );
    } else if (creditTxnFilter === 'returned') {
      rows = rows.filter((row) => row.statusTag === 'Returned');
    }
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      `${row.activityType} ${row.date} ${row.refId} ${row.statusTag} ${row.expiresAt}`.toLowerCase().includes(query),
    );
  }, [search, creditTableRows, creditTxnFilter]);

  const activeRows = filteredCredits;

  const { containerRef: tableBodyRef, pageSize: fitPageSize } = useFitPageSize({
    layout: 'table',
    fallback: 5,
    itemHeightOverride: 58,
  });
  const tablePageSize = Math.min(Math.max(fitPageSize, 1), 12);

  useEffect(() => {
    setTablePage(1);
  }, [search, creditTxnFilter]);

  const totalPages = Math.max(1, Math.ceil(activeRows.length / tablePageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const rangeStart = activeRows.length === 0 ? 0 : (currentPage - 1) * tablePageSize + 1;
  const rangeEnd = Math.min(currentPage * tablePageSize, activeRows.length);

  const pagedCredits = useMemo(() => {
    const start = (currentPage - 1) * tablePageSize;
    return filteredCredits.slice(start, start + tablePageSize);
  }, [filteredCredits, currentPage, tablePageSize]);

  const searchPlaceholder = 'Search credit activity…';

  const paginationNoun = 'entries';

  const returnedCount = purchaseRequests.filter((p) => p.status === 'rejected').length;

  return (
    <>
      {returnedCheckout ? (
        <MemberReturnedPaymentResubmitModal
          kind="subscription"
          payment={returnedCheckout}
          onClose={() => setReturnedCheckout(null)}
          onSuccess={() => void reloadPurchaseRequests()}
        />
      ) : null}
      {showAddCredits && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowAddCredits(false)}
          role="presentation"
        >
          <div
            className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="add-credits-title"
          >
            <div className="px-6 pt-6 pb-4 border-b border-[#D4CDB5]/50 flex items-center justify-between shrink-0">
              <h3
                id="add-credits-title"
                className="text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.05em' }}
              >
                Add credits
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCredits(false)}
                className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <p className="text-[#8A7E6E] text-sm mb-4">
                Choose a membership or pack. Pay online and upload proof — credits apply after admin approval.
              </p>
              {packagesLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-[#8A7E6E] text-sm">
                  <Loader2 size={18} className="animate-spin text-[#c49a3c]" />
                  Loading packages…
                </div>
              ) : availablePackages.length === 0 ? (
                <p className="text-center text-[#8A7E6E] text-sm py-10">No packages available right now.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {availablePackages.map((pkg) => (
                    <li
                      key={pkg.id}
                      className="rounded-2xl border border-[#D4CDB5]/60 bg-[#FBF9F3] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1E2A35] truncate">{pkg.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A8E7E]">{pkg.uid}</p>
                        <p className="text-xs text-[#8A7E6E] mt-1 line-clamp-2">
                          {pkg.description || `${pkg.creditsGranted} credits · ${pkg.creditValidityDays} days valid`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p
                          className="text-[#1E2A35] tabular-nums"
                          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem' }}
                        >
                          ₱{pkg.priceAmount.toLocaleString()}
                        </p>
                        <button
                          type="button"
                          onClick={() => goCheckout(pkg)}
                          className="action-button rounded-full bg-[#1E2A35] text-white text-xs font-bold px-4 py-2 hover:bg-[#263545] transition-colors"
                        >
                          Select
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

    <MemberPageShell
      viewportBody="desktop"
      searchPlaceholder={searchPlaceholder}
      onSearch={(query) => {
        setSearch(query);
        setTablePage(1);
      }}
    >
      <div className="md:flex md:h-full md:min-h-0 md:flex-col md:overflow-hidden">
        <div className="shrink-0 pt-6 mb-3 md:pt-4 md:mb-2">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Finances</p>
              <h2
                className="text-[#1E2A35] leading-tight"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 'clamp(1.25rem, 2.5vw, 1.65rem)',
                  letterSpacing: '0.04em',
                }}
              >
                Credits &amp; Pass
              </h2>
              <p className="text-[#8A7E6E] text-xs mt-1 max-w-xl hidden sm:block">
                Usable credits, membership renewal, and activity on your pass.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Redeem codes — coming soon"
                className={`${HEADER_OUTLINE_BTN} cursor-not-allowed text-[#9A8E7E] hover:bg-white disabled:opacity-100`}
              >
                Redeem
              </button>
              <button type="button" onClick={openAddCredits} className={`action-button ${HEADER_OUTLINE_BTN}`}>
                <Plus size={14} strokeWidth={2} aria-hidden />
                Add credits
              </button>
            </div>
          </div>
        </div>

        <div className="mb-3 shrink-0 grid gap-3 md:grid-cols-2 md:items-start">
          <div
            className="relative overflow-hidden rounded-2xl border border-[#D4CDB5]/50 p-5 shadow-md"
            style={{ background: 'linear-gradient(145deg, #FBF9F3 0%, #F8F3E8 45%, #EDE8D8 100%)' }}
          >
            <div className="pointer-events-none absolute -right-4 -top-6 h-24 w-24 rounded-full bg-[#c49a3c]/15" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A8E7E]">
                  Credit balance
                </p>
                <p
                  className="mt-2 text-[#1E2A35] leading-none tabular-nums"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 3.25rem)', letterSpacing: '0.04em' }}
                >
                  {loading ? '—' : creditBalance}
                </p>
                <p className="mt-2 text-[#8A7E6E] text-xs font-medium">Total usable credits on your pass</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D4CDB5]/60 bg-white text-[#c49a3c] shadow-sm">
                <Coins size={22} strokeWidth={2.25} aria-hidden />
              </div>
            </div>
            {!loading && expiringCredits ? (
              <div className="relative mt-4 flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-amber-950">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-700" aria-hidden />
                <p className="text-xs font-semibold leading-snug">
                  {expiringCredits.creditCount} credit{expiringCredits.creditCount === 1 ? '' : 's'} expiring on{' '}
                  {expiringCredits.expiresAtDisplay}
                </p>
              </div>
            ) : null}
          </div>

          <div
            className="relative overflow-hidden rounded-2xl border border-[#1E2A35]/15 p-4 shadow-md"
            style={
              activeSubscription && !loading
                ? {
                    background:
                      'linear-gradient(145deg, #1E2A35 0%, #243442 42%, #2A4050 100%)',
                  }
                : {
                    background: 'linear-gradient(145deg, #FBF9F3 0%, #F8F3E8 55%, #FFFFFF 100%)',
                  }
            }
          >
            <div
              className={`pointer-events-none absolute -right-5 -bottom-6 h-20 w-20 rounded-full ${
                activeSubscription && !loading ? 'bg-[#c49a3c]/25' : 'bg-[#c49a3c]/10'
              }`}
            />
            <div
              className={`pointer-events-none absolute -left-3 top-4 h-12 w-12 rounded-full ${
                activeSubscription && !loading ? 'bg-white/[0.06]' : 'bg-[#1E2A35]/[0.04]'
              }`}
            />

            <div className="relative flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                    activeSubscription && !loading ? 'text-[#c49a3c]/90' : 'text-[#9A8E7E]'
                  }`}
                >
                  Active membership
                </p>
                {activeSubscription && !loading ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-px text-[9px] font-bold uppercase tracking-wider text-emerald-200">
                    <span className="h-1 w-1 rounded-full bg-emerald-400" aria-hidden />
                    Active
                  </span>
                ) : null}
              </div>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm ${
                  activeSubscription && !loading
                    ? 'border-[#c49a3c]/40 bg-[#c49a3c]/15 text-[#e8c878]'
                    : 'border-[#D4CDB5]/60 bg-white text-[#8A7E6E]'
                }`}
              >
                {activeSubscription && !loading ? (
                  <BadgeCheck size={18} strokeWidth={2.25} aria-hidden />
                ) : (
                  <Sparkles size={17} strokeWidth={2.25} aria-hidden />
                )}
              </div>
            </div>

            {loading ? (
              <div className="relative mt-2 space-y-2 animate-pulse">
                <div className="h-5 w-2/3 max-w-[12rem] rounded-md bg-[#EDE8D8]/80" />
                <div className="h-3 w-1/2 max-w-[9rem] rounded bg-[#EDE8D8]/60" />
              </div>
            ) : activeSubscription ? (
              <div className="relative mt-2">
                <p
                  className="text-white leading-tight truncate"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 'clamp(1.35rem, 3.2vw, 1.65rem)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {activeSubscription.packageName}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-white/70">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <CalendarDays size={10} className="shrink-0 text-[#e8c878]/90" aria-hidden />
                    Billing{' '}
                    <span className="font-semibold text-[#e8c878]">{activeSubscription.endDate}</span>
                  </span>
                  <span className="text-white/35" aria-hidden>
                    ·
                  </span>
                  <span className="tabular-nums">
                    Since{' '}
                    <span className="font-medium text-white/85">{activeSubscription.startDate}</span>
                  </span>
                </p>
              </div>
            ) : (
              <div className="relative mt-2 rounded-xl border border-dashed border-[#D4CDB5]/80 bg-white/80 px-3 py-2.5">
                <p className="text-xs font-semibold text-[#1E2A35]">No active membership</p>
                <p className="text-[11px] text-[#8A7E6E] mt-0.5 leading-snug">
                  Add a plan to unlock recurring credits.
                </p>
                <button
                  type="button"
                  onClick={openAddCredits}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#a67f2e] hover:text-[#8a6824]"
                >
                  Browse memberships
                  <span aria-hidden>→</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm md:min-h-[12rem]"
        >
          <div className="shrink-0 border-b border-[#D4CDB5]/50 px-4 py-3 sm:px-5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <h3
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}
            >
              Credit activity
            </h3>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A7E6E] shrink-0">
                Filter:
              </span>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: 'all' as const, label: 'All' },
                    { id: 'pending' as const, label: 'Pending' },
                    { id: 'approved' as const, label: 'Cleared' },
                    { id: 'returned' as const, label: 'Returned', count: returnedCount },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCreditTxnFilter(item.id)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all sm:text-[11px] ${
                      creditTxnFilter === item.id
                        ? 'bg-[#1E2A35] text-white'
                        : 'bg-white border border-[#D4CDB5]/60 text-[#8A7E6E] hover:text-[#1E2A35]'
                    }`}
                  >
                    {item.label}
                    {'count' in item && item.count > 0 ? (
                      <span className="ml-1 rounded-full bg-red-500 text-white px-1.5 py-px text-[9px]">
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div ref={tableBodyRef} className="min-h-0 flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-2 px-5 py-6 text-[#8A7E6E] text-sm">
                <Loader2 size={18} className="animate-spin text-[#c49a3c]" />
                Loading…
              </div>
            ) : activeRows.length === 0 ? (
              <div className="flex h-full items-center justify-center px-5 py-6 text-[#8A7E6E] text-sm">
                {creditTableRows.length === 0
                  ? 'No credit activity yet.'
                  : 'No matching credit activity.'}
              </div>
            ) : (
              <table className="w-full min-w-[40rem] table-fixed text-left text-sm border-collapse">
                <colgroup>
                  <col className="w-[7rem]" />
                  <col />
                  <col className="w-[7.5rem]" />
                  <col className="w-[6.5rem]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-[#FBF9F3]/95 backdrop-blur-sm border-b border-[#D4CDB5]/50">
                  <tr className="text-[10px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
                    <th className="px-4 py-2 text-left font-semibold sm:px-5">Date</th>
                    <th className="px-4 py-2 text-left font-semibold sm:px-5">Transaction</th>
                    <th className="px-4 py-2 text-left font-semibold sm:px-5">Expires</th>
                    <th className="px-4 py-2 text-left font-semibold sm:px-5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCredits.map((row) => {
                    const isReturnedCheckout = row.statusTag === 'Returned' && row.payment;
                    return (
                      <tr
                        key={row.key}
                        onClick={() => {
                          if (isReturnedCheckout) setReturnedCheckout(row.payment!);
                        }}
                        className={`border-b border-[#D4CDB5]/30 last:border-b-0 ${
                          isReturnedCheckout ? 'cursor-pointer hover:bg-[#F8F3E8]/70' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 text-[#1E2A35] whitespace-nowrap text-xs sm:px-5 sm:text-sm">
                          {row.date}
                        </td>
                        <td className="px-4 py-2.5 text-[#1E2A35] sm:px-5">
                          <p className="font-medium text-xs sm:text-sm">{row.activityType}</p>
                          <p className="text-[10px] text-[#9A8E7E] tabular-nums">{row.refId}</p>
                          {isReturnedCheckout && row.payment?.reviewNote.trim() ? (
                            <p className="text-[10px] text-red-600 mt-0.5">{row.payment.reviewNote.trim()}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 text-[#5A5048] text-xs whitespace-nowrap sm:px-5 sm:text-sm">
                          {row.expiresAt}
                        </td>
                        <td className="px-4 py-2.5 sm:px-5">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${LEDGER_STATUS_STYLE[row.statusTag]}`}
                          >
                            {row.statusTag}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {activeRows.length > 0 && (
            <div className="shrink-0 border-t border-[#D4CDB5]/40 px-3 pb-2 pt-0 sm:px-4">
              <AdminTablePagination
                page={currentPage}
                totalPages={totalPages}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                total={activeRows.length}
                noun={paginationNoun}
                onPageChange={setTablePage}
              />
            </div>
          )}
        </div>
      </div>
    </MemberPageShell>
    </>
  );
}
