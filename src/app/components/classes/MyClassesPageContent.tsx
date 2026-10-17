import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Bookmark,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  User,
} from 'lucide-react';
import { CARD_HOVER_GROW } from '../../../lib/motion-classes';
import {
  fetchCoachAssignedClassDisplayById,
  fetchCoachClassRoster,
  fetchCoachClassWaitlist,
  fetchMemberMyClassDetail,
  memberEnrolledClassId,
  type ClassDisplay,
  type ClassPerson,
  type MemberClassListStatus,
  type MemberEnrolledClassItem,
  type MemberMyClassDetail,
} from '../../../lib/class-service';
import { MemberMyClassDetailModal } from './MemberMyClassDetailModal';
import { resolveMyClassDisciplineAccent } from './myClassesDisciplineColor';
import { StaffCoachStudentProfileModal } from '../staff/StaffCoachStudentProfileModal';
import { toastCreated, toastOperationFailed } from '../../../lib/operation-toast';
import {
  fetchMyPortalRequests,
  PORTAL_REQUESTS_CHANGED,
  submitCancellationRequest,
  type PortalRequestRow,
} from '../../../lib/portal-request-service';

const PH_TZ = 'Asia/Manila';

type ClassView = 'today' | 'upcoming' | 'past';

const STATUS_STYLE: Record<MemberClassListStatus, string> = {
  confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  waitlisted: 'bg-amber-50 text-amber-900 border-amber-200/80',
  pending: 'bg-sky-50 text-sky-800 border-sky-200/80',
  completed: 'bg-[#EDE8D8] text-[#5A5048] border-[#D4CDB5]/70',
  cancelled: 'bg-red-50 text-red-700 border-red-200/80',
};

const STATUS_LABEL: Record<MemberClassListStatus, string> = {
  confirmed: 'Enrolled',
  waitlisted: 'Waitlisted',
  pending: 'Waitlisted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STAFF_COACH_BADGE_CANCELLED = 'bg-[#EDE8D8] text-[#5A5048] border-[#D4CDB5]/70';
const STAFF_COACH_BADGE_CANCELLATION_REQUESTED = 'bg-red-50 text-red-700 border-red-200/80';

function staffCoachClassBadge(
  item: MemberEnrolledClassItem,
  pendingCancellationClassIds: Set<string>,
  classById: Map<string, ClassDisplay>,
): { label: string; className: string } {
  const classId = memberEnrolledClassId(item);
  if (pendingCancellationClassIds.has(classId)) {
    return { label: 'Cancellation Requested', className: STAFF_COACH_BADGE_CANCELLATION_REQUESTED };
  }
  const row = classById.get(classId);
  const isCancelled =
    item.status === 'cancelled' || row?.statusBlock === 'closed' || row?.statusClass === 'close';
  if (isCancelled) {
    return { label: 'Cancelled', className: STAFF_COACH_BADGE_CANCELLED };
  }
  if (item.status === 'completed') {
    return { label: 'Completed', className: STATUS_STYLE.completed };
  }
  return { label: 'Assigned', className: STATUS_STYLE.confirmed };
}

function phDateKey(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDisplayDate(iso: string, now: Date): string {
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
    year: 'numeric',
  }).format(new Date(iso));
}

function sessionDateParts(iso: string): { weekday: string; day: string; month: string } {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    weekday: 'short',
  }).format(new Date(iso));
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    day: 'numeric',
  }).format(new Date(iso));
  const month = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    month: 'short',
  }).format(new Date(iso));
  return { weekday, day, month };
}

function formatTimeRange(startIso: string, endIso: string | null): string {
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const start = timeFmt.format(new Date(startIso));
  if (!endIso) return start;
  return `${start} – ${timeFmt.format(new Date(endIso))}`;
}

function formatDurationMinutes(startIso: string, endIso: string | null): string {
  if (!endIso) return '—';
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return '—';
  const mins = Math.round((end - start) / 60000);
  return `${mins} min`;
}

function classTimeBucket(item: MemberEnrolledClassItem, now: Date): ClassView {
  const startMs = new Date(item.startsAt).getTime();
  const endMs = item.endsAt ? new Date(item.endsAt).getTime() : startMs;
  const nowMs = now.getTime();

  if (Number.isFinite(endMs) && endMs < nowMs) {
    return 'past';
  }
  if (phDateKey(item.startsAt) === phDateKey(now)) {
    return 'today';
  }
  if (startMs > nowMs) {
    return 'upcoming';
  }
  return 'past';
}

