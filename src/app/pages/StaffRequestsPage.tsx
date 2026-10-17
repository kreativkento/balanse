import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { AlertCircle, Check, Clock, Loader2, X } from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';
import {
  AdminTablePagination,
  useFitPageSize,
} from '../components/layout/AdminTablePagination';
import { fetchClassesForStaffSchedule, type ClassDisplay } from '../../lib/class-service';
import { fetchDisciplinesForPublic } from '../../lib/discipline-service';
import { PendingPortalRequestWithdrawActions } from '../components/portal/PendingPortalRequestWithdrawActions';
import { toastDeleted, toastOperationFailed } from '../../lib/operation-toast';
import {
  fetchMyPortalRequests,
  PORTAL_REQUESTS_CHANGED,
  withdrawPortalRequest,
  portalRequestStatusBadgeClass,
  type PortalRequestRow,
  type PortalRequestStatus,
} from '../../lib/portal-request-service';

type ReqStatus = PortalRequestStatus;
type StatusFilter = 'all' | ReqStatus;
type RequestTab = 'requests' | 'cancellations';

const CLASS_COLORS: Record<string, string> = {
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

interface SlotRequestRow {
  id: string;
  className: string;
  discipline: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  durationLabel: string;
  classLimit: number;
  submittedAt: string;
  status: ReqStatus;
}

function formatDurationFromRange(startsAt: string, endsAt: string | null): {
  minutes: number | null;
  label: string;
} {
  if (!startsAt || !endsAt) return { minutes: null, label: '—' };
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return { minutes: null, label: '—' };
  }
  const minutes = Math.round((endMs - startMs) / 60_000);
  if (minutes < 60) return { minutes, label: `${minutes} min` };
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return { minutes, label: `${hrs} hr${hrs === 1 ? '' : 's'}` };
  return { minutes, label: `${hrs} hr ${mins} min` };
}

const STAFF_SLOT_REQUESTED_HEADER_BG = '#6B8E6B';

interface CancelRequestRow {
  id: string;
  className: string;
  date: string;
  time: string;
  enrolled: number;
  requestedAt: string;
  hoursUntilClass: number;
  status: ReqStatus;
}

