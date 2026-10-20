import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  ChevronDown,
  Check,
  AlertCircle,
  Clock,
  Undo2,
  Layers,
  Users,
  UserCheck,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStaffAuth } from '../context/StaffAuthContext';
import { AdminTablePagination, useFitPageSize } from '../components/layout/AdminTablePagination';
import { PageLoadingScreen } from '../components/layout/PageLoadingScreen';
import { useClassesScheduleRealtimeSync } from '../hooks/useClassesScheduleRealtime';
import {
  fetchDisciplinesForAdmin,
  fetchDisciplinesForPublic,
  isDisciplineActive,
  statusColorFromHue,
  type DisciplineDisplay,
} from '../../lib/discipline-service';
import { normalizeDisciplineColorHex } from '../../lib/default-assets';
import { getDisciplinePlaceholderLogo } from '../data/disciplines';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import {
  toastCreated,
  toastDeleted,
  toastOperationFailed,
  toastSaved,
  toastUpdated,
} from '../../lib/operation-toast';
import {
  fetchPortalRequests,
  fetchCancellationPortalRequests,
  fetchPortalRequestsForClass,
  fetchMyPortalRequests,
  mergePortalRequestRows,
  portalRequestMatchesClassId,
  classIdsWithPendingPortalRequests,
  myPendingSlotRequestClassIds,
  myPendingSlotRequestIdForClass,
  notifyPortalRequestsChanged,
  withdrawPortalRequest,
  PORTAL_REQUESTS_CHANGED,
  reviewPortalRequest,
  isClassCancellationShortNotice,
  portalRequestStatusBadgeClass,
  type PortalRequestRow,
  type PortalRequestStatus,
} from '../../lib/portal-request-service';
import {
  CLASS_BLOCK_STATUSES,
  isTerminalClassBlockStatus,
  MEMBER_SCHEDULE_VISIBLE_BLOCK_STATUSES,
  classToUpsertInput,
  createClass,
  deleteClass,
  fetchClassesForAdmin,
  fetchClassesForMemberSchedule,
  fetchClassesForPublicSchedule,
  classSessionHasStarted,
  fetchClassesForStaffSchedule,
  updateClass,
  type ClassBlockStatus,
  type ClassDisplay,
  type ClassUpsertInput,
} from '../../lib/class-service';
import {
  fetchMemberClassEnrollmentGate,
  fetchMemberEnrollmentStatusMap,
  type MemberClassEnrollmentStatus,
} from '../../lib/class-payment-service';
import {
  fetchManagedAccountsWithProfiles,
  withBucketProfileImages,
} from '../../lib/admin-service';
import {
  AdminClassModal,
  type ClassPersonOption,
} from '../components/classes/AdminClassModal';
import {
  StaffCancellationRequestModal,
  type StaffCancellationRequestContext,
} from '../components/classes/StaffCancellationRequestModal';
import {
  StaffSlotRequestModal,
  type StaffSlotRequestContext,
} from '../components/classes/StaffSlotRequestModal';
import { PendingPortalRequestWithdrawActions } from '../components/portal/PendingPortalRequestWithdrawActions';
import { ClassBlockStatusLegend } from '../components/schedule/ClassBlockStatusLegend';
import {
  blockMatchesClassScheduleFilters,
  ClassScheduleCalendarFilter,
  countClassScheduleFilterSelections,
  emptyClassScheduleCalendarFilters,
  type ClassScheduleCalendarFilters,
} from '../components/schedule/ClassScheduleCalendarFilter';
import {
  allClassesToBlocks,
  buildDisciplineClassColors,
  buildStartEndFromMinutes,
  coachDisplayShort,
  localMinutesFromIso,
  mergeScheduleBlock,
  provisionalScheduleBlock,
  type AdminScheduleBlock,
  type ScheduleBlockColorMode,
} from '../../lib/admin-schedule-map';
import { findOverlappingScheduleRow } from '../../lib/schedule-overlap';
import { sendScheduleCoachAssignedEmail } from '../../lib/schedule-coach-email';
import {
  CALENDAR_BORDER_DIVIDER,
  CALENDAR_DATE_MUTED,
  CALENDAR_DAY_LABEL,
  CALENDAR_GRID_HALF_HOUR_LINE,
  CALENDAR_GRID_HOUR_LINE,
  CALENDAR_PANEL_FILTER_LABEL,
  CALENDAR_PANEL_FILTER_SELECT,
  isLightCalendarFill,
  CALENDAR_PANEL_GRID_HALF_HOUR,
  CALENDAR_PANEL_GRID_HOUR,
  CALENDAR_PANEL_HOVER_SLOT,
  CALENDAR_PANEL_HOVER_TIME,
  CALENDAR_PANEL_TIME_GUTTER,
  CALENDAR_PANEL_TIME_LABEL,
  CALENDAR_PANEL_TIME_META,
  CALENDAR_PANEL_TIMELINE_SURFACE,
  CALENDAR_TIME_GUTTER_BG,
  CALENDAR_TIME_LABEL,
  CALENDAR_TODAY_COLUMN,
} from '../components/calendar/calendarContrast';
import { MonthCalendarGrid, type MonthGridEvent } from '../components/calendar/MonthCalendarGrid';
import { ClockDatePicker } from '../components/calendar/ClockDatePicker';
import { ClockTimePicker } from '../components/calendar/ClockTimePicker';
import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_HOURS,
  CALENDAR_DAY_START_HOUR,
  CLOCK_MINUTE_STEP,
  formatHour24,
  formatMinutesOfDay,
  minutesFromIsoLocal,
  snapMinutesToStep,
} from '../components/calendar/clock-time';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import {
  MONTH_NAMES,
  addDaysToDate,
  dateKeyToDate,
  formatWeekRange,
  formatDayRange,
  formatDateLongFromKey,
  getInitialCalendarMonth,
  getSundayOfWeekContaining,
  getThreeDayDates,
  visibleRangeIncludesToday,
  getTodayDateKey,
  getTodayLocal,
  toDateKey,
  toDateKeyFromParts,
  DAY_LABELS_FULL,
  isWeekendDate,
  SCHEDULE_END_HOUR,
  SCHEDULE_START_HOUR,
  WEEKEND_COLUMN_BG,
  WEEKEND_COLUMN_BG_SOFT,
} from '../components/calendar/weekCalendarUtils';

// ── Types & Data ───────────────────────────────────────────────

type ScheduleBlock = AdminScheduleBlock;

type ReqStatus = PortalRequestStatus;

function pendingActionCountBadgeClass(): string {
  return 'px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white';
}

function requestStatusFilterCountBadgeClass(
  filterId: string,
  count: number,
  filterActive: boolean,
): string {
  const base = 'px-1.5 py-0.5 rounded-full text-[10px] font-bold';
  if (filterId === 'pending' && count > 0) {
    return `${base} bg-red-500 text-white`;
  }
  if (filterActive) {
    return `${base} bg-white/20 text-white`;
  }
  return `${base} bg-[#EDE8D8] text-[#8A7E6E]`;
}

interface ClassScheduleRequest {
  id: string;
  staff: string;
  email: string;
  requesterPhoto: string;
  className: string;
  discipline: string;
  disciplineLogoUrl: string;
  disciplineImageUrl: string;
  disciplineHue: number;
  date: string;
  startTime: string;
  endTime: string;
  classLimit: number;
  submittedAt: string;
  status: ReqStatus;
  dayIndex: number;
  startHour: number;
  duration: number;
  coach: string;
}

const SCHEDULE_UNASSIGNED_LABEL = 'Unassigned';

function unassignedIfBlank(label: string | undefined | null): string {
  const trimmed = label?.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return SCHEDULE_UNASSIGNED_LABEL;
  return trimmed;
}