function ClassRow({
  item,
  now,
  accentColor,
  onSelect,
  statusBadge,
}: {
  item: MemberEnrolledClassItem;
  now: Date;
  accentColor: string;
  onSelect: () => void;
  /** Coach portal: overrides member enrollment badge. */
  statusBadge?: { label: string; className: string };
}) {
  const badge = statusBadge ?? {
    label: STATUS_LABEL[item.status],
    className: STATUS_STYLE[item.status],
  };
  const dateLabel = formatDisplayDate(item.startsAt, now);
  const { weekday, day, month } = sessionDateParts(item.startsAt);
  const timeLabel = formatTimeRange(item.startsAt, item.endsAt);
  const duration = formatDurationMinutes(item.startsAt, item.endsAt);
  const isToday = dateLabel === 'Today';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full overflow-hidden rounded-2xl border border-[#D4CDB5]/55 bg-white text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/40 ${CARD_HOVER_GROW}`}
      style={{ ['--class-accent' as string]: accentColor }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1 transition-opacity group-hover:opacity-100"
        style={{
          backgroundColor: accentColor,
          opacity: isToday ? 1 : 0.55,
        }}
        aria-hidden
      />
      <div className="flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-stretch sm:gap-4">
        <div
          className="flex shrink-0 items-center gap-3 sm:w-[4.25rem] sm:flex-col sm:justify-center sm:gap-0 sm:pr-4 sm:border-r"
          style={{ borderColor: `${accentColor}40` }}
        >
          <div className="flex flex-col items-center leading-none">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#9A8E7E] sm:mb-0.5">
              {weekday}
            </span>
            <span
              className={`tabular-nums ${isToday ? 'text-[#a67f2e]' : 'text-[#1E2A35]'}`}
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '1.75rem',
                letterSpacing: '0.02em',
              }}
            >
              {day}
            </span>
            <span className="text-[11px] font-semibold text-[#8A7E6E]">{month}</span>
          </div>
          <p className="text-xs font-semibold text-[#8A7E6E] sm:hidden">{dateLabel}</p>
        </div>

        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex max-w-full items-center rounded-md border border-[#D4CDB5]/50 bg-[#F8F3E8]/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A7E6E] truncate">
                {item.disciplineName}
              </span>
              <h3
                className="mt-1.5 truncate text-[#1E2A35] leading-tight"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.04em' }}
              >
                {item.className}
              </h3>
              <p className="mt-0.5 hidden text-xs font-semibold text-[#8A7E6E] sm:block">{dateLabel}</p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 text-[11px] text-[#6B6358] sm:grid-cols-2">
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <Clock size={12} className="shrink-0 text-[#9A8E7E]" aria-hidden />
              <span className="truncate font-medium">
                {timeLabel}
                <span className="text-[#B0A898]"> · {duration}</span>
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <User size={12} className="shrink-0 text-[#9A8E7E]" aria-hidden />
              <span className="truncate font-medium">{item.coachLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 min-w-0 sm:col-span-2">
              <MapPin size={12} className="shrink-0 text-[#9A8E7E]" aria-hidden />
              <span className="truncate font-medium">{item.location}</span>
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: 'gold' | 'dark' | 'muted';
}) {
  const accentClass =
    accent === 'gold'
      ? 'border-[#c49a3c]/35 bg-[#c49a3c]/08'
      : accent === 'dark'
        ? 'border-[#1E2A35]/12 bg-white'
        : 'border-[#D4CDB5]/55 bg-white';

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${accentClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E]">{label}</p>
      <p
        className="mt-0.5 text-[#1E2A35] leading-none tabular-nums"
        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.65rem', letterSpacing: '0.04em' }}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[10px] font-medium text-[#B0A898]">{hint}</p> : null}
    </div>
  );
}

export interface StaffCoachClassDetailConfig {
  coachAccountId: string;
  classById: Map<string, ClassDisplay>;
  colorForClass: (row: ClassDisplay) => string;
  disciplineLogoById: Map<string, string>;
}

function classDisplayToMemberDetail(row: ClassDisplay, disciplineLogoUrl: string): MemberMyClassDetail {
  return {
    classId: row.id,
    uid: row.uid,
    name: row.name,
    description: row.description,
    disciplineName: row.disciplineName,
    disciplineLogoUrl,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    statusClass: row.statusClass,
    statusBlock: row.statusBlock,
    classLimit: row.classLimit,
    enrolledCount: row.enrolledCount,
    coaches: row.coaches,
  };
}

export interface MyClassesPageContentProps {
  search: string;
  classes: MemberEnrolledClassItem[];
  loading: boolean;
  loadError: string | null;
  showPageHeader?: boolean;
  pageEyebrow?: string;
  pageTitle?: string;
  primaryAction?: { label: string; icon?: ReactNode; onClick: () => void };
  emptyAllMessage: string;
  emptyBrowseAction?: { label: string; onClick: () => void };
  /** Admin-assigned discipline colors (id → hex). */
  disciplineColorById?: Map<string, string>;
  /** Coach portal: open staff class detail + student profile modals on card click. */
  staffCoachDetail?: StaffCoachClassDetailConfig;
}

export function MyClassesPageContent({
  search,
  classes,
  loading,
  loadError,
  showPageHeader = true,
  pageEyebrow = 'Class Management',
  pageTitle = 'My Classes',
  primaryAction,
  emptyAllMessage,
  emptyBrowseAction,
  disciplineColorById,
  staffCoachDetail,
}: MyClassesPageContentProps) {
  const [view, setView] = useState<ClassView>('today');
  const [now] = useState(() => new Date());
  const [selectedItem, setSelectedItem] = useState<MemberEnrolledClassItem | null>(null);
  const [detail, setDetail] = useState<MemberMyClassDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [resolvedCoachClass, setResolvedCoachClass] = useState<ClassDisplay | null>(null);
  const [coachClassLoading, setCoachClassLoading] = useState(false);
  const [coachClassError, setCoachClassError] = useState<string | null>(null);
  const [coachRosterStudents, setCoachRosterStudents] = useState<ClassPerson[]>([]);
  const [coachWaitlistStudents, setCoachWaitlistStudents] = useState<ClassPerson[]>([]);
  const [coachRosterLoading, setCoachRosterLoading] = useState(false);
  const [coachWaitlistLoading, setCoachWaitlistLoading] = useState(false);
  const [coachRosterError, setCoachRosterError] = useState<string | null>(null);
  const [coachWaitlistError, setCoachWaitlistError] = useState<string | null>(null);
  const [portalRequests, setPortalRequests] = useState<PortalRequestRow[]>([]);
  const [cancellationSubmitting, setCancellationSubmitting] = useState(false);

  const selectedCoachClass = useMemo(() => {
    if (!staffCoachDetail || !selectedItem) return null;
    const classId = memberEnrolledClassId(selectedItem);
    return staffCoachDetail.classById.get(classId) ?? resolvedCoachClass;
  }, [staffCoachDetail, selectedItem, resolvedCoachClass]);

  const disciplineAccentForItem = useCallback(
    (item: MemberEnrolledClassItem) => {
      if (staffCoachDetail) {
        const classRow = staffCoachDetail.classById.get(memberEnrolledClassId(item));
        if (classRow) return staffCoachDetail.colorForClass(classRow);
      }
      return resolveMyClassDisciplineAccent(item, disciplineColorById);
    },
    [disciplineColorById, staffCoachDetail],
  );

  const selectedAccent = selectedItem ? disciplineAccentForItem(selectedItem) : '#c49a3c';

  const coachMemberDetail = useMemo(() => {
    if (!staffCoachDetail || !selectedCoachClass) return null;
    const logo =
      (selectedCoachClass.disciplineId
        ? staffCoachDetail.disciplineLogoById.get(selectedCoachClass.disciplineId)
        : undefined) ?? '';
    const detail = classDisplayToMemberDetail(selectedCoachClass, logo);
    const enrolledCount =
      coachRosterStudents.length > 0 ? coachRosterStudents.length : detail.enrolledCount;
    return { ...detail, enrolledCount };
  }, [staffCoachDetail, selectedCoachClass, coachRosterStudents.length]);

  const loadPortalRequests = useCallback(async () => {
    if (!staffCoachDetail) {
      setPortalRequests([]);
      return;
    }
    const { requests, error } = await fetchMyPortalRequests();
    if (error) return;
    setPortalRequests(requests);
  }, [staffCoachDetail]);

  useEffect(() => {
    if (!staffCoachDetail) return;
    void loadPortalRequests();
    const onChanged = () => void loadPortalRequests();
    window.addEventListener(PORTAL_REQUESTS_CHANGED, onChanged);
    return () => window.removeEventListener(PORTAL_REQUESTS_CHANGED, onChanged);
  }, [loadPortalRequests, staffCoachDetail]);

  const pendingCancellationForClass = useMemo(() => {
    if (!selectedCoachClass) return null;
    return (
      portalRequests.find(
        (r) =>
          r.request_type === 'cancellation_request' &&
          r.target_class_id === selectedCoachClass.id &&
          r.status === 'pending',
      ) ?? null
    );
  }, [portalRequests, selectedCoachClass]);

  const pendingCancellationClassIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of portalRequests) {
      if (
        r.request_type === 'cancellation_request' &&
        r.status === 'pending' &&
        r.target_class_id
      ) {
        ids.add(r.target_class_id);
      }
    }
    return ids;
  }, [portalRequests]);

  const coachBadgeForItem = useCallback(
    (item: MemberEnrolledClassItem) => {
      if (!staffCoachDetail) return undefined;
      return staffCoachClassBadge(item, pendingCancellationClassIds, staffCoachDetail.classById);
    },
    [pendingCancellationClassIds, staffCoachDetail],
  );

  const handleRequestCancellation = useCallback(async () => {
    if (!selectedCoachClass || pendingCancellationForClass || cancellationSubmitting) return;
    setCancellationSubmitting(true);
    const { error } = await submitCancellationRequest({
      targetClassId: selectedCoachClass.id,
    });
    setCancellationSubmitting(false);
    if (error) {
      toastOperationFailed(error);
      return;
    }
    toastCreated('Cancellation request');
    await loadPortalRequests();
  }, [
    cancellationSubmitting,
    loadPortalRequests,
    pendingCancellationForClass,
    selectedCoachClass,
  ]);

  useEffect(() => {
    if (!staffCoachDetail || !selectedCoachClass) {
      setCoachRosterStudents([]);
      setCoachWaitlistStudents([]);
      setCoachRosterLoading(false);
      setCoachWaitlistLoading(false);
      setCoachRosterError(null);
      setCoachWaitlistError(null);
      return;
    }

    let cancelled = false;
    const classId = selectedCoachClass.id;
    setCoachRosterLoading(true);
    setCoachWaitlistLoading(true);
    setCoachRosterError(null);
    setCoachWaitlistError(null);

    void (async () => {
      const [enrolledResult, waitlistResult] = await Promise.all([
        fetchCoachClassRoster(classId),
        fetchCoachClassWaitlist(classId),
      ]);
      if (cancelled) return;

      if (enrolledResult.error) {
        setCoachRosterError(enrolledResult.error);
        setCoachRosterStudents([]);
      } else {
        setCoachRosterStudents(enrolledResult.data);
      }
      setCoachRosterLoading(false);

      if (waitlistResult.error) {
        setCoachWaitlistError(waitlistResult.error);
        setCoachWaitlistStudents([]);
      } else {
        setCoachWaitlistStudents(waitlistResult.data);
      }
      setCoachWaitlistLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [staffCoachDetail, selectedCoachClass]);

  useEffect(() => {
    if (!staffCoachDetail || !selectedItem) {
      setResolvedCoachClass(null);
      setCoachClassLoading(false);
      setCoachClassError(null);
      return;
    }

    const classId = memberEnrolledClassId(selectedItem);
    if (staffCoachDetail.classById.has(classId)) {
      setResolvedCoachClass(null);
      setCoachClassLoading(false);
      setCoachClassError(null);
      return;
    }

    let cancelled = false;
    setCoachClassLoading(true);
    setCoachClassError(null);
    setResolvedCoachClass(null);

    void (async () => {
      const { data, error } = await fetchCoachAssignedClassDisplayById(
        staffCoachDetail.coachAccountId,
        classId,
      );
      if (cancelled) return;
      if (error) {
        setCoachClassError(error);
      } else {
        setResolvedCoachClass(data);
      }
      setCoachClassLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [staffCoachDetail, selectedItem]);

  useEffect(() => {
    if (staffCoachDetail) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    if (!selectedItem) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    const classId = memberEnrolledClassId(selectedItem);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);

    void (async () => {
      const { data, error } = await fetchMemberMyClassDetail(classId);
      if (cancelled) return;
      if (error) {
        setDetailError(error);
        setDetail(null);
      } else {
        setDetail(data);
      }
      setDetailLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedItem, staffCoachDetail]);

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((item) =>
      `${item.className} ${item.coachLabel} ${item.disciplineName} ${item.location} ${item.status}`
        .toLowerCase()
        .includes(q),
    );
  }, [classes, search]);

  const buckets = useMemo(() => {
    const today: MemberEnrolledClassItem[] = [];
    const upcoming: MemberEnrolledClassItem[] = [];
    const past: MemberEnrolledClassItem[] = [];

    for (const item of filteredBySearch) {
      const bucket = classTimeBucket(item, now);
      if (bucket === 'today') today.push(item);
      else if (bucket === 'upcoming') upcoming.push(item);
      else past.push(item);
    }

    today.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    past.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

    return { today, upcoming, past };
  }, [filteredBySearch, now]);

  const activeList =
    view === 'today' ? buckets.today : view === 'upcoming' ? buckets.upcoming : buckets.past;

  const viewCounts = {
    today: buckets.today.length,
    upcoming: buckets.upcoming.length,
    past: buckets.past.length,
  };

  const summary = useMemo(() => {
    if (staffCoachDetail) {
      let active = 0;
      for (const item of classes) {
        const bucket = classTimeBucket(item, now);
        if (bucket === 'today' || bucket === 'upcoming') active += 1;
      }
      return { confirmed: active, pending: 0 };
    }
    const confirmed = classes.filter((c) => c.status === 'confirmed').length;
    const pending = classes.filter((c) => c.status === 'pending' || c.status === 'waitlisted').length;
    return { confirmed, pending };
  }, [classes, staffCoachDetail, now]);

  const searchActive = search.trim().length > 0;

  return (
    <>
      {showPageHeader ? (
        <div className="mb-5 pt-4 md:pt-6">
          <div className="min-w-0">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">{pageEyebrow}</p>
            <h2
              className="text-[#1E2A35] leading-tight"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
                letterSpacing: '0.04em',
              }}
            >
              {pageTitle}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-[#8A7E6E] leading-relaxed">
              Sessions you&apos;re enrolled in or waiting on — grouped by when they happen.
            </p>
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{loadError}</p>
        </div>
      ) : null}

      {!loading && !loadError && classes.length > 0 ? (
        <div
          className={`mb-5 grid grid-cols-2 gap-3 ${staffCoachDetail ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} ${!showPageHeader ? 'mt-5 md:mt-6' : ''}`}
        >
          <SummaryCard label="Today" value={viewCounts.today} accent="gold" />
          <SummaryCard label="Upcoming" value={viewCounts.upcoming} hint="Future sessions" accent="dark" />
          <SummaryCard
            label={staffCoachDetail ? 'Active' : 'Confirmed'}
            value={summary.confirmed}
            hint={staffCoachDetail ? 'Today & upcoming' : 'Enrolled & active'}
          />
          {!staffCoachDetail ? (
            <SummaryCard
              label="Pending"
              value={summary.pending}
              hint="Waitlist or payment"
              accent={summary.pending > 0 ? 'gold' : 'muted'}
            />
          ) : null}
        </div>
      ) : null}

      <div className="mb-5 flex w-full flex-wrap items-center gap-2 sm:gap-3">
        <div
          className="flex min-w-0 flex-1 gap-1 rounded-2xl border border-[#D4CDB5]/60 bg-white p-1 shadow-sm sm:flex-none sm:max-w-full"
          role="tablist"
          aria-label="Class time range"
        >
          {(
            [
              ['today', 'Today'],
              ['upcoming', 'Upcoming'],
              ['past', 'Past'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 sm:flex-none sm:px-4 ${
                view === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:bg-[#EDE8D8]/60 hover:text-[#1E2A35]'
              }`}
            >
              {label}
              <span
                className={`tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  view === id ? 'bg-white/15 text-white' : 'bg-[#EDE8D8] text-[#8A7E6E]'
                }`}
              >
                {viewCounts[id]}
              </span>
            </button>
          ))}
        </div>
        {primaryAction ? (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="action-button ml-auto inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#c49a3c] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#a67f2e] sm:px-5 sm:py-2 sm:text-sm"
          >
            {primaryAction.icon}
            {primaryAction.label}
          </button>
        ) : null}
      </div>
      {searchActive ? (
        <p className="-mt-3 mb-5 text-[11px] font-medium text-[#9A8E7E] px-1">
          Showing {filteredBySearch.length} of {classes.length} classes
        </p>
      ) : null}

      <section aria-live="polite">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#D4CDB5]/50 bg-white py-20 text-[#8A7E6E] shadow-sm">
            <Loader2 size={28} className="text-[#c49a3c] animate-spin mb-3" />
            <p className="text-sm font-medium">Loading your classes…</p>
          </div>
        ) : activeList.length === 0 ? (
          <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDE8D8] text-[#8A7E6E]">
              <CalendarDays size={22} strokeWidth={1.75} aria-hidden />
            </div>
            <p className="text-[#5A5048] text-sm font-semibold">
              {classes.length === 0
                ? emptyAllMessage
                : searchActive
                  ? 'No classes match your search in this tab.'
                  : `No ${view} classes right now.`}
            </p>
            <p className="mt-1 text-[#B0A898] text-xs max-w-sm mx-auto">
              {classes.length === 0
                ? 'Browse the schedule to enroll in your next session.'
                : view === 'today'
                  ? 'Check Upcoming for later this week.'
                  : 'Try another tab or clear your search.'}
            </p>
            {classes.length === 0 && emptyBrowseAction ? (
              <button
                type="button"
                onClick={emptyBrowseAction.onClick}
                className="action-button mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#1E2A35] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#263545]"
              >
                <Bookmark size={12} />
                {emptyBrowseAction.label}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeList.map((item) => (
              <ClassRow
                key={item.id}
                item={item}
                now={now}
                accentColor={disciplineAccentForItem(item)}
                onSelect={() => setSelectedItem(item)}
                statusBadge={coachBadgeForItem(item)}
              />
            ))}
          </div>
        )}
      </section>

      {staffCoachDetail && selectedItem && selectedCoachClass && coachMemberDetail ? (
        <MemberMyClassDetailModal
          listItem={selectedItem}
          detail={coachMemberDetail}
          loading={false}
          loadError={null}
          now={now}
          accentColor={staffCoachDetail.colorForClass(selectedCoachClass)}
          onClose={() => {
            setSelectedItem(null);
            setSelectedStudentId(null);
            setCancellationSubmitting(false);
          }}
          onRequestCancellation={() => void handleRequestCancellation()}
          requestCancellationSubmitting={cancellationSubmitting}
          requestCancellationDisabled={Boolean(pendingCancellationForClass)}
          coachStatusBadge={
            selectedItem && staffCoachDetail
              ? staffCoachClassBadge(
                  selectedItem,
                  pendingCancellationClassIds,
                  staffCoachDetail.classById,
                )
              : undefined
          }
          coachRoster={{
            students: coachRosterStudents,
            waitlisted: coachWaitlistStudents,
            loading: coachRosterLoading,
            waitlistLoading: coachWaitlistLoading,
            loadError: coachRosterError,
            waitlistLoadError: coachWaitlistError,
            onSelectStudent: (accountId) => setSelectedStudentId(accountId),
          }}
        />
      ) : null}
      {staffCoachDetail && selectedStudentId && selectedCoachClass ? (
        <StaffCoachStudentProfileModal
          classId={selectedCoachClass.id}
          accountId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      ) : null}
      {!staffCoachDetail && selectedItem ? (
        <MemberMyClassDetailModal
          listItem={selectedItem}
          detail={detail}
          loading={detailLoading}
          loadError={detailError}
          now={now}
          accentColor={selectedAccent}
          onClose={() => setSelectedItem(null)}
        />
      ) : null}

      {staffCoachDetail && selectedItem && !selectedCoachClass && coachClassLoading ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1E2A35]/40 p-4">
          <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-8 py-10 text-center shadow-xl">
            <Loader2 size={28} className="mx-auto mb-3 animate-spin text-[#c49a3c]" />
            <p className="text-[#5A5048] text-sm font-medium">Loading class details…</p>
          </div>
        </div>
      ) : null}

      {staffCoachDetail && selectedItem && !selectedCoachClass && !coachClassLoading ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1E2A35]/40 p-4">
          <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white px-6 py-8 text-center shadow-xl max-w-sm">
            <p className="text-[#5A5048] text-sm font-medium">
              {coachClassError ?? 'Could not load class details.'}
            </p>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="mt-4 rounded-full border border-[#D4CDB5]/70 px-5 py-2 text-sm font-semibold text-[#5A5048] hover:bg-[#EDE8D8]"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
