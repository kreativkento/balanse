import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CreditCard, Check, X,
  Receipt, Download, Clock, CheckCircle2, Smartphone, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { AdminTablePagination, useFitPageSize } from '../components/layout/AdminTablePagination';
import { ProfileIncompleteState } from '../components/ProfileIncompleteState';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import {
  fetchClassPaymentsForMember,
  type ClassPaymentDisplay,
  type ClassPaymentStatus,
} from '../../lib/class-payment-service';

type PaymentStatus = ClassPaymentStatus;

interface PaymentRecord {
  id: string;
  uid: string;
  class: string;
  coach: string;
  date: string;
  time: string;
  amount: number;
  method: string;
  ref: string;
  submittedAt: string;
  status: PaymentStatus;
  receiptSent: boolean;
  issuedAt?: string;
  rejectionNote?: string;
}

const PH_TZ = 'Asia/Manila';

function formatSessionDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatSessionTime(startIso: string | null, endIso: string | null): string {
  if (!startIso) return '—';
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const start = timeFmt.format(new Date(startIso));
  if (!endIso) return start;
  const end = timeFmt.format(new Date(endIso));
  return `${start} – ${end}`;
}

function formatSubmittedAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours >= 0 && diffHours < 48) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    if (diffHours < 1) {
      const mins = Math.round(diffMs / (1000 * 60));
      return rtf.format(-mins, 'minute');
    }
    return rtf.format(-Math.round(diffHours), 'hour');
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatIssuedAt(iso: string | null): string | undefined {
  if (!iso) return undefined;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function mapPaymentToRecord(row: ClassPaymentDisplay): PaymentRecord {
  return {
    id: row.id,
    uid: row.uid,
    class: row.className?.trim() || row.serviceDescription?.trim() || 'Class',
    coach: row.coachNames?.trim() || '—',
    date: formatSessionDate(row.classStartsAt),
    time: formatSessionTime(row.classStartsAt, row.classEndsAt),
    amount: row.amountPaid,
    method: row.paymentMethodLabel?.trim() || 'Payment',
    ref: row.paymentReference?.trim() || '—',
    submittedAt: formatSubmittedAt(row.createdAt),
    status: row.status,
    receiptSent: row.emailReceiptSent,
    issuedAt: formatIssuedAt(row.receiptIssuedAt),
    rejectionNote: row.status === 'rejected' && row.reviewNote.trim()
      ? row.reviewNote.trim()
      : undefined,
  };
}

function MethodIcon({ method }: { method: string }) {
  const lower = method.toLowerCase();
  if (lower.includes('gcash')) return <Smartphone size={13} style={{ color: '#007DFF' }} />;
  if (lower.includes('maya')) return <Smartphone size={13} style={{ color: '#46BFA8' }} />;
  return <CreditCard size={13} className="text-[#3A4A5A]" />;
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const map = {
    approved: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${map[status]}`}>
      {status}
    </span>
  );
}

function PaymentDetailModal({ payment, onClose }: { payment: PaymentRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md my-4">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Payment Receipt</p>
            <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
              {payment.uid}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={payment.status} />
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-7 py-6 flex flex-col gap-4">
          <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/40 p-4">
            <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">Class</p>
            <p className="text-[#1E2A35] font-semibold">{payment.class}</p>
            <p className="text-[#9A8E7E] text-xs mt-0.5">{payment.date} · {payment.time} · Coach {payment.coach}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Amount', value: `₱${payment.amount.toLocaleString()}`, bold: true },
              { label: 'Method', value: payment.method },
              { label: 'Reference', value: payment.ref },
              { label: 'Submitted', value: payment.submittedAt },
              ...(payment.issuedAt ? [{ label: 'Receipt Issued', value: payment.issuedAt }] : []),
              ...(payment.receiptSent ? [{ label: 'E-Receipt', value: '✓ Sent to email' }] : []),
            ].map((item) => (
              <div key={item.label} className="bg-white border border-[#D4CDB5]/50 rounded-xl p-3">
                <p className="text-[#9A8E7E] text-xs mb-1">{item.label}</p>
                <p className={`text-[#1E2A35] text-sm ${item.bold ? 'font-bold' : 'font-medium'} truncate`}>{item.value}</p>
              </div>
            ))}
          </div>

          {payment.rejectionNote && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
              <X size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 text-xs font-semibold mb-0.5">Rejection Reason</p>
                <p className="text-red-600 text-xs leading-relaxed">{payment.rejectionNote}</p>
              </div>
            </div>
          )}

          {payment.status === 'approved' && (
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              <p className="text-green-700 text-xs">
                {payment.receiptSent
                  ? 'E-receipt was sent to your registered email address.'
                  : 'Payment approved — e-receipt will be sent when issued.'}
              </p>
            </div>
          )}
        </div>

        <div className="px-7 pb-7 flex gap-3">
          {payment.status === 'approved' && (
            <button
              type="button"
              disabled
              title="Receipt download coming soon"
              className="action-button flex-1 py-3 rounded-full bg-[#1E2A35]/40 text-white cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download size={13} /> Download Receipt
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all ${payment.status === 'approved' ? '' : 'w-full'}`}
            style={payment.status === 'approved' ? { minWidth: '90px' } : {}}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MemberPaymentHistoryPage() {
  const navigate = useNavigate();
  const { user, profileComplete } = useAuth();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | PaymentStatus>('all');
  const [selected, setSelected] = useState<PaymentRecord | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !profileComplete) {
      setPayments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      const { data, error } = await fetchClassPaymentsForMember();
      if (cancelled) return;
      if (error) {
        setLoadError(error);
        setPayments([]);
      } else {
        setPayments(data.map(mapPaymentToRecord));
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, profileComplete]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter((p) => {
      const matchSearch =
        p.class.toLowerCase().includes(q)
        || p.ref.toLowerCase().includes(q)
        || p.coach.toLowerCase().includes(q)
        || p.uid.toLowerCase().includes(q);
      const matchFilter = filter === 'all' || p.status === filter;
      return matchSearch && matchFilter;
    });
  }, [payments, search, filter]);

  const [tablePage, setTablePage] = useState(1);
  const { containerRef: tableContainerRef, pageSize: fitPageSize } = useFitPageSize({
    layout: 'table',
    fallback: 6,
    itemHeightOverride: 73,
  });
  const tablePageSize = Math.min(Math.max(fitPageSize, 1), 8);

  useEffect(() => {
    setTablePage(1);
  }, [search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / tablePageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * tablePageSize + 1;
  const rangeEnd = Math.min(currentPage * tablePageSize, filtered.length);

  const pagedPayments = useMemo(() => {
    const start = (currentPage - 1) * tablePageSize;
    return filtered.slice(start, start + tablePageSize);
  }, [filtered, currentPage, tablePageSize]);

  const totals = useMemo(
    () => ({
      total: payments.length,
      approved: payments.filter((p) => p.status === 'approved').length,
      pending: payments.filter((p) => p.status === 'pending').length,
      rejected: payments.filter((p) => p.status === 'rejected').length,
      spent: payments
        .filter((p) => p.status === 'approved')
        .reduce((s, p) => s + p.amount, 0),
    }),
    [payments],
  );

  if (!user) return null;

  return (
    <>
      {selected && <PaymentDetailModal payment={selected} onClose={() => setSelected(null)} />}

      <MemberPageShell
        viewportBody="desktop"
        searchPlaceholder="Search payments…"
        onSearch={(query) => {
          setSearch(query);
          setTablePage(1);
        }}
      >
        <div className="md:flex md:h-full md:min-h-0 md:flex-col md:overflow-hidden">
          <div className="shrink-0 pt-6 mb-4 md:mb-3">
            <div className="flex items-center gap-2 mb-0.5">
              <CreditCard size={13} className="text-[#c49a3c]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Account › Payments</span>
            </div>
            <h2 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}>
              Payment History
            </h2>
          </div>

          {!profileComplete && (
            <div className={`bg-white border border-[#D4CDB5]/60 rounded-3xl shadow-sm ${CARD_HOVER_GROW}`}>
              <ProfileIncompleteState
                description="Complete your profile to view your payment history and track your class payments."
              />
            </div>
          )}

          {profileComplete && (
            <div className="flex min-h-0 flex-1 flex-col md:overflow-hidden">
              {loadError && (
                <div className="mb-3 flex shrink-0 items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{loadError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
                {[
                  { label: 'Total Paid', value: `₱${totals.spent.toLocaleString()}`, icon: <CreditCard size={15} className="text-[#c49a3c]" />, bg: 'bg-[#c49a3c]/10', border: 'border-[#c49a3c]/25' },
                  { label: 'Approved', value: String(totals.approved), icon: <Check size={15} className="text-green-600" />, bg: 'bg-green-50', border: 'border-green-200' },
                  { label: 'Pending', value: String(totals.pending), icon: <Clock size={15} className="text-amber-600" />, bg: 'bg-amber-50', border: 'border-amber-200' },
                  { label: 'Rejected', value: String(totals.rejected), icon: <X size={15} className="text-red-500" />, bg: 'bg-red-50', border: 'border-red-200' },
                ].map((s) => (
                  <div key={s.label} className={`bg-white rounded-2xl border shadow-sm px-4 py-3.5 flex items-center gap-3 min-w-0 ${s.border}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>{s.icon}</div>
                    <div className="min-w-0">
                      <p className="text-[#8A7E6E] text-xs uppercase tracking-widest truncate">{s.label}</p>
                      <p className="text-[#1E2A35] leading-none truncate" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.04em' }}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-3 shrink-0">
                <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm w-fit max-w-full overflow-x-auto">
                  {(['all', 'approved', 'pending', 'rejected'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${filter === f ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={tableContainerRef}
                className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm"
              >
                {loading ? (
                  <div className="flex flex-1 items-center justify-center px-6 py-8">
                    <div className="text-center">
                      <Clock size={24} className="mx-auto text-[#c49a3c] mb-3 animate-pulse" />
                      <p className="text-[#8A7E6E] text-sm">Loading your payments…</p>
                    </div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center px-6 py-8">
                    <div className="text-center">
                      <Receipt size={24} className="mx-auto text-[#D4CDB5] mb-3" />
                      <p className="text-[#B0A898] text-sm">
                        {payments.length === 0 ? 'No payments yet' : 'No payments match your search'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-h-0 flex-1 overflow-hidden divide-y divide-[#D4CDB5]/30">
                      {pagedPayments.map((p) => (
                        <div
                          key={p.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelected(p)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelected(p);
                            }
                          }}
                          className="grid w-full min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-1 px-4 py-3.5 transition-colors hover:bg-[#F8F3E8]/70 group sm:gap-x-3 sm:px-5 sm:py-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,5.5rem)_auto_auto]"
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            p.status === 'approved' ? 'bg-green-50 border border-green-200' :
                            p.status === 'pending' ? 'bg-amber-50 border border-amber-200' :
                            'bg-red-50 border border-red-200'
                          }`}
                          >
                            {p.status === 'approved' ? <Check size={15} className="text-green-600" /> :
                             p.status === 'pending' ? <Clock size={15} className="text-amber-600" /> :
                             <X size={15} className="text-red-500" />}
                          </div>

                          <div className="min-w-0">
                            <p className="text-[#1E2A35] text-sm font-semibold group-hover:text-[#c49a3c] transition-colors truncate">{p.class}</p>
                            <p className="text-[#9A8E7E] text-xs truncate">{p.date} · {p.time} · Coach {p.coach}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-[#8A7E6E] text-[0.65rem] truncate sm:hidden">
                              <MethodIcon method={p.method} />
                              <span className="truncate">{p.method}</span>
                            </p>
                          </div>

                          <div className="hidden md:flex items-center gap-1.5 min-w-0 shrink-0">
                            <MethodIcon method={p.method} />
                            <span className="text-[#8A7E6E] text-xs truncate">{p.method}</span>
                          </div>

                          <p className="text-[#1E2A35] font-bold shrink-0 tabular-nums" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.04em' }}>
                            ₱{p.amount.toLocaleString()}
                          </p>

                          <div className="shrink-0 justify-self-end">
                            <StatusBadge status={p.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="shrink-0 border-t border-[#D4CDB5]/40 px-4 pb-3 pt-0 sm:px-5">
                      <AdminTablePagination
                        page={currentPage}
                        totalPages={totalPages}
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        total={filtered.length}
                        noun="payments"
                        onPageChange={setTablePage}
                      />
                      <p className="text-[#B0A898] text-[0.65rem] mt-1 text-center sm:text-xs">
                        Click any row to view receipt details
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </MemberPageShell>
    </>
  );
}
