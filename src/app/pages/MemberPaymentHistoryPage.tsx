import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CreditCard,
  Receipt,
  Download,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { CategorizedAddFilter, matchesAnySelected } from '../components/filters/CategorizedAddFilter';
import { AdminTablePagination, useFitPageSize } from '../components/layout/AdminTablePagination';
import {
  ChronologicalSortSelect,
  sortChronologically,
  type ChronologicalOrder,
} from '../components/layout/ChronologicalSortSelect';
import {
  downloadOfficialReceiptPdfFromHtml,
  fetchClassPaymentReceiptHtml,
  fetchClassPaymentsForMember,
  type ClassPaymentDisplay,
} from '../../lib/class-payment-service';
import {
  buildEscrowAuthorizations,
  mergeOfficialReceipts,
  type EscrowAuthorizationRow,
  type OfficialReceiptRow,
} from '../../lib/member-billing-receipts';
import {
  fetchSubscriptionPackagePaymentsForMember,
  fetchSubscriptionPackageReceiptHtml,
  type SubscriptionPackagePaymentDisplay,
} from '../../lib/subscription-package-payment-service';
import { MemberReturnedPaymentResubmitModal } from '../components/payments/MemberReturnedPaymentResubmitModal';

function isReturnedClassPayment(row: ClassPaymentDisplay): boolean {
  return row.status === 'rejected' || row.escrowState === 'rejected';
}

async function loadMemberBillingRecords(): Promise<{
  classRows: ClassPaymentDisplay[];
  subscriptionRows: SubscriptionPackagePaymentDisplay[];
  error: string | null;
}> {
  const [classResult, subResult] = await Promise.all([
    fetchClassPaymentsForMember(),
    fetchSubscriptionPackagePaymentsForMember(),
  ]);

  const errors = [classResult.error, subResult.error].filter(Boolean) as string[];
  const classRows = classResult.error ? [] : classResult.data;
  const subscriptionRows = subResult.error ? [] : subResult.data;

  if (errors.length === 2) {
    return { classRows, subscriptionRows, error: errors[0] };
  }
  if (errors.length === 1) {
    toast.error(errors[0]);
  }

  return { classRows, subscriptionRows, error: null };
}