function personInitials(name: string): string {
  const display = unassignedIfBlank(name);
  if (display === SCHEDULE_UNASSIGNED_LABEL) return 'U';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function blockPanelRequestAccent(
  discipline: string,
  disciplineHue: number,
): string {
  return statusColorFromHue(disciplineHue) || CLASS_COLORS[discipline] || '#c49a3c';
}

function BlockPanelCoachDisciplineRow({
  coachName,
  coachPhoto,
  submittedMeta,
  discipline,
  disciplineImageUrl,
  disciplineLogoUrl,
  disciplineHue,
}: {
  coachName: string;
  coachPhoto: string;
  submittedMeta: string;
  discipline: string;
  disciplineImageUrl: string;
  disciplineLogoUrl: string;
  disciplineHue: number;
}) {
  return (
    <div className="flex min-w-0 items-stretch overflow-hidden rounded-lg border border-[#D4CDB5]/55 bg-[#FBF9F3]">
      <div className="flex min-w-0 flex-[1.05] items-center gap-2 border-r border-[#D4CDB5]/45 bg-white px-2 py-2">
        <PortalPersonAvatar name={coachName} photo={coachPhoto} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E]">
            Requesting coach
          </p>
          <p className="text-[#1E2A35] text-xs font-semibold truncate leading-tight">{coachName}</p>
          <p className="text-[#B0A898] text-[10px] truncate mt-0.5">{submittedMeta}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 bg-[#F8F3E8]/55 px-2 py-2">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-[#D4CDB5]/50 bg-white shadow-sm">
          <ImageWithFallback
            src={
              disciplineImageUrl?.trim()
              || disciplineLogoUrl
              || getDisciplinePlaceholderLogo(discipline)
            }
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E]">Discipline</p>
          <p className="text-[#1E2A35] text-xs font-semibold truncate leading-tight">{discipline}</p>
        </div>
        <span
          className="h-2 w-2 shrink-0 rounded-full ring-2 ring-white"
          style={{ backgroundColor: blockPanelRequestAccent(discipline, disciplineHue) }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function PortalPersonAvatar({
  name,
  photo,
  size = 48,
}: {
  name: string;
  photo?: string;
  size?: number;
}) {
  const trimmed = photo?.trim();
  if (trimmed) {
    return (
      <ImageWithFallback
        src={trimmed}
        alt=""
        className="shrink-0 rounded-full object-cover ring-2 ring-white shadow-md"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[#1E2A35] text-sm font-semibold text-white ring-2 ring-white shadow-md"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {personInitials(name) || '?'}
    </div>
  );
}

interface CancelRequest {
  id: string;
  isMemberEnrollmentCancel: boolean;
  coach: string;
  email: string;
  requesterPhoto: string;
  className: string;
  discipline: string;
  disciplineLogoUrl: string;
  disciplineImageUrl: string;
  disciplineHue: number;
  date: string;
  time: string;
  enrolled: number;
  requestedAt: string;
  hoursUntilClass: number;
  status: ReqStatus;
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

function mapPortalSlotRequest(
  req: PortalRequestRow,
  requesterLabel: { name: string; email: string; photo?: string },
  classRow: ClassDisplay | undefined,
  disciplineMeta: {
    name: string;
    logoUrl: string;
    imageUrl: string;
    hue: number;
  },
  coachShort: string,
): ClassScheduleRequest {
  const payload = req.payload as {
    name?: string;
    class_limit?: number;
    discipline_id?: string;
  };
  const startsAt = classRow?.startsAt ?? '';
  const endsAt = classRow?.endsAt ?? null;
  const startDate = startsAt ? new Date(startsAt) : new Date();
  const dateStr = startsAt
    ? startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '—';
  const startTime = startsAt
    ? startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '—';
  const endTime = endsAt
    ? new Date(endsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '—';
  const duration = startsAt && endsAt
    ? Math.max(15, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000))
    : 60;
  const weekStart = getSundayOfWeekContaining(startDate);
  const dayIndex = Math.min(6, Math.max(0, Math.round((startDate.getTime() - weekStart.getTime()) / 86_400_000)));

  const disciplineName = disciplineMeta.name || classRow?.disciplineName || '—';

  return {
    id: req.id,
    staff: requesterLabel.name,
    email: requesterLabel.email,
    requesterPhoto: requesterLabel.photo?.trim() ?? '',
    className: payload.name?.trim() || classRow?.name || '—',
    discipline: disciplineName,
    disciplineLogoUrl: disciplineMeta.logoUrl || getDisciplinePlaceholderLogo(disciplineName),
    disciplineImageUrl: disciplineMeta.imageUrl,
    disciplineHue: disciplineMeta.hue,
    date: dateStr,
    startTime,
    endTime,
    classLimit: payload.class_limit ?? classRow?.classLimit ?? 12,
    submittedAt: formatRelativeSubmitted(req.created_at),
    status: req.status,
    dayIndex,
    startHour: startDate.getHours(),
    duration,
    coach: coachShort,
  };
}

function mapPortalCancellationRequest(
  req: PortalRequestRow,
  requesterLabel: { name: string; email: string; photo?: string },
  classRow: ClassDisplay | undefined,
  disciplineMeta: {
    name: string;
    logoUrl: string;
    imageUrl: string;
    hue: number;
  },
): CancelRequest {
  const startsAt = classRow?.startsAt ?? '';
  const startDate = startsAt ? new Date(startsAt) : new Date();
  const dateStr = startsAt
    ? startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '—';
  const timeStr = startsAt
    ? startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '—';
  const hoursUntil = startsAt
    ? Math.max(0, Math.round((startDate.getTime() - Date.now()) / 3_600_000))
    : 0;

  const disciplineName = disciplineMeta.name || classRow?.disciplineName || '—';
  const isMember = req.request_type === 'member_enrollment_cancellation';

  return {
    id: req.id,
    isMemberEnrollmentCancel: isMember,
    coach: isMember ? `Member · ${requesterLabel.name}` : requesterLabel.name,
    email: requesterLabel.email,
    requesterPhoto: requesterLabel.photo?.trim() ?? '',
    className: classRow?.name || classRow?.disciplineName || 'Class',
    discipline: disciplineName,
    disciplineLogoUrl: disciplineMeta.logoUrl || getDisciplinePlaceholderLogo(disciplineName),
    disciplineImageUrl: disciplineMeta.imageUrl,
    disciplineHue: disciplineMeta.hue,
    date: dateStr,
    time: timeStr,
    enrolled: classRow?.enrolledCount ?? 0,
    requestedAt: formatRelativeSubmitted(req.created_at),
    hoursUntilClass: hoursUntil,
    status: req.status,
  };
}

const CLASS_COLORS: Record<string, string> = {
  'Yoga': '#c49a3c', 'Calisthenics': '#3A4A5A', 'Animal Flow': '#6B8E6B',
  'Groundworks': '#8B6F5A', 'Circuit Training': '#B86A4A', 'Mat Pilates': '#9A7A8A',
  'Kickboxing': '#7A3A4A', 'Capoeira': '#A07050', 'Personal Coaching': '#a67f2e',
};
const SERVICES  = Object.keys(CLASS_COLORS);
const COACHES   = ['Rex', 'Jodi', 'Ephraim', 'Alec', 'Rachelle', 'Kate', 'Wolf'];
const WEEK_LABELS = [...DAY_LABELS_FULL];
const HOURS = CALENDAR_DAY_HOURS;
const DEFAULT_BLOCK_CLASS_LIMIT = 12;

const DEFAULT_START_MINUTES = 9 * 60;
const DEFAULT_END_MINUTES = 10 * 60;

/** Staff calendar: vacant block with the coach's pending slot request. */
/** Pending coach slot request — green, distinct from status_block fills (assigned/active/etc.). */
const STAFF_VACANT_REQUESTED_COLOR = '#6B8E6B';
const STAFF_VACANT_REQUESTED_RING = '#5A7A5A';
/** Staff vacant-slot modal header when a pending slot request exists. */
const STAFF_SLOT_REQUESTED_HEADER_BG = '#6B8E6B';
const STAFF_SLOT_REQUESTED_HEADER_BORDER = '#5A7A5A';

const BLOCK_STATUS_LABELS: Record<
  import('../../lib/class-service').ClassBlockStatus,
  string
> = {
  vacant: 'Vacant',
  assigned: 'Assigned',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function isStaffClassScheduleVisibleBlock(
  block: ScheduleBlock,
  pendingSlotRequestClassIds: ReadonlySet<string>,
): boolean {
  if (block.statusBlock === 'assigned' || block.statusBlock === 'active') return true;
  return block.statusBlock === 'vacant' && pendingSlotRequestClassIds.has(block.id);
}

function isAssignedScheduleBlock(statusBlock: ClassBlockStatus): boolean {
  return statusBlock !== 'vacant';
}

function scheduleBlockIncludesCoachAccount(
  block: ScheduleBlock,
  coachAccountId: string | undefined,
): boolean {
  const id = coachAccountId?.trim();
  if (!id) return false;
  if (block.coachAccountIds?.some((coachId) => coachId.trim() === id)) return true;
  return block.coachAccountId?.trim() === id;
}

function isMemberClassScheduleVisibleBlock(block: ScheduleBlock): boolean {
  return MEMBER_SCHEDULE_VISIBLE_BLOCK_STATUSES.includes(block.statusBlock);
}

function classBlockStatusBadgeClass(
  status: import('../../lib/class-service').ClassBlockStatus,
): string {
  switch (status) {
    case 'vacant':
      return 'bg-[#F8F3E8] text-[#5A5048] border-[#D4CDB5] ring-1 ring-[#c49a3c]/25';
    case 'assigned':
      return 'bg-amber-50 text-amber-900 border-amber-200 ring-1 ring-amber-300/40';
    case 'active':
      return 'bg-emerald-50 text-emerald-900 border-emerald-200 ring-1 ring-emerald-300/40';
    case 'completed':
      return 'bg-[#1E2A35]/8 text-[#1E2A35] border-[#1E2A35]/15 ring-1 ring-[#1E2A35]/10';
    case 'cancelled':
      return 'bg-rose-50 text-rose-900 border-rose-200 ring-1 ring-rose-300/40';
    default:
      return 'bg-[#EDE8D8] text-[#5A5048] border-[#D4CDB5]';
  }
}

function classBookingLabel(open: boolean): string {
  return open ? 'Open' : 'Closed';
}

function classBookingBadgeClass(open: boolean): string {
  return open
    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 ring-1 ring-emerald-300/40'
    : 'bg-[#1E2A35]/8 text-[#1E2A35] border-[#1E2A35]/15 ring-1 ring-[#1E2A35]/10';
}

function ScheduleHourRangeFilter({
  idPrefix,
  startHour,
  endHour,
  onStartHourChange,
  onEndHourChange,
  className,
  layout = 'inline',
}: {
  idPrefix: string;
  startHour: number;
  endHour: number;
  onStartHourChange: (hour: number) => void;
  onEndHourChange: (hour: number) => void;
  className?: string;
  layout?: 'inline' | 'stacked';
}) {
  const labelClass =
    layout === 'stacked'
      ? CALENDAR_PANEL_FILTER_LABEL
      : 'text-[#8A7E6E] text-[10px] font-semibold uppercase tracking-wide shrink-0';
  const selectClass = `appearance-none pl-2.5 pr-7 py-1 rounded-lg border outline-none cursor-pointer focus:ring-2 focus:ring-[#c49a3c]/25 w-full min-w-[6.5rem] ${
    layout === 'stacked'
      ? CALENDAR_PANEL_FILTER_SELECT
      : 'border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-[11px] font-semibold focus:ring-[#c49a3c]/20'
  }`;

  const stackedRowClass = 'grid grid-cols-[2.5rem_6.75rem] gap-x-1.5 items-center';
  const stackedLabelClass = `${labelClass} text-right justify-self-end`;

  const startRow = (
    <div className={layout === 'stacked' ? stackedRowClass : 'flex items-center gap-1.5'}>
      <label
        htmlFor={`${idPrefix}-start-hour`}
        className={layout === 'stacked' ? stackedLabelClass : labelClass}
      >
        Start
      </label>
      <div className={layout === 'stacked' ? 'relative w-full min-w-0' : 'relative'}>
        <select
          id={`${idPrefix}-start-hour`}
          value={startHour}
          onChange={(e) => {
            const next = Number(e.target.value);
            onStartHourChange(next);
            if (next >= endHour) {
              onEndHourChange(Math.min(CALENDAR_DAY_END_HOUR, next + 1));
            }
          }}
          className={selectClass}
        >
          {HOURS.filter((h) => h < endHour).map((h) => (
            <option key={`${idPrefix}-start-${h}`} value={h}>
              {formatHour24(h)}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none"
        />
      </div>
    </div>
  );

  const endRow = (
    <div className={layout === 'stacked' ? stackedRowClass : 'flex items-center gap-1.5'}>
      <label
        htmlFor={`${idPrefix}-end-hour`}
        className={layout === 'stacked' ? stackedLabelClass : labelClass}
      >
        End
      </label>
      <div className={layout === 'stacked' ? 'relative w-full min-w-0' : 'relative'}>
        <select
          id={`${idPrefix}-end-hour`}
          value={endHour}
          onChange={(e) => {
            const next = Number(e.target.value);
            onEndHourChange(next);
            if (next <= startHour) {
              onStartHourChange(Math.max(CALENDAR_DAY_START_HOUR, next - 1));
            }
          }}
          className={selectClass}
        >
          {HOURS.filter((h) => h > startHour).map((h) => (
            <option key={`${idPrefix}-end-${h}`} value={h}>
              {formatHour24(h)}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none"
        />
      </div>
    </div>
  );

  if (layout === 'stacked') {
    return (
      <div className={`ml-auto flex flex-col gap-1.5 items-end ${className ?? ''}`}>
        {startRow}
        {endRow}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ''}`}>
      {startRow}
      {endRow}
    </div>
  );
}

function timelineHourMarks(viewStartHour: number, viewEndHour: number): number[] {
  const start = Math.min(viewStartHour, viewEndHour);
  const end = Math.max(viewStartHour, viewEndHour);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function timelineSpanMinutes(viewStartHour: number, viewEndHour: number): number {
  const marks = timelineHourMarks(viewStartHour, viewEndHour);
  return Math.max(marks.length, 1) * 60;
}

function blockMinuteRange(block: ScheduleBlock): { startMin: number; endMin: number } {
  let startMin: number;
  if (block.startsAt) {
    startMin = minutesFromIsoLocal(block.startsAt);
  } else {
    startMin = block.startHour * 60;
  }
  let endMin: number;
  if (block.endsAt) {
    endMin = minutesFromIsoLocal(block.endsAt);
    if (endMin <= startMin) {
      endMin = startMin + block.duration;
    }
  } else {
    endMin = startMin + block.duration;
  }
  return { startMin, endMin };
}

function blockVisibleDurationInRange(
  block: ScheduleBlock,
  viewStartHour: number,
  viewEndHour: number,
): number {
  const { startMin, endMin } = blockMinuteRange(block);
  const marks = timelineHourMarks(viewStartHour, viewEndHour);
  const rangeStartMin = marks[0] * 60;
  const rangeEndMin = rangeStartMin + timelineSpanMinutes(viewStartHour, viewEndHour);
  if (endMin <= rangeStartMin || startMin >= rangeEndMin) return 0;
  const visStart = Math.max(startMin, rangeStartMin);
  const visEnd = Math.min(endMin, rangeEndMin);
  return visEnd - visStart;
}

function compactScheduleBlockEstimate(
  block: ScheduleBlock,
  viewStartHour: number,
  viewEndHour: number,
  timelineHeightPct: number,
): boolean {
  const visibleMin = blockVisibleDurationInRange(block, viewStartHour, viewEndHour);
  if (visibleMin <= SCHEDULE_BLOCK_COMPACT_MAX_VISIBLE_MINUTES) return true;
  if (
    Number.isFinite(timelineHeightPct) &&
    timelineHeightPct <= SCHEDULE_BLOCK_COMPACT_MAX_HEIGHT_PCT
  ) {
    return true;
  }
  return false;
}

function useScheduleBlockCompactMode(
  containerRef: RefObject<HTMLElement | null>,
  estimate: boolean,
  blockId: string,
): boolean {
  const [compact, setCompact] = useState(estimate);

  useLayoutEffect(() => {
    setCompact(estimate);
  }, [estimate, blockId]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const heightPx = el.clientHeight;
      if (heightPx <= 0) return;

      const overflows = el.scrollHeight > heightPx + 2;
      const tooShort = heightPx < SCHEDULE_BLOCK_COMPACT_MIN_PX;

      if (tooShort || overflows) {
        setCompact(true);
        return;
      }
      if (!estimate && heightPx >= 64) {
        setCompact(false);
        return;
      }
      setCompact(estimate);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, estimate, blockId]);

  return compact;
}

function weekBlockTimelineStyleInRange(
  block: ScheduleBlock,
  viewStartHour: number,
  viewEndHour: number,
): { top: string; height: string; hidden: boolean } {
  const { startMin, endMin } = blockMinuteRange(block);
  const marks = timelineHourMarks(viewStartHour, viewEndHour);
  const rangeStartMin = marks[0] * 60;
  const rangeEndMin = rangeStartMin + timelineSpanMinutes(viewStartHour, viewEndHour);

  if (endMin <= rangeStartMin || startMin >= rangeEndMin) {
    return { top: '0', height: '0', hidden: true };
  }

  return minutesRangeTimelineStyleInRange(startMin, endMin, viewStartHour, viewEndHour);
}

function minutesRangeTimelineStyleInRange(
  startMinutes: number,
  endMinutes: number,
  viewStartHour: number,
  viewEndHour: number,
): { top: string; height: string; hidden: boolean } {
  const marks = timelineHourMarks(viewStartHour, viewEndHour);
  const rangeStartMin = marks[0] * 60;
  const totalMin = timelineSpanMinutes(viewStartHour, viewEndHour);
  const rangeEndMin = rangeStartMin + totalMin;

  if (endMinutes <= rangeStartMin || startMinutes >= rangeEndMin) {
    return { top: '0', height: '0', hidden: true };
  }

  const visStart = Math.max(startMinutes, rangeStartMin);
  const visEnd = Math.min(endMinutes, rangeEndMin);
  const visDuration = visEnd - visStart;
  const topPct = ((visStart - rangeStartMin) / totalMin) * 100;
  const heightPct = (visDuration / totalMin) * 100;
  const minHeightPct = (15 / totalMin) * 100;

  return {
    top: `${topPct}%`,
    height: `${Math.max(heightPct, minHeightPct)}%`,
    hidden: visDuration <= 0,
  };
}

const TIMELINE_HOVER_SLOT_MINUTES = 60;
/** Matches day side panel `sm:max-w-md` — modal backdrop leaves this strip visible. */
const DAY_SCHEDULE_PANEL_WIDTH = '28rem';
/** Class Schedule block detail panel (wider than day panel). */
const CLASS_SCHEDULE_BLOCK_PANEL_WIDTH = '34rem';
/** Shorter blocks show time + status_block only (fits narrow timeline cells). */
const SCHEDULE_BLOCK_COMPACT_MAX_VISIBLE_MINUTES = 55;
const SCHEDULE_BLOCK_COMPACT_MAX_HEIGHT_PCT = 14;
const SCHEDULE_BLOCK_COMPACT_MIN_PX = 52;

function timelinePointerSlot(
  clientY: number,
  columnRect: DOMRect,
  viewStartHour: number,
  viewEndHour: number,
  slotMinutes = TIMELINE_HOVER_SLOT_MINUTES,
): { startMinutes: number; endMinutes: number } {
  const marks = timelineHourMarks(viewStartHour, viewEndHour);
  const rangeStartMin = marks[0] * 60;
  const totalMin = timelineSpanMinutes(viewStartHour, viewEndHour);
  const rangeEndMin = rangeStartMin + totalMin;
  const ratio = Math.max(0, Math.min(1, (clientY - columnRect.top) / columnRect.height));
  const rawStart = rangeStartMin + ratio * totalMin;
  let startMinutes = snapMinutesToStep(rawStart);
  startMinutes = Math.max(rangeStartMin, Math.min(startMinutes, rangeEndMin - CLOCK_MINUTE_STEP));
  let endMinutes = Math.min(rangeEndMin, startMinutes + slotMinutes);
  if (endMinutes <= startMinutes) {
    endMinutes = Math.min(rangeEndMin, startMinutes + CLOCK_MINUTE_STEP);
  }
  return { startMinutes, endMinutes };
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function formatDayShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function disciplineDotColor(discipline: DisciplineDisplay): string {
  const hex = normalizeDisciplineColorHex(discipline.colorHex);
  return hex || statusColorFromHue(discipline.status.hue);
}

function CalendarDisciplineMultiSelect({
  disciplines: items,
  selectedIds,
  onChange,
}: {
  disciplines: DisciplineDisplay[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggleId = (id: string) => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    );
  };

  const allSelected = selectedIds.length === 0;
  const label = allSelected ? 'All disciplines' : `${selectedIds.length} selected`;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
          !allSelected
            ? 'border-[#c49a3c]/45 bg-[#c49a3c]/10 text-[#8A6520]'
            : 'border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#5A5048] hover:border-[#c49a3c]/30'
        }`}
      >
        <Layers size={12} className="shrink-0 opacity-80" />
        <span className="max-w-[7.5rem] truncate">{label}</span>
        {!allSelected && (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#c49a3c] text-[9px] font-bold text-white">
            {selectedIds.length}
          </span>
        )}
        <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-40 left-0 top-full mt-1.5 w-64 max-h-72 overflow-y-auto rounded-2xl border border-[#D4CDB5]/60 bg-white p-2 shadow-[0_8px_28px_rgba(30,42,53,0.16)]">
          <button
            type="button"
            onClick={() => {
              onChange([]);
              setOpen(false);
            }}
            className="mb-1 w-full rounded-xl px-3 py-2 text-left text-[11px] font-semibold text-[#c49a3c] transition-colors hover:bg-[#F5F2E8]"
          >
            Show all disciplines
          </button>
          {items.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-[#8A7E6E]">No active disciplines.</p>
          ) : (
            items.map((d) => (
              <label
                key={d.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-[#F5F2E8]"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(d.id)}
                  onChange={() => toggleId(d.id)}
                  className="h-3.5 w-3.5 shrink-0 rounded accent-[#c49a3c]"
                />
                <span
                  className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: disciplineDotColor(d) }}
                />
                <span className="truncate text-[11px] text-[#1E2A35]">{d.name}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function scheduleBlockUsesDarkText(isVacant: boolean, fillColor?: string): boolean {
  if (isVacant) return true;
  return isLightCalendarFill(fillColor ?? '#c49a3c');
}

function scheduleBlockTimeRange(block: ScheduleBlock): string {
  const { startMin, endMin } = blockMinuteRange(block);
  return `${formatMinutesOfDay(startMin)} – ${formatMinutesOfDay(endMin)}`;
}

function scheduleBlockDisplayName(block: ScheduleBlock): string {
  return block.title?.trim() || block.className?.trim() || 'Class';
}

function scheduleBlockCapacityFromBlock(block: ScheduleBlock): {
  enrolled: number;
  limit: number | null;
  available: number | null;
} {
  const limit = block.capacity > 0 ? block.capacity : null;
  const enrolled = block.enrolled ?? 0;
  const available = limit != null ? Math.max(0, limit - enrolled) : null;
  return { enrolled, limit, available };
}

function ClassScheduleBlockScheduleCard({ block }: { block: ScheduleBlock }) {
  return (
    <div className="rounded-xl border border-[#D4CDB5]/70 bg-gradient-to-br from-[#F8F3E8] to-[#FBF9F3] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 border border-[#D4CDB5]/60 text-[#c49a3c] mt-0.5">
          <Clock size={16} strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A8E7E]">Schedule</p>
          <p className="text-[#5A5048] text-xs font-medium leading-snug">
            {formatDateLongFromKey(block.dateKey)}
          </p>
          <p className="text-[#1E2A35] text-sm font-semibold tabular-nums leading-tight">
            {scheduleBlockTimeRange(block)}
          </p>
          <p className="text-[#8A7E6E] text-[11px] font-medium tabular-nums">
            {block.duration} min session
          </p>
        </div>
      </div>
    </div>
  );
}

function memberClassCapacityProgress(enrolled: number, limit: number | null): {
  percent: number;
  barColor: string;
} {
  if (limit == null || limit <= 0) {
    return { percent: 0, barColor: '#B0A898' };
  }
  const percent = Math.min(100, Math.round((enrolled / limit) * 100));
  let barColor = '#22c55e';
  if (percent >= 85) barColor = '#ef4444';
  else if (percent >= 60) barColor = '#facc15';
  return { percent, barColor };
}

function memberAvailableSlotsLabel(available: number): string {
  return `${available} Slot${available === 1 ? '' : 's'}`;
}

function MemberClassBlockDetailModal({
  block,
  classRow,
  classIdLabel,
  disciplineMeta,
  slotCapacity,
  onClose,
  onEnroll,
  enrollDisabled,
  enrollHint,
  memberEnrollmentStatus,
  readOnly = false,
  showMemberEnrollmentSummary = false,
  onCancelSchedule,
  cancelScheduleDisabled = false,
}: {
  block: ScheduleBlock;
  classRow: ClassDisplay | null;
  classIdLabel: string;
  disciplineMeta: { name: string; logoSrc: string };
  slotCapacity: { enrolled: number; limit: number | null; available: number | null };
  onClose: () => void;
  onEnroll: () => void;
  enrollDisabled: boolean;
  enrollHint?: string;
  memberEnrollmentStatus?: MemberClassEnrollmentStatus | null;
  /** Staff class schedule: same session details, no enrollment actions. */
  readOnly?: boolean;
  /** Member schedule: show enrolled / waitlisted / not enrolled on past closed sessions. */
  showMemberEnrollmentSummary?: boolean;
  /** Staff: open schedule cancellation request for this assignment. */
  onCancelSchedule?: () => void;
  cancelScheduleDisabled?: boolean;
}) {
  const { enrolled, limit, available } = slotCapacity;
  const capacityProgress = memberClassCapacityProgress(enrolled, limit);
  /** `classes.status_class`: true = open for enrollment, false = closed. */
  const enrollmentOpen = classRow?.statusClass ?? block.statusClass;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[110] bg-[#1E2A35]/50 backdrop-blur-[2px]"
        role="presentation"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto flex w-full max-w-md min-h-0 max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-[#D4CDB5]/60 bg-[#FBF9F3] shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-class-block-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="h-1 shrink-0"
            style={{
              backgroundColor: isTerminalClassBlockStatus(block.statusBlock)
                ? '#A8A196'
                : block.color,
            }}
          />
          {showMemberEnrollmentSummary && memberEnrollmentStatus === 'enrolled' ? (
            <div className="shrink-0 flex items-center gap-2 border-b border-emerald-200/80 bg-emerald-50 px-4 py-2.5 text-emerald-900">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <Check size={16} strokeWidth={2.75} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight">You&apos;re enrolled in this class</p>
                <p className="text-[10px] font-medium text-emerald-800/90 mt-0.5">
                  {isTerminalClassBlockStatus(block.statusBlock)
                    ? 'This session has ended — your enrollment is on record.'
                    : 'View details below — enrollment is already confirmed.'}
                </p>
              </div>
            </div>
          ) : showMemberEnrollmentSummary && memberEnrollmentStatus === 'waitlisted' ? (
            <div className="shrink-0 flex items-center gap-2 border-b border-amber-200/80 bg-amber-50 px-4 py-2.5 text-amber-950">
              <Clock size={18} className="shrink-0 text-amber-700" strokeWidth={2.25} aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight">Payment pending — you&apos;re waitlisted</p>
                <p className="text-[10px] font-medium text-amber-900/90 mt-0.5">
                  We&apos;ll confirm enrollment after your payment is reviewed.
                </p>
              </div>
            </div>
          ) : showMemberEnrollmentSummary && isTerminalClassBlockStatus(block.statusBlock) ? (
            <div className="shrink-0 flex items-center gap-2 border-b border-[#D4CDB5]/60 bg-[#EDE8D8]/80 px-4 py-2.5 text-[#5A5048]">
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight">
                  {block.statusBlock === 'cancelled' ? 'Session cancelled' : 'Session completed'}
                </p>
                <p className="text-[10px] font-medium text-[#8A7E6E] mt-0.5">
                  You were not enrolled in this class.
                </p>
              </div>
            </div>
          ) : null}
          <div className="px-4 pt-4 pb-3 border-b border-[#D4CDB5]/50 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A8E7E] mb-1">
                Class session
              </p>
              <h2
                id="member-class-block-modal-title"
                className="text-[#1E2A35] leading-tight truncate"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.04em' }}
              >
                {block.title?.trim() || block.className?.trim() || 'Class'}
              </h2>
              {classIdLabel !== '—' ? (
                <p className="text-[#8A7E6E] text-[11px] mt-0.5 tabular-nums">Class ID {classIdLabel}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[#D4CDB5]/70 text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            <ClassScheduleBlockScheduleCard block={block} />

            <div className="min-w-0 rounded-xl border border-[#D4CDB5]/55 bg-white px-2.5 py-2 flex flex-col gap-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9A8E7E]">Discipline</p>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-[#D4CDB5]/50 bg-[#F8F3E8]">
                  <ImageWithFallback
                    src={disciplineMeta.logoSrc}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-[#1E2A35] text-xs font-semibold truncate min-w-0" title={disciplineMeta.name}>
                  {disciplineMeta.name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 min-w-0">
              <div className="rounded-xl border border-[#D4CDB5]/55 bg-white px-2.5 py-2 flex flex-col gap-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9A8E7E]">Block status</p>
                <span
                  className={`self-start inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${classBlockStatusBadgeClass(block.statusBlock)}`}
                >
                  {BLOCK_STATUS_LABELS[block.statusBlock]}
                </span>
              </div>
              <div className="rounded-xl border border-[#D4CDB5]/55 bg-white px-2.5 py-2 flex flex-col gap-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9A8E7E]">Enrollment</p>
                <span
                  className={`self-start inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${classBookingBadgeClass(enrollmentOpen)}`}
                >
                  {classBookingLabel(enrollmentOpen)}
                </span>
              </div>
            </div>

            {classRow?.description?.trim() ? (
              <div className="rounded-xl border border-[#D4CDB5]/55 bg-white px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9A8E7E] mb-1">Description</p>
                <p className="text-[#5A5048] text-xs leading-relaxed">{classRow.description}</p>
              </div>
            ) : null}

            <div className="rounded-xl border border-[#D4CDB5]/55 bg-white overflow-hidden shadow-sm">
              <div className="px-3 py-2.5 border-b border-[#D4CDB5]/45 bg-[#F8F3E8]/70 flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-[#D4CDB5]/55 text-[#5A5048]">
                  <UserCheck size={14} strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-[#1E2A35] text-xs font-semibold">Available slots</p>
                  <p className="text-[#8A7E6E] text-[10px] mt-0.5">Spots open for booking</p>
                </div>
              </div>
              <div className="px-3 py-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[#1E2A35] text-2xl font-bold tabular-nums leading-none">
                    {available != null ? available : '—'}
                  </p>
                  <p className="text-[#8A7E6E] text-[10px] mt-1.5">
                    {limit != null
                      ? `${enrolled} enrolled · ${limit} class capacity`
                      : 'Class capacity not set'}
                  </p>
                </div>
                {limit != null ? (
                  <div className="text-right shrink-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#9A8E7E]">Capacity</p>
                    <p className="text-[#1E2A35] text-sm font-bold tabular-nums mt-0.5">{limit}</p>
                  </div>
                ) : null}
              </div>
              {limit != null && limit > 0 ? (
                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#9A8E7E]">
                      Class fill
                    </p>
                    <p className="text-[10px] font-semibold tabular-nums text-[#5A5048]">
                      {capacityProgress.percent}%
                    </p>
                  </div>
                  <div
                    className="h-2 w-full rounded-full bg-[#EDE8D8] overflow-hidden"
                    role="progressbar"
                    aria-valuenow={capacityProgress.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Class enrollment fill"
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-300 ease-out"
                      style={{
                        width: `${capacityProgress.percent}%`,
                        backgroundColor: capacityProgress.barColor,
                      }}
                    />
                  </div>
                  <p className="text-[#9A8E7E] text-[10px] mt-1.5 leading-snug">
                    {capacityProgress.percent >= 85
                      ? 'Almost full — book soon.'
                      : capacityProgress.percent >= 60
                        ? 'Filling up — limited spots left.'
                        : 'Plenty of spots available.'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 border-t border-[#D4CDB5]/50 px-4 py-3 bg-white flex flex-col gap-2">
            {!readOnly && enrollHint ? (
              <p className="text-[#8A7E6E] text-[10px] text-center leading-snug">{enrollHint}</p>
            ) : null}
            {readOnly ? (
              onCancelSchedule ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={cancelScheduleDisabled}
                    className="w-full py-2.5 rounded-xl border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-colors disabled:opacity-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={onCancelSchedule}
                    disabled={cancelScheduleDisabled}
                    className="w-full py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Cancel Schedule
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-colors"
                >
                  Close
                </button>
              )
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={onEnroll}
                  disabled={enrollDisabled}
                  className="action-button flex-1 py-2.5 rounded-xl bg-[#c49a3c] text-white text-sm font-bold hover:bg-[#a67f2e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {memberEnrollmentStatus === 'enrolled' ? (
                    <>
                      <Check size={16} strokeWidth={2.5} />
                      Enrolled
                    </>
                  ) : memberEnrollmentStatus === 'waitlisted' ? (
                    <>
                      <Clock size={16} strokeWidth={2.25} />
                      Waitlisted
                    </>
                  ) : (
                    <>
                      <CalendarCheck size={16} strokeWidth={2.25} />
                      Enroll Class
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

function ScheduleBlockTimelineLabels({
  block,
  timeRange,
  isVacant,
  fillColor,
  staffRequestPending = false,
  compact,
  density = 'timeline',
  memberCapacity,
}: {
  block: ScheduleBlock;
  timeRange: string;
  isVacant: boolean;
  fillColor?: string;
  staffRequestPending?: boolean;
  compact: boolean;
  density?: 'timeline' | 'panel';
  memberCapacity?: { available: number; limit: number; percent: number; barColor: string } | null;
}) {
  const statusLabel = staffRequestPending ? 'Requested' : BLOCK_STATUS_LABELS[block.statusBlock];
  const useDarkText = staffRequestPending
    ? false
    : scheduleBlockUsesDarkText(isVacant, fillColor);

  if (memberCapacity) {
    const displayName = scheduleBlockDisplayName(block);
    const coachLabel = block.coach?.trim();
    const showCoach =
      !compact &&
      coachLabel &&
      coachLabel !== '—' &&
      coachLabel.toLowerCase() !== 'unassigned';
    const titleSize =
      density === 'panel'
        ? 'text-sm'
        : compact
          ? 'text-[10px] leading-[1.15]'
          : 'text-[11px] leading-tight';
    const timeSize =
      density === 'panel'
        ? 'text-[11px]'
        : compact
          ? 'text-[9px]'
          : 'text-[10px]';
    const textOnColor = useDarkText
      ? 'text-[#1E2A35]'
      : 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]';
    const mutedOnColor = useDarkText
      ? 'text-[#5A5048]'
      : 'text-white/92 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]';

    return (
      <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col justify-between gap-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <p
            className={`line-clamp-2 font-bold ${titleSize} ${textOnColor}`}
            title={displayName}
          >
            {displayName}
          </p>
          <p className={`mt-0.5 shrink-0 font-semibold tabular-nums tracking-tight ${timeSize} ${mutedOnColor}`}>
            {timeRange}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-0.5 min-w-0 w-full max-w-full pt-0.5">
          {showCoach ? (
            <span
              className={`min-w-0 w-full truncate text-[9px] font-medium ${mutedOnColor}`}
              title={coachLabel}
            >
              w/ {coachLabel}
            </span>
          ) : (
            <span className={`shrink-0 text-[9px] font-medium tabular-nums ${mutedOnColor}`}>
              {block.duration}m
            </span>
          )}
          <div className="flex justify-end min-w-0 w-full">
            <span
              className={`inline-flex max-w-full shrink items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold leading-none ring-1 ${
                useDarkText
                  ? 'bg-white/90 text-[#5A5048] ring-[#B8AB93]/50'
                  : 'bg-black/45 text-white ring-white/25 backdrop-blur-[1px]'
              }`}
              title={`${memberCapacity.available} of ${memberCapacity.limit} spots available`}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: useDarkText ? '#6B6358' : memberCapacity.barColor }}
                aria-hidden
              />
              <span className="truncate whitespace-nowrap">
                {memberAvailableSlotsLabel(memberCapacity.available)}
              </span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  const timeClass = compact
    ? `font-bold tabular-nums leading-[1.15] ${
        density === 'panel' ? 'text-[9px]' : 'text-[9px] tracking-tight'
      } ${useDarkText ? 'text-[#1E2A35]' : 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]'}`
    : density === 'panel'
      ? `truncate font-bold leading-tight tabular-nums text-sm ${
          useDarkText
            ? 'text-[#1E2A35]'
            : 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]'
        }`
      : `truncate font-bold leading-tight tabular-nums tracking-tight text-[11px] ${
          useDarkText
            ? 'text-[#2A3540]'
            : 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]'
        }`;

  const statusClass = compact
    ? `font-semibold leading-[1.15] ${density === 'panel' ? 'text-[9px]' : 'text-[8px]'} ${
        useDarkText ? 'text-[#5A5048]' : 'text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]'
      }`
    : density === 'panel'
      ? `truncate font-semibold mt-1 text-[11px] ${
          useDarkText ? 'text-[#5A5048]' : 'text-white/90'
        }`
      : `truncate font-semibold mt-0.5 text-[0.65rem] ${
          useDarkText ? 'text-[#5A5048]' : 'text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]'
        }`;

  if (compact) {
    return (
      <>
        <p className={timeClass}>{timeRange}</p>
        <p
          className={`${statusClass} ${density === 'panel' ? 'mt-1' : 'mt-0.5'}`}
        >
          {statusLabel}
        </p>
      </>
    );
  }

  if (density === 'panel') {
    return (
      <>
        <p className={timeClass}>{timeRange}</p>
        <p className={statusClass}>{statusLabel}</p>
        <p
          className={`truncate text-[11px] font-medium tabular-nums ${
            useDarkText ? 'text-[#6B6358]' : 'text-white/85'
          }`}
        >
          {block.duration} min
        </p>
        <p
          className={`mt-auto truncate pt-1 text-[10px] font-medium ${
            useDarkText ? 'text-[#8A7E6E]' : 'text-white/70'
          }`}
        >
          {block.uid ? `#${block.uid}` : 'New block'}
        </p>
      </>
    );
  }

  return (
    <>
      <p className={timeClass}>{timeRange}</p>
      <p className={statusClass}>
        {statusLabel}
        {!block.statusClass ? (
          <span
            className={`ml-1 rounded-full px-1 py-px text-[9px] font-bold ${
              useDarkText ? 'bg-[#5A5048]/15 text-[#5A5048]' : 'bg-black/35 text-white'
            }`}
          >
            Closed
          </span>
        ) : null}
      </p>
      <p
        className={`truncate text-[0.6rem] ${
          useDarkText ? 'text-[#6B6358]' : 'text-white/85 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]'
        }`}
      >
        {block.duration} min
      </p>
      <p
        className={`mt-auto truncate pt-1 text-[0.55rem] font-medium ${
          useDarkText ? 'text-[#8A7E6E]' : 'text-white/75'
        }`}
      >
        {block.uid ? `#${block.uid}` : 'New block'}
      </p>
    </>
  );
}

function ScheduleTimelineBlockCard({
  block,
  timeline,
  viewStartHour,
  viewEndHour,
  density,
  isVacant,
  staffRequestPending = false,
  staffCoachAssignedToYou = false,
  adminPendingPortalRequest = false,
  isClosedBlock = false,
  variant,
  onActivate,
  onKeyDown,
  disabled = false,
  showMemberCapacity = false,
  memberSelfEnrollment = null,
  emphasizeMemberEnrollment = false,
}: {
  block: ScheduleBlock;
  timeline: { top: string; height: string };
  viewStartHour: number;
  viewEndHour: number;
  density: 'timeline' | 'panel';
  isVacant: boolean;
  staffRequestPending?: boolean;
  /** Staff time slots: logged-in coach is on this block's roster. */
  staffCoachAssignedToYou?: boolean;
  /** Admin class schedule: pending slot/cancellation request on this class. */
  adminPendingPortalRequest?: boolean;
  isClosedBlock?: boolean;
  variant: 'timeline' | 'panel';
  disabled?: boolean;
  showMemberCapacity?: boolean;
  memberSelfEnrollment?: MemberClassEnrollmentStatus | null;
  /** Member class schedule: clearer enrolled/waitlisted badge without resizing the block. */
  emphasizeMemberEnrollment?: boolean;
  onActivate: (e: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const heightPct = parseFloat(timeline.height);
  const estimate =
    showMemberCapacity && variant === 'timeline'
      ? false
      : compactScheduleBlockEstimate(block, viewStartHour, viewEndHour, heightPct);
  const compact = useScheduleBlockCompactMode(ref, estimate, block.id);
  const timeRange = scheduleBlockTimeRange(block);

  const memberCapacity = useMemo(() => {
    if (!showMemberCapacity) return null;
    const { enrolled, limit, available } = scheduleBlockCapacityFromBlock(block);
    if (limit == null || available == null) return null;
    const { percent, barColor } = memberClassCapacityProgress(enrolled, limit);
    return { available, limit, percent, barColor };
  }, [showMemberCapacity, block]);

  const blockFillColor = isVacant ? undefined : block.color;
  const useDarkText = scheduleBlockUsesDarkText(isVacant, blockFillColor);

  const vacantRequested = isVacant && staffRequestPending;

  const memberClosedOnCalendar =
    emphasizeMemberEnrollment && isClosedBlock && !isVacant;

  const memberEnrollmentMarked =
    emphasizeMemberEnrollment
    && !isVacant
    && (memberSelfEnrollment != null || memberClosedOnCalendar);
  const memberEnrolled = memberSelfEnrollment === 'enrolled';
  const memberWaitlisted = memberSelfEnrollment === 'waitlisted';

  const memberTimelineShell = showMemberCapacity && variant === 'timeline';
  const timelinePositionClass = memberTimelineShell
    ? `absolute inset-x-0.5 box-border max-w-[calc(100%-4px)] ${memberEnrollmentMarked ? 'z-[12]' : 'z-10'}`
    : `absolute left-1 right-1 ${memberEnrollmentMarked ? 'z-[12]' : 'z-10'}`;
  const timelineVisualClass = memberTimelineShell
    ? 'shadow-sm ring-1 ring-inset'
    : 'shadow-md ring-1';
  const memberHighlightShell = memberEnrollmentMarked
    ? memberEnrolled
      ? 'ring-2 ring-inset ring-emerald-500/75 shadow-[0_3px_10px_rgba(16,185,129,0.22)]'
      : 'ring-2 ring-inset ring-amber-500/75 shadow-[0_3px_10px_rgba(245,158,11,0.22)]'
    : '';
  const shellClass = `${
    variant === 'panel' ? 'p-3' : memberTimelineShell ? 'gap-0.5 p-1.5' : 'gap-0 p-2'
  } ${memberHighlightShell} ${
    disabled
      ? 'cursor-not-allowed opacity-55 saturate-[0.85] ring-black/10'
      : memberClosedOnCalendar
        ? 'cursor-pointer opacity-[0.82] grayscale-[0.5] saturate-[0.4] ring-black/15 hover:opacity-90'
        : memberEnrollmentMarked
          ? ''
          : vacantRequested
            ? 'border-2 border-solid ring-2 shadow-sm'
            : isVacant
              ? 'border-2 border-dashed border-[#7A7268] bg-[#EDE8D8] ring-[#B8AB93]/60'
              : variant === 'panel'
                ? 'border border-[#D4CDB5]/40'
                : isClosedBlock
                  ? 'opacity-70 ring-black/20'
                  : 'ring-black/25 hover:ring-black/35'
  }`;

  const style = {
    ...timeline,
    backgroundColor: vacantRequested
      ? STAFF_VACANT_REQUESTED_COLOR
      : isVacant
        ? undefined
        : memberClosedOnCalendar
          ? '#A8A196'
          : block.color,
    ...(vacantRequested
      ? {
          borderColor: STAFF_VACANT_REQUESTED_RING,
          ['--tw-ring-color' as string]: `${STAFF_VACANT_REQUESTED_RING}99`,
        }
      : {}),
  };

  const labels = (
    <ScheduleBlockTimelineLabels
      block={block}
      timeRange={timeRange}
      isVacant={isVacant}
      fillColor={vacantRequested ? STAFF_VACANT_REQUESTED_COLOR : blockFillColor}
      staffRequestPending={staffRequestPending}
      compact={compact}
      density={density}
      memberCapacity={memberCapacity}
    />
  );

  const memberEnrollmentAccentBar = memberEnrollmentMarked ? (
    <div
      className={`pointer-events-none absolute inset-y-1 left-0 z-[2] w-1 rounded-sm ${
        memberEnrolled ? 'bg-emerald-500/90' : 'bg-amber-500/90'
      }`}
      aria-hidden
    />
  ) : null;

  const memberEnrollmentTopRightBadge = memberEnrollmentMarked ? (
    memberEnrolled ? (
      <span
        className="pointer-events-none absolute top-0.5 right-0.5 z-[3] inline-flex max-w-[calc(100%-6px)] items-center gap-0.5 rounded px-1 py-px text-[8px] font-bold uppercase leading-none tracking-wide text-white bg-emerald-600/95 shadow-sm ring-1 ring-white/80"
        title="You are enrolled in this class"
        aria-label="You are enrolled in this class"
      >
        <Check size={9} strokeWidth={2.5} aria-hidden className="shrink-0" />
        <span className="truncate">Enrolled</span>
      </span>
    ) : memberWaitlisted ? (
      <span
        className="pointer-events-none absolute top-0.5 right-0.5 z-[3] inline-flex max-w-[calc(100%-6px)] items-center gap-0.5 rounded px-1 py-px text-[8px] font-bold uppercase leading-none tracking-wide text-white bg-amber-600/95 shadow-sm ring-1 ring-white/80"
        title="Payment pending — waitlisted"
        aria-label="Waitlisted for this class"
      >
        <Clock size={9} strokeWidth={2.5} aria-hidden className="shrink-0" />
        <span className="truncate">Waitlist</span>
      </span>
    ) : memberClosedOnCalendar ? (
      <span
        className="pointer-events-none absolute top-0.5 right-0.5 z-[3] inline-flex max-w-[calc(100%-6px)] items-center rounded px-1 py-px text-[8px] font-bold uppercase leading-none tracking-wide text-[#5A5048] bg-white/90 shadow-sm ring-1 ring-[#D4CDB5]/80"
        title="You were not enrolled in this class"
        aria-label="Not enrolled in this class"
      >
        <span className="truncate">Not enrolled</span>
      </span>
    ) : null
  ) : null;

  const pendingRequestIndicator = adminPendingPortalRequest ? (
    <span
      className="pointer-events-none absolute top-1.5 right-1.5 z-[2] h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 ring-2 ring-white/90 shadow-sm"
      title="Pending request"
      aria-label="Pending request"
    />
  ) : null;

  const staffCoachAssignedIndicator = staffCoachAssignedToYou ? (
    <span
      className={`pointer-events-none absolute z-[3] flex shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm ring-2 ring-white/90 ${
        compact ? 'top-0.5 right-0.5 h-4 w-4' : 'top-1 right-1 h-5 w-5'
      }`}
      title="Assigned to you"
      aria-label="Assigned to you"
    >
      <UserCheck size={compact ? 9 : 11} strokeWidth={2.5} aria-hidden />
    </span>
  ) : null;

  if (variant === 'panel') {
    return (
      <button
        ref={ref as RefObject<HTMLButtonElement | null>}
        type="button"
        data-schedule-block
        disabled={disabled}
        onClick={disabled ? undefined : onActivate}
        className={`absolute left-1 right-1 z-10 flex flex-col overflow-hidden rounded-xl text-left transition-all relative ${
          disabled ? '' : 'hover:brightness-[0.98] active:scale-[0.99]'
        } ${shellClass}`}
        style={style}
        aria-disabled={disabled || undefined}
      >
        {memberEnrollmentAccentBar}
        {memberEnrollmentTopRightBadge}
        {pendingRequestIndicator}
        {staffCoachAssignedIndicator}
        {labels}
      </button>
    );
  }

  return (
    <div
      ref={ref as RefObject<HTMLDivElement | null>}
      data-schedule-block
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onActivate}
      onKeyDown={disabled ? undefined : onKeyDown}
      className={`${timelinePositionClass} flex min-w-0 flex-col overflow-hidden rounded-lg transition-all ${timelineVisualClass} ${
        disabled ? '' : 'cursor-pointer'
      } ${shellClass}`}
      style={style}
    >
      {memberTimelineShell && !isVacant && !useDarkText ? (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b from-black/25 via-black/5 to-black/45"
          aria-hidden
        />
      ) : null}
      {memberEnrollmentAccentBar}
      {memberEnrollmentTopRightBadge}
      {pendingRequestIndicator}
      {staffCoachAssignedIndicator}
      {labels}
    </div>
  );
}

function toPersonOption(row: {
  account: { id: string; email: string };
  profile: { name: string; display_name?: string; photo?: string };
}): ClassPersonOption {
  return {
    accountId: row.account.id,
    name: row.profile.name || row.profile.display_name || row.account.email,
    email: row.account.email,
    photo: row.profile.photo ?? '',
  };
}

const EMPTY_FORM: {
  dateKey: string;
  startMinutes: number;
  endMinutes: number;
  statusBlock: ClassBlockStatus;
} = {
  dateKey: getTodayDateKey(),
  startMinutes: DEFAULT_START_MINUTES,
  endMinutes: DEFAULT_END_MINUTES,
  statusBlock: 'vacant',
};

// ── Component ──────────────────────────────────────────────────

type SchedulePageVariant =
  | 'time-blocking'
  | 'class-schedule'
  | 'member-class-schedule'
  | 'public-class-schedule'
  | 'staff-class-schedule'
  | 'staff-time-slots'
  | 'coach-requests'
  | 'frontdesk-class-schedule'
  | 'frontdesk-bookings'
  | 'frontdesk-cancellations';

type CoachRequestTab = 'requests' | 'cancellations';
type ClassScheduleBlockPanelTab = 'info' | 'slot-requests' | 'cancellations';

export default function AdminTimeBlockingPage({
  variant = 'time-blocking',
  onPublicBlockActivate,
  showClassBlockStatusLegend = false,
}: {
  variant?: SchedulePageVariant;
  /** Public class schedule: block tapped while browsing without member enroll UI. */
  onPublicBlockActivate?: (block: ScheduleBlock) => void;
  /** Admin class schedule: multi-category calendar filter (discipline, status_block, status_class). */
  showClassBlockStatusLegend?: boolean;
}) {
  const isFrontdeskClassSchedule = variant === 'frontdesk-class-schedule';
  const isFrontdeskBookings = variant === 'frontdesk-bookings';
  const isFrontdeskCancellations = variant === 'frontdesk-cancellations';
  const isClassSchedule = variant === 'class-schedule' || isFrontdeskClassSchedule;
  const isMemberClassSchedule = variant === 'member-class-schedule';
  const isPublicClassSchedule = variant === 'public-class-schedule';
  const isActiveClassCalendar = isMemberClassSchedule || isPublicClassSchedule;
  const isStaffClassSchedule = variant === 'staff-class-schedule';
  const isStaffTimeSlots = variant === 'staff-time-slots';
  const useClassScheduleRealtimeSync =
    variant === 'class-schedule'
    || variant === 'staff-time-slots'
    || variant === 'staff-class-schedule'
    || variant === 'member-class-schedule';
  const isStaffSchedulePortal = isStaffClassSchedule || isStaffTimeSlots;
  const isReadOnlySchedule =
    isStaffSchedulePortal || isActiveClassCalendar || isFrontdeskClassSchedule;
  const isCoachRequests =
    variant === 'coach-requests' || isFrontdeskBookings || isFrontdeskCancellations;
  const hideCoachRequestTabSwitcher = isFrontdeskBookings || isFrontdeskCancellations;
  const showClassScheduleFeatures =
    isClassSchedule || isStaffSchedulePortal || isActiveClassCalendar;
  const usesDisciplineCalendarColors =
    isClassSchedule
    || isFrontdeskClassSchedule
    || isStaffClassSchedule
    || isActiveClassCalendar;
  const scheduleBlockColorMode: ScheduleBlockColorMode = usesDisciplineCalendarColors
    ? 'discipline'
    : 'operations';
  const usesOperationsBlockColors = scheduleBlockColorMode === 'operations';
  const opensClassScheduleBlockPanel =
    variant === 'class-schedule'
    || isMemberClassSchedule
    || isStaffClassSchedule
    || isStaffTimeSlots;
  const usesClassSessionDetailModal = isMemberClassSchedule || isStaffClassSchedule;
  const showCoachRequestTables = isCoachRequests;
  const isStaffVacantBlock = (block: ScheduleBlock) => block.statusBlock === 'vacant';
  /** Staff time slots: all calendar blocks open the detail side panel. */
  const isStaffBlockInteractive = (_block: ScheduleBlock) => true;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: memberUser } = useAuth();
  const { adminUser } = useAdminAuth();
  const { staffUser } = useStaffAuth();
  const portalUser = isMemberClassSchedule
    ? memberUser
    : isStaffSchedulePortal
      ? staffUser
      : adminUser;

  const [coachRequestTab, setCoachRequestTab] = useState<CoachRequestTab>(() => {
    if (variant === 'frontdesk-cancellations') return 'cancellations';
    return 'requests';
  });
  const [classScheduleBlockPanelId, setClassScheduleBlockPanelId] = useState<string | null>(null);
  const [enrolledStudentsModalOpen, setEnrolledStudentsModalOpen] = useState(false);
  const [classScheduleBlockTab, setClassScheduleBlockTab] =
    useState<ClassScheduleBlockPanelTab>('info');
  const [blocks, setBlocks]           = useState<ScheduleBlock[]>([]);
  const [portalRequests, setPortalRequests] = useState<PortalRequestRow[]>([]);
  const [requesterDirectory, setRequesterDirectory] = useState<
    Map<string, { name: string; email: string; photo: string }>
  >(new Map());
  const [loadingPortalRequests, setLoadingPortalRequests] = useState(false);
  const [showSlotRequestModal, setShowSlotRequestModal] = useState(false);
  const [slotRequestContext, setSlotRequestContext] = useState<StaffSlotRequestContext | null>(null);
  const [showCancellationRequestModal, setShowCancellationRequestModal] = useState(false);
  const [cancellationRequestContext, setCancellationRequestContext] =
    useState<StaffCancellationRequestContext | null>(null);
  const [myPortalRequests, setMyPortalRequests] = useState<PortalRequestRow[]>([]);
  const [confirmWithdrawBlockSlot, setConfirmWithdrawBlockSlot] = useState(false);
  const [withdrawingBlockSlot, setWithdrawingBlockSlot] = useState(false);
  const [withdrawBlockSlotError, setWithdrawBlockSlotError] = useState<string | null>(null);
  const [disciplines, setDisciplines] = useState<DisciplineDisplay[]>([]);
  const [classesById, setClassesById] = useState<Map<string, ClassDisplay>>(new Map());
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rangeStart, setRangeStart] = useState(() => getSundayOfWeekContaining(getTodayLocal()));
  const [calendarView, setCalendarView] = useState<'weekly' | 'threeDay' | 'monthly'>('weekly');
  const [calMonth, setCalMonth]       = useState(getInitialCalendarMonth);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [showMonthDayPanel, setShowMonthDayPanel] = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [timelineHoverSlot, setTimelineHoverSlot] = useState<{
    dayIndex: number;
    startMinutes: number;
    endMinutes: number;
  } | null>(null);
  const [dayPanelStartHour, setDayPanelStartHour] = useState(SCHEDULE_START_HOUR);
  const [dayPanelEndHour, setDayPanelEndHour] = useState(SCHEDULE_END_HOUR);
  const [dayPanelHoverSlot, setDayPanelHoverSlot] = useState<{
    startMinutes: number;
    endMinutes: number;
  } | null>(null);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [selectedCancelId, setSelectedCancelId] = useState<string | null>(null);
  const [cancelApproveMode, setCancelApproveMode] = useState<'replace' | 'cancel_class'>('replace');
  const [cancelReplacementCoachId, setCancelReplacementCoachId] = useState('');
  const [viewStartHour, setViewStartHour] = useState(SCHEDULE_START_HOUR);
  const [viewEndHour, setViewEndHour] = useState(SCHEDULE_END_HOUR);
  const [reqStatusFilter, setReqStatusFilter] = useState<'all' | ReqStatus>('all');
  const [cancelStatusFilter, setCancelStatusFilter] = useState<'all' | ReqStatus>('all');
  const [disciplineFilterIds, setDisciplineFilterIds] = useState<string[]>([]);
  const [classScheduleFilters, setClassScheduleFilters] = useState<ClassScheduleCalendarFilters>(
    emptyClassScheduleCalendarFilters,
  );
  const [classAssignId, setClassAssignId] = useState<string | null>(null);
  const [classAssignSession, setClassAssignSession] = useState<{
    classId: string;
    draft: ClassUpsertInput;
    item: ClassDisplay;
  } | null>(null);
  const [coachOptions, setCoachOptions] = useState<ClassPersonOption[]>([]);
  const [studentOptions, setStudentOptions] = useState<ClassPersonOption[]>([]);

  useEffect(() => {
    if (isActiveClassCalendar) return;
    if (isStaffSchedulePortal) {
      if (!staffUser) navigate('/staff-login');
      return;
    }
    if (!adminUser) navigate('/admin-login');
  }, [isActiveClassCalendar, isStaffSchedulePortal, staffUser, adminUser, navigate]);

  useEffect(() => {
    if ((!showClassScheduleFeatures && !showCoachRequestTables) || !portalUser) return;
    if (isReadOnlySchedule) return;
    let cancelled = false;
    void (async () => {
      const [coachRows, studentRows] = await Promise.all([
        fetchManagedAccountsWithProfiles('coach'),
        fetchManagedAccountsWithProfiles('user'),
      ]);
      if (cancelled) return;
      const coachOpts = await Promise.all(
        coachRows.map(async (row) => {
          const base = toPersonOption(row);
          const images = await withBucketProfileImages(
            { photo: row.profile.photo ?? '', coverImage: '' },
            row.account.auth_user_id,
          );
          return { ...base, photo: images.photo };
        }),
      );
      const studentOpts = await Promise.all(
        studentRows.map(async (row) => {
          const base = toPersonOption(row);
          const images = await withBucketProfileImages(
            { photo: row.profile.photo ?? '', coverImage: '' },
            row.account.auth_user_id,
          );
          return { ...base, photo: images.photo };
        }),
      );
      setCoachOptions(coachOpts);
      setStudentOptions(studentOpts);
    })();
    return () => {
      cancelled = true;
    };
  }, [showClassScheduleFeatures, showCoachRequestTables, isReadOnlySchedule, portalUser]);

  useEffect(() => {
    if (!classScheduleBlockPanelId) {
      setEnrolledStudentsModalOpen(false);
    }
  }, [classScheduleBlockPanelId]);

  const closeClassAssignModal = useCallback(() => {
    setClassAssignId(null);
    setClassAssignSession(null);
  }, []);

  const openClassAssignModal = useCallback(
    (classId: string) => {
      const item = classesById.get(classId);
      if (!item) return;
      setClassAssignSession({
        classId,
        draft: classToUpsertInput(item),
        item,
      });
      setClassAssignId(classId);
    },
    [classesById],
  );

  useEffect(() => {
    if (!isClassSchedule || loadingSchedule) return;
    const assignId = searchParams.get('assign');
    if (!assignId || !classesById.has(assignId)) return;
    openClassAssignModal(assignId);
    setSearchParams({}, { replace: true });
  }, [
    isClassSchedule,
    loadingSchedule,
    classesById,
    searchParams,
    setSearchParams,
    openClassAssignModal,
  ]);

  useEffect(() => {
    if (isCoachRequests) setLoadingSchedule(false);
  }, [isCoachRequests]);

  const loadPortalRequests = useCallback(async () => {
    if (!portalUser) return;

    if (isClassSchedule && !showCoachRequestTables) {
      const [requestsResult, classesResult, coachRows, userRows] = await Promise.all([
        fetchPortalRequests(),
        fetchClassesForAdmin(),
        fetchManagedAccountsWithProfiles('coach'),
        fetchManagedAccountsWithProfiles('user'),
      ]);
      if (classesResult.data) {
        setClassesById((prev) => {
          const byId = new Map(prev);
          for (const row of classesResult.data) byId.set(row.id, row);
          return byId;
        });
      }
      const directory = new Map<string, { name: string; email: string; photo: string }>();
      for (const row of [...coachRows, ...userRows]) {
        const profile = row.profile as { photo?: string; name?: string; display_name?: string };
        directory.set(row.account.id, {
          name: profile.name || profile.display_name || row.account.email,
          email: row.account.email,
          photo: profile.photo?.trim() ?? '',
        });
      }
      setRequesterDirectory(directory);
      if (requestsResult.error) {
        setScheduleError(requestsResult.error);
      } else {
        setPortalRequests(requestsResult.requests);
      }
      return;
    }

    if (!showCoachRequestTables) return;

    setLoadingPortalRequests(true);
    const [requestsResult, classesResult, disciplinesResult, coachRows] = await Promise.all([
      fetchPortalRequests(),
      fetchClassesForAdmin(),
      fetchDisciplinesForAdmin(),
      fetchManagedAccountsWithProfiles('coach'),
    ]);
    if (classesResult.data) {
      const byId = new Map(classesResult.data.map((row) => [row.id, row]));
      setClassesById(byId);
    }
    setDisciplines(disciplinesResult.data);
    const directory = new Map<string, { name: string; email: string; photo: string }>();
    for (const row of coachRows) {
      if (row.account.role !== 'coach') continue;
      const profile = row.profile;
      directory.set(row.account.id, {
        name: profile.name || profile.display_name || row.account.email,
        email: row.account.email,
        photo: profile.photo?.trim() ?? '',
      });
    }
    setRequesterDirectory(directory);
    if (requestsResult.error) {
      setScheduleError(requestsResult.error);
    } else {
      setPortalRequests(requestsResult.requests);
      notifyPortalRequestsChanged();
    }
    setLoadingPortalRequests(false);
  }, [showCoachRequestTables, isClassSchedule, portalUser]);

  const loadCancellationPortalRequests = useCallback(async () => {
    if (!portalUser || !showCoachRequestTables) return;

    setLoadingPortalRequests(true);
    const [requestsResult, classesResult, disciplinesResult, coachRows] = await Promise.all([
      fetchCancellationPortalRequests(),
      fetchClassesForAdmin(),
      fetchDisciplinesForAdmin(),
      fetchManagedAccountsWithProfiles('coach'),
    ]);
    if (classesResult.data) {
      const byId = new Map(classesResult.data.map((row) => [row.id, row]));
      setClassesById(byId);
    }
    setDisciplines(disciplinesResult.data);
    const directory = new Map<string, { name: string; email: string; photo: string }>();
    for (const row of coachRows) {
      if (row.account.role !== 'coach') continue;
      const profile = row.profile;
      directory.set(row.account.id, {
        name: profile.name || profile.display_name || row.account.email,
        email: row.account.email,
        photo: profile.photo?.trim() ?? '',
      });
    }
    setRequesterDirectory(directory);
    if (requestsResult.error) {
      setScheduleError(requestsResult.error);
    } else {
      setPortalRequests((prev) => {
        const keepNonCancellation = prev.filter((row) => row.request_type !== 'cancellation_request');
        return mergePortalRequestRows(keepNonCancellation, requestsResult.requests);
      });
      notifyPortalRequestsChanged();
    }
    setLoadingPortalRequests(false);
  }, [showCoachRequestTables, portalUser]);

  const refreshBlockPanelPortalRequests = useCallback(
    async (classId: string) => {
      if (!portalUser || !classId.trim()) return;
      const result = await fetchPortalRequestsForClass(classId);
      if (result.error) {
        setScheduleError(result.error);
        return;
      }
      setPortalRequests((prev) => mergePortalRequestRows(prev, result.requests));
    },
    [portalUser],
  );

  useEffect(() => {
    if (portalUser && (showCoachRequestTables || isClassSchedule)) {
      void loadPortalRequests();
    }
  }, [showCoachRequestTables, isClassSchedule, portalUser, loadPortalRequests]);

  useEffect(() => {
    if (!showCoachRequestTables || !portalUser) return;
    if (coachRequestTab !== 'cancellations') return;
    void loadCancellationPortalRequests();
  }, [
    showCoachRequestTables,
    portalUser,
    coachRequestTab,
    loadCancellationPortalRequests,
  ]);

  useEffect(() => {
    if (!isClassSchedule || !classScheduleBlockPanelId || !portalUser) return;
    void refreshBlockPanelPortalRequests(classScheduleBlockPanelId);
  }, [
    isClassSchedule,
    classScheduleBlockPanelId,
    portalUser,
    refreshBlockPanelPortalRequests,
  ]);

  useEffect(() => {
    if (!portalUser) return;
    if (!isClassSchedule && !showCoachRequestTables) return;
    const onChange = () => {
      if (showCoachRequestTables && coachRequestTab === 'cancellations') {
        void loadCancellationPortalRequests();
      } else {
        void loadPortalRequests();
      }
      if (isClassSchedule && classScheduleBlockPanelId) {
        void refreshBlockPanelPortalRequests(classScheduleBlockPanelId);
      }
    };
    window.addEventListener(PORTAL_REQUESTS_CHANGED, onChange);
    return () => window.removeEventListener(PORTAL_REQUESTS_CHANGED, onChange);
  }, [
    isClassSchedule,
    showCoachRequestTables,
    portalUser,
    coachRequestTab,
    classScheduleBlockPanelId,
    loadPortalRequests,
    loadCancellationPortalRequests,
    refreshBlockPanelPortalRequests,
  ]);

  const disciplineCatalogById = useMemo(
    () => new Map(disciplines.map((d) => [d.id, d])),
    [disciplines],
  );

  const coachPhotoByAccountId = useMemo(() => {
    const map = new Map(coachOptions.map((coach) => [coach.accountId, coach.photo]));
    for (const classRow of classesById.values()) {
      for (const coach of classRow.coaches) {
        if (coach.photo?.trim()) {
          map.set(coach.accountId, coach.photo.trim());
        }
      }
    }
    return map;
  }, [coachOptions, classesById]);

  const studentPhotoByAccountId = useMemo(
    () => new Map(studentOptions.map((student) => [student.accountId, student.photo])),
    [studentOptions],
  );

  const scheduleReqs = useMemo(() => {
    return portalRequests
      .filter((r) => r.request_type === 'slot_request')
      .map((req) => {
        const requester = requesterDirectory.get(req.requester_account_id) ?? {
          name: 'Staff',
          email: '',
          photo: '',
        };
        const classRow = req.target_class_id ? classesById.get(req.target_class_id) : undefined;
        const payload = req.payload as { discipline_id?: string };
        const disciplineRow = payload.discipline_id
          ? disciplineCatalogById.get(payload.discipline_id)
          : undefined;
        const fallbackName = classRow?.disciplineName ?? '—';
        const disciplineMeta = {
          name: disciplineRow?.name ?? fallbackName,
          logoUrl: disciplineRow?.logoUrl ?? getDisciplinePlaceholderLogo(fallbackName),
          imageUrl: disciplineRow?.imageUrl ?? '',
          hue: disciplineRow?.status.hue ?? 38,
        };
        return mapPortalSlotRequest(
          req,
          requester,
          classRow,
          disciplineMeta,
          coachDisplayShort(requester.name),
        );
      });
  }, [portalRequests, requesterDirectory, classesById, disciplineCatalogById]);

  const cancelReqs = useMemo(() => {
    return portalRequests
      .filter(
        (r) =>
          r.request_type === 'cancellation_request'
          || r.request_type === 'member_enrollment_cancellation',
      )
      .map((req) => {
        const requester = requesterDirectory.get(req.requester_account_id) ?? {
          name: 'Coach',
          email: '',
          photo: '',
        };
        const classRow = req.target_class_id ? classesById.get(req.target_class_id) : undefined;
        const disciplineRow = classRow?.disciplineId
          ? disciplineCatalogById.get(classRow.disciplineId)
          : undefined;
        const fallbackName = classRow?.disciplineName ?? '—';
        const disciplineMeta = {
          name: disciplineRow?.name ?? fallbackName,
          logoUrl: disciplineRow?.logoUrl ?? getDisciplinePlaceholderLogo(fallbackName),
          imageUrl: disciplineRow?.imageUrl ?? '',
          hue: disciplineRow?.status.hue ?? 38,
        };
        return mapPortalCancellationRequest(req, requester, classRow, disciplineMeta);
      });
  }, [portalRequests, requesterDirectory, classesById, disciplineCatalogById]);

  const applyClassesToState = useCallback(
    (rows: ClassDisplay[], disciplineRows: DisciplineDisplay[]) => {
      const byId = new Map(rows.map((row) => [row.id, row]));
      setClassesById(byId);
      const colors = buildDisciplineClassColors(disciplineRows, CLASS_COLORS);
      setBlocks(allClassesToBlocks(rows, colors, scheduleBlockColorMode));
    },
    [scheduleBlockColorMode],
  );

  const loadMySlotRequests = useCallback(async () => {
    if (!isStaffSchedulePortal || !staffUser?.accountId) {
      setMyPortalRequests([]);
      return;
    }
    const { requests } = await fetchMyPortalRequests();
    setMyPortalRequests(requests);
  }, [isStaffSchedulePortal, staffUser?.accountId]);

  const loadSchedule = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoadingSchedule(true);
      const fetchClasses = isMemberClassSchedule
        ? fetchClassesForMemberSchedule
        : isPublicClassSchedule
          ? fetchClassesForPublicSchedule
        : isStaffSchedulePortal
          ? fetchClassesForStaffSchedule
          : fetchClassesForAdmin;
      const [classesResult, disciplinesResult, myRequestsResult] = await Promise.all([
        fetchClasses(),
        isStaffSchedulePortal || isActiveClassCalendar
          ? fetchDisciplinesForPublic()
          : fetchDisciplinesForAdmin(),
        isStaffSchedulePortal
          ? fetchMyPortalRequests()
          : Promise.resolve({ requests: [] as PortalRequestRow[] }),
      ]);
      if (isStaffSchedulePortal) {
        setMyPortalRequests(myRequestsResult.requests);
      }
      setDisciplines(disciplinesResult.data);
    if (classesResult.error) {
      setScheduleError(classesResult.error);
        if (!options?.silent) {
      setBlocks([]);
      setClassesById(new Map());
        }
    } else {
      setScheduleError(null);
        applyClassesToState(classesResult.data, disciplinesResult.data);
      }
      if (!options?.silent) setLoadingSchedule(false);
    },
    [applyClassesToState, isMemberClassSchedule, isPublicClassSchedule, isStaffSchedulePortal],
  );

  const focusCalendarOnDateKey = useCallback(
    (dateKey: string, startMinutes: number, endMinutes: number) => {
      const date = dateKeyToDate(dateKey);
      const startHour = Math.floor(startMinutes / 60);
      const endHour = Math.ceil(endMinutes / 60);
      if (calendarView === 'monthly') {
        setCalMonth({ year: date.getFullYear(), month: date.getMonth() });
        setSelectedMonthKey(dateKey);
      } else if (calendarView === 'weekly') {
        setRangeStart(getSundayOfWeekContaining(date));
      } else {
        setRangeStart(date);
      }
      setViewStartHour((prev) => Math.max(CALENDAR_DAY_START_HOUR, Math.min(prev, startHour)));
      setViewEndHour((prev) => Math.min(CALENDAR_DAY_END_HOUR, Math.max(prev, endHour)));
    },
    [calendarView],
  );

  useEffect(() => {
    if (isCoachRequests) return;
    if (isPublicClassSchedule) {
      void loadSchedule();
      return;
    }
    if (portalUser) void loadSchedule();
  }, [portalUser, isCoachRequests, loadSchedule, isPublicClassSchedule]);

  useClassesScheduleRealtimeSync(
    useCallback(() => {
      void loadSchedule({ silent: true });
    }, [loadSchedule]),
    useClassScheduleRealtimeSync
      && !isCoachRequests
      && Boolean(portalUser)
      && !classAssignId,
  );

  const isMultiDayTimeline =
    calendarView === 'weekly' || calendarView === 'threeDay';

  useEffect(() => {
    if (!isMultiDayTimeline || showModal) {
      setTimelineHoverSlot(null);
    }
  }, [isMultiDayTimeline, showModal, calendarView, viewStartHour, viewEndHour]);

  useEffect(() => {
    if (showMonthDayPanel) {
      setDayPanelStartHour(viewStartHour);
      setDayPanelEndHour(viewEndHour);
    } else {
      setDayPanelHoverSlot(null);
    }
  }, [showMonthDayPanel, selectedMonthKey, viewStartHour, viewEndHour]);

  useEffect(() => {
    if (showModal) {
      setDayPanelHoverSlot(null);
    }
  }, [showModal]);

  const weeklyViewportFit =
    (calendarView === 'weekly' ||
      calendarView === 'threeDay' ||
      calendarView === 'monthly') &&
    !isCoachRequests;

  const coachRequestsViewportFit = isCoachRequests;

  useEffect(() => {
    const scrollEl = document.querySelector(
      isPublicClassSchedule
        ? '[data-public-main-scroll]'
        : isMemberClassSchedule
          ? '[data-member-main-scroll]'
          : isStaffSchedulePortal
            ? '[data-staff-main-scroll]'
            : '[data-admin-main-scroll]',
    );
    if (!(scrollEl instanceof HTMLElement)) return;
    if (weeklyViewportFit || coachRequestsViewportFit) {
      scrollEl.classList.remove('overflow-y-auto');
      scrollEl.classList.add('overflow-hidden');
    } else {
      scrollEl.classList.remove('overflow-hidden');
      scrollEl.classList.add('overflow-y-auto');
    }
    return () => {
      scrollEl.classList.remove('overflow-hidden');
      scrollEl.classList.add('overflow-y-auto');
    };
  }, [
    weeklyViewportFit,
    coachRequestsViewportFit,
    isMemberClassSchedule,
    isPublicClassSchedule,
    isStaffSchedulePortal,
    loadingSchedule,
  ]);

  const calendarFilterDisciplines = useMemo(
    () =>
      [...disciplines]
        .filter((d) => isDisciplineActive(d))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [disciplines],
  );

  const memberScheduleFilterCoaches = useMemo(() => {
    if (!isMemberClassSchedule) return undefined;
    const byId = new Map<string, string>();
    for (const row of classesById.values()) {
      for (const coach of row.coaches) {
        const id = coach.accountId?.trim();
        if (!id) continue;
        const name = coach.name?.trim() || coach.email?.trim() || 'Coach';
        if (!byId.has(id)) byId.set(id, name);
      }
    }
    return [...byId.entries()]
      .map(([accountId, name]) => ({ accountId, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [isMemberClassSchedule, classesById]);

  const today = getTodayLocal();
  const todayKey = getTodayDateKey();
  const visibleDates = useMemo(() => {
    if (calendarView === 'threeDay') return getThreeDayDates(rangeStart);
    if (calendarView === 'weekly') {
      const sunday = getSundayOfWeekContaining(rangeStart);
      return Array.from({ length: 7 }, (_, i) => addDaysToDate(sunday, i));
    }
    return [];
  }, [calendarView, rangeStart]);
  const rangeLabel =
    calendarView === 'weekly'
      ? formatWeekRange(visibleDates)
      : calendarView === 'threeDay'
        ? formatDayRange(visibleDates)
        : '';
  const monthLabel = `${MONTH_NAMES[calMonth.month]} ${calMonth.year}`;
  const isOnToday =
    calendarView === 'monthly'
      ? calMonth.year === today.getFullYear() && calMonth.month === today.getMonth()
      : visibleRangeIncludesToday(visibleDates, today);

  const weekDateKeys = visibleDates.map((d) => toDateKey(d));

  const formDateKey = form.dateKey || todayKey;

  const timelineHours = useMemo(
    () => timelineHourMarks(viewStartHour, viewEndHour),
    [viewStartHour, viewEndHour],
  );

  const dayPanelTimelineHours = useMemo(
    () => timelineHourMarks(dayPanelStartHour, dayPanelEndHour),
    [dayPanelStartHour, dayPanelEndHour],
  );

  const invalidBlockTimes = showModal && form.endMinutes <= form.startMinutes;

  const overlappingBlock = useMemo(() => {
    if (!showModal || invalidBlockTimes) return null;
    const { startsAt, endsAt } = buildStartEndFromMinutes(
      formDateKey,
      form.startMinutes,
      form.endMinutes,
    );
    return findOverlappingScheduleRow(
      classesById.values(),
      { startsAt, endsAt },
      editingBlock?.id ?? null,
    );
  }, [
    showModal,
    invalidBlockTimes,
    formDateKey,
    form.startMinutes,
    form.endMinutes,
    classesById,
    editingBlock?.id,
  ]);

  const blockFormInvalid = invalidBlockTimes || !!overlappingBlock;

  const pendingSlotRequestIds = useMemo(
    () => (staffUser?.accountId
      ? myPendingSlotRequestClassIds(myPortalRequests, staffUser.accountId)
      : new Set<string>()),
    [myPortalRequests, staffUser?.accountId],
  );

  const staffPendingSlotRequest = useCallback(
    (classId: string) =>
      isStaffSchedulePortal && pendingSlotRequestIds.has(classId),
    [isStaffSchedulePortal, pendingSlotRequestIds],
  );

  const staffCoachAssignedOnBlock = useCallback(
    (block: ScheduleBlock) => {
      if (!isStaffSchedulePortal || !staffUser?.accountId) return false;
      if (block.statusBlock === 'vacant') return false;
      return scheduleBlockIncludesCoachAccount(block, staffUser.accountId);
    },
    [isStaffSchedulePortal, staffUser?.accountId],
  );

  const pendingPortalRequestClassIds = useMemo(
    () => classIdsWithPendingPortalRequests(portalRequests),
    [portalRequests],
  );

  const adminPendingPortalRequestOnBlock = useCallback(
    (classId: string) => isClassSchedule && pendingPortalRequestClassIds.has(classId),
    [isClassSchedule, pendingPortalRequestClassIds],
  );

  const editingBlockPendingRequest =
    Boolean(editingBlock && staffPendingSlotRequest(editingBlock.id));

  const slotRequestModalAlreadyRequested =
    Boolean(slotRequestContext && staffPendingSlotRequest(slotRequestContext.classId));

  const editingBlockPendingRequestId = useMemo(() => {
    if (!editingBlock || !staffUser?.accountId) return null;
    return myPendingSlotRequestIdForClass(
      myPortalRequests,
      staffUser.accountId,
      editingBlock.id,
    );
  }, [editingBlock, staffUser?.accountId, myPortalRequests]);

  const slotRequestPendingRequestId = useMemo(() => {
    if (!slotRequestContext || !staffUser?.accountId) return null;
    return myPendingSlotRequestIdForClass(
      myPortalRequests,
      staffUser.accountId,
      slotRequestContext.classId,
    );
  }, [slotRequestContext, staffUser?.accountId, myPortalRequests]);

  useEffect(() => {
    setConfirmWithdrawBlockSlot(false);
    setWithdrawBlockSlotError(null);
    setWithdrawingBlockSlot(false);
  }, [editingBlock?.id, classScheduleBlockPanelId]);

  const handleWithdrawEditingBlockSlotRequest = useCallback(async () => {
    let requestId = editingBlockPendingRequestId;
    if (
      !requestId
      && isStaffTimeSlots
      && classScheduleBlockPanelId
      && staffUser?.accountId
    ) {
      requestId = myPendingSlotRequestIdForClass(
        myPortalRequests,
        staffUser.accountId,
        classScheduleBlockPanelId,
      );
    }
    if (!requestId) return;
    setWithdrawingBlockSlot(true);
    setWithdrawBlockSlotError(null);
    const { error } = await withdrawPortalRequest(requestId);
    setWithdrawingBlockSlot(false);
    if (error) {
      setWithdrawBlockSlotError(error);
      toastOperationFailed(error);
      return;
    }
    toastDeleted('Slot request');
    setConfirmWithdrawBlockSlot(false);
    void loadMySlotRequests();
  }, [
    editingBlockPendingRequestId,
    isStaffTimeSlots,
    classScheduleBlockPanelId,
    staffUser?.accountId,
    myPortalRequests,
    loadMySlotRequests,
  ]);

  const visibleBlocksInRange = isMultiDayTimeline
    ? blocks.filter((b) => weekDateKeys.includes(b.dateKey))
    : blocks.filter((b) => {
        const d = dateKeyToDate(b.dateKey);
        return d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month;
      });

  const visibleBlocksInRangeForView = isActiveClassCalendar
    ? visibleBlocksInRange.filter(isMemberClassScheduleVisibleBlock)
    : isStaffClassSchedule
      ? visibleBlocksInRange.filter((b) =>
          isStaffClassScheduleVisibleBlock(b, pendingSlotRequestIds),
        )
      : visibleBlocksInRange;

  const visibleBlocks = (() => {
    if (showClassBlockStatusLegend) {
      if (countClassScheduleFilterSelections(classScheduleFilters) === 0) {
        return visibleBlocksInRangeForView;
      }
      return visibleBlocksInRangeForView.filter((b) =>
        blockMatchesClassScheduleFilters(b, classScheduleFilters),
      );
    }
    if (showClassScheduleFeatures && disciplineFilterIds.length > 0) {
      return visibleBlocksInRangeForView.filter(
        (b) => b.disciplineId && disciplineFilterIds.includes(b.disciplineId),
      );
    }
    return visibleBlocksInRangeForView;
  })();

  const blocksForWeekDay = (dayIndex: number) => {
    const key = weekDateKeys[dayIndex];
    return visibleBlocks.filter((b) => b.dateKey === key);
  };

  const monthEventsByDate = (() => {
    const result: Record<string, MonthGridEvent[]> = {};
    for (const block of visibleBlocks) {
      const list = result[block.dateKey] ?? [];
      const requested = staffPendingSlotRequest(block.id);
      const memberSlots = isActiveClassCalendar
        ? scheduleBlockCapacityFromBlock(block)
        : null;
      const memberSlotsLabel =
        memberSlots?.available != null
          ? memberAvailableSlotsLabel(memberSlots.available)
          : null;
      list.push({
        id: block.id,
        time: scheduleBlockTimeRange(block),
        title: requested
          ? `Requested · ${block.duration}m`
          : memberSlotsLabel
            ? `${memberSlotsLabel} · ${block.duration}m`
            : `${BLOCK_STATUS_LABELS[block.statusBlock]} · ${block.duration}m`,
        color: requested ? STAFF_VACANT_REQUESTED_COLOR : block.color,
        muted:
          !requested
          && (isTerminalClassBlockStatus(block.statusBlock) || !block.statusClass),
      });
      result[block.dateKey] = list;
    }
    return result;
  })();

  const selectedMonthDate = selectedMonthKey ? dateKeyToDate(selectedMonthKey) : null;
  const selectedMonthBlocks = selectedMonthKey
    ? visibleBlocks.filter((b) => b.dateKey === selectedMonthKey)
    : [];

  const selectedMonthBlocksByTime = [...selectedMonthBlocks].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const selectedDayBlocksInPanelRange = useMemo(() => {
    return selectedMonthBlocks.filter((block) => {
      const placement = weekBlockTimelineStyleInRange(
        block,
        dayPanelStartHour,
        dayPanelEndHour,
      );
      return !placement.hidden;
    });
  }, [selectedMonthBlocks, dayPanelStartHour, dayPanelEndHour]);

  const closeMonthDayPanel = () => {
    setShowMonthDayPanel(false);
    setSelectedMonthKey(null);
  };

  const closeClassScheduleBlockPanel = () => {
    setClassScheduleBlockPanelId(null);
    setClassScheduleBlockTab('info');
  };

  const openMonthDayPanel = (dateKey: string) => {
    setClassScheduleBlockPanelId(null);
    setSelectedMonthKey(dateKey);
    setShowMonthDayPanel(true);
  };

  const dayPanelDefaultSlot = () => {
    const startMinutes = dayPanelStartHour * 60;
    const endMinutes = Math.min(
      dayPanelEndHour * 60 + 55,
      startMinutes + TIMELINE_HOVER_SLOT_MINUTES,
    );
    return {
      startMinutes,
      endMinutes: Math.max(startMinutes + CLOCK_MINUTE_STEP, endMinutes),
    };
  };

  const openAddBlockForSelectedDay = () => {
    if (isReadOnlySchedule) return;
    if (!selectedMonthKey || !selectedMonthDate) return;
    const slot = dayPanelHoverSlot ?? dayPanelDefaultSlot();
    setDayPanelHoverSlot(null);
    setForm({
      ...EMPTY_FORM,
      dateKey: selectedMonthKey,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
    });
    setEditingBlock(null);
    setShowModal(true);
  };

  const openAddFromDayPanelTimeline = (e: MouseEvent<HTMLDivElement>) => {
    if (isReadOnlySchedule) return;
    if ((e.target as HTMLElement).closest('[data-schedule-block]')) return;
    if (!selectedMonthKey) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const slot =
      dayPanelHoverSlot ?? timelinePointerSlot(e.clientY, rect, dayPanelStartHour, dayPanelEndHour);
    setDayPanelHoverSlot(null);
    setForm({
      ...EMPTY_FORM,
      dateKey: selectedMonthKey,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
    });
    setEditingBlock(null);
    setShowModal(true);
  };

  const goToday = () => {
    if (calendarView === 'threeDay') setRangeStart(today);
    else if (calendarView === 'weekly') setRangeStart(getSundayOfWeekContaining(today));
    setCalMonth(getInitialCalendarMonth());
    setSelectedMonthKey(todayKey);
  };

  const goPrev = () => {
    if (calendarView === 'weekly') {
      setRangeStart((d) => addDaysToDate(d, -7));
    } else if (calendarView === 'threeDay') {
      setRangeStart((d) => addDaysToDate(d, -1));
    } else {
      setCalMonth(m => shiftMonth(m.year, m.month, -1));
      closeMonthDayPanel();
    }
  };

  const goNext = () => {
    if (calendarView === 'weekly') {
      setRangeStart((d) => addDaysToDate(d, +7));
    } else if (calendarView === 'threeDay') {
      setRangeStart((d) => addDaysToDate(d, +1));
    } else {
      setCalMonth(m => shiftMonth(m.year, m.month, 1));
      closeMonthDayPanel();
    }
  };

  const switchCalendarView = (view: 'weekly' | 'threeDay' | 'monthly') => {
    if (view === 'weekly' || view === 'threeDay') {
      setShowMonthDayPanel(false);
    }
    if (view === 'monthly') {
      setCalMonth(getInitialCalendarMonth());
      closeMonthDayPanel();
    } else if (view === 'weekly') {
      const anchor =
        calendarView === 'monthly' && selectedMonthKey
          ? dateKeyToDate(selectedMonthKey)
          : rangeStart;
      setRangeStart(getSundayOfWeekContaining(anchor));
    } else if (view === 'threeDay') {
      if (calendarView === 'monthly' && selectedMonthKey) {
        setRangeStart(dateKeyToDate(selectedMonthKey));
      } else if (visibleRangeIncludesToday(visibleDates, today)) {
        setRangeStart(today);
      } else if (visibleDates.length > 0) {
        setRangeStart(visibleDates[0]);
      }
    }
    setCalendarView(view);
  };

  const openAddFromTimeline = (
    e: MouseEvent<HTMLDivElement>,
    dayIndex: number,
    date: Date,
  ) => {
    if (isReadOnlySchedule) return;
    if ((e.target as HTMLElement).closest('[data-schedule-block]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const slot =
      timelineHoverSlot?.dayIndex === dayIndex
        ? {
            startMinutes: timelineHoverSlot.startMinutes,
            endMinutes: timelineHoverSlot.endMinutes,
          }
        : timelinePointerSlot(e.clientY, rect, viewStartHour, viewEndHour);
    setForm({
      ...EMPTY_FORM,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      dateKey: toDateKey(date),
    });
    setEditingBlock(null);
    setTimelineHoverSlot(null);
    setShowModal(true);
  };

  const openEdit = (block: ScheduleBlock) => {
    if (isReadOnlySchedule) return;
    if (!isStaffBlockInteractive(block)) return;
    const row = classesById.get(block.id);
    const startMinutes = row?.startsAt
      ? snapMinutesToStep(localMinutesFromIso(row.startsAt))
      : block.startHour * 60;
    const endMinutes = row?.endsAt
      ? snapMinutesToStep(localMinutesFromIso(row.endsAt))
      : startMinutes + block.duration;
    setForm({
      dateKey: block.dateKey,
      startMinutes,
      endMinutes: Math.max(startMinutes + CLOCK_MINUTE_STEP, endMinutes),
      statusBlock: row?.statusBlock ?? block.statusBlock ?? 'vacant',
    });
    setEditingBlock(block);
    setShowModal(true);
  };

  const handleScheduleBlockActivate = (block: ScheduleBlock) => {
    if (isPublicClassSchedule) {
      onPublicBlockActivate?.(block);
      return;
    }
    if (opensClassScheduleBlockPanel) {
    setShowMonthDayPanel(false);
      setSelectedMonthKey(null);
      setClassScheduleBlockPanelId(block.id);
      setClassScheduleBlockTab('info');
      return;
    }
    openEdit(block);
  };

  const persistScheduleBlock = async (): Promise<string | null> => {
    if (isReadOnlySchedule || blockFormInvalid || saving) return null;
    const { startsAt, endsAt } = buildStartEndFromMinutes(
      formDateKey,
      form.startMinutes,
      form.endMinutes,
    );
    const existing = editingBlock ? classesById.get(editingBlock.id) : null;
    const studentIds = existing?.students.map((s) => s.accountId) ?? [];
    const coachIds = existing?.coaches.map((c) => c.accountId) ?? [];
    const payload = {
      name: existing?.name ?? '',
      description: existing?.description ?? '',
      disciplineId: existing?.disciplineId ?? null,
      startsAt,
      endsAt,
      classLimit: existing?.classLimit ?? null,
      statusClass: existing?.statusClass ?? false,
      statusBlock: editingBlock ? form.statusBlock : 'vacant',
      coachAccountIds: coachIds,
      studentAccountIds: studentIds,
    };

    setSaving(true);
    setScheduleError(null);

    const result = editingBlock
      ? await updateClass(editingBlock.id, payload, { scheduleBlockOnly: true })
      : await createClass(payload, { scheduleBlockOnly: true });

    if (result.error) {
      setScheduleError(result.error);
      toastOperationFailed(result.error);
      setSaving(false);
      return null;
    }

    if (editingBlock) {
      toastUpdated('Schedule block');
    } else {
      toastCreated('Schedule block');
    }

    const savedDateKey = formDateKey;
    focusCalendarOnDateKey(savedDateKey, form.startMinutes, form.endMinutes);

    const classId =
      editingBlock?.id ?? ('id' in result && result.id ? result.id : null);
    if (classId) {
      const patch = provisionalScheduleBlock({
        id: classId,
        dateKey: savedDateKey,
        startsAt,
        endsAt,
        startHour: Math.floor(form.startMinutes / 60),
        statusClass: payload.statusClass,
        statusBlock: payload.statusBlock,
        classLimit: payload.classLimit,
        uid: existing?.uid,
        name: payload.name,
        enrolled: existing?.enrolledCount,
        colorMode: scheduleBlockColorMode,
      });
      setBlocks((prev) => mergeScheduleBlock(prev, patch));
    }

    setSaving(false);
    setShowModal(false);
    setEditingBlock(null);
    await loadSchedule({ silent: true });
    return classId;
  };

  const handleSave = async () => {
    await persistScheduleBlock();
  };

  const handleAssignSchedule = () => {
    if (!editingBlock || editingBlock.id.startsWith('req-')) return;
    const classId = editingBlock.id;
    if (!classesById.has(classId)) return;
    setShowModal(false);
    setConfirmDeleteId(null);
    setEditingBlock(null);
    if (showClassScheduleFeatures) {
      openClassAssignModal(classId);
    } else {
      navigate(`/admin-classes?assign=${encodeURIComponent(classId)}`);
    }
  };

  const isDaySchedulePanelOpen =
    showMonthDayPanel &&
    !!selectedMonthKey &&
    (calendarView === 'monthly' ||
      calendarView === 'weekly' ||
      calendarView === 'threeDay');

  const isClassScheduleBlockPanelOpen =
    opensClassScheduleBlockPanel && classScheduleBlockPanelId != null;

  const isClassSessionDetailModalOpen =
    usesClassSessionDetailModal && isClassScheduleBlockPanelOpen;

  const isScheduleSidePanelOpen =
    isDaySchedulePanelOpen
    || (isClassScheduleBlockPanelOpen && !usesClassSessionDetailModal);

  const isBlockPanelReviewOpen =
    isClassScheduleBlockPanelOpen
    && (selectedReqId !== null || selectedCancelId !== null);

  const isClassAssignModalOpen = isClassSchedule && classAssignId != null;

  /** Side sheet must not trap focus / pointer events while a stacked modal is open. */
  const isSheetObstructedByModal =
    isBlockPanelReviewOpen
    || isClassAssignModalOpen
    || showSlotRequestModal
    || showCancellationRequestModal;

  const scheduleSidePanelWidth = isClassScheduleBlockPanelOpen
    ? CLASS_SCHEDULE_BLOCK_PANEL_WIDTH
    : DAY_SCHEDULE_PANEL_WIDTH;

  const classSchedulePanelBlock = classScheduleBlockPanelId
    ? blocks.find((b) => b.id === classScheduleBlockPanelId) ?? null
    : null;
  const classSchedulePanelClass = classScheduleBlockPanelId
    ? classesById.get(classScheduleBlockPanelId) ?? null
    : null;

  const panelBlockPendingRequest = Boolean(
    isStaffTimeSlots
    && classSchedulePanelBlock
    && staffPendingSlotRequest(classSchedulePanelBlock.id),
  );

  const panelBlockPendingRequestId = useMemo(() => {
    if (!isStaffTimeSlots || !classScheduleBlockPanelId || !staffUser?.accountId) return null;
    return myPendingSlotRequestIdForClass(
      myPortalRequests,
      staffUser.accountId,
      classScheduleBlockPanelId,
    );
  }, [isStaffTimeSlots, classScheduleBlockPanelId, staffUser?.accountId, myPortalRequests]);

  const openStaffPanelSlotRequest = useCallback(() => {
    if (!classSchedulePanelBlock || !staffUser) return;
    const row = classSchedulePanelClass;
    const startMinutes = row?.startsAt
      ? snapMinutesToStep(localMinutesFromIso(row.startsAt))
      : classSchedulePanelBlock.startHour * 60;
    const endMinutes = row?.endsAt
      ? snapMinutesToStep(localMinutesFromIso(row.endsAt))
      : startMinutes + classSchedulePanelBlock.duration;
    setSlotRequestContext({
      classId: classSchedulePanelBlock.id,
      dateKey: classSchedulePanelBlock.dateKey,
      startMinutes,
      endMinutes,
      ...(classSchedulePanelBlock.capacity > 0
        ? { defaultClassLimit: classSchedulePanelBlock.capacity }
        : {}),
    });
    setShowSlotRequestModal(true);
  }, [classSchedulePanelBlock, classSchedulePanelClass, staffUser]);

  const panelPendingCancellationRequest = useMemo(() => {
    if (!isStaffSchedulePortal || !classScheduleBlockPanelId) return null;
    return (
      myPortalRequests.find(
        (r) =>
          r.request_type === 'cancellation_request'
          && r.target_class_id === classScheduleBlockPanelId
          && r.status === 'pending',
      ) ?? null
    );
  }, [isStaffSchedulePortal, classScheduleBlockPanelId, myPortalRequests]);

  const openStaffPanelCancellationRequest = useCallback(() => {
    if (!classSchedulePanelBlock) return;
    const startsAt =
      classSchedulePanelClass?.startsAt ?? classSchedulePanelBlock.startsAt;
    setCancellationRequestContext({
      classId: classSchedulePanelBlock.id,
      className:
        classSchedulePanelBlock.title?.trim()
        || classSchedulePanelClass?.name?.trim()
        || 'Class',
      startsAt,
      enrolledCount:
        classSchedulePanelClass?.students?.length
        ?? classSchedulePanelBlock.enrolled
        ?? 0,
      statusClass:
        classSchedulePanelClass?.statusClass ?? classSchedulePanelBlock.statusClass,
    });
    setShowCancellationRequestModal(true);
  }, [classSchedulePanelBlock, classSchedulePanelClass]);

  const staffTimeSlotsPanelHeaderActionClass =
    'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold active:scale-95 transition-all ml-auto disabled:opacity-50 disabled:pointer-events-none';

  const classSchedulePanelEnrolledStudents = useMemo(() => {
    const rows = classSchedulePanelClass?.students ?? [];
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }, [classSchedulePanelClass?.students]);

  const classSchedulePanelSlotCapacity = useMemo(() => {
    const enrolled =
      classSchedulePanelClass?.students?.length
      ?? classSchedulePanelClass?.enrolledCount
      ?? classSchedulePanelBlock?.enrolled
      ?? 0;
    const limit = classSchedulePanelClass?.classLimit ?? classSchedulePanelBlock?.capacity ?? null;
    const normalizedLimit =
      limit != null && Number.isFinite(limit) && limit > 0 ? limit : null;
    const available =
      normalizedLimit != null ? Math.max(0, normalizedLimit - enrolled) : null;
    return { enrolled, limit: normalizedLimit, available };
  }, [classSchedulePanelClass, classSchedulePanelBlock]);

  const [memberEnrollmentByClassId, setMemberEnrollmentByClassId] = useState<
    Map<string, MemberClassEnrollmentStatus>
  >(() => new Map());

  const refreshMemberEnrollmentMap = useCallback(async () => {
    if (!isMemberClassSchedule || !memberUser) {
      setMemberEnrollmentByClassId(new Map());
      return;
    }
    const map = await fetchMemberEnrollmentStatusMap();
    setMemberEnrollmentByClassId((prev) => {
      if (prev.size === map.size) {
        let unchanged = true;
        for (const [classId, status] of map) {
          if (prev.get(classId) !== status) {
            unchanged = false;
            break;
          }
        }
        if (unchanged) return prev;
      }
      return map;
    });
  }, [isMemberClassSchedule, memberUser?.email]);

  useEffect(() => {
    if (!isMemberClassSchedule || !memberUser || loadingSchedule) return;
    void refreshMemberEnrollmentMap();
  }, [isMemberClassSchedule, memberUser, loadingSchedule, refreshMemberEnrollmentMap]);

  const [memberClassEnrollmentGate, setMemberClassEnrollmentGate] = useState<
    'enrolled' | 'waitlisted' | 'none' | null
  >(null);

  useEffect(() => {
    if (!isMemberClassSchedule || !classScheduleBlockPanelId) {
      setMemberClassEnrollmentGate(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const gate = await fetchMemberClassEnrollmentGate(classScheduleBlockPanelId);
      if (!cancelled) setMemberClassEnrollmentGate(gate);
    })();
    return () => {
      cancelled = true;
    };
  }, [isMemberClassSchedule, classScheduleBlockPanelId]);

  const memberClassEnrollState = useMemo(() => {
    if (!isMemberClassSchedule || !classSchedulePanelBlock) {
      return { disabled: true, hint: undefined as string | undefined };
    }
    if (memberClassEnrollmentGate === 'waitlisted') {
      return {
        disabled: true,
        hint: 'Your payment is pending review. You are waitlisted for this class.',
      };
    }
    if (memberClassEnrollmentGate === 'enrolled') {
      return { disabled: true, hint: 'You are already enrolled in this class.' };
    }
    const email = memberUser?.email?.trim().toLowerCase();
    const alreadyEnrolled =
      email != null
      && (classSchedulePanelClass?.students.some(
        (student) => student.email.trim().toLowerCase() === email,
      ) ?? false);
    if (alreadyEnrolled) {
      return { disabled: true, hint: 'You are already enrolled in this class.' };
    }
    if (classSchedulePanelClass && !classSchedulePanelClass.statusClass) {
      return { disabled: true, hint: 'This class is closed for enrollment.' };
    }
    const blockStatus =
      classSchedulePanelClass?.statusBlock ?? classSchedulePanelBlock.statusBlock;
    if (isTerminalClassBlockStatus(blockStatus)) {
      return {
        disabled: true,
        hint:
          blockStatus === 'cancelled'
            ? 'This class was cancelled.'
            : 'This session has already ended.',
      };
    }
    const sessionStartsAt =
      classSchedulePanelClass?.startsAt ?? classSchedulePanelBlock.startsAt;
    if (classSessionHasStarted(sessionStartsAt)) {
      return { disabled: true, hint: 'This class has already started.' };
    }
    const { available, limit } = classSchedulePanelSlotCapacity;
    if (limit != null && available != null && available <= 0) {
      return { disabled: true, hint: 'This class is full.' };
    }
    return { disabled: false, hint: undefined };
  }, [
    isMemberClassSchedule,
    classSchedulePanelBlock,
    memberClassEnrollmentGate,
    memberUser?.email,
    classSchedulePanelClass,
    classSchedulePanelSlotCapacity,
  ]);

  const classSchedulePanelDisciplineMeta = useMemo(() => {
    const fallbackName = unassignedIfBlank(
      classSchedulePanelClass?.disciplineName
      || classSchedulePanelBlock?.discipline
      || '',
    );
    const disciplineId = classSchedulePanelClass?.disciplineId ?? null;
    const catalog = disciplineId ? disciplineCatalogById.get(disciplineId) : undefined;
    const name = catalog?.name?.trim()
      ? catalog.name.trim()
      : fallbackName;
    const logoSrc =
      catalog?.logoUrl?.trim()
      || catalog?.imageUrl?.trim()
      || getDisciplinePlaceholderLogo(name);
    return { name, logoSrc };
  }, [classSchedulePanelClass, classSchedulePanelBlock, disciplineCatalogById]);

  const classSchedulePanelClassIdLabel = useMemo(() => {
    const uid =
      classSchedulePanelClass?.uid?.trim()
      || classSchedulePanelBlock?.uid?.trim()
      || '';
    return uid ? `#${uid}` : '—';
  }, [classSchedulePanelClass?.uid, classSchedulePanelBlock?.uid]);

  const classSchedulePanelCoachMeta = useMemo(() => {
    const coaches = classSchedulePanelClass?.coaches ?? [];
    if (coaches.length > 0) {
      const primary = coaches[0];
      const photo = coachPhotoByAccountId.get(primary.accountId);
      const primaryName = unassignedIfBlank(
        primary.name || classSchedulePanelBlock?.coach || '',
      );
      const name =
        coaches.length === 1
          ? primaryName
          : `${primaryName} +${coaches.length - 1} more`;
      const title = coaches.map((coach) => unassignedIfBlank(coach.name)).join(', ');
      return { name, photo, title };
    }
    const fallbackName = unassignedIfBlank(classSchedulePanelBlock?.coach || '');
    return { name: fallbackName, photo: undefined, title: fallbackName };
  }, [classSchedulePanelClass, classSchedulePanelBlock, coachPhotoByAccountId]);

  const handleMemberEnrollClass = useCallback(() => {
    if (memberClassEnrollState.disabled || !classSchedulePanelBlock) return;
    const className =
      classSchedulePanelBlock.title?.trim()
      || classSchedulePanelClass?.name?.trim()
      || 'Class';
    closeClassScheduleBlockPanel();
    navigate('/member-payment-portal', {
      state: {
        booking: {
          classId: classSchedulePanelBlock.id,
          className,
          date: classSchedulePanelBlock.dateKey,
          dateLabel: formatDateLongFromKey(classSchedulePanelBlock.dateKey),
          time: scheduleBlockTimeRange(classSchedulePanelBlock),
          duration: `${classSchedulePanelBlock.duration} min`,
          trainer: classSchedulePanelCoachMeta.name,
          price: '₱360',
          priceNum: 360,
        },
      },
    });
  }, [
    memberClassEnrollState.disabled,
    classSchedulePanelBlock,
    classSchedulePanelClass?.name,
    classSchedulePanelCoachMeta.name,
    navigate,
  ]);

  const blockPanelSlotReqs = classScheduleBlockPanelId
    ? scheduleReqs.filter((req) => {
        const row = portalRequests.find((r) => r.id === req.id);
        return (
          row != null
          && row.request_type === 'slot_request'
          && portalRequestMatchesClassId(row, classScheduleBlockPanelId)
        );
      })
    : [];
  const blockPanelCancelReqs = classScheduleBlockPanelId
    ? cancelReqs.filter((req) => {
        const row = portalRequests.find((r) => r.id === req.id);
        return (
          row != null
          && (row.request_type === 'cancellation_request'
            || row.request_type === 'member_enrollment_cancellation')
          && portalRequestMatchesClassId(row, classScheduleBlockPanelId)
        );
      })
    : [];
  const blockPanelPendingSlotCount = blockPanelSlotReqs.filter((r) => r.status === 'pending').length;
  const blockPanelPendingCancelCount = blockPanelCancelReqs.filter((r) => r.status === 'pending').length;

  const closeScheduleBlockModal = () => {
    setShowModal(false);
    setConfirmDeleteId(null);
  };

  const handleClassAssignSave = async (input: ClassUpsertInput) => {
    if (!classAssignId) {
      return { success: false, error: 'No schedule block selected.' };
    }
    const existing = classesById.get(classAssignId);
    const alreadyAssigned =
      existing != null && isAssignedScheduleBlock(existing.statusBlock);
    const statusBlock = alreadyAssigned ? input.statusBlock : 'assigned';
    const result = await updateClass(classAssignId, {
      ...input,
      statusBlock,
    });
    if (result.success) {
      if (input.coachAccountIds.length > 0) {
        void sendScheduleCoachAssignedEmail(classAssignId).then(({ ok, error: emailError }) => {
          if (!ok && emailError) {
            console.warn('Coach assignment email:', emailError);
          }
        });
      }
      await loadSchedule({ silent: true });
    }
    return { success: result.success, error: result.error };
  };

  const handleClassAssignDelete = async () => {
    if (!classAssignId) {
      return { success: false, error: 'No schedule block selected.' };
    }
    const result = await deleteClass(classAssignId);
    if (result.success) {
      closeClassAssignModal();
      await loadSchedule({ silent: true });
    }
    return { success: result.success, error: result.error };
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('req-')) {
      setBlocks(prev => prev.filter(b => b.id !== id));
      setConfirmDeleteId(null);
      setShowModal(false);
      return;
    }
    setSaving(true);
    const result = await deleteClass(id);
    setSaving(false);
    if (result.error) {
      setScheduleError(result.error);
      toastOperationFailed(result.error);
      return;
    }
    toastDeleted('Schedule block');
    setConfirmDeleteId(null);
    setShowModal(false);
    setEditingBlock(null);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    await loadSchedule({ silent: true });
  };

  const setRequestStatus = (id: string, status: PortalRequestStatus) => {
    void reviewPortalRequest({ requestId: id, status }).then(({ error }) => {
      if (error) {
        setScheduleError(error);
        toastOperationFailed(error);
        return;
      }
      if (status === 'approved') {
        toastUpdated('Request approved');
      } else if (status === 'rejected') {
        toastUpdated('Request declined');
      } else {
        toastSaved();
      }
      void loadPortalRequests();
      if (isClassSchedule) void loadSchedule({ silent: true });
    });
  };

  const selectedReq = scheduleReqs.find(r => r.id === selectedReqId) ?? null;
  const selectedCancel = cancelReqs.find(r => r.id === selectedCancelId) ?? null;

  const selectedCancelPortalRow = useMemo(
    () => (selectedCancelId ? portalRequests.find((r) => r.id === selectedCancelId) ?? null : null),
    [portalRequests, selectedCancelId],
  );
  const selectedCancelClassRow = useMemo(() => {
    const classId = selectedCancelPortalRow?.target_class_id;
    return classId ? classesById.get(classId) ?? null : null;
  }, [selectedCancelPortalRow, classesById]);
  const selectedCancelShortNotice = isClassCancellationShortNotice(
    selectedCancelClassRow?.startsAt,
  );
  const cancelReplacementCoachOptions = useMemo(() => {
    const requesterId = selectedCancelPortalRow?.requester_account_id ?? '';
    return coachOptions.filter((coach) => coach.accountId !== requesterId);
  }, [coachOptions, selectedCancelPortalRow?.requester_account_id]);
  const canApproveCancellation = useMemo(() => {
    if (!selectedCancel || selectedCancel.status !== 'pending') return false;
    if (selectedCancel.isMemberEnrollmentCancel) return true;
    if (!selectedCancelShortNotice) return true;
    if (cancelApproveMode === 'cancel_class') return true;
    return cancelReplacementCoachId.trim().length > 0;
  }, [
    selectedCancel,
    selectedCancelShortNotice,
    cancelApproveMode,
    cancelReplacementCoachId,
  ]);

  const closePortalReviewModal = useCallback(() => {
    setSelectedReqId(null);
    setSelectedCancelId(null);
    setCancelApproveMode('replace');
    setCancelReplacementCoachId('');
  }, []);

  useEffect(() => {
    setCancelApproveMode('replace');
    setCancelReplacementCoachId('');
  }, [selectedCancelId]);

  useEffect(() => {
    if (selectedReqId === null && selectedCancelId === null) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closePortalReviewModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedReqId, selectedCancelId, closePortalReviewModal]);

  const submitCancellationReview = (id: string, status: PortalRequestStatus) => {
    const replacementCoachAccountId =
      status === 'approved'
      && selectedCancelShortNotice
      && cancelApproveMode === 'replace'
        ? cancelReplacementCoachId.trim()
        : null;
    const cancelEntireClass =
      status === 'approved'
      && selectedCancelShortNotice
      && cancelApproveMode === 'cancel_class';

    void reviewPortalRequest({
      requestId: id,
      status,
      replacementCoachAccountId: replacementCoachAccountId || null,
      cancelEntireClass,
    }).then(({ error }) => {
      if (error) {
        setScheduleError(error);
        toastOperationFailed(error);
        return;
      }
      if (status === 'approved') {
        toastUpdated('Cancellation approved');
      } else if (status === 'rejected') {
        toastUpdated('Cancellation declined');
      } else {
        toastSaved();
      }
      void loadPortalRequests();
      if (isClassSchedule) void loadSchedule({ silent: true });
    });
  };

  const pendingB = scheduleReqs.filter(r => r.status === 'pending').length;
  const approvedB = scheduleReqs.filter(r => r.status === 'approved').length;
  const rejectedB = scheduleReqs.filter(r => r.status === 'rejected').length;
  const cancelledB = scheduleReqs.filter(r => r.status === 'cancelled').length;
  const pendingC = cancelReqs.filter(r => r.status === 'pending').length;
  const approvedC = cancelReqs.filter(r => r.status === 'approved').length;
  const rejectedC = cancelReqs.filter(r => r.status === 'rejected').length;
  const cancelledC = cancelReqs.filter(r => r.status === 'cancelled').length;
  const filteredScheduleReqs = reqStatusFilter === 'all'
    ? scheduleReqs
    : scheduleReqs.filter(r => r.status === reqStatusFilter);
  const filteredCancelReqs = cancelStatusFilter === 'all'
    ? cancelReqs
    : cancelReqs.filter(r => r.status === cancelStatusFilter);

  const [coachTablePage, setCoachTablePage] = useState(1);
  const { containerRef: coachTableContainerRef, pageSize: coachTablePageSize } = useFitPageSize({
    layout: 'table',
    fallback: 8,
  });

  useEffect(() => {
    setCoachTablePage(1);
  }, [coachRequestTab, reqStatusFilter, cancelStatusFilter]);

  const bookingTotalPages = Math.max(1, Math.ceil(filteredScheduleReqs.length / coachTablePageSize));
  const bookingCurrentPage = Math.min(coachTablePage, bookingTotalPages);
  const pagedScheduleReqs = useMemo(() => {
    const start = (bookingCurrentPage - 1) * coachTablePageSize;
    return filteredScheduleReqs.slice(start, start + coachTablePageSize);
  }, [filteredScheduleReqs, bookingCurrentPage, coachTablePageSize]);
  const bookingRangeStart =
    filteredScheduleReqs.length === 0 ? 0 : (bookingCurrentPage - 1) * coachTablePageSize + 1;
  const bookingRangeEnd = Math.min(bookingCurrentPage * coachTablePageSize, filteredScheduleReqs.length);

  const cancelTotalPages = Math.max(1, Math.ceil(filteredCancelReqs.length / coachTablePageSize));
  const cancelCurrentPage = Math.min(coachTablePage, cancelTotalPages);
  const pagedCancelReqs = useMemo(() => {
    const start = (cancelCurrentPage - 1) * coachTablePageSize;
    return filteredCancelReqs.slice(start, start + coachTablePageSize);
  }, [filteredCancelReqs, cancelCurrentPage, coachTablePageSize]);
  const cancelRangeStart =
    filteredCancelReqs.length === 0 ? 0 : (cancelCurrentPage - 1) * coachTablePageSize + 1;
  const cancelRangeEnd = Math.min(cancelCurrentPage * coachTablePageSize, filteredCancelReqs.length);

  const inputClass  = "w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  const StatusBadge = ({ s }: { s: ReqStatus }) => (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit capitalize ${portalRequestStatusBadgeClass(s)}`}>
      {s}
    </span>
  );

  const ReviewActions = ({
    status,
    onApprove,
    onReject,
    onUndo,
    onClose,
    approveDisabled = false,
    compact = false,
  }: {
    status: ReqStatus;
    onApprove: () => void;
    onReject: () => void;
    onUndo: () => void;
    onClose: () => void;
    approveDisabled?: boolean;
    compact?: boolean;
  }) => {
    if (status === 'cancelled') {
      return (
        <div className={`flex flex-col gap-3 ${compact ? 'px-5 pb-4 pt-1' : 'px-7 pb-7'}`}>
          <p className="text-[#5A5048] text-xs leading-relaxed text-center">
            The coach cancelled this request before review. No admin action is required.
          </p>
          <button
            type="button"
            onClick={onClose}
            className={`w-full rounded-2xl bg-[#1E2A35] text-white font-semibold hover:bg-[#2A3A48] transition-colors ${
              compact ? 'py-2.5 text-xs' : 'py-3 text-sm'
            }`}
          >
            Close
          </button>
        </div>
      );
    }

    const left =
      status === 'rejected'
        ? {
            label: 'Undo Reject',
            onClick: onUndo,
            className: 'flex-1 flex items-center justify-center gap-2 py-3 rounded-full border border-[#D4CDB5]/70 text-[#1E2A35] text-sm font-semibold hover:bg-[#EDE8D8] active:scale-[0.97] transition-all',
            icon: true,
          }
        : {
            label: 'Reject',
            onClick: onReject,
            className: 'flex-1 py-3 rounded-full bg-red-50 text-red-600 border border-red-200 text-sm font-semibold hover:bg-red-100 active:scale-[0.97] transition-all',
            icon: false,
          };

    const right =
      status === 'approved'
        ? {
            label: 'Undo Approve',
            onClick: onUndo,
            className: 'flex-1 flex items-center justify-center gap-2 py-3 rounded-full border border-[#D4CDB5]/70 text-[#1E2A35] text-sm font-semibold hover:bg-[#EDE8D8] active:scale-[0.97] transition-all',
            icon: true,
          }
        : {
            label: 'Approve',
            onClick: onApprove,
            className: 'action-button flex-1 py-3 rounded-full bg-green-600 text-white text-sm hover:bg-green-700 active:scale-[0.97] transition-all shadow-sm',
            icon: false,
          };

    const pad = compact ? 'px-5 pb-4 pt-3' : 'px-7 pb-7';
    const btnPy = compact ? 'py-2.5 text-xs' : 'py-3 text-sm';

    return (
      <div className={pad}>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={left.onClick}
            className={`${left.className}${compact ? ` ${btnPy}` : ''}`}
          >
            {left.icon && <Undo2 size={14} />}
            {left.label}
          </button>
          <button
            type="button"
            onClick={right.onClick}
            disabled={right.label === 'Approve' && approveDisabled}
            className={`${right.className}${compact ? ` ${btnPy}` : ''}${
              right.label === 'Approve' && approveDisabled ? ' opacity-50 pointer-events-none' : ''
            }`}
          >
            {right.icon && <Undo2 size={14} />}
            {right.label}
          </button>
        </div>
      </div>
    );
  };

  const showPageLoading =
    loadingSchedule
    || (showCoachRequestTables && loadingPortalRequests && portalRequests.length === 0);

  if (!portalUser && !isPublicClassSchedule) return null;

  return (
    <>
      {showPageLoading && <PageLoadingScreen />}
      <div
        className={
          isCoachRequests
            ? 'h-full min-h-0 overflow-hidden flex flex-col'
            : weeklyViewportFit
              ? `max-w-7xl mx-auto px-6 w-full flex flex-col min-h-0 h-full overflow-hidden ${
                  isPublicClassSchedule ? 'py-2' : 'py-4'
                }`
              : 'max-w-7xl mx-auto px-6 w-full flex flex-col min-h-0 py-8'
        }
      >
      <div
        className={
          isCoachRequests
            ? 'max-w-7xl mx-auto px-6 w-full flex-1 min-h-0 flex flex-col py-8'
            : 'contents'
        }
      >

        {showCoachRequestTables && !hideCoachRequestTabSwitcher && (
          <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm mb-6 w-fit shrink-0">
            {([
              ['requests', 'Slot Requests', pendingB] as const,
              ['cancellations', 'Cancellation Requests', pendingC] as const,
            ]).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCoachRequestTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${coachRequestTab === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}
              >
                {label}
                {count > 0 && (
                  <span className={pendingActionCountBadgeClass()}>{count}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ══ CALENDAR ══ */}
        {!isCoachRequests && (
          <div
            className={
              weeklyViewportFit
                ? `flex min-h-0 flex-1 flex-col overflow-hidden ${
                    isPublicClassSchedule ? 'pb-2' : 'pb-10'
                  }`
                : undefined
            }
          >
            {scheduleError && (
              <div className="mb-4 flex shrink-0 items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{scheduleError}</p>
              </div>
            )}
            <div
              className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${
                weeklyViewportFit ? 'flex min-h-0 flex-1 flex-col' : ''
              }`}
            >
              <div className="flex shrink-0 items-center gap-2 px-3 py-2 border-b border-[#D4CDB5]/40 flex-wrap">
                <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-0.5 bg-[#F8F3E8] rounded-lg p-0.5">
                  {(
                    [
                      ['threeDay', '3-Day'],
                      ['weekly', 'Weekly'],
                      ['monthly', 'Monthly'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => switchCalendarView(id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide transition-all ${
                        calendarView === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  </div>
                  {showClassScheduleFeatures && showClassBlockStatusLegend && (
                    <ClassScheduleCalendarFilter
                      disciplines={calendarFilterDisciplines}
                      coaches={
                        isMemberClassSchedule
                          ? memberScheduleFilterCoaches
                          : coachOptions.map((c) => ({
                              accountId: c.accountId,
                              name: c.name,
                            }))
                      }
                      applied={classScheduleFilters}
                      onApply={setClassScheduleFilters}
                      statusBlockFilterOptions={
                        isMemberClassSchedule ? MEMBER_SCHEDULE_VISIBLE_BLOCK_STATUSES : undefined
                      }
                    />
                  )}
                  {showClassScheduleFeatures && !showClassBlockStatusLegend && !isStaffTimeSlots && (
                    <CalendarDisciplineMultiSelect
                      disciplines={calendarFilterDisciplines}
                      selectedIds={disciplineFilterIds}
                      onChange={setDisciplineFilterIds}
                    />
                  )}
                  {usesOperationsBlockColors && <ClassBlockStatusLegend />}
                </div>

                <div className="flex items-center justify-center gap-1.5 flex-1 min-w-[220px]">
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label={
                      calendarView === 'weekly'
                        ? 'Previous week'
                        : calendarView === 'threeDay'
                          ? 'Previous day'
                          : 'Previous month'
                    }
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] transition-all"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span
                    className="text-[#1E2A35] text-center min-w-[11rem]"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.06em' }}
                  >
                    {isMultiDayTimeline ? rangeLabel : monthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label={
                      calendarView === 'weekly'
                        ? 'Next week'
                        : calendarView === 'threeDay'
                          ? 'Next day'
                          : 'Next month'
                    }
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] transition-all"
                  >
                    <ChevronRight size={15} />
                  </button>
                  {!isOnToday && (
                    <button
                      type="button"
                      onClick={goToday}
                      className="action-button text-[#c49a3c] text-[11px] font-bold px-2 py-1 rounded-md hover:bg-[#c49a3c]/10 transition-colors"
                    >
                      Today
                    </button>
                  )}
                </div>

                <ScheduleHourRangeFilter
                  idPrefix="calendar-view"
                  startHour={viewStartHour}
                  endHour={viewEndHour}
                  onStartHourChange={setViewStartHour}
                  onEndHourChange={setViewEndHour}
                  className="shrink-0 ml-auto"
                />
              </div>

              {showClassScheduleFeatures
                && !showClassBlockStatusLegend
                && !isFrontdeskClassSchedule
                && !isStaffTimeSlots && (
                <div className="flex items-center gap-x-3 gap-y-1.5 px-3 py-2 border-b border-[#D4CDB5]/30 flex-wrap bg-[#F8F3E8]/40">
                  {[
                    { label: 'Upcoming', dot: 'bg-[#6B8E6B]' },
                    { label: 'Completed', dot: 'bg-[#3A4A5A]' },
                    { label: 'Cancelled', dot: 'bg-red-400' },
                    { label: 'Closed', dot: 'bg-[#D4CDB5]' },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-1">
                      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                      <span className="text-[#8A7E6E] text-[10px]">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}

            <div
              className={
                weeklyViewportFit
                  ? 'relative flex min-h-0 flex-1 flex-col'
                  : 'relative min-h-[280px]'
              }
            >
            {isMultiDayTimeline && (
              <div
                className={
                  weeklyViewportFit
                    ? 'min-h-0 flex-1 overflow-x-auto overflow-y-hidden'
                    : 'overflow-x-auto'
                }
              >
                <div
                  className={weeklyViewportFit ? 'flex h-full min-h-0 flex-col' : undefined}
                  style={
                    weeklyViewportFit
                      ? undefined
                      : { minWidth: `${72 + visibleDates.length * 128}px` }
                  }
                >
                  <div
                    className={`grid shrink-0 border-b ${CALENDAR_BORDER_DIVIDER} bg-[#F5F1E8]`}
                    style={{ gridTemplateColumns: `72px repeat(${visibleDates.length}, minmax(0, 1fr))` }}
                  >
                    <div className={`px-3 py-2.5 ${CALENDAR_TIME_GUTTER_BG} border-r ${CALENDAR_BORDER_DIVIDER}`}>
                      <span className={`block text-center text-[9px] uppercase tracking-wide ${CALENDAR_DATE_MUTED}`}>
                        GMT+8
                      </span>
                    </div>
                    {visibleDates.map((date) => {
                      const dateKey = toDateKey(date);
                      const day = DAY_LABELS_FULL[date.getDay()];
                      const isTodayCol = dateKey === todayKey;
                      const isWeekendCol = isWeekendDate(date);
                      const headerBg = isWeekendCol ? WEEKEND_COLUMN_BG : 'bg-[#F5F1E8]';
                      const isDayPanelOpen =
                        showMonthDayPanel && selectedMonthKey === dateKey;
                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => openMonthDayPanel(dateKey)}
                          aria-label={`View schedule for ${formatDateLongFromKey(dateKey)}`}
                          aria-pressed={isDayPanelOpen}
                          className={`px-2 py-2.5 text-center border-l ${CALENDAR_BORDER_DIVIDER} ${headerBg} transition-colors hover:bg-[#EDE8D8]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/40 focus-visible:z-[3] ${
                            isDayPanelOpen ? 'bg-[#c49a3c]/12 ring-1 ring-inset ring-[#c49a3c]/35 z-[3]' : ''
                          } ${isTodayCol ? `relative z-[2] ${CALENDAR_TODAY_COLUMN}` : ''}`}
                        >
                          <p className={`text-[11px] leading-snug ${CALENDAR_DAY_LABEL} ${isTodayCol ? 'text-[#8A6520]' : ''}`}>
                            {day}
                          </p>
                          <p className={`text-xs font-medium ${isTodayCol ? 'text-[#1E2A35]' : CALENDAR_DATE_MUTED}`}>
                            {formatDayShort(date)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <div
                    className={`relative flex min-h-0 flex-1 ${
                      weeklyViewportFit ? '' : 'min-h-[664px]'
                    }`}
                  >
                    <div className={`relative w-[72px] shrink-0 border-r ${CALENDAR_BORDER_DIVIDER} ${CALENDAR_TIME_GUTTER_BG}`}>
                      {timelineHours.map((hour, i) => (
                        <span
                          key={hour}
                          className={`absolute right-3 -translate-y-1/2 text-[11px] whitespace-nowrap select-none ${CALENDAR_TIME_LABEL}`}
                          style={{ top: `${(i / timelineHours.length) * 100}%` }}
                        >
                          {formatHour24(hour)}
                        </span>
                      ))}
                    </div>
                    <div
                      className="grid min-h-0 flex-1"
                      style={{ gridTemplateColumns: `repeat(${visibleDates.length}, minmax(0, 1fr))` }}
                    >
                      {visibleDates.map((date, dayIndex) => {
                        const dayBlocks = blocksForWeekDay(dayIndex);
                        const isTodayCol = toDateKey(date) === todayKey;
                        const isWeekendCol = isWeekendDate(date);
                        const hourCount = Math.max(timelineHours.length - 1, 1);
                        return (
                          <div
                            key={dayIndex}
                            role="presentation"
                            onClick={(e) => openAddFromTimeline(e, dayIndex, date)}
                            onMouseMove={(e) => {
                              if (isActiveClassCalendar) return;
                              if ((e.target as HTMLElement).closest('[data-schedule-block]')) {
                                setTimelineHoverSlot((prev) =>
                                  prev?.dayIndex === dayIndex ? null : prev,
                                );
                                return;
                              }
                              const rect = e.currentTarget.getBoundingClientRect();
                              const slot = timelinePointerSlot(
                                e.clientY,
                                rect,
                                viewStartHour,
                                viewEndHour,
                              );
                              setTimelineHoverSlot({ dayIndex, ...slot });
                            }}
                            onMouseLeave={() => {
                              setTimelineHoverSlot((prev) =>
                                prev?.dayIndex === dayIndex ? null : prev,
                              );
                            }}
                            className={`relative min-h-0 h-full overflow-hidden border-l ${CALENDAR_BORDER_DIVIDER} ${
                              isReadOnlySchedule ? '' : 'cursor-pointer'
                            } ${
                              isWeekendCol ? WEEKEND_COLUMN_BG_SOFT : 'bg-white'
                            } ${isTodayCol ? `z-[2] ${CALENDAR_TODAY_COLUMN}` : ''}`}
                          >
                            {Array.from({ length: hourCount }, (_, i) => (
                              <div key={`grid-${i}`}>
                                <div
                                  className={`pointer-events-none absolute left-0 right-0 ${CALENDAR_GRID_HOUR_LINE}`}
                                  style={{ top: `${(i / hourCount) * 100}%` }}
                                />
                                <div
                                  className={`pointer-events-none absolute left-0 right-0 ${CALENDAR_GRID_HALF_HOUR_LINE}`}
                                  style={{ top: `${((i + 0.5) / hourCount) * 100}%` }}
                                />
                              </div>
                            ))}
                            {timelineHoverSlot?.dayIndex === dayIndex &&
                              (() => {
                                const preview = minutesRangeTimelineStyleInRange(
                                  timelineHoverSlot.startMinutes,
                                  timelineHoverSlot.endMinutes,
                                  viewStartHour,
                                  viewEndHour,
                                );
                                if (preview.hidden) return null;
                                return (
                                  <div
                                    className="pointer-events-none absolute left-1 right-1 z-[6] overflow-hidden rounded-lg border border-[#1E2A35]/25 bg-[#1E2A35]/[0.07] shadow-[inset_3px_0_0_0_rgba(30,42,53,0.55)]"
                                    style={preview}
                                  >
                                    <p className="truncate px-2 py-1 text-[10px] font-semibold tabular-nums text-[#1E2A35]/85">
                                      {formatMinutesOfDay(timelineHoverSlot.startMinutes)} –{' '}
                                      {formatMinutesOfDay(timelineHoverSlot.endMinutes)}
                                    </p>
                                  </div>
                                );
                              })()}
                            {dayBlocks.map((block) => {
                              const isVacant = block.statusBlock === 'vacant';
                              const isClosedBlock = isTerminalClassBlockStatus(block.statusBlock);
                              const staffRequestPending = staffPendingSlotRequest(block.id);
                              const adminPendingPortalRequest = adminPendingPortalRequestOnBlock(block.id);
                              const timeline = weekBlockTimelineStyleInRange(
                                block,
                                viewStartHour,
                                viewEndHour,
                              );
                              if (timeline.hidden) return null;
                              return (
                                <ScheduleTimelineBlockCard
                                  key={block.id}
                                  block={block}
                                  timeline={timeline}
                                  viewStartHour={viewStartHour}
                                  viewEndHour={viewEndHour}
                                  density="timeline"
                                  variant="timeline"
                                  isVacant={isVacant}
                                  staffRequestPending={staffRequestPending}
                                  staffCoachAssignedToYou={staffCoachAssignedOnBlock(block)}
                                  adminPendingPortalRequest={adminPendingPortalRequest}
                                  isClosedBlock={isClosedBlock}
                                  showMemberCapacity={isActiveClassCalendar || isStaffClassSchedule}
                                  memberSelfEnrollment={
                                    isMemberClassSchedule
                                      ? memberEnrollmentByClassId.get(block.id) ?? null
                                      : null
                                  }
                                  emphasizeMemberEnrollment={isMemberClassSchedule}
                                  disabled={!isStaffBlockInteractive(block)}
                                  onActivate={(e) => {
                                    e.stopPropagation();
                                    handleScheduleBlockActivate(block);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleScheduleBlockActivate(block);
                                    }
                                  }}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {calendarView === 'monthly' && (
              <div
                className={
                  weeklyViewportFit
                    ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                    : undefined
                }
              >
              <MonthCalendarGrid
                year={calMonth.year}
                month={calMonth.month}
                eventsByDate={monthEventsByDate}
                todayKey={todayKey}
                selectedDateKey={selectedMonthKey}
                onSelectDate={openMonthDayPanel}
                weekdayLabels={DAY_LABELS_FULL}
                  fillHeight={weeklyViewportFit}
                  className="rounded-none border-0 shadow-none h-full min-h-0"
              />
              </div>
            )}
            </div>
            </div>

            {!weeklyViewportFit && (
              <p className="text-[#B0A898] text-xs mt-3 text-right shrink-0">
                {visibleBlocks.length} schedule blocks{' '}
                {calendarView === 'weekly'
                  ? 'this week'
                  : calendarView === 'threeDay'
                    ? 'in this 3-day range'
                    : 'this month'}
              </p>
            )}
          </div>
        )}

        {/* ══ BOOKING REQUESTS TAB ══ */}
        {showCoachRequestTables && coachRequestTab === 'requests' && (
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#F8F3E8]/60 shrink-0">
              <div>
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}>Slot Requests</h2>
                <p className="text-[#8A7E6E] text-xs mt-0.5">Class schedule requests submitted by staff · click a row to review</p>
              </div>
              <div className="flex items-center gap-1 bg-white border border-[#D4CDB5]/60 rounded-xl p-1 w-fit">
                {([
                  ['all', 'All', scheduleReqs.length],
                  ['pending', 'Pending', pendingB],
                  ['approved', 'Approved', approvedB],
                  ['rejected', 'Rejected', rejectedB],
                  ['cancelled', 'Cancelled', cancelledB],
                ] as const).map(([id, label, count]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setReqStatusFilter(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      reqStatusFilter === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                    }`}
                  >
                    {label}
                    <span className={requestStatusFilterCountBadgeClass(id, count, reqStatusFilter === id)}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40 shrink-0">
                  {['Class Name', 'Discipline', 'Start Time', 'End Time', 'Class Limit', 'Status'].map(h => (
                    <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                  ))}
                </div>
                {filteredScheduleReqs.length === 0 ? (
              <div ref={coachTableContainerRef} className="flex-1 min-h-0 px-6 py-14 text-center">
                    <p className="text-[#1E2A35] text-sm font-semibold">No {reqStatusFilter === 'all' ? '' : `${reqStatusFilter} `}requests</p>
                    <p className="text-[#B0A898] text-xs mt-1">
                      {reqStatusFilter === 'all'
                        ? 'Staff class schedule requests will appear here.'
                        : `Switch filters to see requests that are not ${reqStatusFilter}.`}
                    </p>
                  </div>
                ) : (
              <div ref={coachTableContainerRef} className="flex-1 min-h-0 divide-y divide-[#D4CDB5]/30 overflow-hidden">
                {pagedScheduleReqs.map(req => (
                    <button
                      type="button"
                      key={req.id}
                      onClick={() => setSelectedReqId(req.id)}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px] w-full text-left cursor-pointer bg-transparent border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-semibold truncate">{req.className}</p>
                        <p className="text-[#B0A898] text-xs truncate">Requested by {req.staff}</p>
                      </div>
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CLASS_COLORS[req.discipline] || '#c49a3c' }} />
                        <p className="text-[#1E2A35] text-sm truncate">{req.discipline}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-medium truncate">{req.startTime}</p>
                        <p className="text-[#9A8E7E] text-xs truncate">{req.date}</p>
                      </div>
                      <p className="text-[#1E2A35] text-sm truncate">{req.endTime}</p>
                      <p className="text-[#1E2A35] text-sm">{req.classLimit} spots</p>
                      <StatusBadge s={req.status} />
                    </button>
                  ))}
                </div>
                )}
            <div className="px-6 pb-4 shrink-0">
              <AdminTablePagination
                page={bookingCurrentPage}
                totalPages={bookingTotalPages}
                rangeStart={bookingRangeStart}
                rangeEnd={bookingRangeEnd}
                total={filteredScheduleReqs.length}
                noun="requests"
                onPageChange={setCoachTablePage}
              />
            </div>
          </div>
        )}

        {/* ══ CANCELLATION REQUESTS TAB ══ */}
        {showCoachRequestTables && coachRequestTab === 'cancellations' && (
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#F8F3E8]/60 shrink-0">
              <div>
                <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}>Cancellation Requests</h2>
                <p className="text-[#8A7E6E] text-xs mt-0.5">Coaches requesting to cancel their scheduled classes · click a row to review</p>
              </div>
              <div className="flex items-center gap-1 bg-white border border-[#D4CDB5]/60 rounded-xl p-1 w-fit">
                {([
                  ['all', 'All', cancelReqs.length],
                  ['pending', 'Pending', pendingC],
                  ['approved', 'Approved', approvedC],
                  ['rejected', 'Rejected', rejectedC],
                  ['cancelled', 'Cancelled', cancelledC],
                ] as const).map(([id, label, count]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCancelStatusFilter(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      cancelStatusFilter === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                    }`}
                  >
                    {label}
                    <span className={requestStatusFilterCountBadgeClass(id, count, cancelStatusFilter === id)}>
                      {count}
                    </span>
                  </button>
                ))}
            </div>
            </div>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40 shrink-0">
                  {['Coach', 'Class / Date', 'Notice', 'Status'].map(h => (
                    <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                  ))}
                </div>
            {filteredCancelReqs.length === 0 ? (
              <div ref={coachTableContainerRef} className="flex-1 min-h-0 px-6 py-14 text-center">
                <p className="text-[#1E2A35] text-sm font-semibold">
                  No {cancelStatusFilter === 'all' ? '' : `${cancelStatusFilter} `}cancellation requests
                </p>
                <p className="text-[#B0A898] text-xs mt-1">
                  {cancelReqs.length === 0
                    ? 'Coach cancellation requests will appear here.'
                    : 'Switch filters to see other cancellation requests.'}
                </p>
              </div>
            ) : (
              <div ref={coachTableContainerRef} className="flex-1 min-h-0 divide-y divide-[#D4CDB5]/30 overflow-hidden">
                {pagedCancelReqs.map(req => (
                    <button
                      type="button"
                      key={req.id}
                      onClick={() => setSelectedCancelId(req.id)}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px] w-full text-left cursor-pointer bg-transparent border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-semibold truncate">{req.coach}</p>
                        <p className="text-[#B0A898] text-xs truncate">{req.email}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-medium truncate">{req.className}</p>
                        <p className="text-[#9A8E7E] text-xs truncate">{req.date} · {req.time} · {req.enrolled} enrolled</p>
                      </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Clock size={12} className="text-[#9A8E7E] shrink-0" />
                      <span className="text-[#5A5048] text-sm truncate">{req.hoursUntilClass} hrs before</span>
                      </div>
                      <StatusBadge s={req.status} />
                    </button>
                  ))}
                </div>
            )}
            <div className="px-6 pb-4 shrink-0">
              <AdminTablePagination
                page={cancelCurrentPage}
                totalPages={cancelTotalPages}
                rangeStart={cancelRangeStart}
                rangeEnd={cancelRangeEnd}
                total={filteredCancelReqs.length}
                noun="requests"
                onPageChange={setCoachTablePage}
              />
            </div>
          </div>
        )}
      </div>
      </div>

      {(showCoachRequestTables || isClassSchedule) && selectedReq && createPortal(
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 pointer-events-auto"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) closePortalReviewModal(); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">Class schedule request</p>
                <h3 className="text-[#1E2A35] leading-tight truncate" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
                  {selectedReq.className}
                </h3>
              </div>
              <button
                type="button"
                onClick={closePortalReviewModal}
                className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-7 py-6 flex flex-col gap-4">
              <div className="flex items-center gap-3.5 rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8]/90 p-3.5">
                <PortalPersonAvatar name={selectedReq.staff} photo={selectedReq.requesterPhoto} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A8E7E]">Requested by</p>
                  <p className="truncate text-[#1E2A35] text-sm font-semibold">{selectedReq.staff}</p>
                  {selectedReq.email ? (
                    <p className="truncate text-[#8A7E6E] text-xs">{selectedReq.email}</p>
                  ) : null}
                  <p className="text-[#B0A898] text-[11px] mt-0.5">{selectedReq.submittedAt}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                <StatusBadge s={selectedReq.status} />
                </div>
              </div>

              {selectedReq.status === 'approved' && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                  <Check size={15} className="text-green-600 shrink-0 mt-0.5" />
                  <p className="text-green-700 text-xs leading-relaxed">This class is approved and added to the weekly schedule. You can undo this decision below, or close to return to the schedule.</p>
                </div>
              )}
              {selectedReq.status === 'rejected' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-xs leading-relaxed">This request was rejected and will not appear on the schedule. You can undo this decision below, or close to return to the schedule.</p>
                </div>
              )}
              {selectedReq.status === 'pending' && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <Clock size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-amber-700 text-xs leading-relaxed">Review the details below. Approve or reject when ready—you can close this dialog anytime without deciding.</p>
                </div>
              )}
              {selectedReq.status === 'cancelled' && (
                <div className="flex items-start gap-2 bg-[#F8F3E8] border border-[#D4CDB5]/70 rounded-2xl px-4 py-3">
                  <X size={15} className="text-[#8A7E6E] shrink-0 mt-0.5" />
                  <p className="text-[#5A5048] text-xs leading-relaxed">
                    Cancelled by the coach before review. This request will not be scheduled.
                  </p>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-[#D4CDB5]/50 bg-white shadow-sm">
                <div
                  className="h-1.5"
                  style={{
                    backgroundColor:
                      statusColorFromHue(selectedReq.disciplineHue)
                      || CLASS_COLORS[selectedReq.discipline]
                      || '#c49a3c',
                  }}
                />
                <div className="flex items-center gap-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/50 px-4 py-3.5">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#D4CDB5]/50 bg-white shadow-sm">
                    <ImageWithFallback
                      src={
                        selectedReq.disciplineImageUrl?.trim()
                        || selectedReq.disciplineLogoUrl
                        || getDisciplinePlaceholderLogo(selectedReq.discipline)
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A8E7E]">Discipline</p>
                    <p className="truncate text-[#1E2A35] text-base font-semibold">{selectedReq.discipline}</p>
                  </div>
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: statusColorFromHue(selectedReq.disciplineHue) }}
                    aria-hidden
                  />
                </div>
                <div className="flex flex-col gap-3 p-4">
                  {(
                    [
                      ['Class name', selectedReq.className],
                      ['Start', `${selectedReq.date} · ${selectedReq.startTime}`],
                      ['End', selectedReq.endTime],
                      ['Class limit', `${selectedReq.classLimit} spots`],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-4">
                      <span className="text-[#9A8E7E] text-xs uppercase tracking-widest shrink-0 pt-0.5">
                        {label}
                      </span>
                      <span className="text-[#1E2A35] text-sm font-semibold text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <ReviewActions
              status={selectedReq.status}
              onApprove={() => setRequestStatus(selectedReq.id, 'approved')}
              onReject={() => setRequestStatus(selectedReq.id, 'rejected')}
              onUndo={() => setRequestStatus(selectedReq.id, 'pending')}
              onClose={closePortalReviewModal}
            />
          </div>
        </div>,
        document.body,
      )}

      {(showCoachRequestTables || isClassSchedule) && selectedCancel && createPortal(
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 pointer-events-auto"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) closePortalReviewModal(); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancellation-review-title"
            className={`bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-2xl w-full overflow-hidden flex flex-col ${
              selectedCancel.status === 'pending' && selectedCancelShortNotice
                ? 'max-w-[min(96vw,36rem)]'
                : 'max-w-[min(96vw,24rem)]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-3 border-b border-[#D4CDB5]/50 flex items-start justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <p className="text-[#9A8E7E] text-[10px] uppercase tracking-widest mb-0.5">
                  {selectedCancel.isMemberEnrollmentCancel ? 'Member cancellation' : 'Cancellation request'}
                </p>
                <h3
                  id="cancellation-review-title"
                  className="text-[#1E2A35] leading-tight truncate"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.04em' }}
                >
                  {selectedCancel.className}
                </h3>
                {selectedCancel.discipline.trim().toLowerCase()
                  !== selectedCancel.className.trim().toLowerCase() ? (
                  <p className="text-[#8A7E6E] text-[11px] mt-0.5 truncate">{selectedCancel.discipline}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closePortalReviewModal}
                className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-3 flex flex-col gap-2.5 shrink-0">
              <div className="flex items-center gap-2.5 rounded-xl border border-[#D4CDB5]/60 bg-[#F8F3E8]/90 p-2.5">
                <PortalPersonAvatar
                  name={selectedCancel.coach}
                  photo={selectedCancel.requesterPhoto}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[#1E2A35] text-xs font-semibold">{selectedCancel.coach}</p>
                  <p className="text-[#B0A898] text-[10px] truncate">
                    {selectedCancel.requestedAt}
                    {selectedCancel.email ? ` · ${selectedCancel.email}` : ''}
                  </p>
                </div>
                <StatusBadge s={selectedCancel.status} />
              </div>

              {selectedCancel.status === 'approved' && (
                <div className="flex items-start gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <Check size={14} className="text-green-600 shrink-0 mt-0.5" />
                  <p className="text-green-700 text-[11px] leading-snug">
                    Approved — schedule updated. Undo below or close.
                  </p>
                </div>
              )}
              {selectedCancel.status === 'rejected' && (
                <div className="flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-[11px] leading-snug">Rejected — class stays on schedule.</p>
                </div>
              )}
              {selectedCancel.isMemberEnrollmentCancel && selectedCancel.status === 'pending' && (
                <div className="flex items-start gap-1.5 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
                  <Clock size={14} className="text-sky-700 shrink-0 mt-0.5" />
                  <p className="text-sky-900 text-[11px] leading-snug">
                    Approve to unenroll. Inside the cancellation window, drop-in cash is approved for a manual refund (no official receipt) or the session credit is restored. After the window, the fee or credit is forfeited and a drop-in payment is locked with an official receipt.
                  </p>
                </div>
              )}
              {!selectedCancel.isMemberEnrollmentCancel && selectedCancel.status === 'pending' && selectedCancelShortNotice && (
                <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <Clock size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-amber-800 text-[11px] leading-snug">
                    Under 2 weeks — pick a replacement coach or cancel the session before approving.
                  </p>
                </div>
              )}
              {!selectedCancel.isMemberEnrollmentCancel && selectedCancel.status === 'pending' && !selectedCancelShortNotice && (
                <div className="flex items-start gap-1.5 bg-[#F8F3E8] border border-[#D4CDB5]/70 rounded-xl px-3 py-2">
                  <Clock size={14} className="text-[#9A8E7E] shrink-0 mt-0.5" />
                  <p className="text-[#5A5048] text-[11px] leading-snug">
                    2+ weeks out — approve removes this coach from the block.
                  </p>
                </div>
              )}
              {selectedCancel.status === 'cancelled' && (
                <div className="flex items-start gap-1.5 bg-[#F8F3E8] border border-[#D4CDB5]/70 rounded-xl px-3 py-2">
                  <X size={14} className="text-[#8A7E6E] shrink-0 mt-0.5" />
                  <p className="text-[#5A5048] text-[11px] leading-snug">Withdrawn by coach before review.</p>
                </div>
              )}

              <div
                className={`grid gap-2.5 ${
                  selectedCancel.status === 'pending' && selectedCancelShortNotice
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                <div className="bg-[#F8F3E8] rounded-xl border border-[#D4CDB5]/50 overflow-hidden min-w-0">
                  <div
                    className="h-1"
                    style={{
                      backgroundColor: blockPanelRequestAccent(
                        selectedCancel.discipline,
                        selectedCancel.disciplineHue,
                      ),
                    }}
                  />
                  <div className="p-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
                    {[
                      ['Date', selectedCancel.date],
                      ['Time', selectedCancel.time],
                      ['Enrolled', String(selectedCancel.enrolled)],
                      ['Notice', `${selectedCancel.hoursUntilClass}h`],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <p className="text-[#9A8E7E] text-[9px] uppercase tracking-wider font-bold">{label}</p>
                        <p className="text-[#1E2A35] text-xs font-semibold truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {!selectedCancel.isMemberEnrollmentCancel && selectedCancel.status === 'pending' && selectedCancelShortNotice && (
                  <div className="rounded-xl border border-[#D4CDB5]/60 bg-white p-2.5 flex flex-col gap-2 min-w-0">
                    <p className="text-[#1E2A35] text-xs font-semibold">Approve as</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cancel-approve-mode"
                        checked={cancelApproveMode === 'replace'}
                        onChange={() => setCancelApproveMode('replace')}
                        className="accent-[#c49a3c] shrink-0"
                      />
                      <span className="text-xs font-medium text-[#1E2A35]">Replacement coach</span>
                    </label>
                    {cancelApproveMode === 'replace' && (
                      <select
                        value={cancelReplacementCoachId}
                        onChange={(e) => setCancelReplacementCoachId(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#D4CDB5]/70 bg-[#F8F3E8] text-xs text-[#1E2A35] outline-none focus:ring-2 focus:ring-[#c49a3c]/25"
                      >
                        <option value="">Select coach…</option>
                        {cancelReplacementCoachOptions.map((coach) => (
                          <option key={coach.accountId} value={coach.accountId}>
                            {coach.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cancel-approve-mode"
                        checked={cancelApproveMode === 'cancel_class'}
                        onChange={() => setCancelApproveMode('cancel_class')}
                        className="accent-[#c49a3c] shrink-0"
                      />
                      <span className="text-xs font-medium text-[#1E2A35]">Cancel class</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-[#D4CDB5]/40 bg-[#FBF9F3]/80">
              <ReviewActions
                status={selectedCancel.status}
                onApprove={() => submitCancellationReview(selectedCancel.id, 'approved')}
                onReject={() => submitCancellationReview(selectedCancel.id, 'rejected')}
                onUndo={() => submitCancellationReview(selectedCancel.id, 'pending')}
                onClose={closePortalReviewModal}
                approveDisabled={!canApproveCancellation}
                compact
              />
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Schedule side panel: day view or class-schedule block detail ── */}
      <Sheet
        open={isScheduleSidePanelOpen}
        modal={!isSheetObstructedByModal}
        onOpenChange={(open) => {
          if (!open && isClassAssignModalOpen) return;
          if (!open && (showSlotRequestModal || showCancellationRequestModal)) return;
          if (!open && !showModal && !isSheetObstructedByModal) {
            if (isClassScheduleBlockPanelOpen) closeClassScheduleBlockPanel();
            else closeMonthDayPanel();
          }
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          overlayClassName={
            isClassAssignModalOpen || showSlotRequestModal || showCancellationRequestModal
              ? 'pointer-events-none'
              : isBlockPanelReviewOpen
                ? 'pointer-events-none bg-black/30'
                : undefined
          }
          className={`bg-[#FBF9F3] border-l border-[#D4CDB5]/60 w-full flex flex-col gap-0 p-0 ${
            isClassScheduleBlockPanelOpen ? 'sm:max-w-[34rem]' : 'sm:max-w-md'
          } ${showModal ? 'z-[105]' : ''} ${
            isClassAssignModalOpen || showSlotRequestModal || showCancellationRequestModal
              ? 'pointer-events-none'
              : ''
          } ${isBlockPanelReviewOpen ? 'pointer-events-none opacity-60' : ''}`}
          aria-hidden={isBlockPanelReviewOpen || undefined}
          onInteractOutside={(event) => {
            if (
              isClassAssignModalOpen
              || isBlockPanelReviewOpen
              || showSlotRequestModal
              || showCancellationRequestModal
            ) {
              event.preventDefault();
            }
          }}
          onPointerDownOutside={(event) => {
            if (
              isClassAssignModalOpen
              || isBlockPanelReviewOpen
              || showSlotRequestModal
              || showCancellationRequestModal
            ) {
              event.preventDefault();
            }
          }}
          onFocusOutside={(event) => {
            if (
              isClassAssignModalOpen
              || isBlockPanelReviewOpen
              || showSlotRequestModal
              || showCancellationRequestModal
            ) {
              event.preventDefault();
            }
          }}
        >
          {isClassScheduleBlockPanelOpen && classSchedulePanelBlock ? (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#D4CDB5]/50 text-left space-y-3 shrink-0">
                <div className="flex w-full items-center gap-2">
                  <button
                    type="button"
                    onClick={closeClassScheduleBlockPanel}
                    disabled={isSheetObstructedByModal}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-xs font-semibold hover:bg-[#EDE8D8] transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ChevronLeft size={14} />
                    Go Back
                  </button>
                  {!isMemberClassSchedule && !isStaffTimeSlots && (
                  <button
                    type="button"
                    onClick={() => {
                      if (classScheduleBlockPanelId) {
                        openClassAssignModal(classScheduleBlockPanelId);
                      }
                    }}
                    disabled={isSheetObstructedByModal}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold active:scale-95 transition-all ml-auto disabled:opacity-50 disabled:pointer-events-none ${
                      isAssignedScheduleBlock(classSchedulePanelBlock.statusBlock)
                        ? 'bg-[#c49a3c] text-white hover:bg-[#a67f2e] shadow-sm'
                        : 'bg-[#1E2A35] text-white hover:bg-[#263545]'
                    }`}
                  >
                    {isAssignedScheduleBlock(classSchedulePanelBlock.statusBlock)
                      ? 'Update Schedule'
                      : 'Assign Schedule'}
                  </button>
                  )}
                  {isStaffTimeSlots && classSchedulePanelBlock && staffCoachAssignedOnBlock(classSchedulePanelBlock) && (
                    <button
                      type="button"
                      onClick={openStaffPanelCancellationRequest}
                      disabled={isSheetObstructedByModal}
                      className={`${staffTimeSlotsPanelHeaderActionClass} bg-red-500 text-white hover:bg-red-600`}
                    >
                      Cancel Assignment
                    </button>
                  )}
                  {isStaffTimeSlots
                    && classSchedulePanelBlock
                    && isStaffVacantBlock(classSchedulePanelBlock)
                    && !panelBlockPendingRequest && (
                    <button
                      type="button"
                      onClick={openStaffPanelSlotRequest}
                      disabled={!staffUser?.accountId || isSheetObstructedByModal}
                      className={`${staffTimeSlotsPanelHeaderActionClass} bg-[#1E2A35] text-white hover:bg-[#263545]`}
                    >
                      Request Slot
                    </button>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <SheetTitle
                      className="text-[#1E2A35] leading-tight truncate min-w-0 flex-1 text-left"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
                    >
                      {classSchedulePanelBlock.title?.trim() || 'Schedule block'}
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      Class schedule block details and actions for this time slot.
                    </SheetDescription>
                    <p
                      className={`shrink-0 text-right truncate max-w-[45%] text-[11px] ${CALENDAR_PANEL_TIME_META}`}
                      title={
                        classSchedulePanelClassIdLabel !== '—'
                          ? `Class ID ${classSchedulePanelClassIdLabel}`
                          : undefined
                      }
                    >
                      {classSchedulePanelClassIdLabel}
                    </p>
                  </div>
                  <div className="mt-2.5">
                    <ClassScheduleBlockScheduleCard block={classSchedulePanelBlock} />
                  </div>
                </div>
                {!isMemberClassSchedule && !isStaffTimeSlots && (
                <div className="flex flex-row gap-2">
                  {([
                    ['info', 'Info', 0] as const,
                    ['slot-requests', 'Slot Requests', blockPanelPendingSlotCount] as const,
                    ['cancellations', 'Cancellation Requests', blockPanelPendingCancelCount] as const,
                  ]).map(([id, label, count]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setClassScheduleBlockTab(id)}
                      disabled={isSheetObstructedByModal}
                      className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition-all disabled:pointer-events-none disabled:opacity-50 ${
                        classScheduleBlockTab === id
                          ? 'border-[#1E2A35] bg-[#1E2A35] text-white shadow-sm'
                          : 'border-[#D4CDB5]/60 bg-white text-[#8A7E6E] hover:border-[#c49a3c]/40 hover:text-[#1E2A35]'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      {count > 0 && (
                        <span className={`${pendingActionCountBadgeClass()} shrink-0`}>{count}</span>
                      )}
                    </button>
                  ))}
                </div>
                )}
              </SheetHeader>

              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
                {classScheduleBlockTab === 'info' && (
                  <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-2xl border border-[#D4CDB5]/60 overflow-hidden shadow-sm">
                      <div className="h-1.5" style={{ backgroundColor: classSchedulePanelBlock.color }} />
                      <div className="p-4 flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-2 min-w-0">
                          <div className="min-w-0 rounded-xl border border-[#D4CDB5]/60 bg-[#FBF9F3]/80 px-3 py-2.5 flex flex-col gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A8E7E]">
                              Discipline
                            </p>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-[#D4CDB5]/50 bg-white shadow-sm">
                                <ImageWithFallback
                                  src={classSchedulePanelDisciplineMeta.logoSrc}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <p
                                className="text-[#1E2A35] text-sm font-semibold truncate min-w-0"
                                title={classSchedulePanelDisciplineMeta.name}
                              >
                                {classSchedulePanelDisciplineMeta.name}
                              </p>
                            </div>
                          </div>
                          <div className="min-w-0 rounded-xl border border-[#D4CDB5]/60 bg-[#FBF9F3]/80 px-3 py-2.5 flex flex-col gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A8E7E]">
                              Coach
                            </p>
                            <div className="flex items-center gap-2 min-w-0">
                              <PortalPersonAvatar
                                name={classSchedulePanelCoachMeta.name}
                                photo={classSchedulePanelCoachMeta.photo}
                                size={36}
                              />
                              <p
                                className="text-[#1E2A35] text-sm font-semibold truncate min-w-0"
                                title={classSchedulePanelCoachMeta.title}
                              >
                                {classSchedulePanelCoachMeta.name}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 min-w-0">
                          <div className="rounded-xl border border-[#D4CDB5]/60 bg-white px-3 py-2.5 flex flex-col gap-1.5 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A8E7E]">
                              Block status
                            </p>
                            <span
                              className={`self-start inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold shadow-sm ${classBlockStatusBadgeClass(classSchedulePanelBlock.statusBlock)}`}
                            >
                              {BLOCK_STATUS_LABELS[classSchedulePanelBlock.statusBlock]}
                            </span>
                          </div>
                          <div className="rounded-xl border border-[#D4CDB5]/60 bg-white px-3 py-2.5 flex flex-col gap-1.5 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A8E7E]">
                              Class booking
                            </p>
                            {classSchedulePanelClass ? (
                              <span
                                className={`self-start inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold shadow-sm ${classBookingBadgeClass(classSchedulePanelClass.statusClass)}`}
                              >
                                {classBookingLabel(classSchedulePanelClass.statusClass)}
                              </span>
                            ) : (
                              <span className="self-start inline-flex items-center rounded-full border border-[#D4CDB5] bg-[#EDE8D8] px-2.5 py-0.5 text-xs font-bold text-[#5A5048] shadow-sm">
                                —
                              </span>
                            )}
                          </div>
                        </div>

                        {classSchedulePanelClass?.description?.trim() ? (
                          <div className="pt-1 border-t border-[#D4CDB5]/40">
                            <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">Description</p>
                            <p className="text-[#5A5048] text-sm leading-relaxed">
                              {classSchedulePanelClass.description}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEnrolledStudentsModalOpen(true)}
                      disabled={isSheetObstructedByModal}
                      className="w-full text-left bg-white rounded-2xl border border-[#D4CDB5]/60 overflow-hidden shadow-sm transition-all hover:border-[#c49a3c]/45 hover:shadow-md active:scale-[0.995] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/30"
                      aria-label="View enrolled students"
                    >
                      <div className="px-4 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/90 border border-[#D4CDB5]/60 text-[#5A5048]">
                            <Users size={16} strokeWidth={2.25} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#1E2A35] text-sm font-semibold">Enrolled students</p>
                            <p className="text-[#8A7E6E] text-[11px] mt-0.5">
                              Tap to view roster ·{' '}
                              {classSchedulePanelEnrolledStudents.length} enrolled
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-[#1E2A35] text-xs font-bold tabular-nums rounded-full border border-[#D4CDB5]/60 bg-white px-2.5 py-0.5">
                          {classSchedulePanelEnrolledStudents.length}
                          {classSchedulePanelClass?.classLimit != null
                            ? ` / ${classSchedulePanelClass.classLimit}`
                            : ''}
                        </span>
                      </div>
                      <div className="px-4 py-3 min-h-[3.25rem] flex items-center">
                        {classSchedulePanelEnrolledStudents.length === 0 ? (
                          <p className="text-[#B0A898] text-xs font-medium">No profile photos yet</p>
                        ) : (
                          <div className="flex items-center min-w-0">
                            <div className="flex items-center -space-x-2">
                              {classSchedulePanelEnrolledStudents.slice(0, 10).map((student) => (
                                <PortalPersonAvatar
                                  key={student.accountId}
                                  name={student.name}
                                  photo={studentPhotoByAccountId.get(student.accountId)}
                                  size={36}
                                />
                              ))}
                            </div>
                            {classSchedulePanelEnrolledStudents.length > 10 ? (
                              <span className="ml-2 shrink-0 text-[#8A7E6E] text-xs font-semibold tabular-nums">
                                +{classSchedulePanelEnrolledStudents.length - 10}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                )}

                {classScheduleBlockTab === 'slot-requests' && (
                  <div className="bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
                      <p className="text-[#1E2A35] text-sm font-semibold">Slot Requests</p>
                      <p className="text-[#8A7E6E] text-xs mt-0.5">
                        Staff booking requests for this block · tap to review
                      </p>
                    </div>
                    {blockPanelSlotReqs.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <p className="text-[#1E2A35] text-sm font-semibold">No slot requests</p>
                        <p className="text-[#B0A898] text-xs mt-1">Requests tied to this class will appear here.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5 p-3">
                        {blockPanelSlotReqs.map((req) => {
                          const accent = blockPanelRequestAccent(req.discipline, req.disciplineHue);
                          return (
                            <button
                              type="button"
                              key={req.id}
                              onClick={() => setSelectedReqId(req.id)}
                              className="group w-full rounded-xl border border-[#D4CDB5]/70 border-l-4 bg-white p-3 text-left shadow-sm transition-all hover:border-[#c49a3c]/35 hover:shadow-md active:scale-[0.995]"
                              style={{ borderLeftColor: accent }}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="min-w-0">
                                  <p className="text-[#1E2A35] text-sm font-semibold truncate group-hover:text-[#c49a3c] transition-colors">
                                    {req.className}
                                  </p>
                                  <p className="text-[#8A7E6E] text-[11px] font-medium tabular-nums mt-0.5">
                                    {req.startTime} – {req.endTime} · {req.classLimit} spots
                                  </p>
                                </div>
                                <StatusBadge s={req.status} />
                              </div>
                              <BlockPanelCoachDisciplineRow
                                coachName={req.staff}
                                coachPhoto={req.requesterPhoto}
                                submittedMeta={`Submitted ${req.submittedAt}`}
                                discipline={req.discipline}
                                disciplineImageUrl={req.disciplineImageUrl}
                                disciplineLogoUrl={req.disciplineLogoUrl}
                                disciplineHue={req.disciplineHue}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {classScheduleBlockTab === 'cancellations' && (
                  <div className="bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
                      <p className="text-[#1E2A35] text-sm font-semibold">Cancellation Requests</p>
                      <p className="text-[#8A7E6E] text-xs mt-0.5">
                        Coach cancellation requests for this class · tap to review
                      </p>
                    </div>
                    {blockPanelCancelReqs.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <p className="text-[#1E2A35] text-sm font-semibold">No cancellation requests</p>
                        <p className="text-[#B0A898] text-xs mt-1">Cancellation requests for this block will appear here.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5 p-3">
                        {blockPanelCancelReqs.map((req) => {
                          const accent = blockPanelRequestAccent(req.discipline, req.disciplineHue);
                          return (
                            <button
                              type="button"
                              key={req.id}
                              onClick={() => setSelectedCancelId(req.id)}
                              className="group w-full rounded-xl border border-[#D4CDB5]/70 border-l-4 bg-white p-3 text-left shadow-sm transition-all hover:border-[#c49a3c]/35 hover:shadow-md active:scale-[0.995]"
                              style={{ borderLeftColor: accent }}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="min-w-0">
                                  <p className="text-[#1E2A35] text-sm font-semibold truncate group-hover:text-[#c49a3c] transition-colors">
                                    {req.className}
                                  </p>
                                  <p className="text-[#8A7E6E] text-[11px] tabular-nums mt-0.5">
                                    {req.date} · {req.time}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5 text-[#8A7E6E] text-[11px] font-medium">
                                    <Clock size={11} className="shrink-0 text-[#9A8E7E]" />
                                    <span>
                                      {req.hoursUntilClass} hrs before · {req.enrolled} enrolled
                                    </span>
                                  </div>
                                </div>
                                <StatusBadge s={req.status} />
                              </div>
                              <BlockPanelCoachDisciplineRow
                                coachName={req.coach}
                                coachPhoto={req.requesterPhoto}
                                submittedMeta={`Submitted ${req.requestedAt}`}
                                discipline={req.discipline}
                                disciplineImageUrl={req.disciplineImageUrl}
                                disciplineLogoUrl={req.disciplineLogoUrl}
                                disciplineHue={req.disciplineHue}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isStaffTimeSlots
                && classSchedulePanelBlock
                && isStaffVacantBlock(classSchedulePanelBlock)
                && panelBlockPendingRequest
                && panelBlockPendingRequestId && (
                <div className="shrink-0 border-t border-[#D4CDB5]/50 bg-white px-4 py-4">
                  <PendingPortalRequestWithdrawActions
                    variant="panel"
                    hideClose
                    confirmingWithdraw={confirmWithdrawBlockSlot}
                    withdrawing={withdrawingBlockSlot}
                    withdrawError={withdrawBlockSlotError}
                    onClose={closeClassScheduleBlockPanel}
                    onStartWithdraw={() => {
                      setWithdrawBlockSlotError(null);
                      setConfirmWithdrawBlockSlot(true);
                    }}
                    onConfirmWithdraw={() => void handleWithdrawEditingBlockSlotRequest()}
                    onKeepRequest={() => {
                      setConfirmWithdrawBlockSlot(false);
                      setWithdrawBlockSlotError(null);
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <>
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#D4CDB5]/50 text-left space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeMonthDayPanel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-xs font-semibold hover:bg-[#EDE8D8] transition-all"
              >
                <ChevronLeft size={14} />
                Go Back
              </button>
              {!isReadOnlySchedule && (
              <button
                type="button"
                onClick={openAddBlockForSelectedDay}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#1E2A35] text-white text-xs font-semibold hover:bg-[#263545] active:scale-95 transition-all ml-auto"
              >
                <Plus size={14} />
                Add Block
              </button>
              )}
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
              <SheetTitle
                className="text-[#1E2A35] leading-tight"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
              >
                {selectedMonthKey ? formatDateLongFromKey(selectedMonthKey) : 'Day schedule'}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Time blocks scheduled for the selected day.
              </SheetDescription>
                <p className={`text-xs mt-1 ${CALENDAR_PANEL_TIME_META}`}>
                  {selectedDayBlocksInPanelRange.length} block
                  {selectedDayBlocksInPanelRange.length === 1 ? '' : 's'} · Hours{' '}
                  <span className="text-[#1E2A35] font-semibold">
                    {formatHour24(dayPanelTimelineHours[0])} –{' '}
                    {formatHour24(dayPanelTimelineHours[dayPanelTimelineHours.length - 1])}
                  </span>
                </p>
              </div>
              <ScheduleHourRangeFilter
                idPrefix="day-panel"
                layout="stacked"
                startHour={dayPanelStartHour}
                endHour={dayPanelEndHour}
                onStartHourChange={(hour) => {
                  setDayPanelStartHour(hour);
                  setDayPanelHoverSlot(null);
                }}
                onEndHourChange={(hour) => {
                  setDayPanelEndHour(hour);
                  setDayPanelHoverSlot(null);
                }}
                className="shrink-0"
              />
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {(() => {
              const panelHourCount = Math.max(dayPanelTimelineHours.length - 1, 1);
              const panelMinHeight = panelHourCount * 52;
              const isWeekendDay = selectedMonthDate ? isWeekendDate(selectedMonthDate) : false;
              return (
                <div
                  className="flex gap-3"
                  style={{ minHeight: `${panelMinHeight}px` }}
                >
                  <div
                    className={`relative w-[4.75rem] shrink-0 py-1 ${CALENDAR_PANEL_TIME_GUTTER}`}
                    style={{ minHeight: `${panelMinHeight}px` }}
                  >
                    {dayPanelTimelineHours.map((hour, i) => (
                      <span
                  key={hour}
                        className={`absolute right-2 -translate-y-1/2 text-right ${CALENDAR_PANEL_TIME_LABEL}`}
                        style={{
                          top: `${(i / dayPanelTimelineHours.length) * 100}%`,
                        }}
                      >
                        {formatHour24(hour)}
                  </span>
                    ))}
                  </div>
                  <div
                    role="presentation"
                    onClick={openAddFromDayPanelTimeline}
                    onMouseMove={(e) => {
                      if (isActiveClassCalendar) return;
                      if ((e.target as HTMLElement).closest('[data-schedule-block]')) {
                        setDayPanelHoverSlot(null);
                        return;
                      }
                      const rect = e.currentTarget.getBoundingClientRect();
                      const slot = timelinePointerSlot(
                        e.clientY,
                        rect,
                        dayPanelStartHour,
                        dayPanelEndHour,
                      );
                      setDayPanelHoverSlot(slot);
                    }}
                    onMouseLeave={() => setDayPanelHoverSlot(null)}
                    className={`relative min-w-0 flex-1 rounded-r-lg ${CALENDAR_PANEL_TIMELINE_SURFACE} ${
                      isReadOnlySchedule ? '' : 'cursor-pointer'
                    } ${
                      isWeekendDay ? 'bg-[#F0EBE4]' : ''
                    }`}
                    style={{ minHeight: `${panelMinHeight}px` }}
                  >
                    {Array.from({ length: panelHourCount }, (_, i) => (
                      <div key={`day-panel-grid-${i}`}>
                        <div
                          className={`pointer-events-none absolute left-0 right-0 ${CALENDAR_PANEL_GRID_HOUR}`}
                          style={{ top: `${(i / panelHourCount) * 100}%` }}
                        />
                        <div
                          className={`pointer-events-none absolute left-0 right-0 ${CALENDAR_PANEL_GRID_HALF_HOUR}`}
                          style={{ top: `${((i + 0.5) / panelHourCount) * 100}%` }}
                        />
                      </div>
                    ))}
                    {dayPanelHoverSlot &&
                      (() => {
                        const preview = minutesRangeTimelineStyleInRange(
                          dayPanelHoverSlot.startMinutes,
                          dayPanelHoverSlot.endMinutes,
                          dayPanelStartHour,
                          dayPanelEndHour,
                        );
                        if (preview.hidden) return null;
                        return (
                          <div
                            className={`pointer-events-none absolute left-1 right-1 z-[6] overflow-hidden rounded-lg ${CALENDAR_PANEL_HOVER_SLOT}`}
                            style={preview}
                          >
                            <p className={`truncate px-2 py-1 ${CALENDAR_PANEL_HOVER_TIME}`}>
                              {formatMinutesOfDay(dayPanelHoverSlot.startMinutes)} –{' '}
                              {formatMinutesOfDay(dayPanelHoverSlot.endMinutes)}
                            </p>
                          </div>
                        );
                      })()}
                    {selectedMonthBlocksByTime.map((block) => {
                      const placement = weekBlockTimelineStyleInRange(
                        block,
                        dayPanelStartHour,
                        dayPanelEndHour,
                      );
                      if (placement.hidden) return null;
                      const isVacant = block.statusBlock === 'vacant';
                      const isClosedBlock = isTerminalClassBlockStatus(block.statusBlock);
                      const staffRequestPending = staffPendingSlotRequest(block.id);
                      const adminPendingPortalRequest = adminPendingPortalRequestOnBlock(block.id);
                      return (
                        <ScheduleTimelineBlockCard
                          key={block.id}
                          block={block}
                          timeline={placement}
                          viewStartHour={dayPanelStartHour}
                          viewEndHour={dayPanelEndHour}
                          density="panel"
                          variant="panel"
                          isVacant={isVacant}
                          isClosedBlock={isClosedBlock}
                          staffRequestPending={staffRequestPending}
                          staffCoachAssignedToYou={staffCoachAssignedOnBlock(block)}
                          adminPendingPortalRequest={adminPendingPortalRequest}
                          showMemberCapacity={isActiveClassCalendar || isStaffClassSchedule}
                          memberSelfEnrollment={
                            isMemberClassSchedule
                              ? memberEnrollmentByClassId.get(block.id) ?? null
                              : null
                          }
                          emphasizeMemberEnrollment={isMemberClassSchedule}
                          disabled={!isStaffBlockInteractive(block)}
                          onActivate={(e) => {
                            e.stopPropagation();
                            handleScheduleBlockActivate(block);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {isClassSessionDetailModalOpen && classSchedulePanelBlock
        ? (
          <MemberClassBlockDetailModal
            block={classSchedulePanelBlock}
            classRow={classSchedulePanelClass}
            classIdLabel={classSchedulePanelClassIdLabel}
            disciplineMeta={classSchedulePanelDisciplineMeta}
            slotCapacity={classSchedulePanelSlotCapacity}
            onClose={closeClassScheduleBlockPanel}
            onEnroll={handleMemberEnrollClass}
            enrollDisabled={memberClassEnrollState.disabled}
            enrollHint={memberClassEnrollState.hint}
            readOnly={
              isStaffClassSchedule
              || (isMemberClassSchedule
                && isTerminalClassBlockStatus(classSchedulePanelBlock.statusBlock))
            }
            showMemberEnrollmentSummary={isMemberClassSchedule}
            memberEnrollmentStatus={
              isStaffClassSchedule
                ? null
                : memberClassEnrollmentGate === 'enrolled' || memberClassEnrollmentGate === 'waitlisted'
                  ? memberClassEnrollmentGate
                  : memberEnrollmentByClassId.get(classSchedulePanelBlock.id) ?? null
            }
            onCancelSchedule={
              isStaffClassSchedule
              && classSchedulePanelBlock
              && staffCoachAssignedOnBlock(classSchedulePanelBlock)
              && !isTerminalClassBlockStatus(classSchedulePanelBlock.statusBlock)
                ? openStaffPanelCancellationRequest
                : undefined
            }
            cancelScheduleDisabled={showCancellationRequestModal}
          />
        )
        : null}

      {enrolledStudentsModalOpen
        && isClassScheduleBlockPanelOpen
        && classSchedulePanelBlock
        && createPortal(
          <>
            <div
              className="fixed inset-0 z-[120] bg-[#1E2A35]/55 backdrop-blur-[2px]"
              role="presentation"
              onClick={() => setEnrolledStudentsModalOpen(false)}
            />
            <div
              className={`fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none ${
                isScheduleSidePanelOpen ? 'sm:pr-[var(--day-panel-width)]' : ''
              }`}
              style={{ '--day-panel-width': scheduleSidePanelWidth } as CSSProperties}
            >
              <div
                className="pointer-events-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#D4CDB5]/60 bg-white shadow-2xl max-h-[min(85vh,32rem)]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="enrolled-students-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-[#D4CDB5]/50 flex items-start justify-between gap-3 shrink-0 bg-[#F8F3E8]/50">
                  <div className="min-w-0">
                    <h2
                      id="enrolled-students-modal-title"
                      className="text-[#1E2A35] text-lg font-semibold leading-tight"
                    >
                      Enrolled students
                    </h2>
                    <p className="text-[#8A7E6E] text-xs mt-1">
                      {classSchedulePanelEnrolledStudents.length} enrolled
                      {classSchedulePanelClass?.classLimit != null
                        ? ` · ${classSchedulePanelClass.classLimit} spot limit`
                        : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnrolledStudentsModalOpen(false)}
                    className="w-8 h-8 rounded-full border border-[#D4CDB5]/70 text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center shrink-0"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
                {classSchedulePanelEnrolledStudents.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p className="text-[#1E2A35] text-sm font-semibold">No students enrolled</p>
                    <p className="text-[#B0A898] text-xs mt-1">
                      Enrollments for this block will show up here.
                    </p>
                  </div>
                ) : (
                  <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#D4CDB5]/35">
                    {classSchedulePanelEnrolledStudents.map((student) => (
                      <li
                        key={student.accountId}
                        className="flex items-center gap-3 px-5 py-3 bg-white hover:bg-[#FBF9F3]/80 transition-colors"
                      >
                        <PortalPersonAvatar
                          name={student.name}
                          photo={studentPhotoByAccountId.get(student.accountId)}
                          size={40}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[#1E2A35] text-sm font-semibold truncate">{student.name}</p>
                          <p className="text-[#8A7E6E] text-[11px] truncate">{student.email}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}

      {isClassSchedule && classAssignSession && (
        <AdminClassModal
          mode="edit"
          assignSchedule
          assignScheduleIsUpdate={isAssignedScheduleBlock(classAssignSession.item.statusBlock)}
          initial={classAssignSession.draft}
          classItem={classAssignSession.item}
          disciplines={disciplines}
          coaches={coachOptions}
          students={studentOptions}
          onClose={closeClassAssignModal}
          onSave={handleClassAssignSave}
          onDelete={handleClassAssignDelete}
        />
      )}

      {showModal && (
        <>
          <div
            className={`fixed inset-y-0 left-0 z-[100] ${
              isScheduleSidePanelOpen ? 'right-0 sm:right-[var(--day-panel-width)]' : 'right-0'
            }`}
            style={
              {
                backgroundColor: 'rgba(30,42,53,0.55)',
                backdropFilter: 'blur(4px)',
                '--day-panel-width': scheduleSidePanelWidth,
              } as CSSProperties
            }
            role="presentation"
            onClick={closeScheduleBlockModal}
          />
          <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none ${
              isScheduleSidePanelOpen ? 'sm:pr-[var(--day-panel-width)]' : ''
            }`}
            style={{ '--day-panel-width': scheduleSidePanelWidth } as CSSProperties}
          >
          <div
            className="pointer-events-auto flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-block-modal-title"
          >
            <div
              className={`px-6 pt-6 pb-4 border-b flex items-start justify-between gap-3 shrink-0 ${
                isStaffTimeSlots && editingBlockPendingRequest
                  ? 'border-[#5A7A5A]/50'
                  : 'border-[#D4CDB5]/50 bg-white'
              }`}
              style={
                isStaffTimeSlots && editingBlockPendingRequest
                  ? { backgroundColor: STAFF_SLOT_REQUESTED_HEADER_BG }
                  : undefined
              }
            >
              <div className="min-w-0">
                {isStaffTimeSlots && editingBlockPendingRequest ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-white/35 bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                        Requested
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-white/75">
                        Pending admin review
                      </span>
                    </div>
                    <h2
                      id="schedule-block-modal-title"
                      className="text-white leading-none mt-2"
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '1.5rem',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Vacant slot
                    </h2>
                    <p className="text-white/85 text-xs mt-1.5 leading-relaxed">
                      You already requested this slot. Cancel below if your plans change.
                    </p>
                  </>
                ) : (
                  <>
                    <h2
                      id="schedule-block-modal-title"
              className="text-[#1E2A35] leading-none"
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '1.5rem',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {isStaffTimeSlots
                        ? 'Vacant slot'
                        : editingBlock
                          ? 'Edit Schedule Block'
                          : 'Add Schedule Block'}
                    </h2>
                    <p className="text-[#8A7E6E] text-xs mt-1.5">
                      {isStaffTimeSlots
                        ? 'Submit a request to teach this vacant slot. It stays open until admin approves.'
                        : editingBlock
                          ? `${editingBlock.uid ? `#${editingBlock.uid} · ` : ''}${formatDateLongFromKey(form.dateKey)}`
                          : 'Set date and time for a vacant calendar block'}
                    </p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={closeScheduleBlockModal}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                  isStaffTimeSlots && editingBlockPendingRequest
                    ? 'text-white/90 hover:bg-white/15'
                    : 'text-[#8A7E6E] hover:bg-[#EDE8D8]'
                }`}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {invalidBlockTimes && (
              <div className="mx-6 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 shrink-0">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-600 text-xs">End time must be after start time.</p>
              </div>
            )}
            {overlappingBlock && !invalidBlockTimes && (
              <div className="mx-6 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 shrink-0">
                <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-600 text-xs leading-relaxed">
                  {(() => {
                    const startLabel = formatMinutesOfDay(minutesFromIsoLocal(overlappingBlock.startsAt));
                    const endLabel = overlappingBlock.endsAt
                      ? formatMinutesOfDay(minutesFromIsoLocal(overlappingBlock.endsAt))
                      : formatMinutesOfDay(minutesFromIsoLocal(overlappingBlock.startsAt) + 60);
                    const idLabel = overlappingBlock.uid ? ` (#${overlappingBlock.uid})` : '';
                    return `This time overlaps an existing block${idLabel} (${startLabel}–${endLabel}). Choose a different time.`;
                  })()}
                </p>
            </div>
          )}

            <div
              className={`px-6 py-5 flex flex-col gap-4 overflow-visible ${
                isStaffTimeSlots ? 'pointer-events-none opacity-90' : ''
              }`}
            >
              <ClockDatePicker
                value={formDateKey}
                onChange={(dateKey) => setForm((f) => ({ ...f, dateKey }))}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ClockTimePicker
                  label="Start time"
                  value={form.startMinutes}
                  headerDateLabel={formatDateLongFromKey(form.dateKey)}
                  onChange={(startMinutes) => {
                    setForm((f) => ({
                      ...f,
                      startMinutes,
                      endMinutes:
                        f.endMinutes <= startMinutes
                          ? Math.min(CALENDAR_DAY_END_HOUR * 60 + 55, startMinutes + CLOCK_MINUTE_STEP)
                          : f.endMinutes,
                    }));
                  }}
                />
                <ClockTimePicker
                  label="End time"
                  value={form.endMinutes}
                  minMinutes={form.startMinutes + CLOCK_MINUTE_STEP}
                  headerDateLabel={formatDateLongFromKey(form.dateKey)}
                  onChange={(endMinutes) => setForm((f) => ({ ...f, endMinutes }))}
              />
            </div>
              {editingBlock && !isStaffTimeSlots && (
            <div>
                  <label
                    htmlFor="schedule-block-status"
                    className="mb-2 block text-[#8A7E6E] text-xs font-semibold uppercase tracking-wide"
                  >
                    Block status
                  </label>
                <div className="relative">
                  <select
                      id="schedule-block-status"
                      value={form.statusBlock}
                      onChange={(e) =>
                        setForm((f) => ({
                        ...f,
                          statusBlock: e.target.value as ClassBlockStatus,
                        }))
                      }
                    className={selectClass}
                  >
                      {CLASS_BLOCK_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {BLOCK_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898]"
                    />
                </div>
                  <p className="mt-2 text-[#9A8E7E] text-xs leading-relaxed">
                    Vacant blocks are open slots; active or assigned blocks show as scheduled classes on the calendar.
                  </p>
              </div>
              )}
              {!editingBlock && !isStaffTimeSlots && (
                <p className="text-[#9A8E7E] text-xs leading-relaxed">
                  New blocks are saved as <span className="font-semibold text-[#5A5048]">vacant</span> with{' '}
                  <span className="font-semibold text-[#5A5048]">pending</span> class status. Class limit stays unset until
                  you configure the class in Class Schedule.
                </p>
              )}
              {isStaffTimeSlots && editingBlock && (
                <div className="pointer-events-auto flex flex-col gap-2">
                  <p className="text-[#9A8E7E] text-xs leading-relaxed">
                    Status:{' '}
                    <span className="font-semibold text-[#5A5048]">
                      {editingBlockPendingRequest
                        ? 'Requested (pending)'
                        : BLOCK_STATUS_LABELS[form.statusBlock]}
                    </span>
                    {editingBlock.uid ? (
                      <>
                        {' '}
                        · UID <span className="font-semibold text-[#5A5048]">#{editingBlock.uid}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              )}
              </div>

            <div className="shrink-0 border-t border-[#D4CDB5]/50 bg-white px-6 py-4">
              <div className="flex flex-col gap-3">
                {editingBlock && !isStaffTimeSlots && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#D4CDB5]/35 pb-3">
                    {confirmDeleteId === editingBlock.id ? (
                      <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-start">
                        <span className="text-xs font-semibold text-red-700">Delete this block?</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-full border border-[#D4CDB5]/70 px-4 py-2 text-sm text-[#8A7E6E] transition-all hover:bg-[#EDE8D8]"
                          >
                            Keep
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(editingBlock.id)}
                            disabled={saving}
                            className="action-button flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-600 disabled:opacity-60"
                          >
                            <Trash2 size={14} />
                            Confirm delete
                          </button>
            </div>
                </div>
                    ) : (
                      <>
              <button
                type="button"
                          onClick={() => setConfirmDeleteId(editingBlock.id)}
                          className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                          Delete
              </button>
                        {!editingBlock.id.startsWith('req-') && (
                          <button
                            type="button"
                            onClick={handleAssignSchedule}
                            disabled={saving}
                            className={`action-button rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                              blockFormInvalid || saving
                                ? 'cursor-not-allowed border-[#D4CDB5]/60 text-[#B0A898]'
                                : 'border-[#c49a3c]/50 bg-[#F8F3E8] text-[#8A6520] hover:bg-[#c49a3c]/10'
                            }`}
                          >
                            Assign Schedule
                          </button>
                        )}
                      </>
                    )}
                    </div>
                )}

                {isStaffTimeSlots ? (
                  editingBlockPendingRequest && editingBlockPendingRequestId ? (
                    <PendingPortalRequestWithdrawActions
                      variant="panel"
                      confirmingWithdraw={confirmWithdrawBlockSlot}
                      withdrawing={withdrawingBlockSlot}
                      withdrawError={withdrawBlockSlotError}
                      onClose={closeScheduleBlockModal}
                      onStartWithdraw={() => {
                        setWithdrawBlockSlotError(null);
                        setConfirmWithdrawBlockSlot(true);
                      }}
                      onConfirmWithdraw={() => void handleWithdrawEditingBlockSlotRequest()}
                      onKeepRequest={() => {
                        setConfirmWithdrawBlockSlot(false);
                        setWithdrawBlockSlotError(null);
                      }}
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={closeScheduleBlockModal}
                        className="min-w-0 rounded-full border border-[#D4CDB5]/70 px-4 py-2.5 text-sm font-medium text-[#8A7E6E] transition-all hover:bg-[#EDE8D8] sm:min-w-[7.5rem]"
                      >
                        Close
                </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!editingBlock || !staffUser) return;
                          setSlotRequestContext({
                            classId: editingBlock.id,
                            dateKey: form.dateKey,
                            startMinutes: form.startMinutes,
                            endMinutes: form.endMinutes,
                            ...(editingBlock.capacity > 0
                              ? { defaultClassLimit: editingBlock.capacity }
                              : {}),
                          });
                          closeScheduleBlockModal();
                          setShowSlotRequestModal(true);
                        }}
                        disabled={!editingBlock || !staffUser?.accountId}
                        className="action-button min-w-0 rounded-full bg-[#1E2A35] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#263545] active:scale-[0.97] disabled:opacity-50 sm:min-w-[9.5rem]"
                      >
                        Request
                      </button>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={closeScheduleBlockModal}
                      className="min-w-0 rounded-full border border-[#D4CDB5]/70 px-4 py-2.5 text-sm font-medium text-[#8A7E6E] transition-all hover:bg-[#EDE8D8] sm:min-w-[7.5rem]"
                    >
                      Cancel
                </button>
            <button
              type="button"
              onClick={() => void handleSave()}
                      disabled={blockFormInvalid || saving}
                      className={`action-button min-w-0 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.97] sm:min-w-[9.5rem] ${
                        blockFormInvalid || saving
                          ? 'cursor-not-allowed bg-[#8A7E6E]'
                          : 'bg-[#1E2A35] hover:bg-[#263545]'
                      }`}
                    >
                      {saving ? 'Saving…' : editingBlock ? 'Save Changes' : 'Add Block'}
            </button>
          </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </>
      )}

      {isStaffTimeSlots && staffUser && (
        <StaffSlotRequestModal
          open={showSlotRequestModal}
          context={slotRequestContext}
          staffAccountId={staffUser.accountId}
          staffDisplayName={staffUser.name}
          alreadyRequested={slotRequestModalAlreadyRequested}
          pendingSlotRequestId={slotRequestPendingRequestId}
          onClose={() => {
            setShowSlotRequestModal(false);
            setSlotRequestContext(null);
          }}
          onSubmitted={() => {
            void loadMySlotRequests();
          }}
          onWithdrawn={() => {
            void loadMySlotRequests();
          }}
        />
      )}

      {isStaffSchedulePortal && staffUser && (
        <StaffCancellationRequestModal
          open={showCancellationRequestModal}
          context={cancellationRequestContext}
          pendingRequestId={panelPendingCancellationRequest?.id ?? null}
          pendingStatus={panelPendingCancellationRequest?.status ?? null}
          onClose={() => {
            setShowCancellationRequestModal(false);
            setCancellationRequestContext(null);
          }}
          onSubmitted={() => {
            void loadMySlotRequests();
          }}
          onWithdrawn={() => {
            void loadMySlotRequests();
          }}
        />
      )}
    </>
  );
}