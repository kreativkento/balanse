import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  Clock,
  LayoutGrid,
  SendHorizonal,
  Users,
} from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';
import { CardInfoButton } from '../components/balanse-flow/CardInfoButton';
import { STAFF_PAGE_CONTAINER } from '../lib/staff-page-meta';
import { ContentSkeleton } from '../components/layout/PageLoadingScreen';
import {
  fetchCoachAssignedClassDisplays,
  fetchClassesForStaffSchedule,
  type ClassDisplay,
} from '../../lib/class-service';
import { fetchDisciplinesForPublic } from '../../lib/discipline-service';
import {
  fetchMyPortalRequests,
  PORTAL_REQUESTS_CHANGED,
  portalRequestStatusBadgeClass,
  type PortalRequestRow,
  type PortalRequestStatus,
} from '../../lib/portal-request-service';
import { toast } from 'sonner';
import {
  DashboardWeekdayChart,
  weekdayCountsFromIsoDates,
} from '../components/dashboard/DashboardWeekdayChart';

const DASHBOARD_CLASS_DETAIL_TOAST = 'Go to my classes to view class details';

const PH_TZ = 'Asia/Manila';
const MAX_TODAY = 4;
const MAX_UPCOMING = 4;
const MAX_REQUESTS = 3;

const CLASS_COLOR_FALLBACK: Record<string, string> = {
  Yoga: '#c49a3c',
  Calisthenics: '#3A4A5A',
  'Animal Flow': '#6B8E6B',
  Groundworks: '#8B6F5A',
  'Circuit Training': '#B86A4A',
  'Mat Pilates': '#9A7A8A',
  Kickboxing: '#7A3A4A',
  Capoeira: '#A07050',
  'Personal Coaching': '#a67f2e',
};