export default function MemberPaymentHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [returnedPayment, setReturnedPayment] = useState<ClassPaymentDisplay | null>(null);
  const [paymentRows, setPaymentRows] = useState<ClassPaymentDisplay[]>([]);
  const [subscriptionRows, setSubscriptionRows] = useState<SubscriptionPackagePaymentDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [escrowOpen, setEscrowOpen] = useState(true);
  const [downloadingOrKey, setDownloadingOrKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!user) {
      setPaymentRows([]);
      setSubscriptionRows([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      try {
        const result = await loadMemberBillingRecords();
        if (cancelled) return;
        setLoadError(result.error);
        setPaymentRows(result.classRows);
        setSubscriptionRows(result.subscriptionRows);
      } catch (err) {
        if (cancelled) return;
        console.error('MemberPaymentHistoryPage load:', err);
        setLoadError('Could not load billing records. Please refresh and try again.');
        setPaymentRows([]);
        setSubscriptionRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const returnedPayments = useMemo(
    () => paymentRows.filter(isReturnedClassPayment),
    [paymentRows],
  );

  const officialReceipts = useMemo(
    () => mergeOfficialReceipts(paymentRows, subscriptionRows),
    [paymentRows, subscriptionRows],
  );

  const escrowAuthorizations = useMemo(
    () => buildEscrowAuthorizations(paymentRows),
    [paymentRows],
  );

  const [tablePage, setTablePage] = useState(1);
  const [chronoOrder, setChronoOrder] = useState<ChronologicalOrder>('latest');
  const [sourceFilters, setSourceFilters] = useState<string[]>([]);
  const { containerRef: tableContainerRef, pageSize: fitPageSize } = useFitPageSize({
    layout: 'table',
    fallback: 6,
    itemHeightOverride: 73,
  });

  const filteredOfficialReceipts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = officialReceipts.filter((row) => {
      const matchQuery =
        !q
        || `${row.orNumber} ${row.title} ${row.subtitle} ${row.kind}`.toLowerCase().includes(q);
      return matchQuery && matchesAnySelected(sourceFilters, row.kind);
    });
    return sortChronologically(matched, (row) => row.sortAt, chronoOrder);
  }, [officialReceipts, search, sourceFilters, chronoOrder]);

  const tablePageSize = Math.min(Math.max(fitPageSize, 1), 8);

  useEffect(() => {
    setTablePage(1);
  }, [search, chronoOrder, sourceFilters]);
  const totalPages = Math.max(1, Math.ceil(filteredOfficialReceipts.length / tablePageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const rangeStart =
    filteredOfficialReceipts.length === 0 ? 0 : (currentPage - 1) * tablePageSize + 1;
  const rangeEnd = Math.min(currentPage * tablePageSize, filteredOfficialReceipts.length);

  const pagedOfficialReceipts = useMemo(() => {
    const start = (currentPage - 1) * tablePageSize;
    return filteredOfficialReceipts.slice(start, start + tablePageSize);
  }, [filteredOfficialReceipts, currentPage, tablePageSize]);

  const reloadPayments = async () => {
    try {
      const result = await loadMemberBillingRecords();
      setLoadError(result.error);
      setPaymentRows(result.classRows);
      setSubscriptionRows(result.subscriptionRows);
    } catch (err) {
      console.error('MemberPaymentHistoryPage reload:', err);
      setLoadError('Could not load billing records. Please refresh and try again.');
      setPaymentRows([]);
      setSubscriptionRows([]);
    }
  };

  const handleDownloadOfficialReceipt = async (row: OfficialReceiptRow) => {
    setDownloadingOrKey(row.key);
    try {
      const { html, error } =
        row.kind === 'subscription'
          ? await fetchSubscriptionPackageReceiptHtml(row.receiptPaymentId)
          : await fetchClassPaymentReceiptHtml(row.receiptPaymentId);
      if (error || !html) {
        toast.error(error ?? 'Could not load official receipt.');
        return;
      }
      downloadOfficialReceiptPdfFromHtml(html, row.orNumber);
      toast.message('Use “Save as PDF” in the print dialog to download your official receipt.');
    } finally {
      setDownloadingOrKey(null);
    }
  };

  if (!user) return null;

  return (
    <>
      {returnedPayment ? (
        <MemberReturnedPaymentResubmitModal
          kind="class"
          payment={returnedPayment}
          onClose={() => setReturnedPayment(null)}
          onSuccess={() => void reloadPayments()}
        />
      ) : null}
      <MemberPageShell
        viewportBody="desktop"
        searchPlaceholder="Search official receipts…"
        onSearch={(query) => {
          setSearch(query);
          setTablePage(1);
        }}
      >
        <div className="md:flex md:h-full md:min-h-0 md:flex-col md:overflow-hidden">
          <div className="shrink-0 pt-6 mb-4 md:mb-3">
            <div className="flex items-center gap-2 mb-0.5">
              <CreditCard size={13} className="text-[#c49a3c]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Finances</span>
            </div>
            <h2 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}>
              Billing &amp; Receipts
            </h2>
            <p className="text-[#8A7E6E] text-xs mt-1 max-w-2xl hidden sm:block">
              Memberships issue official receipts right away. Drop-in class payments issue after the
              cancellation lock window or when the session is complete.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:overflow-hidden">
              {loadError && (
                <div className="mb-3 flex shrink-0 items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{loadError}</p>
                </div>
              )}

              {escrowAuthorizations.length > 0 ? (
                <div className="mb-3 shrink-0 rounded-2xl border border-sky-200/80 bg-sky-50/80 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEscrowOpen((open) => !open)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-sky-900">
                        Pending approval
                      </p>
                      <p className="text-[11px] text-sky-800/90 mt-0.5">
                        {escrowAuthorizations.length} drop-in booking
                        {escrowAuthorizations.length === 1 ? '' : 's'} pending approval
                      </p>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-sky-800 transition-transform ${escrowOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {escrowOpen ? (
                    <ul className="border-t border-sky-200/60 divide-y divide-sky-200/50 px-4 pb-3">
                      {escrowAuthorizations.map((row: EscrowAuthorizationRow) => (
                        <li key={row.key} className="py-2.5 text-xs leading-relaxed text-sky-950">
                          {row.pendingVerification ? (
                            <>
                              Payment of <strong>₱{row.amount.toLocaleString()}</strong> for{' '}
                              <strong>{row.className}</strong> is awaiting verification.
                            </>
                          ) : (
                            <>
                              Payment of <strong>₱{row.amount.toLocaleString()}</strong> on hold for{' '}
                              <strong>{row.className}</strong>
                              {' — '}
                              Official receipt issues on{' '}
                              <strong>{row.lockAtLabel === '—' ? 'lock date (after cancel window)' : row.lockAtLabel}</strong>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {returnedPayments.length > 0 ? (
                <div className="mb-3 shrink-0 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs font-semibold text-red-800">
                    {returnedPayments.length} returned payment{returnedPayments.length === 1 ? '' : 's'} — tap to
                    resubmit proof
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {returnedPayments.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setReturnedPayment(p)}
                        className="rounded-full border border-red-200 bg-white px-3 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100/80"
                      >
                        {p.uid} · {p.className?.trim() || p.serviceDescription?.trim() || 'Class'}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div
                ref={tableContainerRef}
                className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm"
              >
                <div className="shrink-0 border-b border-[#D4CDB5]/50 px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3
                        className="text-[#1E2A35] leading-none"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.05em' }}
                      >
                        Official receipts
                      </h3>
                      <p className="text-[10px] text-[#8A7E6E] mt-1">
                        Subscriptions (Mode 2) appear as soon as cleared · Drop-ins (Mode 1) after the lock window
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <CategorizedAddFilter
                        groups={[{
                          id: 'source',
                          label: 'Source',
                          options: [
                            { value: 'class_drop_in', label: 'Drop-in' },
                            { value: 'subscription', label: 'Credit pack' },
                          ],
                        }]}
                        selected={{ source: sourceFilters }}
                        onChange={(next) => setSourceFilters(next.source ?? [])}
                      />
                      <ChronologicalSortSelect value={chronoOrder} onChange={setChronoOrder} />
                    </div>
                  </div>
                </div>
                {loading ? (
                  <div className="flex flex-1 items-center justify-center px-6 py-8">
                    <p className="text-[#8A7E6E] text-sm">Loading billing records…</p>
                  </div>
                ) : filteredOfficialReceipts.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center px-6 py-8">
                    <div className="text-center max-w-sm">
                      <Receipt size={24} className="mx-auto text-[#D4CDB5] mb-3" />
                      <p className="text-[#B0A898] text-sm">
                        {officialReceipts.length === 0
                          ? 'No official receipts yet. Drop-ins pending approval appear above until they finalize.'
                          : 'No official receipts match your search.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-h-0 flex-1 overflow-auto">
                      <table className="w-full min-w-[40rem] text-left text-sm">
                        <thead className="sticky top-0 z-10 bg-[#FBF9F3]/95 backdrop-blur-sm border-b border-[#D4CDB5]/50">
                          <tr className="text-[10px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
                            <th className="px-4 py-2 sm:px-5">OR #</th>
                            <th className="px-4 py-2 sm:px-5">Purchase</th>
                            <th className="px-4 py-2 sm:px-5">Issued</th>
                            <th className="px-4 py-2 sm:px-5 text-right">Amount</th>
                            <th className="px-4 py-2 sm:px-5 text-right">PDF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedOfficialReceipts.map((row) => (
                            <tr key={row.key} className="border-b border-[#D4CDB5]/30 last:border-b-0">
                              <td className="px-4 py-3 font-mono text-xs text-[#1E2A35] sm:px-5">{row.orNumber}</td>
                              <td className="px-4 py-3 sm:px-5">
                                <p className="font-semibold text-[#1E2A35] text-sm">{row.title}</p>
                                <p className="text-[10px] text-[#9A8E7E]">{row.subtitle}</p>
                              </td>
                              <td className="px-4 py-3 text-xs text-[#5A5048] whitespace-nowrap sm:px-5">
                                {row.issuedAtLabel}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#1E2A35] sm:px-5">
                                ₱{row.amount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right sm:px-5">
                                <button
                                  type="button"
                                  disabled={downloadingOrKey === row.key}
                                  onClick={() => void handleDownloadOfficialReceipt(row)}
                                  className="action-button inline-flex items-center gap-1.5 rounded-full border border-[#D4CDB5]/70 bg-white px-3 py-1.5 text-[11px] font-bold text-[#1E2A35] hover:bg-[#F8F3E8] disabled:opacity-60"
                                >
                                  <Download size={13} />
                                  {downloadingOrKey === row.key ? 'Loading…' : 'Download PDF'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="shrink-0 border-t border-[#D4CDB5]/40 px-4 pb-3 pt-0 sm:px-5">
                      <AdminTablePagination
                        page={currentPage}
                        totalPages={totalPages}
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        total={filteredOfficialReceipts.length}
                        noun="receipts"
                        onPageChange={setTablePage}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
        </div>
      </MemberPageShell>
    </>
  );
}
