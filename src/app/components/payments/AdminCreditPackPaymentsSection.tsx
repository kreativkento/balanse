import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ProfileAvatar } from '../ProfileImages';
import { AdminTablePagination, useFitPageSize } from '../layout/AdminTablePagination';
import {
  adminReviewSubscriptionPackagePayment,
  fetchSubscriptionPackagePaymentsForAdmin,
  getPaymentProofSignedUrl,
  notifySubscriptionPackagePaymentsChanged,
  resolvePaymentProofDisplayName,
  type SubscriptionPackagePaymentDisplay,
} from '../../../lib/subscription-package-payment-service';

const REQUESTS_GRID_COLS =
  'grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,5.5rem)]';

const PH_TZ = 'Asia/Manila';

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

function formatRequestSubmittedAt(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function PendingCreditPackModal({
  payment,
  onClose,
  onApprove,
  onReject,
}: {
  payment: SubscriptionPackagePaymentDisplay;
  onClose: () => void;
  onApprove: (id: string) => void | Promise<void>;
  onReject: (id: string, note?: string) => void | Promise<void>;
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg my-4">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Credit pack payment</p>
            <h3
              className="text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
            >
              {payment.uid}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] hover:text-[#1E2A35] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-7 py-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <ProfileAvatar
              src={payment.studentPhotoUrl || undefined}
              initials={studentInitials(payment.buyerName)}
              alt={payment.buyerName}
              className="w-9 h-9 rounded-xl shrink-0 bg-[#c49a3c]/12 border border-[#c49a3c]/25"
              initialsClassName="text-[#a67f2e] text-xs font-bold"
            />
            <div>
              <p className="font-semibold text-[#1E2A35]">{payment.buyerName}</p>
              <p className="text-[#8A7E6E] text-sm">{payment.buyerEmail}</p>
            </div>
          </div>
          <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/40 p-4">
            <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">Package</p>
            <p className="font-semibold text-[#1E2A35]">{payment.packageName}</p>
            <p className="text-xs text-[#8A7E6E] mt-1">
              {payment.creditsGranted} credits · ₱{payment.amountPaid.toLocaleString()} · {payment.paymentMethodLabel}
            </p>
          </div>
          {proofUrl ? (
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">{proofDisplayName}</p>
              <a
                href={proofUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl overflow-hidden border border-[#D4CDB5]/60 hover:border-[#c49a3c]/45 hover:bg-[#FBF9F3] transition-colors"
              >
                <img src={proofUrl} alt="" className="w-full max-h-64 object-contain bg-[#FBF9F3]" />
              </a>
            </div>
          ) : null}
          {confirmReject ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-red-700 text-sm font-semibold mb-2">Reject payment?</p>
              <p className="text-red-600 text-xs mb-3">
                The member will be emailed and can edit and resubmit from Credits.
              </p>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Reason for rejection (shown to member)"
                className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm mb-3 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200/60 transition-shadow"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={() => void (async () => {
                    setReviewBusy(true);
                    await onReject(payment.id, rejectNote.trim());
                    setReviewBusy(false);
                  })()}
                  className="flex-1 py-2 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors"
                >
                  Confirm reject
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReject(false)}
                  className="px-4 py-2 text-sm text-[#8A7E6E] rounded-xl hover:bg-red-100/80 hover:text-red-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : confirmApprove ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="text-green-800 text-sm font-semibold mb-2">Approve and grant credits?</p>
              <p className="text-green-700 text-xs mb-3">
                Credits will post to the wallet, final accounting will be recorded, and e-receipt emails will send.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={() => void (async () => {
                    setReviewBusy(true);
                    await onApprove(payment.id);
                    setReviewBusy(false);
                  })()}
                  className="flex-1 py-2 rounded-full bg-green-700 text-white text-sm font-bold hover:bg-green-800 disabled:opacity-50 disabled:hover:bg-green-700 transition-colors"
                >
                  Confirm approve
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmApprove(false)}
                  className="px-4 py-2 text-sm text-[#8A7E6E] rounded-xl hover:bg-green-100/80 hover:text-green-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmApprove(true)}
                className="action-button flex-1 py-3 rounded-full bg-[#1E2A35] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#263545] hover:shadow-md transition-[background-color,box-shadow]"
              >
                <Check size={14} /> Approve
              </button>
              <button
                type="button"
                onClick={() => setConfirmReject(true)}
                className="flex-1 py-3 rounded-full border border-red-200 bg-white text-red-600 text-sm font-bold hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RequestStatusBadge({ status }: { status: SubscriptionPackagePaymentDisplay['status'] }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex text-[10px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        Pending
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex text-[10px] font-bold uppercase text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
        Cleared
      </span>
    );
  }
  return (
    <span className="inline-flex text-[10px] font-bold uppercase text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      Rejected
    </span>
  );
}

