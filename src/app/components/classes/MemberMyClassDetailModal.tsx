import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Hourglass,
  Loader2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type {
  ClassBlockStatus,
  ClassOpenStatus,
  ClassPerson,
  MemberClassListStatus,
  MemberEnrolledClassItem,
  MemberMyClassDetail,
} from '../../../lib/class-service';

const PH_TZ = 'Asia/Manila';

/** Shared modal typography — readable but tight vertical rhythm */
const MODAL_LABEL = 'text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A8E7E]';
const MODAL_VALUE = 'text-[#1E2A35] text-sm font-semibold';
const MODAL_MUTED = 'text-[#5A5048] text-xs font-medium';
const MODAL_CARD = 'min-w-0 overflow-hidden rounded-xl border border-[#D4CDB5]/55 bg-white px-3 py-2.5';

const ENROLLMENT_STATUS_STYLE: Record<MemberClassListStatus, string> = {
  confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  waitlisted: 'bg-amber-50 text-amber-900 border-amber-200/80',
  pending: 'bg-sky-50 text-sky-800 border-sky-200/80',
  completed: 'bg-[#EDE8D8] text-[#5A5048] border-[#D4CDB5]/70',
  cancelled: 'bg-red-50 text-red-700 border-red-200/80',
};

const ENROLLMENT_STATUS_LABEL: Record<MemberClassListStatus, string> = {
  confirmed: 'Enrolled',
  waitlisted: 'Waitlisted',
  pending: 'Waitlisted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const BLOCK_STATUS_LABELS: Record<ClassBlockStatus, string> = {
  active: 'Active',
  occupied: 'Occupied',
  vacant: 'Vacant',
  closed: 'Closed',
};

const CLASS_OPEN_STATUS_LABELS: Record<ClassOpenStatus, string> = {
  open: 'Open for enrollment',
  close: 'Closed to enrollment',
  pending: 'Enrollment pending',
};

function formatDisplayDate(iso: string, now: Date): string {
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  if (dateKey === todayKey) return 'Today';

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow);
  if (dateKey === tomorrowKey) return 'Tomorrow';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
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

function coachInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function CoachGridCell({
  coaches,
  fallbackLabel,
}: {
  coaches: ClassPerson[];
  fallbackLabel: string;
}) {
  if (coaches.length === 0) {
    return (
      <p className={`${MODAL_MUTED} mt-1.5 flex items-center gap-1.5 min-w-0 overflow-hidden`}>
        <User size={14} className="shrink-0 text-[#9A8E7E]" aria-hidden />
        <span className="truncate">{fallbackLabel}</span>
      </p>
    );
  }

  return (
    <ul className="mt-1.5 flex flex-col gap-1.5 min-w-0 overflow-hidden">
      {coaches.slice(0, 2).map((coach) => (
        <li key={coach.accountId} className="flex items-center gap-2 min-w-0 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-[#EDE8D8] border border-[#D4CDB5]/55 flex items-center justify-center shrink-0 overflow-hidden">
            {coach.photo ? (
              <img src={coach.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[#1E2A35] text-[10px] font-bold">{coachInitials(coach.name) || '?'}</span>
            )}
          </div>
          <span className={`${MODAL_VALUE} truncate min-w-0 text-[13px]`} title={coach.name}>
            {coach.name}
          </span>
        </li>
      ))}
      {coaches.length > 2 ? (
        <li className="text-xs font-medium text-[#9A8E7E] pl-10 truncate">
          +{coaches.length - 2} more
        </li>
      ) : null}
    </ul>
  );
}

function studentInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function capacityProgress(enrolled: number, limit: number | null): { percent: number; barColor: string } {
  if (limit == null || limit <= 0) {
    return { percent: 0, barColor: '#B0A898' };
  }
  const percent = Math.min(100, Math.round((enrolled / limit) * 100));
  let barColor = '#22c55e';
  if (percent >= 85) barColor = '#ef4444';
  else if (percent >= 60) barColor = '#facc15';
  return { percent, barColor };
}

type CoachRosterPanel = 'enrolled' | 'waitlist';

function StudentAvatarIcon({ student, sizeClass = 'w-8 h-8' }: { student: ClassPerson; sizeClass?: string }) {
  return (
    <div
      className={`${sizeClass} rounded-lg bg-white border border-[#D4CDB5]/55 flex items-center justify-center shrink-0 overflow-hidden`}
      title={student.name}
    >
      {student.photo ? (
        <img src={student.photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[#1E2A35] text-[10px] font-bold">{studentInitials(student.name) || '?'}</span>
      )}
    </div>
  );
}

function CoachPeopleCompactBlock({
  title,
  icon,
  people,
  loading,
  loadError,
  emptyMessage,
  seeLabel,
  expanded,
  onExpand,
}: {
  title: string;
  icon: React.ReactNode;
  people: ClassPerson[];
  loading?: boolean;
  loadError?: string | null;
  emptyMessage: string;
  seeLabel: string;
  expanded: boolean;
  onExpand: () => void;
}) {
  const canExpand = !loading && !loadError && people.length > 0;

  return (
    <div className={MODAL_CARD}>
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <p className={`${MODAL_VALUE} truncate min-w-0 text-[13px] flex-1`}>{title}</p>
        <span className="text-xs tabular-nums text-[#8A7E6E] shrink-0">{loading ? '…' : people.length}</span>
        {canExpand ? (
          <button
            type="button"
            onClick={onExpand}
            className={`ml-1 flex shrink-0 items-center gap-0.5 text-[11px] font-bold transition-colors ${
              expanded ? 'text-[#1E2A35]' : 'text-[#c49a3c] hover:text-[#a67d2a]'
            }`}
          >
            {seeLabel}
            <ChevronRight
              size={14}
              strokeWidth={2.5}
              aria-hidden
              className={`transition-transform duration-300 ease-in-out ${expanded ? 'rotate-90' : ''}`}
            />
          </button>
        ) : null}
      </div>
      <div className="mt-2 min-w-0">
        {loading ? (
          <div className="flex items-center gap-2 py-2 text-[#8A7E6E] text-xs">
            <Loader2 size={14} className="animate-spin text-[#c49a3c]" />
            Loading…
          </div>
        ) : loadError ? (
          <p className="text-red-700 text-xs py-2 px-1">{loadError}</p>
        ) : people.length === 0 ? (
          <p className="text-[#B0A898] text-xs py-2">{emptyMessage}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5 min-w-0" aria-label={title}>
            {people.map((student) => (
              <li key={student.accountId}>
                <StudentAvatarIcon student={student} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StudentGridCard({
  student,
  onClick,
}: {
  student: ClassPerson;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex aspect-square w-full min-w-0 flex-col items-center justify-between gap-1 rounded-xl border border-[#D4CDB5]/45 bg-[#F8F3E8]/50 p-1.5 text-center transition-colors hover:border-[#c49a3c]/35 hover:bg-[#FBF9F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/30"
      title={`${student.name} — view profile`}
    >
      <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-lg border border-[#D4CDB5]/55 bg-white">
        {student.photo ? (
          <img src={student.photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[#1E2A35] text-xs font-bold px-1">
            {studentInitials(student.name) || '?'}
          </span>
        )}
      </div>
      <p className="text-[#1E2A35] text-[10px] font-semibold leading-tight line-clamp-2 w-full shrink-0">
        {student.name}
      </p>
    </button>
  );
}

function CoachPeopleSidePanel({
  title,
  people,
  onSelectStudent,
  onCollapse,
}: {
  title: string;
  people: ClassPerson[];
  onSelectStudent: (accountId: string) => void;
  onCollapse: () => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#FBF9F3] sm:bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#D4CDB5]/50 px-4 py-3">
        <p className={`${MODAL_VALUE} text-[13px] truncate`}>{title}</p>
        <span className="text-xs tabular-nums text-[#8A7E6E] shrink-0">{people.length}</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2 grid grid-cols-3 gap-2 content-start sm:grid-cols-2">
        {people.map((student) => (
          <li key={student.accountId} className="min-w-0">
            <StudentGridCard
              student={student}
              onClick={() => onSelectStudent(student.accountId)}
            />
          </li>
        ))}
      </ul>
      <div className="shrink-0 border-t border-[#D4CDB5]/50 px-4 py-3 text-center">
        <button
          type="button"
          onClick={onCollapse}
          className="text-[#8A7E6E] text-xs font-semibold hover:text-[#c49a3c] transition-colors"
        >
          Collapse Panel
        </button>
      </div>
    </div>
  );
}

export function MemberMyClassDetailModal({
  listItem,
  detail,
  loading,
  loadError,
  now,
  accentColor,
  onClose,
  coachRoster,
  onRequestCancellation,
  requestCancellationSubmitting,
  requestCancellationDisabled,
  coachStatusBadge,
}: {
  listItem: MemberEnrolledClassItem;
  detail: MemberMyClassDetail | null;
  loading: boolean;
  loadError: string | null;
  now: Date;
  accentColor: string;
  onClose: () => void;
  /** Coach portal: submit cancellation request for admin review. */
  onRequestCancellation?: () => void;
  requestCancellationSubmitting?: boolean;
  requestCancellationDisabled?: boolean;
  /** Coach portal: card-style status badge (Assigned, cancellation, etc.). */
  coachStatusBadge?: { label: string; className: string };
  /** Coach portal: show enrolled members and open profile on tap. */
  coachRoster?: {
    students: ClassPerson[];
    waitlisted?: ClassPerson[];
    loading?: boolean;
    waitlistLoading?: boolean;
    loadError?: string | null;
    waitlistLoadError?: string | null;
    onSelectStudent: (accountId: string) => void;
  };
}) {
  const title = detail?.name?.trim() || listItem.className;
  const disciplineName = detail?.disciplineName ?? listItem.disciplineName;
  const startsAt = detail?.startsAt ?? listItem.startsAt;
  const endsAt = detail?.endsAt ?? listItem.endsAt;
  const enrolled = detail?.enrolledCount ?? 0;
  const limit = detail?.classLimit ?? null;
  const available = limit != null ? Math.max(0, limit - enrolled) : null;
  const progress = capacityProgress(enrolled, limit);
  const coaches = detail?.coaches ?? [];
  const isCoachView = Boolean(coachRoster);
  const rosterStudents = coachRoster?.students ?? [];
  const waitlistStudents = coachRoster?.waitlisted ?? [];
  const [rosterPanel, setRosterPanel] = useState<CoachRosterPanel | null>(null);

  useEffect(() => {
    setRosterPanel(null);
  }, [listItem.id]);

  const rosterExpanded = rosterPanel != null;
  const sidePanelPeople =
    rosterPanel === 'waitlist'
      ? waitlistStudents
      : rosterPanel === 'enrolled'
        ? rosterStudents
        : [];
  const sidePanelTitle = rosterPanel === 'waitlist' ? 'Waitlisted' : 'Enrolled students';

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[110] bg-[#1E2A35]/50 backdrop-blur-[2px] transition-opacity duration-300"
        role="presentation"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`pointer-events-auto flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#D4CDB5]/60 bg-[#FBF9F3] shadow-2xl min-h-0 transition-[max-width,max-height] duration-300 ease-in-out ${
            rosterExpanded
              ? 'max-w-[min(96vw,52rem)] max-h-[min(90vh,44rem)]'
              : `max-w-lg sm:max-w-[34rem] ${isCoachView ? 'max-h-[min(90vh,44rem)]' : ''}`
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-my-class-detail-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1.5 shrink-0" style={{ backgroundColor: accentColor }} />
          <div
            className={`min-h-0 min-w-0 flex-1 ${
              isCoachView && coachRoster
                ? `grid grid-cols-1 transition-[grid-template-rows] duration-300 ease-in-out sm:transition-[grid-template-columns] ${
                    rosterExpanded
                      ? 'grid-rows-[1fr_auto] sm:grid-rows-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,17.5rem)]'
                      : 'grid-rows-1 sm:grid-cols-[minmax(0,1fr)_0fr]'
                  }`
                : 'flex flex-col'
            }`}
          >
            <div className="flex min-h-0 min-w-0 flex-col flex-1 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-[#D4CDB5]/50 flex items-start justify-between gap-3 min-w-0 overflow-hidden shrink-0">
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className={`${MODAL_LABEL} tracking-[0.2em]`}>
                  {isCoachView ? 'Assigned class' : 'Your class'}
                </p>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                    isCoachView && coachStatusBadge
                      ? coachStatusBadge.className
                      : ENROLLMENT_STATUS_STYLE[listItem.status]
                  }`}
                >
                  {isCoachView && coachStatusBadge
                    ? coachStatusBadge.label
                    : ENROLLMENT_STATUS_LABEL[listItem.status]}
                </span>
              </div>
              <h2
                id="member-my-class-detail-title"
                className="text-[#1E2A35] leading-tight truncate"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.55rem', letterSpacing: '0.04em' }}
              >
                {title}
              </h2>
              {detail?.uid ? (
                <p className="text-[#8A7E6E] text-xs mt-1 tabular-nums">Class ID {detail.uid}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-[#D4CDB5]/70 text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className={`px-5 py-3 flex min-w-0 flex-col gap-2.5 ${isCoachView ? 'min-h-0 flex-1 overflow-y-auto' : 'overflow-hidden'}`}
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-[#8A7E6E]">
                <Loader2 size={24} className="mb-2 animate-spin text-[#c49a3c]" />
                <p className="text-sm">Loading class details…</p>
              </div>
            ) : loadError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {loadError}
              </p>
            ) : (
              <>
                <div className="min-w-0 overflow-hidden rounded-xl border border-[#D4CDB5]/70 bg-gradient-to-br from-[#F8F3E8] to-[#FBF9F3] px-3.5 py-3">
                  <div className="flex items-start gap-3 min-w-0 overflow-hidden">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 border border-[#D4CDB5]/60 text-[#c49a3c]">
                      <Clock size={17} strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className={MODAL_LABEL}>Schedule</p>
                      <p className="text-[#1E2A35] text-base font-semibold tabular-nums leading-snug truncate mt-0.5">
                        {formatTimeRange(startsAt, endsAt)}
                        <span className="text-[#8A7E6E] font-medium text-xs">
                          {' '}
                          · {formatDurationMinutes(startsAt, endsAt)}
                        </span>
                      </p>
                      <p className={`${MODAL_MUTED} flex items-center gap-1.5 mt-1 min-w-0 overflow-hidden`}>
                        <CalendarDays size={14} className="shrink-0 text-[#9A8E7E]" aria-hidden />
                        <span className="truncate">{formatDisplayDate(startsAt, now)}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 min-w-0 w-full">
                  <div className={MODAL_CARD}>
                    <p className={`${MODAL_LABEL} truncate`}>Discipline</p>
                    <div className="flex items-center gap-2 min-w-0 mt-1.5 overflow-hidden">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-[#D4CDB5]/50 bg-[#F8F3E8]">
                        <ImageWithFallback
                          src={detail?.disciplineLogoUrl ?? ''}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className={`${MODAL_VALUE} truncate min-w-0 flex-1 text-[13px]`} title={disciplineName}>
                        {disciplineName}
                      </p>
                    </div>
                  </div>
                  <div className={MODAL_CARD}>
                    <p className={`${MODAL_LABEL} truncate`}>Coach</p>
                    <CoachGridCell coaches={coaches} fallbackLabel={listItem.coachLabel} />
                  </div>
                </div>

                {detail?.description ? (
                  <div className={MODAL_CARD}>
                    <p className={`${MODAL_LABEL} mb-1`}>Description</p>
                    <p className={`${MODAL_MUTED} leading-relaxed line-clamp-2`}>{detail.description}</p>
                  </div>
                ) : null}

                {detail ? (
                  <div className="grid grid-cols-2 gap-2.5 min-w-0 w-full">
                    <div className={`${MODAL_CARD} flex flex-col gap-1`}>
                      <p className={`${MODAL_LABEL} truncate`}>Schedule block</p>
                      <span className={`${MODAL_VALUE} truncate text-[13px]`}>
                        {BLOCK_STATUS_LABELS[detail.statusBlock]}
                      </span>
                    </div>
                    <div className={`${MODAL_CARD} flex flex-col gap-1`}>
                      <p className={`${MODAL_LABEL} truncate`}>Enrollment</p>
                      <span className={`${MODAL_VALUE} leading-snug line-clamp-2 text-[13px]`}>
                        {CLASS_OPEN_STATUS_LABELS[detail.statusClass]}
                      </span>
                    </div>
                  </div>
                ) : null}

                {detail && limit != null ? (
                  <div className={MODAL_CARD}>
                    <div className="flex items-center justify-between gap-3 mb-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                        <UserCheck size={16} className="text-[#5A5048] shrink-0" strokeWidth={2.25} />
                        <p className={`${MODAL_VALUE} truncate min-w-0 text-[13px]`}>
                          {available != null ? available : '—'} spots open
                        </p>
                      </div>
                      <p className="text-xs tabular-nums text-[#8A7E6E] shrink-0 whitespace-nowrap">
                        {enrolled}/{limit} · {progress.percent}%
                      </p>
                    </div>
                    {limit > 0 ? (
                      <div
                        className="h-2 w-full max-w-full rounded-full bg-[#EDE8D8] overflow-hidden"
                        role="progressbar"
                        aria-valuenow={progress.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Class enrollment fill"
                      >
                        <div
                          className="h-full max-w-full rounded-full transition-[width] duration-300 ease-out"
                          style={{
                            width: `${progress.percent}%`,
                            backgroundColor: progress.barColor,
                          }}
                        />
                      </div>
                    ) : null}
                    {!isCoachView ? (
                      <p className="text-[10px] text-[#B0A898] mt-1.5 truncate">Roster is private</p>
                    ) : null}
                  </div>
                ) : null}

                {isCoachView && coachRoster ? (
                  <>
                    <CoachPeopleCompactBlock
                      title="Enrolled students"
                      icon={<Users size={16} className="text-[#5A5048] shrink-0" strokeWidth={2.25} />}
                      people={rosterStudents}
                      loading={coachRoster.loading}
                      loadError={coachRoster.loadError}
                      emptyMessage="No students enrolled yet."
                      seeLabel="See Enrolled"
                      expanded={rosterPanel === 'enrolled'}
                      onExpand={() => setRosterPanel('enrolled')}
                    />
                    <CoachPeopleCompactBlock
                      title="Waitlisted"
                      icon={<Hourglass size={16} className="text-amber-700 shrink-0" strokeWidth={2.25} />}
                      people={waitlistStudents}
                      loading={coachRoster.waitlistLoading}
                      loadError={coachRoster.waitlistLoadError}
                      emptyMessage="No one on the waitlist."
                      seeLabel="See Waitlist"
                      expanded={rosterPanel === 'waitlist'}
                      onExpand={() => setRosterPanel('waitlist')}
                    />
                  </>
                ) : null}
              </>
            )}
          </div>
            </div>

            {isCoachView && coachRoster ? (
              <div
                aria-hidden={!rosterExpanded}
                className={`min-h-0 min-w-0 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out sm:max-h-none sm:transition-[opacity] ${
                  rosterExpanded
                    ? 'max-h-[min(42vh,22rem)] opacity-100'
                    : 'max-h-0 opacity-0 pointer-events-none sm:opacity-0'
                } ${rosterExpanded ? 'pointer-events-auto sm:opacity-100' : ''}`}
              >
                <div
                  className={`flex h-full min-h-0 min-w-0 w-full flex-col border-[#D4CDB5]/50 transition-[border-color,transform,opacity] duration-300 ease-in-out ${
                    rosterExpanded
                      ? 'border-t sm:border-t-0 sm:border-l translate-y-0 opacity-100'
                      : 'border-transparent opacity-0 sm:translate-x-2'
                  }`}
                >
                  <CoachPeopleSidePanel
                    title={sidePanelTitle}
                    people={sidePanelPeople}
                    onSelectStudent={coachRoster.onSelectStudent}
                    onCollapse={() => setRosterPanel(null)}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div
            className={`shrink-0 border-t border-[#D4CDB5]/50 bg-white px-5 py-3 overflow-hidden rounded-b-2xl ${
              isCoachView && onRequestCancellation ? 'grid grid-cols-2 gap-2.5' : ''
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-colors"
            >
              Close
            </button>
            {isCoachView && onRequestCancellation ? (
              <button
                type="button"
                onClick={onRequestCancellation}
                disabled={rosterExpanded || requestCancellationDisabled || requestCancellationSubmitting}
                title={
                  rosterExpanded
                    ? 'Collapse the roster panel to request cancellation'
                    : requestCancellationDisabled
                      ? 'A cancellation request is already pending for this class'
                      : undefined
                }
                className="w-full py-2.5 rounded-xl border border-red-200/80 bg-red-50/80 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-45 disabled:pointer-events-none disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {requestCancellationSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />
                    Submitting…
                  </>
                ) : (
                  'Request Cancellation'
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
