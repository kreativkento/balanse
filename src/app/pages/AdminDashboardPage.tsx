import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  ChevronRight,
  CreditCard,
  ClipboardList,
  Newspaper,
  Users,
  CalendarRange,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  fetchAdminDashboardSnapshot,
  type AdminDashboardSnapshot,
} from '../../lib/admin-dashboard-service';
import { formatDateLongFromKey, getTodayDateKey } from '../components/calendar/weekCalendarUtils';

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D4CDB5]/55 bg-white px-4 py-3 shadow-sm min-w-0">
      <p className="text-[#9A8E7E] text-[10px] font-semibold uppercase tracking-widest truncate">
        {label}
      </p>
      <p
        className="text-[#1E2A35] leading-none mt-1.5 truncate"
        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.65rem', letterSpacing: '0.04em' }}
      >
        {value}
      </p>
      {hint ? <p className="text-[#B0A898] text-[11px] mt-1 truncate">{hint}</p> : null}
    </div>
  );
}

function ApprovalRow({
  to,
  icon,
  label,
  count,
  loading,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  count: number;
  loading: boolean;
}) {
  const hasWork = count > 0;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
        hasWork
          ? 'border-amber-200/90 bg-amber-50/80 hover:bg-amber-50'
          : 'border-[#E8E2D2]/80 bg-[#FBF9F3]/50 hover:bg-[#F8F3E8]'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          hasWork ? 'bg-amber-100 text-amber-700' : 'bg-[#EDE8D8] text-[#8A7E6E]'
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0 text-sm font-semibold text-[#1E2A35]">{label}</span>
      {loading ? (
        <Loader2 size={16} className="animate-spin text-[#B0A898] shrink-0" />
      ) : (
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
            hasWork ? 'bg-amber-200/80 text-amber-900' : 'bg-[#EDE8D8] text-[#8A7E6E]'
          }`}
        >
          {count}
        </span>
      )}
      <ChevronRight size={16} className="text-[#C0B8A8] shrink-0" />
    </Link>
  );
}

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

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[#8A7E6E] text-sm">{formatDateLongFromKey(getTodayDateKey())}</p>
          <h1
            className="text-[#1E2A35] leading-none mt-1"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', letterSpacing: '0.05em' }}
          >
            Overview
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="text-[#8A7E6E] text-xs font-semibold hover:text-[#1E2A35] disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {s?.error ? (
        <p className="text-red-600 text-sm mb-4" role="alert">
          {s.error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        <StatTile
          label="Clients"
          value={loading ? '—' : String(s?.clientCount ?? 0)}
        />
        <StatTile
          label="Pending pay"
          value={loading ? '—' : String(s?.pendingPayments ?? 0)}
          hint={loading ? undefined : pendingAmountLabel}
        />
        <StatTile
          label="Month revenue"
          value={
            loading
              ? '—'
              : `₱${Math.round(s?.approvedThisMonthRevenue ?? 0).toLocaleString()}`
          }
          hint={
            loading
              ? undefined
              : `${s?.approvedThisMonthCount ?? 0} approved`
          }
        />
        <StatTile
          label="Classes week"
          value={loading ? '—' : String(s?.classesThisWeek ?? 0)}
        />
      </div>

      <section className="mb-6">
        <h2
          className="text-[#1E2A35] mb-2.5"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.06em' }}
        >
          Needs your review
        </h2>
        <div className="flex flex-col gap-2">
          <ApprovalRow
            to="/admin-payments"
            icon={<CreditCard size={17} />}
            label="Class payments"
            count={s?.pendingPayments ?? 0}
            loading={loading}
          />
          <ApprovalRow
            to="/admin-coach-requests"
            icon={<ClipboardList size={17} />}
            label="Coach schedule requests"
            count={s?.portalRequestsPending ?? 0}
            loading={loading}
          />
          <ApprovalRow
            to="/admin-bulletin"
            icon={<Newspaper size={17} />}
            label="Bulletin posts"
            count={s?.bulletinPending ?? 0}
            loading={loading}
          />
        </div>
      </section>

      <section>
        <h2
          className="text-[#1E2A35] mb-2.5"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.06em' }}
        >
          Quick links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { to: '/admin-students', icon: <Users size={16} />, label: 'Clients' },
            { to: '/admin-classes', icon: <CalendarRange size={16} />, label: 'Class schedule' },
            { to: '/admin-payments', icon: <CreditCard size={16} />, label: 'Payments' },
            { to: '/admin-financial-metrics', icon: <BarChart3 size={16} />, label: 'Financial metrics' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-[#D4CDB5]/55 bg-white text-sm font-medium text-[#5A5048] hover:bg-[#F8F3E8] hover:text-[#1E2A35] transition-colors"
            >
              <span className="text-[#c49a3c]">{item.icon}</span>
              {item.label}
              <ChevronRight size={14} className="ml-auto text-[#C0B8A8]" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
