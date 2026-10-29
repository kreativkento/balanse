import { supabase } from './supabase';
import { notifyPortalRequestsChanged } from './portal-request-service';
import type {
  ClassCancelHoldingOutcome,
  ClassCancelHoldingRefundKind,
  ClassCancelHoldingRefundStatus,
} from './database.types';

export interface ClassCancelHoldingListItem {
  id: string;
  portalRequestId: string;
  classId: string;
  accountId: string;
  memberName: string;
  memberEmail: string;
  notifiedAt: string | null;
  notifyNote: string;
  outcome: ClassCancelHoldingOutcome;
  refundStatus: ClassCancelHoldingRefundStatus;
  refundKind: ClassCancelHoldingRefundKind;
  refundedAt: string | null;
}

type HoldingDbRow = {
  id: string;
  portal_request_id: string;
  class_id: string;
  account_id: string;
  member_name?: string | null;
  member_email?: string | null;
  notified_at: string | null;
  notify_note?: string | null;
  outcome: ClassCancelHoldingOutcome;
  refund_status: ClassCancelHoldingRefundStatus;
  refund_kind: ClassCancelHoldingRefundKind;
  refunded_at: string | null;
};

function mapHolding(row: HoldingDbRow): ClassCancelHoldingListItem {
  return {
    id: row.id,
    portalRequestId: row.portal_request_id,
    classId: row.class_id,
    accountId: row.account_id,
    memberName: row.member_name?.trim() || 'Member',
    memberEmail: row.member_email?.trim() || '',
    notifiedAt: row.notified_at,
    notifyNote: row.notify_note ?? '',
    outcome: row.outcome,
    refundStatus: row.refund_status,
    refundKind: row.refund_kind,
    refundedAt: row.refunded_at,
  };
}

export function holdingNeedsNotify(row: ClassCancelHoldingListItem): boolean {
  return row.outcome === 'pending_review' && !row.notifiedAt;
}

export function holdingRefundPending(row: ClassCancelHoldingListItem): boolean {
  return row.refundStatus === 'pending';
}

export function coachCancelHoldingStatusLabel(rows: ClassCancelHoldingListItem[]): string | null {
  if (rows.length === 0) return null;
  const outcome = rows[0]?.outcome;
  if (outcome === 'pending_review') {
    if (rows.some(holdingNeedsNotify)) return 'Front desk notifying enrolled students';
    return 'Waiting on admin to confirm';
  }
  if (outcome === 'class_cancelled') {
    if (rows.some(holdingRefundPending)) return 'Class cancelled, refunds in progress';
    return 'Class cancelled';
  }
  if (outcome === 'coach_replaced') return 'Coach replaced — enrollments kept';
  if (outcome === 'request_rejected') return 'Cancellation was not approved';
  if (outcome === 'request_withdrawn') return 'Request withdrawn';
  return null;
}

export async function fetchClassCancelHoldings(requestId: string): Promise<{
  data: ClassCancelHoldingListItem[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('list_class_cancel_holdings', {
    p_request_id: requestId,
  });
  if (error) {
    console.error('list_class_cancel_holdings:', error.message);
    return { data: [], error: error.message };
  }
  return { data: ((data ?? []) as HoldingDbRow[]).map(mapHolding), error: null };
}

export async function markClassCancelHoldingNotified(input: {
  holdingId: string;
  notified: boolean;
  note?: string;
}): Promise<{ data: ClassCancelHoldingListItem | null; error: string | null }> {
  const { data, error } = await supabase.rpc('mark_class_cancel_holding_notified', {
    p_holding_id: input.holdingId,
    p_notified: input.notified,
    p_notify_note: input.note ?? '',
  });
  if (error) {
    console.error('mark_class_cancel_holding_notified:', error.message);
    return { data: null, error: error.message };
  }
  notifyPortalRequestsChanged();
  return { data: data ? mapHolding(data as HoldingDbRow) : null, error: null };
}

export async function markClassCancelHoldingsNotifiedAll(requestId: string): Promise<{
  count: number;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('mark_class_cancel_holdings_notified_all', {
    p_request_id: requestId,
    p_notify_note: '',
  });
  if (error) {
    console.error('mark_class_cancel_holdings_notified_all:', error.message);
    return { count: 0, error: error.message };
  }
  notifyPortalRequestsChanged();
  return { count: Number(data ?? 0), error: null };
}

export async function markClassCancelHoldingRefunded(holdingId: string): Promise<{
  data: ClassCancelHoldingListItem | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('mark_class_cancel_holding_refunded', {
    p_holding_id: holdingId,
  });
  if (error) {
    console.error('mark_class_cancel_holding_refunded:', error.message);
    return { data: null, error: error.message };
  }
  notifyPortalRequestsChanged();
  return { data: data ? mapHolding(data as HoldingDbRow) : null, error: null };
}

export async function countClassCancelRequestsNeedingNotify(): Promise<number> {
  const { data, error } = await supabase.rpc('count_class_cancel_requests_needing_notify');
  if (error) {
    console.error('count_class_cancel_requests_needing_notify:', error.message);
    return 0;
  }
  return Number(data ?? 0);
}

export async function countClassCancelHoldingsPendingRefund(): Promise<number> {
  const { data, error } = await supabase.rpc('count_class_cancel_holdings_pending_refund');
  if (error) {
    console.error('count_class_cancel_holdings_pending_refund:', error.message);
    return 0;
  }
  return Number(data ?? 0);
}

export async function sendClassCancelHoldingEmails(input: {
  kind: 'holding_pending' | 'holding_refunded';
  holdingId?: string;
  requestId?: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('send-schedule-coach-email', {
    body: {
      kind: input.kind,
      holdingId: input.holdingId,
      requestId: input.requestId,
    },
  });
  if (error) {
    console.error(`send-schedule-coach-email (${input.kind}):`, error.message);
    return { ok: false, error: error.message };
  }
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? 'Could not send notification.' };
  }
  return { ok: true, error: null };
}
