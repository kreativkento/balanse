import { supabase } from './supabase';

export type PortalRequestType = 'slot_request' | 'cancellation_request';
export type PortalRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const PORTAL_REQUEST_STATUSES: PortalRequestStatus[] = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
];

export function portalRequestStatusBadgeClass(status: PortalRequestStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'approved':
      return 'bg-green-50 text-green-700 border border-green-200';
    case 'cancelled':
      return 'bg-[#EDE8D8] text-[#5A5048] border border-[#D4CDB5]/80';
    default:
      return 'bg-red-50 text-red-600 border border-red-200';
  }
}

export interface SlotRequestPayload {
  name: string;
  description: string;
  discipline_id: string;
  class_limit: number;
  coach_account_ids: string[];
}

export interface CancellationRequestPayload {
  reason?: string;
}

export interface PortalRequestRow {
  id: string;
  request_type: PortalRequestType;
  status: PortalRequestStatus;
  requester_account_id: string;
  target_class_id: string | null;
  result_class_id: string | null;
  payload: SlotRequestPayload | CancellationRequestPayload | Record<string, unknown>;
  requester_note: string;
  review_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalRequestDisplay extends PortalRequestRow {
  requesterName: string;
  requesterEmail: string;
  targetClassName?: string;
  targetStartsAt?: string;
  targetEndsAt?: string;
  disciplineName?: string;
  enrolledCount?: number;
}

type PortalRequestDbRow = {
  id: string;
  request_type: PortalRequestType;
  status: PortalRequestStatus;
  requester_account_id: string;
  target_class_id: string | null;
  result_class_id: string | null;
  payload: unknown;
  requester_note: string;
  review_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToPortalRequest(row: PortalRequestDbRow): PortalRequestRow {
  return {
    id: row.id,
    request_type: row.request_type,
    status: row.status,
    requester_account_id: row.requester_account_id,
    target_class_id: row.target_class_id,
    result_class_id: row.result_class_id,
    payload: (row.payload ?? {}) as PortalRequestRow['payload'],
    requester_note: row.requester_note ?? '',
    review_note: row.review_note ?? '',
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchPortalRequests(): Promise<{
  requests: PortalRequestRow[];
  error?: string;
}> {
  const { data, error } = await supabase
    .from('portal_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchPortalRequests:', error.message);
    return { requests: [], error: error.message };
  }

  return { requests: (data ?? []).map((r) => rowToPortalRequest(r as PortalRequestDbRow)) };
}

/** Fired after admin/staff portal request lists change (e.g. review or reload). */
export const PORTAL_REQUESTS_CHANGED = 'balanse:portal-requests-changed';

export function notifyPortalRequestsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PORTAL_REQUESTS_CHANGED));
  }
}

export async function fetchPendingPortalRequestCount(): Promise<number> {
  const { count, error } = await supabase
    .from('portal_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    console.error('fetchPendingPortalRequestCount:', error.message);
    return 0;
  }

  return count ?? 0;
}

/** Vacant blocks the signed-in staff member has a pending slot request for. */
/** Class/event ids with any pending slot or cancellation portal request. */
export function classIdsWithPendingPortalRequests(
  requests: PortalRequestRow[],
): Set<string> {
  const ids = new Set<string>();
  for (const row of requests) {
    if (row.status !== 'pending' || !row.target_class_id) continue;
    ids.add(row.target_class_id);
  }
  return ids;
}

export function myPendingSlotRequestClassIds(
  requests: PortalRequestRow[],
  accountId: string,
): Set<string> {
  const ids = new Set<string>();
  if (!accountId) return ids;
  for (const row of requests) {
    if (
      row.request_type === 'slot_request'
      && row.status === 'pending'
      && row.requester_account_id === accountId
      && row.target_class_id
    ) {
      ids.add(row.target_class_id);
    }
  }
  return ids;
}

/** Pending slot request id for a class block, if the coach submitted one. */
export function myPendingSlotRequestIdForClass(
  requests: PortalRequestRow[],
  accountId: string,
  classId: string,
): string | null {
  if (!accountId || !classId) return null;
  for (const row of requests) {
    if (
      row.request_type === 'slot_request'
      && row.status === 'pending'
      && row.requester_account_id === accountId
      && row.target_class_id === classId
    ) {
      return row.id;
    }
  }
  return null;
}

export async function fetchMyPortalRequests(): Promise<{
  requests: PortalRequestRow[];
  error?: string;
}> {
  const { data, error } = await supabase
    .from('portal_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchMyPortalRequests:', error.message);
    return { requests: [], error: error.message };
  }

  return { requests: (data ?? []).map((r) => rowToPortalRequest(r as PortalRequestDbRow)) };
}

export async function submitSlotRequest(input: {
  targetClassId: string;
  name: string;
  description: string;
  disciplineId: string;
  classLimit: number;
  coachAccountIds: string[];
  note?: string;
}): Promise<{ request?: PortalRequestRow; error?: string }> {
  const payload: SlotRequestPayload = {
    name: input.name.trim(),
    description: input.description.trim(),
    discipline_id: input.disciplineId,
    class_limit: input.classLimit,
    coach_account_ids: input.coachAccountIds,
  };

  const { data, error } = await supabase.rpc('submit_portal_request', {
    p_request_type: 'slot_request',
    p_target_class_id: input.targetClassId,
    p_payload: payload,
    p_requester_note: input.note?.trim() ?? '',
  });

  if (error) {
    console.error('submitSlotRequest:', error.message);
    return { error: error.message };
  }

  if (!data) {
    return { error: 'Request failed — no row returned.' };
  }

  return { request: rowToPortalRequest(data as PortalRequestDbRow) };
}

export async function submitCancellationRequest(input: {
  targetClassId: string;
  reason?: string;
  note?: string;
}): Promise<{ request?: PortalRequestRow; error?: string }> {
  const payload: CancellationRequestPayload = {
    reason: input.reason?.trim() ?? '',
  };

  const { data, error } = await supabase.rpc('submit_portal_request', {
    p_request_type: 'cancellation_request',
    p_target_class_id: input.targetClassId,
    p_payload: payload,
    p_requester_note: input.note?.trim() ?? '',
  });

  if (error) {
    console.error('submitCancellationRequest:', error.message);
    return { error: error.message };
  }

  if (!data) {
    return { error: 'Request failed — no row returned.' };
  }

  notifyPortalRequestsChanged();
  return { request: rowToPortalRequest(data as PortalRequestDbRow) };
}

/** Staff cancels their own pending request (status → cancelled). */
export async function withdrawPortalRequest(requestId: string): Promise<{
  request?: PortalRequestRow;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('withdraw_portal_request', {
    p_request_id: requestId,
  });

  if (error) {
    console.error('withdrawPortalRequest:', error.message);
    return { error: error.message };
  }

  notifyPortalRequestsChanged();
  if (data) {
    return { request: rowToPortalRequest(data as PortalRequestDbRow) };
  }
  return {};
}

export async function reviewPortalRequest(input: {
  requestId: string;
  status: PortalRequestStatus;
  reviewNote?: string;
}): Promise<{ request?: PortalRequestRow; error?: string }> {
  const { data, error } = await supabase.rpc('review_portal_request', {
    p_request_id: input.requestId,
    p_status: input.status,
    p_review_note: input.reviewNote?.trim() ?? '',
  });

  if (error) {
    console.error('reviewPortalRequest:', error.message);
    return { error: error.message };
  }

  if (!data) {
    return { error: 'Review failed — no row returned.' };
  }

  return { request: rowToPortalRequest(data as PortalRequestDbRow) };
}
