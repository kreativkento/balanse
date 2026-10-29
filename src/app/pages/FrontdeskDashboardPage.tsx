import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Ban,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  Coins,
  CreditCard,
  Loader2,
  Newspaper,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  fetchAdminDashboardSnapshot,
  type AdminDashboardSnapshot,
} from '../../lib/admin-dashboard-service';
import { formatDateLongFromKey, getTodayDateKey } from '../components/calendar/weekCalendarUtils';
import { DashboardWeekdayChart } from '../components/dashboard/DashboardWeekdayChart';
import { useFrontdeskCancelNotifyCount } from '../hooks/useFrontdeskCancelNotifyCount';

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#D4CDB5]/55 bg-white px-4 py-3 shadow-sm">
      <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-[#9A8E7E]">{label}</p>
      <p
        className="mt-1.5 truncate leading-none text-[#1E2A35]"
        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.65rem', letterSpacing: '0.04em' }}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 truncate text-[11px] text-[#B0A898]">{hint}</p> : null}
    </div>
  );
}

function ActionRow({
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
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
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
      <span className="min-w-0 flex-1 text-sm font-semibold text-[#1E2A35]">{label}</span>
      {loading ? (
        <Loader2 size={16} className="shrink-0 animate-spin text-[#B0A898]" />
      ) : (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
            hasWork ? 'bg-amber-200/80 text-amber-900' : 'bg-[#EDE8D8] text-[#8A7E6E]'
          }`}
        >
          {count}
        </span>
      )}
      <ChevronRight size={16} className="shrink-0 text-[#C0B8A8]" />
    </Link>
  );
}

export default function FrontdeskDashboardPage() {
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelNotifyCount = useFrontdeskCancelNotifyCount();

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchAdminDashboardSnapshot();
    setSnapshot(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const s = snapshot;
  const pendingAmountLabel =
    s && s.pendingPaymentAmount > 0
      ? `₱${Math.round(s.pendingPaymentAmount).toLocaleString()} awaiting`
      : 'None awaiting';

  return (
    <div className="mx-auto max-w-8xl px-6 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[#8A7E6E]">{formatDateLongFromKey(getTodayDateKey())}</p>
          <h2
            className="mt-1 leading-none text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.04em' }}
          >
            Front desk overview
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-[#D4CDB5]/70 bg-white px-4 py-2 text-xs font-semibold text-[#5A5048] shadow-sm hover:bg-[#EDE8D8] disabled:opacity-50"
        >
          <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {s?.error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {s.error}
        </p>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Clients" value={loading ? '—' : String(s?.clientCount ?? 0)} />
        <StatTile
          label="Pending pay"
          value={loading ? '—' : String(s?.pendingPayments ?? 0)}
          hint={loading ? undefined : pendingAmountLabel}
        />
        <StatTile
          label="Pack checkouts"
          value={loading ? '—' : String(s?.pendingPackPayments ?? 0)}
        />
        <StatTile label="Classes week" value={loading ? '—' : String(s?.classesThisWeek ?? 0)} />
        <StatTile label="Today" value={loading ? '—' : String(s?.classesToday ?? 0)} />
        <StatTile label="Cancellations" value={String(cancelNotifyCount)} hint="Need student notify" />
      </div>

      <div className="mb-6">
        <DashboardWeekdayChart
          data={s?.classesByWeekday ?? []}
          loading={loading}
          title="Studio classes this week"
          hint="Live sessions on the calendar"
        />
      </div>

      <section className="mb-6">
        <h2
          className="mb-2.5 text-[#1E2A35]"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.05em' }}
        >
          Needs attention
        </h2>
        <div className="flex flex-col gap-2">
          <ActionRow
            to="/frontdesk-payments"
            icon={<CreditCard size={17} />}
            label="Payment approvals"
            count={s?.pendingPayments ?? 0}
            loading={loading}
          />
          <ActionRow
            to="/frontdesk-payments"
            icon={<Coins size={17} />}
            label="Credit pack checkouts"
            count={s?.pendingPackPayments ?? 0}
            loading={loading}
          />
          <ActionRow
            to="/frontdesk-bookings"
            icon={<ClipboardList size={17} />}
            label="Bookings queue"
            count={s?.portalRequestsPending ?? 0}
            loading={loading}
          />
          <ActionRow
            to="/frontdesk-cancellations"
            icon={<Ban size={17} />}
            label="Cancellations to notify"
            count={cancelNotifyCount}
            loading={false}
          />
          <ActionRow
            to="/frontdesk-bulletin"
            icon={<Newspaper size={17} />}
            label="Bulletin pending"
            count={s?.bulletinPending ?? 0}
            loading={loading}
          />
        </div>
      </section>

      <section>
        <h2
          className="mb-2.5 text-[#1E2A35]"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.05em' }}
        >
          Quick links
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { to: '/frontdesk-students', icon: <Users size={16} />, label: 'Clients' },
            { to: '/frontdesk-classes', icon: <CalendarRange size={16} />, label: 'Class schedule' },
            { to: '/frontdesk-cancellations', icon: <Ban size={16} />, label: 'Cancellations' },
            { to: '/frontdesk-payments', icon: <CreditCard size={16} />, label: 'Payments' },
            { to: '/frontdesk-bulletin', icon: <Newspaper size={16} />, label: 'Bulletin' },
            { to: '/frontdesk-policies', icon: <ShieldCheck size={16} />, label: 'Policies' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2.5 rounded-xl border border-[#D4CDB5]/55 bg-white px-3.5 py-2.5 text-sm font-medium text-[#5A5048] transition-colors hover:bg-[#F8F3E8] hover:text-[#1E2A35]"
            >
              <span className="text-[#5A7A6A]">{item.icon}</span>
              {item.label}
              <ChevronRight size={14} className="ml-auto text-[#C0B8A8]" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