function mapSlotRequest(
  req: PortalRequestRow,
  classRow: ClassDisplay | undefined,
  disciplineName: string,
): SlotRequestRow {
  const payload = req.payload as {
    name?: string;
    class_limit?: number;
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
  const { minutes: durationMinutes, label: durationLabel } = formatDurationFromRange(
    startsAt,
    endsAt,
  );

  return {
    id: req.id,
    className: payload.name?.trim() || classRow?.name || '—',
    discipline: disciplineName || classRow?.disciplineName || '—',
    date: dateStr,
    startTime,
    endTime,
    durationMinutes,
    durationLabel,
    classLimit: payload.class_limit ?? classRow?.classLimit ?? 12,
    submittedAt: formatRelativeSubmitted(req.created_at),
    status: req.status,
  };
}

function mapCancelRequest(
  req: PortalRequestRow,
  classRow: ClassDisplay | undefined,
): CancelRequestRow {
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

  return {
    id: req.id,
    className: classRow?.name || classRow?.disciplineName || 'Class',
    date: dateStr,
    time: timeStr,
    enrolled: classRow?.enrolledCount ?? 0,
    requestedAt: formatRelativeSubmitted(req.created_at),
    hoursUntilClass: hoursUntil,
    status: req.status,
  };
}

function StatusBadge({ s }: { s: ReqStatus }) {
  return (
    <span
      className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit capitalize ${portalRequestStatusBadgeClass(s)}`}
    >
      {s}
            </span>
  );
}

export default function StaffRequestsPage() {
  const { staffUser } = useStaffAuth();
  const accountId = staffUser?.accountId ?? '';

  const [tab, setTab] = useState<RequestTab>('requests');
  const [reqStatusFilter, setReqStatusFilter] = useState<StatusFilter>('all');
  const [cancelStatusFilter, setCancelStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [portalRequests, setPortalRequests] = useState<PortalRequestRow[]>([]);
  const [classesById, setClassesById] = useState<Map<string, ClassDisplay>>(new Map());
  const [disciplinesById, setDisciplinesById] = useState<Map<string, string>>(new Map());
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedCancelId, setSelectedCancelId] = useState<string | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!accountId) {
      setPortalRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const [requestsResult, classesResult, disciplinesResult] = await Promise.all([
      fetchMyPortalRequests(),
      fetchClassesForStaffSchedule(),
      fetchDisciplinesForPublic(),
    ]);
    if (requestsResult.error) {
      setLoadError(requestsResult.error);
    }
    const mine = requestsResult.requests.filter((r) => r.requester_account_id === accountId);
    setPortalRequests(mine);
    if (classesResult.error) {
      setLoadError((prev) => prev ?? classesResult.error);
    }
    setClassesById(new Map((classesResult.data ?? []).map((row) => [row.id, row])));
    if (disciplinesResult.error) {
      setLoadError((prev) => prev ?? disciplinesResult.error);
    }
    setDisciplinesById(new Map((disciplinesResult.data ?? []).map((d) => [d.id, d.name])));
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

  const requestsById = useMemo(
    () => new Map(portalRequests.map((r) => [r.id, r])),
    [portalRequests],
  );

  const scheduleReqs = useMemo(() => {
    return portalRequests
      .filter((r) => r.request_type === 'slot_request')
      .map((req) => {
        const classRow = req.target_class_id ? classesById.get(req.target_class_id) : undefined;
        const payload = req.payload as { discipline_id?: string };
        const disciplineName = payload.discipline_id
          ? (disciplinesById.get(payload.discipline_id) ?? '—')
          : (classRow?.disciplineName ?? '—');
        return mapSlotRequest(req, classRow, disciplineName);
      });
  }, [portalRequests, classesById, disciplinesById]);

  const cancelReqs = useMemo(() => {
    return portalRequests
      .filter((r) => r.request_type === 'cancellation_request')
      .map((req) => {
        const classRow = req.target_class_id ? classesById.get(req.target_class_id) : undefined;
        return mapCancelRequest(req, classRow);
      });
  }, [portalRequests, classesById]);

  const pendingB = scheduleReqs.filter((r) => r.status === 'pending').length;
  const pendingC = cancelReqs.filter((r) => r.status === 'pending').length;
  const approvedB = scheduleReqs.filter((r) => r.status === 'approved').length;
  const rejectedB = scheduleReqs.filter((r) => r.status === 'rejected').length;
  const cancelledB = scheduleReqs.filter((r) => r.status === 'cancelled').length;
  const approvedC = cancelReqs.filter((r) => r.status === 'approved').length;
  const rejectedC = cancelReqs.filter((r) => r.status === 'rejected').length;
  const cancelledC = cancelReqs.filter((r) => r.status === 'cancelled').length;

  const filteredScheduleReqs =
    reqStatusFilter === 'all'
      ? scheduleReqs
      : scheduleReqs.filter((r) => r.status === reqStatusFilter);
  const filteredCancelReqs =
    cancelStatusFilter === 'all'
      ? cancelReqs
      : cancelReqs.filter((r) => r.status === cancelStatusFilter);

  const [tablePage, setTablePage] = useState(1);
  const { containerRef: tableContainerRef, pageSize: tablePageSize } = useFitPageSize({
    layout: 'table',
    fallback: 8,
  });

  useEffect(() => {
    setTablePage(1);
  }, [tab, reqStatusFilter, cancelStatusFilter]);

  const activeFiltered = tab === 'requests' ? filteredScheduleReqs : filteredCancelReqs;
  const totalPages = Math.max(1, Math.ceil(activeFiltered.length / tablePageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const rangeStart = activeFiltered.length === 0 ? 0 : (currentPage - 1) * tablePageSize + 1;
  const rangeEnd = Math.min(currentPage * tablePageSize, activeFiltered.length);

  const pagedScheduleReqs = useMemo(() => {
    const start = (currentPage - 1) * tablePageSize;
    return filteredScheduleReqs.slice(start, start + tablePageSize);
  }, [filteredScheduleReqs, currentPage, tablePageSize]);

  const pagedCancelReqs = useMemo(() => {
    const start = (currentPage - 1) * tablePageSize;
    return filteredCancelReqs.slice(start, start + tablePageSize);
  }, [filteredCancelReqs, currentPage, tablePageSize]);

  const selectedSlot = scheduleReqs.find((r) => r.id === selectedSlotId) ?? null;
  const selectedCancel = cancelReqs.find((r) => r.id === selectedCancelId) ?? null;
  const selectedSlotRaw = selectedSlotId ? requestsById.get(selectedSlotId) : undefined;
  const selectedCancelRaw = selectedCancelId ? requestsById.get(selectedCancelId) : undefined;

  const closeModal = useCallback(() => {
    setSelectedSlotId(null);
    setSelectedCancelId(null);
    setConfirmWithdrawId(null);
    setWithdrawError(null);
    setWithdrawing(false);
  }, []);

  const openRequestId = selectedSlotId ?? selectedCancelId;

  const handleWithdraw = useCallback(async () => {
    if (!openRequestId) return;
    setWithdrawing(true);
    setWithdrawError(null);
    const { error } = await withdrawPortalRequest(openRequestId);
    setWithdrawing(false);
    if (error) {
      setWithdrawError(error);
      toastOperationFailed(error);
      return;
    }
    toastDeleted('Request');
    closeModal();
    void loadData();
  }, [openRequestId, closeModal, loadData]);

  useEffect(() => {
    if (!selectedSlotId && !selectedCancelId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSlotId, selectedCancelId, closeModal]);

  useEffect(() => {
    setConfirmWithdrawId(null);
    setWithdrawError(null);
  }, [selectedSlotId, selectedCancelId]);

  return (
    <>
      <div className="h-full min-h-0 overflow-hidden flex flex-col">
        <div className="max-w-7xl mx-auto px-6 w-full flex-1 min-h-0 flex flex-col py-8">
          <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm mb-6 w-fit shrink-0">
            {(
              [
                ['requests', 'Slot Requests', pendingB] as const,
                ['cancellations', 'Cancellation Requests', pendingC] as const,
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  tab === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                }`}
              >
                {label}
                {count > 0 && <span className={pendingActionCountBadgeClass()}>{count}</span>}
              </button>
            ))}
            </div>

          {loadError && (
            <p className="text-red-600 text-sm mb-4 shrink-0" role="alert">
              {loadError}
            </p>
          )}

          {tab === 'requests' && (
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col relative">
              {loading && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]"
                  role="status"
                  aria-label="Loading requests"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-[#c49a3c]" aria-hidden />
          </div>
              )}
              <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#F8F3E8]/60 shrink-0">
                <div>
                  <h2
                    className="text-[#1E2A35]"
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '1.15rem',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Slot Requests
                  </h2>
                  <p className="text-[#8A7E6E] text-xs mt-0.5">
                    Your class schedule slot requests · click a row for details
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-white border border-[#D4CDB5]/60 rounded-xl p-1 w-fit">
                  {(
                    [
                      ['all', 'All', scheduleReqs.length],
                      ['pending', 'Pending', pendingB],
                      ['approved', 'Approved', approvedB],
                      ['rejected', 'Rejected', rejectedB],
                      ['cancelled', 'Cancelled', cancelledB],
                    ] as const
                  ).map(([id, label, count]) => (
            <button
              key={id}
                      type="button"
                      onClick={() => setReqStatusFilter(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        reqStatusFilter === id
                          ? 'bg-[#1E2A35] text-white shadow-sm'
                          : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                      }`}
            >
              {label}
                      <span
                        className={requestStatusFilterCountBadgeClass(
                          id,
                          count,
                          reqStatusFilter === id,
                        )}
                      >
                        {count}
                      </span>
            </button>
          ))}
        </div>
            </div>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40 shrink-0">
                {['Class Name', 'Discipline', 'Start Time', 'End Time', 'Class Limit', 'Status'].map(
                  (h) => (
                    <p
                      key={h}
                      className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium"
                    >
                      {h}
                    </p>
                  ),
                )}
                </div>
              {filteredScheduleReqs.length === 0 ? (
                <div ref={tableContainerRef} className="flex-1 min-h-0 px-6 py-14 text-center">
                  <p className="text-[#1E2A35] text-sm font-semibold">
                    No {reqStatusFilter === 'all' ? '' : `${reqStatusFilter} `}slot requests
                  </p>
                  <p className="text-[#B0A898] text-xs mt-1">
                    {scheduleReqs.length === 0 ? (
                      <>
                        Request a vacant slot from{' '}
                        <Link to="/staff-class-schedule" className="text-[#a67f2e] underline">
                          Class Schedule
                        </Link>
                        .
                      </>
                    ) : (
                      'Switch filters to see other requests.'
                    )}
                  </p>
                </div>
              ) : (
                <div
                  ref={tableContainerRef}
                  className="flex-1 min-h-0 divide-y divide-[#D4CDB5]/30 overflow-hidden"
                >
                  {pagedScheduleReqs.map((req) => (
                      <button
                      type="button"
                      key={req.id}
                      onClick={() => setSelectedSlotId(req.id)}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px] w-full text-left cursor-pointer bg-transparent border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-semibold truncate">
                          {req.className}
                        </p>
                        <p className="text-[#B0A898] text-xs truncate">Submitted {req.submittedAt}</p>
                        </div>
                      <div className="min-w-0 flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: CLASS_COLORS[req.discipline] || '#c49a3c',
                          }}
                        />
                        <p className="text-[#1E2A35] text-sm truncate">{req.discipline}</p>
                        </div>
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-medium truncate">
                          {req.startTime}
                        </p>
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
                  page={currentPage}
                  totalPages={totalPages}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  total={filteredScheduleReqs.length}
                  noun="requests"
                  onPageChange={setTablePage}
                />
              </div>
          </div>
        )}

          {tab === 'cancellations' && (
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col relative">
              {loading && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]"
                  role="status"
                  aria-label="Loading requests"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-[#c49a3c]" aria-hidden />
                        </div>
              )}
              <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#F8F3E8]/60 shrink-0">
                <div>
                  <h2
                    className="text-[#1E2A35]"
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '1.15rem',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Cancellation Requests
                  </h2>
                  <p className="text-[#8A7E6E] text-xs mt-0.5">
                    Your requests to cancel scheduled classes · click a row for details
                  </p>
                      </div>
                <div className="flex items-center gap-1 bg-white border border-[#D4CDB5]/60 rounded-xl p-1 w-fit">
                  {(
                    [
                      ['all', 'All', cancelReqs.length],
                      ['pending', 'Pending', pendingC],
                      ['approved', 'Approved', approvedC],
                      ['rejected', 'Rejected', rejectedC],
                      ['cancelled', 'Cancelled', cancelledC],
                    ] as const
                  ).map(([id, label, count]) => (
                      <button
                      key={id}
                      type="button"
                      onClick={() => setCancelStatusFilter(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        cancelStatusFilter === id
                          ? 'bg-[#1E2A35] text-white shadow-sm'
                          : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                      }`}
                    >
                      {label}
                      <span
                        className={requestStatusFilterCountBadgeClass(
                          id,
                          count,
                          cancelStatusFilter === id,
                        )}
                      >
                        {count}
                      </span>
                        </button>
                  ))}
                    </div>
                  </div>
              <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40 shrink-0">
                {['Class / Date', 'Notice', 'Status'].map((h) => (
                  <p
                    key={h}
                    className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium"
                  >
                    {h}
                  </p>
                ))}
                </div>
              {filteredCancelReqs.length === 0 ? (
                <div ref={tableContainerRef} className="flex-1 min-h-0 px-6 py-14 text-center">
                  <p className="text-[#1E2A35] text-sm font-semibold">
                    No {cancelStatusFilter === 'all' ? '' : `${cancelStatusFilter} `}cancellation
                    requests
                  </p>
                  <p className="text-[#B0A898] text-xs mt-1">
                    {cancelReqs.length === 0
                      ? 'Cancellation requests you submit will appear here.'
                      : 'Switch filters to see other requests.'}
                  </p>
                </div>
              ) : (
                <div
                  ref={tableContainerRef}
                  className="flex-1 min-h-0 divide-y divide-[#D4CDB5]/30 overflow-hidden"
                >
                  {pagedCancelReqs.map((req) => (
                    <button
                      type="button"
                      key={req.id}
                      onClick={() => setSelectedCancelId(req.id)}
                      className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px] w-full text-left cursor-pointer bg-transparent border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-medium truncate">
                          {req.className}
                        </p>
                        <p className="text-[#9A8E7E] text-xs truncate">
                          {req.date} · {req.time} · {req.enrolled} enrolled · Submitted{' '}
                          {req.requestedAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Clock size={12} className="text-[#9A8E7E] shrink-0" />
                        <span className="text-[#5A5048] text-sm truncate">
                          {req.hoursUntilClass} hrs before class
                        </span>
                    </div>
                      <StatusBadge s={req.status} />
                    </button>
                  ))}
              </div>
            )}
              <div className="px-6 pb-4 shrink-0">
                <AdminTablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  total={filteredCancelReqs.length}
                  noun="requests"
                  onPageChange={setTablePage}
                />
              </div>
          </div>
        )}
                </div>
                </div>

      {selectedSlot &&
        createPortal(
          <div
            className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
            style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            {(() => {
              const disciplineAccent =
                CLASS_COLORS[selectedSlot.discipline] || '#c49a3c';
              const headerPending = selectedSlot.status === 'pending';
              const headerApproved = selectedSlot.status === 'approved';
              const headerRejected = selectedSlot.status === 'rejected';
              const headerCancelled = selectedSlot.status === 'cancelled';
              const headerOnDark = headerPending;

                    return (
            <div
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-[min(100%,40rem)] sm:max-w-[36rem] min-h-[min(72dvh,28rem)] max-h-[min(88dvh,46rem)] my-auto overflow-hidden flex flex-col shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`relative px-5 sm:px-6 pt-5 pb-3.5 border-b shrink-0 ${
                  headerPending
                    ? 'border-[#5A7A5A]/45'
                    : headerApproved
                      ? 'border-green-200/80 bg-green-50/90'
                      : headerRejected
                        ? 'border-red-200/80 bg-red-50/70'
                        : headerCancelled
                          ? 'border-[#D4CDB5]/60 bg-[#F8F3E8]'
                          : 'border-[#D4CDB5]/50 bg-white'
                }`}
                style={
                  headerPending
                    ? { backgroundColor: STAFF_SLOT_REQUESTED_HEADER_BG }
                    : undefined
                }
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: disciplineAccent }}
                  aria-hidden
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <p
                        className={`text-[10px] uppercase tracking-widest font-semibold ${
                          headerOnDark ? 'text-white/75' : 'text-[#9A8E7E]'
                        }`}
                      >
                        Slot request
                      </p>
                      {headerPending && (
                        <span className="inline-flex items-center rounded-full border border-white/35 bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Requested
                        </span>
                      )}
                </div>
                    <h3
                      className={`leading-tight break-words ${
                        headerOnDark ? 'text-white' : 'text-[#1E2A35]'
                      }`}
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '1.5rem',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {selectedSlot.className}
                    </h3>
                    <p
                      className={`text-xs mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${
                        headerOnDark ? 'text-white/85' : 'text-[#8A7E6E]'
                      }`}
                    >
                      <span
                        className="inline-flex items-center gap-1.5 font-medium"
                        style={headerOnDark ? undefined : { color: disciplineAccent }}
                      >
                        <span
                          className="h-2 w-2 rounded-full ring-1 ring-black/10 shrink-0"
                          style={{ backgroundColor: disciplineAccent }}
                          aria-hidden
                        />
                        {selectedSlot.discipline}
                      </span>
                      <span className={headerOnDark ? 'text-white/50' : 'text-[#C0B8A8]'}>
                        ·
                      </span>
                      <span>Submitted {selectedSlot.submittedAt}</span>
                    </p>
                </div>
                  <div className="flex items-start gap-2 shrink-0">
                    <StatusBadge s={selectedSlot.status} />
                    <button
                      type="button"
                      onClick={closeModal}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        headerOnDark
                          ? 'text-white/90 hover:bg-white/15'
                          : 'text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8]'
                      }`}
                      aria-label="Close"
                    >
                      <X size={16} />
                        </button>
                      </div>
                  </div>
                </div>

              <div className="px-5 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {selectedSlot.status === 'approved' && (
                  <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                    <Check size={15} className="text-green-600 shrink-0 mt-0.5" />
                    <p className="text-green-700 text-xs leading-relaxed">
                      Approved — this class should appear on the schedule once processing finishes.
                    </p>
                </div>
              )}
                {selectedSlot.status === 'rejected' && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                    <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-red-700 text-xs leading-relaxed">
                      Not approved.
                      {selectedSlotRaw?.review_note?.trim()
                        ? ` ${selectedSlotRaw.review_note.trim()}`
                        : ' Contact admin if you have questions.'}
                    </p>
                      </div>
                    )}
                {selectedSlot.status === 'pending' && (
                  <div className="flex items-start gap-2 bg-[#6B8E6B]/10 border border-[#6B8E6B]/25 rounded-xl px-3 py-2">
                    <Clock size={14} className="text-[#4A6B4A] shrink-0 mt-0.5" />
                    <p className="text-[#3D523D] text-xs leading-snug">
                      Waiting for admin review. Cancel below if your plans change.
                    </p>
                </div>
              )}
                {selectedSlot.status === 'cancelled' && (
                  <div className="flex items-start gap-2 bg-[#F8F3E8] border border-[#D4CDB5]/70 rounded-2xl px-4 py-3">
                    <X size={15} className="text-[#8A7E6E] shrink-0 mt-0.5" />
                    <p className="text-[#5A5048] text-xs leading-relaxed">
                      You withdrew this request. It remains in your history as cancelled.
                    </p>
          </div>
        )}

                <div className="flex flex-col gap-4 min-w-0 flex-1">
                  <div className="rounded-xl border border-[#D4CDB5]/55 bg-[#FAF7F0] overflow-hidden min-w-0">
                    <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#9A8E7E]">
                      Schedule
                    </p>
                    <div className="px-4 pb-4 pt-1 grid grid-cols-3 gap-2 sm:gap-3 min-w-0">
                      {(
                        [
                          ['Date', selectedSlot.date],
                          [
                            'Time',
                            selectedSlot.endTime !== '—'
                              ? `${selectedSlot.startTime} – ${selectedSlot.endTime}`
                              : selectedSlot.startTime,
                          ],
                          ['Duration', selectedSlot.durationLabel],
                        ] as const
                      ).map(([label, value]) => (
                        <div
                          key={label}
                          className="min-w-0 rounded-lg bg-white border border-[#D4CDB5]/45 px-2.5 py-3 sm:px-3"
                        >
                          <p className="text-[10px] uppercase tracking-widest text-[#9A8E7E] mb-1 truncate">
                            {label}
                          </p>
                          <p className="text-[#1E2A35] text-xs sm:text-sm font-semibold leading-snug break-words tabular-nums">
                            {value}
                          </p>
                </div>
                  ))}
                </div>
                </div>

                  <div className="rounded-xl border border-[#D4CDB5]/55 overflow-hidden bg-white min-w-0">
                    <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#9A8E7E] bg-[#F8F3E8]/50">
                      Class details
                    </p>
                    <div className="px-4 pb-4 pt-1 grid grid-cols-3 gap-2 sm:gap-3">
                      {(
                        [
                          ['Class name', selectedSlot.className],
                          ['Discipline', selectedSlot.discipline],
                          ['Limit', `${selectedSlot.classLimit} spots`],
                        ] as const
                      ).map(([label, value]) => (
                        <div
                          key={label}
                          className="min-w-0 rounded-lg border border-[#D4CDB5]/35 bg-[#FAF7F0]/50 px-2.5 py-3 sm:px-3"
                        >
                          <p className="text-[10px] uppercase tracking-widest text-[#9A8E7E] mb-1 truncate">
                            {label}
                          </p>
                          <p className="text-[#1E2A35] text-xs sm:text-sm font-semibold leading-snug break-words">
                            {value}
                          </p>
                </div>
                      ))}
              </div>
            </div>
                </div>

                {selectedSlotRaw?.requester_note?.trim() && (
                  <div className="rounded-xl border border-[#D4CDB5]/50 px-3 py-2.5 bg-[#F8F3E8]/40 min-w-0">
                    <p className="text-[#9A8E7E] text-[10px] uppercase tracking-widest font-semibold mb-0.5">
                      Your note
                    </p>
                    <p className="text-[#1E2A35] text-xs sm:text-sm leading-snug break-words">
                      {selectedSlotRaw.requester_note.trim()}
                    </p>
                        </div>
                      )}
                    </div>

              <div className="shrink-0 border-t border-[#D4CDB5]/50 bg-[#FAF7F0]/80 px-5 sm:px-6 py-3.5 sm:py-4">
              {selectedSlot.status === 'pending' ? (
                  <PendingPortalRequestWithdrawActions
                    confirmingWithdraw={confirmWithdrawId === selectedSlot.id}
                    withdrawing={withdrawing}
                    withdrawError={withdrawError}
                    onClose={closeModal}
                    onStartWithdraw={() => {
                      setWithdrawError(null);
                      setConfirmWithdrawId(selectedSlot.id);
                    }}
                    onConfirmWithdraw={() => void handleWithdraw()}
                    onKeepRequest={() => {
                      setConfirmWithdrawId(null);
                      setWithdrawError(null);
                    }}
                  />
              ) : (
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full py-3 rounded-2xl bg-[#1E2A35] text-white text-sm font-semibold hover:bg-[#2A3A48] transition-colors"
                  >
                    Close
                    </button>
              )}
                  </div>
                </div>
              );
            })()}
          </div>,
          document.body,
        )}

      {selectedCancel &&
        createPortal(
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-[460px] max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-start justify-between gap-3">
                  <div>
                  <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">
                    Cancellation request
                  </p>
                  <h3
                    className="text-[#1E2A35] leading-tight"
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '1.5rem',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {selectedCancel.className}
                  </h3>
                  </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0"
                  aria-label="Close"
                >
                  <X size={16} />
                          </button>
                    </div>

              <div className="px-7 py-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-[#8A7E6E] text-xs">
                    Submitted {selectedCancel.requestedAt}
                  </p>
                  <StatusBadge s={selectedCancel.status} />
                  </div>

                {selectedCancel.status === 'approved' && (
                  <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                    <Check size={15} className="text-green-600 shrink-0 mt-0.5" />
                    <p className="text-green-700 text-xs leading-relaxed">
                      This cancellation was approved. The class will be removed from the schedule.
                    </p>
                        </div>
                )}
                {selectedCancel.status === 'rejected' && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                    <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-red-700 text-xs leading-relaxed">
                      This cancellation was not approved.
                      {selectedCancelRaw?.review_note?.trim()
                        ? ` Note: ${selectedCancelRaw.review_note.trim()}`
                        : ' The class remains scheduled.'}
                    </p>
                      </div>
                )}
                {selectedCancel.status === 'pending' && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <Clock size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-amber-700 text-xs leading-relaxed">
                      Waiting for admin review. You can cancel this request below if you no longer
                      need it.
                    </p>
                        </div>
                )}
                {selectedCancel.status === 'cancelled' && (
                  <div className="flex items-start gap-2 bg-[#F8F3E8] border border-[#D4CDB5]/70 rounded-2xl px-4 py-3">
                    <X size={15} className="text-[#8A7E6E] shrink-0 mt-0.5" />
                    <p className="text-[#5A5048] text-xs leading-relaxed">
                      You cancelled this cancellation request before admin review.
                    </p>
                      </div>
                )}

                <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 overflow-hidden">
                  <div
                    className="h-1.5"
                    style={{
                      backgroundColor: CLASS_COLORS[selectedCancel.className] || '#c49a3c',
                    }}
                  />
                  <div className="p-4 flex flex-col gap-3">
                    {(
                      [
                        ['Class', selectedCancel.className],
                        ['Date', selectedCancel.date],
                        ['Time', selectedCancel.time],
                        ['Enrolled', `${selectedCancel.enrolled} students`],
                        ['Notice', `${selectedCancel.hoursUntilClass} hrs before class`],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3">
                        <span className="text-[#9A8E7E] text-xs uppercase tracking-widest">
                          {label}
                        </span>
                        <span className="text-[#1E2A35] text-sm font-semibold text-right">
                          {value}
                        </span>
                      </div>
                    ))}
                        </div>
                      </div>

                {selectedCancelRaw?.requester_note?.trim() && (
                  <div className="rounded-2xl border border-[#D4CDB5]/50 px-4 py-3 bg-white">
                    <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-1">
                      Your note
                    </p>
                    <p className="text-[#1E2A35] text-sm">
                      {selectedCancelRaw.requester_note.trim()}
                    </p>
                    </div>
                )}
                  </div>

              {selectedCancel.status === 'pending' ? (
                <div className="px-7 pb-7">
                  <PendingPortalRequestWithdrawActions
                    confirmingWithdraw={confirmWithdrawId === selectedCancel.id}
                    withdrawing={withdrawing}
                    withdrawError={withdrawError}
                    onClose={closeModal}
                    onStartWithdraw={() => {
                      setWithdrawError(null);
                      setConfirmWithdrawId(selectedCancel.id);
                    }}
                    onConfirmWithdraw={() => void handleWithdraw()}
                    onKeepRequest={() => {
                      setConfirmWithdrawId(null);
                      setWithdrawError(null);
                    }}
                  />
                  </div>
              ) : (
                <div className="px-7 pb-7">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full py-3 rounded-2xl bg-[#1E2A35] text-white text-sm font-semibold hover:bg-[#2A3A48] transition-colors"
                  >
                    Close
                    </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
