import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  ChevronRight,
  CreditCard,
  ClipboardList,
  Newspaper,
  Users,
  CalendarRange,
  Coins,
  Loader2,
  RefreshCcw,
  Receipt,
  Wallet,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  fetchAdminDashboardSnapshot,
  type AdminDashboardSnapshot,
} from '../../lib/admin-dashboard-service';
import { formatDateLongFromKey, getTodayDateKey } from '../components/calendar/weekCalendarUtils';

function StatCard({
  to,
  icon,
  iconWrap,
  label,
  value,
  hint,
}: {
  to: string;
  icon: ReactNode;
  iconWrap: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 flex-col rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-4 shadow-sm transition-colors hover:border-[#c49a3c]/40 hover:bg-[#FBF9F3]"
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-[#9A8E7E]">
            {label}
          </p>
          <p
            className="mt-1 truncate leading-none text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.7rem', letterSpacing: '0.04em' }}
          >
            {value}
          </p>
        </div>
      </div>
      {hint ? (
        <p className="mt-2 truncate text-[11px] text-[#B0A898]">{hint}</p>
      ) : (
        <p className="mt-2 text-[11px] text-[#C0B8A8] opacity-0 transition-opacity group-hover:opacity-100">
          Open
        </p>
      )}
    </Link>
  );
}

function ApprovalRow({
  to,
  icon,
  label,
  detail,
  count,
  loading,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  detail: string;
  count: number;
  loading: boolean;
}) {
  const hasWork = count > 0;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
        hasWork ? 'bg-amber-50/70 hover:bg-amber-50' : 'hover:bg-[#F8F3E8]/80'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          hasWork ? 'bg-amber-100 text-amber-800' : 'bg-[#EDE8D8] text-[#8A7E6E]'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#1E2A35]">{label}</span>
        <span className="mt-0.5 block truncate text-[11px] text-[#9A8E7E]">{detail}</span>
      </span>
      {loading ? (
        <Loader2 size={16} className="shrink-0 animate-spin text-[#B0A898]" />
      ) : (
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            hasWork ? 'bg-amber-200/90 text-amber-950' : 'bg-[#EDE8D8] text-[#8A7E6E]'
          }`}
        >
          {count}
        </span>
      )}
      <ChevronRight size={16} className="shrink-0 text-[#C0B8A8]" />
    </Link>
  );
}

const QUICK_LINKS = [
  {
    to: '/admin-students',
    icon: <Users size={18} />,
    label: 'Clients',
    detail: 'Directory and profiles',
  },
  {
    to: '/admin-classes',
    icon: <CalendarRange size={18} />,
    label: 'Class schedule',
    detail: 'Sessions this week',
  },
  {
    to: '/admin-payments',
    icon: <CreditCard size={18} />,
    label: 'Payments',
    detail: 'Escrow and receipts',
  },
  {
    to: '/admin-credits',
    icon: <Coins size={18} />,
    label: 'Credits',
    detail: 'Packs and overrides',
  },
  {
    to: '/admin-official-receipts',
    icon: <Receipt size={18} />,
    label: 'OR register',
    detail: 'Issued official receipts',
  },
  {
    to: '/admin-coach-requests',
    icon: <ClipboardList size={18} />,
    label: 'Coach requests',
    detail: 'Schedule changes',
  },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchAdminDashboardSnapshot();
    setSnapshot(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (!adminUser) return;
    void load();
  }, [adminUser, load]);

  if (!adminUser) return null;

  const s = snapshot;
  const pendingAmountLabel =
    s && s.pendingPaymentAmount > 0
      ? `₱${Math.round(s.pendingPaymentAmount).toLocaleString()} awaiting`
      : 'None awaiting';
  const reviewTotal =
    (s?.pendingPayments ?? 0) + (s?.portalRequestsPending ?? 0) + (s?.bulletinPending ?? 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-[#8A7E6E]">
              {formatDateLongFromKey(getTodayDateKey())}
            </p>
            <h2
              className="mt-1 leading-none text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '0.04em' }}
            >
              Overview
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-[#D4CDB5]/70 bg-white px-4 py-2 text-xs font-semibold text-[#5A5048] shadow-sm transition-colors hover:bg-[#EDE8D8] hover:text-[#1E2A35] disabled:opacity-50"
          >
            <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {s?.error ? (
          <p className="mb-4 shrink-0 text-sm text-red-600" role="alert">
            {s.error}
          </p>
        ) : null}

        <div className="mb-6 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            to="/admin-students"
            icon={<Users size={17} className="text-[#745b3c]" />}
            iconWrap="bg-[#EDE8D8]"
            label="Clients"
            value={loading ? '—' : String(s?.clientCount ?? 0)}
            hint="Active member accounts"
          />
          <StatCard
            to="/admin-payments"
            icon={<CreditCard size={17} className="text-amber-800" />}
            iconWrap="bg-amber-50"
            label="Pending pay"
            value={loading ? '—' : String(s?.pendingPayments ?? 0)}
            hint={loading ? undefined : pendingAmountLabel}
          />
          <StatCard
            to="/admin-official-receipts"
            icon={<Wallet size={17} className="text-green-700" />}
            iconWrap="bg-green-50"
            label="Month revenue"
            value={
              loading
                ? '—'
                : `₱${Math.round(s?.approvedThisMonthRevenue ?? 0).toLocaleString()}`
            }
            hint={
              loading ? undefined : `${s?.approvedThisMonthCount ?? 0} approved this month`
            }
          />
          <StatCard
            to="/admin-classes"
            icon={<CalendarRange size={17} className="text-sky-800" />}
            iconWrap="bg-sky-50"
            label="Classes week"
            value={loading ? '—' : String(s?.classesThisWeek ?? 0)}
            hint="Sessions on this week's calendar"
          />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#D4CDB5]/40 px-5 py-4">
              <div>
                <h3
                  className="leading-none text-[#1E2A35]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.06em' }}
                >
                  Needs your review
                </h3>
                <p className="mt-1 text-[11px] text-[#9A8E7E]">
                  {loading
                    ? 'Loading queues…'
                    : reviewTotal === 0
                      ? 'Nothing waiting right now'
                      : `${reviewTotal} item${reviewTotal === 1 ? '' : 's'} in queue`}
                </p>
              </div>
            </div>
            <div className="divide-y divide-[#EDE8D8]">
              <ApprovalRow
                to="/admin-payments"
                icon={<CreditCard size={17} />}
                label="Class payments"
                detail="Approvals, escrow, and refunds"
                count={s?.pendingPayments ?? 0}
                loading={loading}
              />
              <ApprovalRow
                to="/admin-coach-requests"
                icon={<ClipboardList size={17} />}
                label="Coach schedule requests"
                detail="Holds, swaps, and coverage"
                count={s?.portalRequestsPending ?? 0}
                loading={loading}
              />
              <ApprovalRow
                to="/admin-bulletin"
                icon={<Newspaper size={17} />}
                label="Bulletin posts"
                detail="Member posts awaiting approval"
                count={s?.bulletinPending ?? 0}
                loading={loading}
              />
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm">
            <div className="border-b border-[#D4CDB5]/40 px-5 py-4">
              <h3
                className="leading-none text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.06em' }}
              >
                Quick links
              </h3>
              <p className="mt-1 text-[11px] text-[#9A8E7E]">Jump to everyday desks</p>
            </div>
            <div className="grid grid-cols-1 gap-px bg-[#EDE8D8] sm:grid-cols-2">
              {QUICK_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 bg-white px-4 py-3.5 text-left transition-colors hover:bg-[#F8F3E8]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EDE8D8] text-[#c49a3c]">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#1E2A35]">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-[#9A8E7E]">{item.detail}</span>
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-[#C0B8A8]" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
