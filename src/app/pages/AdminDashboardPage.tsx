import { useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';
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
  Award,
  Wallet,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  fetchAdminDashboardSnapshot,
  type AdminDashboardSnapshot,
} from '../../lib/admin-dashboard-service';
import { formatDateLongFromKey, getTodayDateKey } from '../components/calendar/weekCalendarUtils';
import { ContentSkeleton } from '../components/layout/PageLoadingScreen';
import { DashboardWeekdayChart } from '../components/dashboard/DashboardWeekdayChart';
import { AdminInsightPanel } from '../components/dashboard/AdminInsightPanel';

function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString('en-PH')}`;
}

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
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.65rem', letterSpacing: '0.04em' }}
          >
            {value}
          </p>
        </div>
      </div>
      {hint ? <p className="mt-2 truncate text-[11px] text-[#B0A898]">{hint}</p> : null}
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

const MIX_COLORS = {
  classes: '#1E2A35',
  packs: '#c49a3c',
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightOpen, setInsightOpen] = useState(false);

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

  const mixData = useMemo(() => {
    const classes = Math.round(snapshot?.classRevenueThisMonth ?? 0);
    const packs = Math.round(snapshot?.packRevenueThisMonth ?? 0);
    return [
      { name: 'Class payments', key: 'classes', value: classes },
      { name: 'Credit packs', key: 'packs', value: packs },
    ].filter((row) => row.value > 0);
  }, [snapshot]);

  if (!adminUser) return null;

  const s = snapshot;
  const pendingInflow = (s?.pendingPaymentAmount ?? 0) + (s?.pendingPackAmount ?? 0);
  const pendingCount = (s?.pendingPayments ?? 0) + (s?.pendingPackPayments ?? 0);
  const reviewTotal =
    pendingCount + (s?.portalRequestsPending ?? 0) + (s?.bulletinPending ?? 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mx-auto flex w-full max-w-8xl min-h-0 flex-1 flex-col px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-[#8A7E6E]">
              {formatDateLongFromKey(getTodayDateKey())}
            </p>
            <h2
              className="mt-1 leading-none text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.04em' }}
            >
              Studio overview
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setInsightOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#c49a3c]/45 bg-[#FBF6EA] px-4 py-2 text-xs font-semibold text-[#745b3c] shadow-sm transition-colors hover:bg-[#F3E6C4] hover:text-[#1E2A35]"
            >
              <Sparkles size={13} />
              AI Summary
            </button>
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
        </div>

        {s?.error ? (
          <p className="mb-4 shrink-0 text-sm text-red-600" role="alert">
            {s.error}
          </p>
        ) : null}

        <div className="mb-5 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            to="/admin-official-receipts"
            icon={<Wallet size={17} className="text-green-700" />}
            iconWrap="bg-green-50"
            label="Revenue this month"
            value={loading ? '—' : formatPeso(s?.approvedThisMonthRevenue ?? 0)}
            hint={
              loading
                ? undefined
                : `${s?.approvedThisMonthCount ?? 0} approved payment${(s?.approvedThisMonthCount ?? 0) === 1 ? '' : 's'}`
            }
          />
          <StatCard
            to="/admin-payments"
            icon={<CreditCard size={17} className="text-amber-800" />}
            iconWrap="bg-amber-50"
            label="Awaiting review"
            value={loading ? '—' : formatPeso(pendingInflow)}
            hint={
              loading
                ? undefined
                : pendingCount > 0
                  ? `${pendingCount} class / pack payment${pendingCount === 1 ? '' : 's'}`
                  : 'No pending inflows'
            }
          />
          <StatCard
            to="/admin-credits"
            icon={<Coins size={17} className="text-[#745b3c]" />}
            iconWrap="bg-[#EDE8D8]"
            label="Credit pack sales"
            value={loading ? '—' : formatPeso(s?.packRevenueThisMonth ?? 0)}
            hint={
              loading
                ? undefined
                : `${s?.pendingPackPayments ?? 0} pack checkout${(s?.pendingPackPayments ?? 0) === 1 ? '' : 's'} pending`
            }
          />
          <StatCard
            to="/admin-classes"
            icon={<CalendarRange size={17} className="text-sky-800" />}
            iconWrap="bg-sky-50"
            label="Classes this week"
            value={loading ? '—' : String(s?.classesThisWeek ?? 0)}
            hint={loading ? undefined : `${s?.classesToday ?? 0} on today's calendar`}
          />
        </div>

        <div className="mb-5 grid min-h-0 shrink-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
          <section className="rounded-3xl border border-[#D4CDB5]/60 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3
                className="leading-none text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}
              >
                Revenue, last 6 months
              </h3>
              <p className="mt-1 text-[11px] text-[#9A8E7E]">Approved class payments and credit packs (₱)</p>
            </div>
            {loading ? (
              <ContentSkeleton variant="list" className="py-2" />
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s?.revenueByMonth ?? []} barGap={4} barCategoryGap="28%">
                    <CartesianGrid stroke="#EDE8D8" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#8A7E6E', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#8A7E6E', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      tickFormatter={(value: number) =>
                        value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
                      }
                    />
                    <Tooltip
                      cursor={{ fill: '#F8F3E8' }}
                      formatter={(value) => formatPeso(Number(value ?? 0))}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #E8E2D2',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="classes" name="Classes" stackId="rev" fill={MIX_COLORS.classes} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="packs" name="Credit packs" stackId="rev" fill={MIX_COLORS.packs} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[#8A7E6E]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[#1E2A35]" /> Classes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[#c49a3c]" /> Credit packs
              </span>
            </div>
          </section>

          <section className="rounded-3xl border border-[#D4CDB5]/60 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3
                className="leading-none text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}
              >
                This month mix
              </h3>
              <p className="mt-1 text-[11px] text-[#9A8E7E]">Share of approved inflows</p>
            </div>
            {loading ? (
              <ContentSkeleton variant="form" />
            ) : mixData.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#9A8E7E]">No approved payments this month yet.</p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mixData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {mixData.map((row) => (
                        <Cell
                          key={row.key}
                          fill={row.key === 'packs' ? MIX_COLORS.packs : MIX_COLORS.classes}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatPeso(Number(value ?? 0))}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #E8E2D2',
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {!loading && mixData.length > 0 ? (
              <div className="mt-1 space-y-1.5 text-[12px] text-[#5A5048]">
                <p>
                  Classes {formatPeso(s?.classRevenueThisMonth ?? 0)}
                </p>
                <p>
                  Credit packs {formatPeso(s?.packRevenueThisMonth ?? 0)}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <div className="mb-5 shrink-0">
          <DashboardWeekdayChart
            data={s?.classesByWeekday ?? []}
            loading={loading}
            title="Classes this week"
            hint="Live sessions on the studio calendar (not cancelled)"
          />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#D4CDB5]/40 px-5 py-4">
              <div>
                <h3
                  className="leading-none text-[#1E2A35]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}
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
                detail={
                  loading
                    ? 'Approvals and escrow'
                    : `${formatPeso(s?.pendingPaymentAmount ?? 0)} awaiting approval`
                }
                count={s?.pendingPayments ?? 0}
                loading={loading}
              />
              <ApprovalRow
                to="/admin-credits"
                icon={<Coins size={17} />}
                label="Credit pack checkouts"
                detail={
                  loading
                    ? 'Pack purchases to verify'
                    : `${formatPeso(s?.pendingPackAmount ?? 0)} in pending packs`
                }
                count={s?.pendingPackPayments ?? 0}
                loading={loading}
              />
              <ApprovalRow
                to="/admin-coach-slots"
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

          <section className="rounded-3xl border border-[#D4CDB5]/60 bg-white p-5 shadow-sm">
            <h3
              className="leading-none text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}
            >
              Operations
            </h3>
            <p className="mt-1 text-[11px] text-[#9A8E7E]">Studio activity at a glance</p>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
              <Link
                to="/admin-students"
                className="flex items-center gap-3 rounded-2xl border border-[#EDE8D8] px-3.5 py-3 transition-colors hover:bg-[#F8F3E8]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDE8D8] text-[#745b3c]">
                  <Users size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#9A8E7E]">
                    Clients
                  </span>
                  <span className="text-sm font-semibold text-[#1E2A35]">
                    {loading ? '—' : s?.clientCount ?? 0}
                  </span>
                </span>
              </Link>
              <Link
                to="/admin-coaches"
                className="flex items-center gap-3 rounded-2xl border border-[#EDE8D8] px-3.5 py-3 transition-colors hover:bg-[#F8F3E8]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDE8D8] text-[#c49a3c]">
                  <Award size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#9A8E7E]">
                    Coaches
                  </span>
                  <span className="text-sm font-semibold text-[#1E2A35]">
                    {loading ? '—' : s?.coachCount ?? 0}
                  </span>
                </span>
              </Link>
              <Link
                to="/admin-classes"
                className="flex items-center gap-3 rounded-2xl border border-[#EDE8D8] px-3.5 py-3 transition-colors hover:bg-[#F8F3E8]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-800">
                  <CalendarRange size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#9A8E7E]">
                    Today
                  </span>
                  <span className="text-sm font-semibold text-[#1E2A35]">
                    {loading ? '—' : `${s?.classesToday ?? 0} class${(s?.classesToday ?? 0) === 1 ? '' : 'es'}`}
                  </span>
                </span>
              </Link>
            </div>
          </section>
        </div>
      </div>
      <AdminInsightPanel
        open={insightOpen}
        onOpenChange={setInsightOpen}
        snapshot={snapshot}
        loading={loading}
        asOfLabel={formatDateLongFromKey(getTodayDateKey())}
        onRegenerate={() => void load()}
      />
    </div>
  );
}