const headingType = { fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' } as const;

function phDateKey(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatShortDate(iso: string, now: Date): string {
  const startKey = phDateKey(iso);
  const todayKey = phDateKey(now);
  if (startKey === todayKey) return 'Today';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (startKey === phDateKey(tomorrow)) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

function formatTimeStart(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

function formatRelativeSubmitted(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  if (!Number.isFinite(then) || diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function isInNextSevenDaysPh(iso: string, now: Date): boolean {
  const dayMs = 86_400_000;
  for (let offset = 0; offset < 7; offset += 1) {
    const d = new Date(now.getTime() + offset * dayMs);
    if (phDateKey(iso) === phDateKey(d)) return true;
  }
  return false;
}

function StatCard({
  label,
  value,
  icon,
  variant = 'default',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant?: 'default' | 'gold' | 'amber';
}) {
  const iconWrap =
    variant === 'gold'
      ? 'bg-[#c49a3c]/12 text-[#c49a3c]'
      : variant === 'amber'
        ? 'bg-amber-50 text-amber-600'
        : 'bg-[#EDE8D8] text-[#5A5048]';
  const border =
    variant === 'gold'
      ? 'border-[#c49a3c]/35'
      : variant === 'amber'
        ? 'border-amber-200/70'
        : 'border-[#D4CDB5]/60';

  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm ${border}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[#8A7E6E] text-[11px] uppercase tracking-widest">
          {label}
          <CardInfoButton title={label} />
        </p>
        <p
          className="text-[#1E2A35] leading-none tabular-nums"
          style={{ ...headingType, fontSize: '1.65rem' }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function PanelLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-0.5 text-[#8A7E6E] text-xs font-semibold hover:text-[#c49a3c] transition-colors"
    >
      {children}
      <ChevronRight size={13} className="opacity-70" />
    </Link>
  );
}

function Panel({
  title,
  hint,
  action,
  tone = 'neutral',
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  tone?: 'neutral' | 'requests';
  children: React.ReactNode;
}) {
  const headerClass =
    tone === 'requests'
      ? 'border-b border-amber-100/80 bg-amber-50/50'
      : 'border-b border-[#D4CDB5]/45 bg-[#FBF9F3]/80';

  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[#D4CDB5]/55 bg-white shadow-sm">
      <div className={`flex shrink-0 items-start justify-between gap-3 px-4 py-3 ${headerClass}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {tone === 'requests' ? (
              <SendHorizonal size={14} className="shrink-0 text-amber-600" aria-hidden />
            ) : null}
            <h2 className="truncate text-[#1E2A35]" style={{ ...headingType, fontSize: '1.15rem' }}>
              {title}
            </h2>
          </div>
          {hint ? <p className="mt-0.5 text-[#8A7E6E] text-[11px] leading-snug">{hint}</p> : null}
        </div>
        {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden divide-y divide-[#D4CDB5]/25">{children}</div>
    </section>
  );
}

function ClassListRow({
  classRow,
  now,
  accentColor,
  onClick,
}: {
  classRow: ClassDisplay;
  now: Date;
  accentColor: string;
  onClick: () => void;
}) {
  const limit = classRow.classLimit ?? 0;
  const enrolled = classRow.enrolledCount;
  const isFull = limit > 0 && enrolled >= limit;
  const title = classRow.name.trim() || classRow.disciplineName;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#F8F3E8]/90"
    >
      <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[#1E2A35] text-sm font-semibold">{title}</p>
        <p className="truncate text-[#8A7E6E] text-xs">
          {classRow.disciplineName} · {formatShortDate(classRow.startsAt, now)} ·{' '}
          {formatTimeStart(classRow.startsAt)}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
          isFull
            ? 'bg-red-50 text-red-600 border border-red-200/80'
            : 'bg-[#F0EBE0] text-[#7A6A52] border border-[#D4CDB5]/50'
        }`}
      >
        {limit > 0 ? `${enrolled}/${limit}` : `${enrolled}`}
      </span>
      <Users
        size={14}
        className="shrink-0 text-[#C0B8A8] transition-colors group-hover:text-[#c49a3c]"
      />
    </button>
  );
}

type DashboardRequestItem = {
  id: string;
  title: string;
  subtitle: string;
  status: PortalRequestStatus;
  accentColor: string;
};

function mapDashboardRequests(
  requests: PortalRequestRow[],
  classesById: Map<string, ClassDisplay>,
  disciplineColorById: Map<string, string>,
  disciplineNameById: Map<string, string>,
): DashboardRequestItem[] {
  return requests
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((req) => {
      const classRow = req.target_class_id ? classesById.get(req.target_class_id) : undefined;
      const payload = req.payload as { name?: string; discipline_id?: string };
      const disciplineId = payload.discipline_id ?? classRow?.disciplineId ?? '';
      const disciplineName =
        (disciplineId ? disciplineNameById.get(disciplineId) : undefined)
        ?? classRow?.disciplineName
        ?? 'Class';
      const accentColor =
        (disciplineId ? disciplineColorById.get(disciplineId) : undefined)
        ?? CLASS_COLOR_FALLBACK[disciplineName]
        ?? '#c49a3c';

      const startsAt = classRow?.startsAt ?? '';
      const startDate = startsAt ? new Date(startsAt) : null;
      const when = startDate
        ? `${startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
        : '—';
      const kind = req.request_type === 'cancellation_request' ? 'Cancellation' : 'Slot request';
      const title =
        req.request_type === 'cancellation_request'
          ? classRow?.name || disciplineName
          : payload.name?.trim() || classRow?.name || disciplineName;

      return {
        id: req.id,
        title,
        subtitle: `${kind} · ${when} · ${formatRelativeSubmitted(req.created_at)}`,
        status: req.status,
        accentColor,
      };
    });
}

function EmptyLine({ message }: { message: string }) {
  return (
    <p className="px-4 py-8 text-center text-[#B0A898] text-sm leading-relaxed">{message}</p>
  );
}

function RequestRow({ req }: { req: DashboardRequestItem }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: req.accentColor }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[#1E2A35] text-sm font-semibold">{req.title}</p>
        <p className="truncate text-[#8A7E6E] text-xs">{req.subtitle}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${portalRequestStatusBadgeClass(req.status)}`}
      >
        {req.status}
      </span>
    </div>
  );
}

export default function StaffDashboardPage() {
  const navigate = useNavigate();
  const { staffUser } = useStaffAuth();
  const accountId = staffUser?.accountId ?? '';

  const [now] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<ClassDisplay[]>([]);
  const [portalRequests, setPortalRequests] = useState<PortalRequestRow[]>([]);
  const [classesById, setClassesById] = useState<Map<string, ClassDisplay>>(new Map());
  const [disciplineColorById, setDisciplineColorById] = useState<Map<string, string>>(new Map());
  const [disciplineNameById, setDisciplineNameById] = useState<Map<string, string>>(new Map());

  const notifyOpenClassOnMyClasses = useCallback(() => {
    toast.message(DASHBOARD_CLASS_DETAIL_TOAST);
  }, []);

  const loadData = useCallback(async () => {
    if (!accountId) {
      setAssignedClasses([]);
      setPortalRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);

    const [assignedResult, requestsResult, allClassesResult, disciplinesResult] = await Promise.all([
      fetchCoachAssignedClassDisplays(accountId),
      fetchMyPortalRequests(),
      fetchClassesForStaffSchedule(),
      fetchDisciplinesForPublic(),
    ]);

    const errors = [
      assignedResult.error,
      requestsResult.error,
      allClassesResult.error,
      disciplinesResult.error,
    ].filter(Boolean) as string[];
    if (errors.length > 0) setLoadError(errors[0]);

    setAssignedClasses(assignedResult.data ?? []);
    setPortalRequests(requestsResult.requests.filter((r) => r.requester_account_id === accountId));
    setClassesById(new Map((allClassesResult.data ?? []).map((row) => [row.id, row])));
    setDisciplineColorById(
      new Map((disciplinesResult.data ?? []).map((d) => [d.id, d.colorHex || '#c49a3c'])),
    );
    setDisciplineNameById(new Map((disciplinesResult.data ?? []).map((d) => [d.id, d.name])));
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const onChange = () => {
      void loadData();
    };
    window.addEventListener(PORTAL_REQUESTS_CHANGED, onChange);
    return () => window.removeEventListener(PORTAL_REQUESTS_CHANGED, onChange);
  }, [loadData]);

  useEffect(() => {
    if (!staffUser) navigate('/staff-login');
  }, [staffUser, navigate]);

  const colorForClass = useCallback(
    (row: ClassDisplay) => {
      if (row.disciplineId && disciplineColorById.has(row.disciplineId)) {
        return disciplineColorById.get(row.disciplineId)!;
      }
      return CLASS_COLOR_FALLBACK[row.disciplineName] ?? '#c49a3c';
    },
    [disciplineColorById],
  );

  const { todayClasses, upcomingClasses, weekCount, pendingRequestCount } = useMemo(() => {
    const todayKey = phDateKey(now);
    const futureAssigned = assignedClasses
      .filter((row) => {
        const endMs = row.endsAt ? new Date(row.endsAt).getTime() : new Date(row.startsAt).getTime();
        return Number.isFinite(endMs) && endMs >= now.getTime();
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    const today = futureAssigned.filter((row) => phDateKey(row.startsAt) === todayKey);
    const upcoming = futureAssigned.filter((row) => phDateKey(row.startsAt) > todayKey);
    const week = assignedClasses.filter((row) => isInNextSevenDaysPh(row.startsAt, now)).length;
    const pending = portalRequests.filter((r) => r.status === 'pending').length;

    return { todayClasses: today, upcomingClasses: upcoming, weekCount: week, pendingRequestCount: pending };
  }, [assignedClasses, now, portalRequests]);

  const dashboardRequests = useMemo(
    () => mapDashboardRequests(portalRequests, classesById, disciplineColorById, disciplineNameById),
    [portalRequests, classesById, disciplineColorById, disciplineNameById],
  );

  const todayShown = todayClasses.slice(0, MAX_TODAY);
  const upcomingShown = upcomingClasses.slice(0, MAX_UPCOMING);
  const requestsShown = dashboardRequests.slice(0, MAX_REQUESTS);

  if (!staffUser) return null;

  return (
    <>
      <div
        className={`${STAFF_PAGE_CONTAINER} flex h-full min-h-0 flex-col gap-4 overflow-y-auto py-4 md:py-5`}
      >
        {loadError ? (
          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-red-800 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="truncate">{loadError}</span>
          </div>
        ) : null}

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Link
            to="/staff-my-classes"
            className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-3 text-sm font-semibold text-[#1E2A35] shadow-sm hover:bg-[#F8F3E8]"
          >
            My classes
          </Link>
          <Link
            to="/staff-time-slots"
            className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-3 text-sm font-semibold text-[#1E2A35] shadow-sm hover:bg-[#F8F3E8]"
          >
            Time slots
          </Link>
          <Link
            to="/staff-class-schedule"
            className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-3 text-sm font-semibold text-[#1E2A35] shadow-sm hover:bg-[#F8F3E8]"
          >
            Class schedule
          </Link>
          <Link
            to="/staff-requests"
            className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-3 text-sm font-semibold text-[#1E2A35] shadow-sm hover:bg-[#F8F3E8]"
          >
            Requests
          </Link>
          <Link
            to="/staff-availability"
            className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-3 text-sm font-semibold text-[#1E2A35] shadow-sm hover:bg-[#F8F3E8]"
          >
            Availability
          </Link>
          <Link
            to="/staff-profile"
            className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-3 text-sm font-semibold text-[#1E2A35] shadow-sm hover:bg-[#F8F3E8]"
          >
            My profile
          </Link>
        </div>

        <DashboardWeekdayChart
          data={weekdayCountsFromIsoDates(assignedClasses.map((row) => row.startsAt))}
          loading={loading}
          title="Your assigned week"
          hint="Sessions on your roster by weekday"
        />

        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Today's classes"
            value={loading ? '—' : String(todayClasses.length)}
            icon={<CalendarDays size={18} />}
            variant="gold"
          />
          <StatCard
            label="Next 7 days"
            value={loading ? '—' : String(weekCount)}
            icon={<LayoutGrid size={18} />}
          />
          <StatCard
            label="Pending requests"
            value={loading ? '—' : String(pendingRequestCount)}
            icon={<Clock size={18} />}
            variant="amber"
          />
        </div>

        {loading ? (
          <div
            className="min-h-0 flex-1 overflow-auto"
            role="status"
            aria-live="polite"
            aria-label="Loading your dashboard"
          >
            <ContentSkeleton />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-3 lg:gap-5 lg:overflow-hidden">
            <Panel
              title="Today"
              hint="Open My Classes for full session details"
              action={
                todayClasses.length > MAX_TODAY ? (
                  <PanelLink to="/staff-my-classes">
                    +{todayClasses.length - MAX_TODAY} more
                  </PanelLink>
                ) : (
                  <PanelLink to="/staff-my-classes">My classes</PanelLink>
                )
              }
            >
              {todayShown.length === 0 ? (
                <EmptyLine message="Nothing scheduled for today." />
              ) : (
                todayShown.map((row) => (
                  <ClassListRow
                    key={row.id}
                    classRow={row}
                    now={now}
                    accentColor={colorForClass(row)}
                    onClick={notifyOpenClassOnMyClasses}
                  />
                ))
              )}
            </Panel>

            <Panel
              title="Upcoming"
              hint="Open My Classes for full session details"
              action={
                upcomingClasses.length > MAX_UPCOMING ? (
                  <PanelLink to="/staff-class-schedule">
                    +{upcomingClasses.length - MAX_UPCOMING} more
                  </PanelLink>
                ) : (
                  <PanelLink to="/staff-class-schedule">Schedule</PanelLink>
                )
              }
            >
              {upcomingShown.length === 0 ? (
                <EmptyLine message="No upcoming sessions yet." />
              ) : (
                upcomingShown.map((row) => (
                  <ClassListRow
                    key={row.id}
                    classRow={row}
                    now={now}
                    accentColor={colorForClass(row)}
                    onClick={notifyOpenClassOnMyClasses}
                  />
                ))
              )}
            </Panel>

            <Panel
              title="Requests"
              hint="Slot & cancellation status"
              tone="requests"
              action={
                <PanelLink to="/staff-requests">
                  {pendingRequestCount > 0 ? `${pendingRequestCount} pending · ` : ''}
                  View all
                </PanelLink>
              }
            >
              {requestsShown.length === 0 ? (
                <EmptyLine message="No requests submitted yet." />
              ) : (
                requestsShown.map((req) => <RequestRow key={req.id} req={req} />)
              )}
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}