function RequestsTableRow({
  payment,
  onOpenPending,
}: {
  payment: SubscriptionPackagePaymentDisplay;
  onOpenPending: (p: SubscriptionPackagePaymentDisplay) => void;
}) {
  const isPending = payment.status === 'pending';
  const rowClass = `grid ${REQUESTS_GRID_COLS} gap-x-4 px-6 py-4 items-center min-h-[68px] min-w-0 border-b border-[#D4CDB5]/30 last:border-b-0 ${
    isPending
      ? 'hover:bg-[#F8F3E8] hover:ring-1 hover:ring-inset hover:ring-[#c49a3c]/25 cursor-pointer group transition-[background-color,box-shadow]'
      : 'bg-[#FBF9F3]/40 hover:bg-[#F8F3E8]/50 transition-colors'
  }`;

  const cells = (
    <>
      <div className="flex items-center gap-2.5 min-w-0">
        <ProfileAvatar
          src={payment.studentPhotoUrl || undefined}
          initials={studentInitials(payment.buyerName)}
          alt={payment.buyerName}
          className="w-9 h-9 rounded-xl shrink-0 bg-[#c49a3c]/12 border border-[#c49a3c]/25"
          initialsClassName="text-[#a67f2e] text-xs font-bold"
        />
        <div className="min-w-0">
          <p className="text-[#1E2A35] text-sm font-semibold truncate group-hover:text-[#c49a3c] transition-colors">
            {payment.buyerName}
          </p>
          <p className="text-[#B0A898] text-xs truncate">{payment.buyerEmail}</p>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[#1E2A35] text-sm font-medium truncate">{payment.packageName}</p>
        <p className="text-[#9A8E7E] text-xs truncate">
          {payment.creditsGranted} credits · {payment.packageUid}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-[#1E2A35] text-sm font-semibold tabular-nums truncate">
          ₱{payment.amountPaid.toLocaleString()}
        </p>
        <p className="text-[#9A8E7E] text-xs truncate">{payment.paymentMethodLabel}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[#8A7E6E] text-xs font-mono truncate">{payment.paymentReference || '—'}</p>
        <p className="text-[#B0A898] text-[10px] truncate">{formatRequestSubmittedAt(payment.createdAt)}</p>
      </div>
      <div className="flex items-center justify-end gap-1 shrink-0">
        <RequestStatusBadge status={payment.status} />
        {isPending ? (
          <ChevronRight size={14} className="text-[#C0B8A8] shrink-0 group-hover:text-[#c49a3c] transition-colors" />
        ) : null}
      </div>
    </>
  );

  if (isPending) {
    return (
      <button type="button" onClick={() => onOpenPending(payment)} className={`${rowClass} w-full text-left`}>
        {cells}
      </button>
    );
  }

  return <div className={rowClass}>{cells}</div>;
}

export function AdminCreditPackPaymentsSection({
  search,
  refreshSignal = 0,
  layout = 'list',
}: {
  search: string;
  refreshSignal?: number;
  layout?: 'list' | 'table';
}) {
  const [payments, setPayments] = useState<SubscriptionPackagePaymentDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPending, setSelectedPending] = useState<SubscriptionPackagePaymentDisplay | null>(null);
  const [page, setPage] = useState(1);
  const { containerRef, pageSize } = useFitPageSize({ fallback: 6, layout: 'table' });

  const reload = useCallback(async () => {
    const { data, error } = await fetchSubscriptionPackagePaymentsForAdmin();
    if (error) toast.error(error);
    else setPayments(data);
    notifySubscriptionPackagePaymentsChanged();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data, error } = await fetchSubscriptionPackagePaymentsForAdmin();
      if (cancelled) return;
      if (error) toast.error(error);
      else setPayments(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      payments.filter(
        (p) =>
          p.buyerName.toLowerCase().includes(q)
          || p.buyerEmail.toLowerCase().includes(q)
          || p.packageName.toLowerCase().includes(q)
          || p.uid.toLowerCase().includes(q)
          || p.paymentReference.toLowerCase().includes(q)
          || p.paymentMethodLabel.toLowerCase().includes(q),
      ),
    [payments, q],
  );

  const tableRows = useMemo(() => {
    const pending = filtered.filter((p) => p.status === 'pending');
    const rest = filtered.filter((p) => p.status !== 'pending');
    rest.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return [...pending, ...rest];
  }, [filtered]);

  const pending = filtered.filter((p) => p.status === 'pending');
  const history = filtered.filter((p) => p.status !== 'pending');

  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return tableRows.slice(start, start + pageSize);
  }, [tableRows, currentPage, pageSize]);
  const rangeStart = tableRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, tableRows.length);

  useEffect(() => {
    setPage(1);
  }, [search, refreshSignal, payments.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const approve = async (id: string) => {
    const result = await adminReviewSubscriptionPackagePayment(id, true);
    if (!result.success) {
      toast.error(result.error ?? 'Could not approve.');
      return;
    }
    toast.success('Approved — credits granted and validity started.');
    if (!result.feedbackEmailSent && result.feedbackEmailError) {
      toast.error(`Member approval email failed: ${result.feedbackEmailError}`);
    } else if (result.feedbackEmailSent) {
      toast.message('Congratulations email sent to the member.');
    }
    if (result.receiptEmailError) {
      toast.error(result.receiptEmailError);
    } else if (result.receiptEmailSent) {
      toast.message('E-receipt emailed to the member.');
    }
    setSelectedPending(null);
    await reload();
  };

  const reject = async (id: string, note = '') => {
    const result = await adminReviewSubscriptionPackagePayment(id, false, note);
    if (!result.success) {
      toast.error(result.error ?? 'Could not reject.');
      return;
    }
    if (result.feedbackEmailSent) {
      toast.success('Rejected — member notified by email with resubmit guidance.');
    } else {
      toast.success('Rejected.');
      if (result.feedbackEmailError) {
        toast.error(`Member rejection email failed: ${result.feedbackEmailError}`);
      }
    }
    setSelectedPending(null);
    await reload();
  };

  if (layout === 'table') {
    return (
      <>
        {selectedPending ? (
          <PendingCreditPackModal
            payment={selectedPending}
            onClose={() => setSelectedPending(null)}
            onApprove={approve}
            onReject={reject}
          />
        ) : null}

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div
            className={`grid ${REQUESTS_GRID_COLS} gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 shrink-0`}
          >
            {['Member', 'Package', 'Payment', 'Reference', 'Status'].map((h) => (
              <p
                key={h}
                className={`text-[#8A7E6E] text-xs uppercase tracking-widest font-medium ${
                  h === 'Status' ? 'text-right' : ''
                }`}
              >
                {h}
              </p>
            ))}
          </div>

          <div ref={containerRef} className="flex-1 min-h-[240px] overflow-hidden">
            {loading ? (
              <div className="px-6 py-14 text-center text-[#B0A898] text-sm">Loading checkout requests…</div>
            ) : tableRows.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-[#B0A898] text-sm">
                  {payments.length === 0
                    ? 'No checkout requests yet. New submissions from member credits checkout will appear here.'
                    : 'No requests match your search.'}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
                {pageRows.map((p) => (
                  <RequestsTableRow key={p.id} payment={p} onOpenPending={setSelectedPending} />
                ))}
              </div>
            )}
          </div>

          {!loading && tableRows.length > 0 ? (
            <div className="shrink-0 px-6 pb-4 pt-0">
              <AdminTablePagination
                page={currentPage}
                totalPages={totalPages}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                total={tableRows.length}
                noun="requests"
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <>
      {selectedPending ? (
        <PendingCreditPackModal
          payment={selectedPending}
          onClose={() => setSelectedPending(null)}
          onApprove={approve}
          onReject={reject}
        />
      ) : null}

      <div className="mb-4 flex items-center gap-2 text-[#8A7E6E] text-sm">
        <span>
          {loading ? 'Loading…' : `${pending.length} pending · ${history.length} reviewed`}
        </span>
      </div>

      {loading ? (
        <p className="text-[#8A7E6E] text-sm py-8 text-center">Loading credit pack payments…</p>
      ) : pending.length === 0 ? (
        <p className="text-[#B0A898] text-sm py-6 text-center">
          No pending checkout payments. New submissions from member credits checkout will appear here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 mb-8">
          {pending.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelectedPending(p)}
                className="w-full flex items-center gap-3 rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-3 text-left hover:border-[#c49a3c]/45 hover:bg-[#F8F3E8]/80 transition-colors"
              >
                <ProfileAvatar
                  src={p.studentPhotoUrl || undefined}
                  initials={studentInitials(p.buyerName)}
                  alt={p.buyerName}
                  className="w-9 h-9 rounded-xl shrink-0"
                  initialsClassName="text-xs font-bold"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1E2A35] truncate">{p.buyerName}</p>
                  <p className="text-xs text-[#8A7E6E] truncate">
                    {p.packageName} · ₱{p.amountPaid.toLocaleString()}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                  Pending
                </span>
                <ChevronRight size={16} className="text-[#B0A898] shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 ? (
        <>
          <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">History</p>
          <ul className="flex flex-col gap-2">
            {history.slice(0, 20).map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-[#D4CDB5]/40 bg-[#FBF9F3]/80 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1E2A35] truncate">{p.buyerName}</p>
                  <p className="text-xs text-[#8A7E6E] truncate">
                    {p.packageName} · {p.uid}
                  </p>
                </div>
                <RequestStatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
