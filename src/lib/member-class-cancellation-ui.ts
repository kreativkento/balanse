import type { MemberBookingRefundKind } from './class-service';

const PH_TZ = 'Asia/Manila';

export function formatFreeCancellationUntilLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

export function resolveFreeCancellationUntil(
  startsAt: string,
  cancelWindowHours: number,
  storedUntil: string | null,
): string {
  if (storedUntil) return storedUntil;
  const startMs = new Date(startsAt).getTime();
  if (!Number.isFinite(startMs)) return startsAt;
  return new Date(startMs - cancelWindowHours * 3_600_000).toISOString();
}

export function isCancellationLocked(
  freeCancellationUntil: string,
  nowMs: number = Date.now(),
): boolean {
  const deadlineMs = new Date(freeCancellationUntil).getTime();
  return !Number.isFinite(deadlineMs) || nowMs >= deadlineMs;
}

export function freeCancellationRefundNote(
  refundKind: MemberBookingRefundKind,
  creditsOnBooking: number | null,
): string {
  if (refundKind === 'credit') {
    const n = creditsOnBooking && creditsOnBooking > 0 ? creditsOnBooking : 1;
    return n === 1 ? '1 credit returned' : `${n} credits returned`;
  }
  if (refundKind === 'cash') {
    return 'Full refund';
  }
  return 'Refund per studio policy';
}

export function buildFreeCancellationBadgeText(
  freeCancellationUntil: string,
  refundKind: MemberBookingRefundKind,
  creditsOnBooking: number | null,
): string {
  const untilLabel = formatFreeCancellationUntilLabel(freeCancellationUntil);
  const refundNote = freeCancellationRefundNote(refundKind, creditsOnBooking);
  return `Free cancellation until ${untilLabel} (${refundNote})`;
}

export function getMemberCancellationBadge(input: {
  startsAt: string;
  freeCancellationUntil: string | null;
  cancelWindowHours: number;
  refundKind: MemberBookingRefundKind;
  creditsOnBooking: number | null;
  nowMs?: number;
}): { locked: boolean; freeUntil: string; badgeText: string } {
  const freeUntil = resolveFreeCancellationUntil(
    input.startsAt,
    input.cancelWindowHours,
    input.freeCancellationUntil,
  );
  const locked = isCancellationLocked(freeUntil, input.nowMs);
  const badgeText = locked
    ? 'Locked — Non-refundable'
    : buildFreeCancellationBadgeText(freeUntil, input.refundKind, input.creditsOnBooking);
  return { locked, freeUntil, badgeText };
}

export function buildCancelBookingConfirmMessage(input: {
  className: string;
  locked: boolean;
  refundKind: MemberBookingRefundKind;
  creditsOnBooking: number | null;
  freeCancellationUntil: string;
}): { title: string; body: string } {
  const { className, locked, refundKind, creditsOnBooking, freeCancellationUntil } = input;
  if (locked) {
    return {
      title: 'Cancel booking?',
      body: `Cancel your booking for ${className}? This session is locked — non-refundable. Your payment or credit will not be returned if cancellation is approved.`,
    };
  }
  const refundNote = freeCancellationRefundNote(refundKind, creditsOnBooking);
  const untilLabel = formatFreeCancellationUntilLabel(freeCancellationUntil);
  return {
    title: 'Cancel booking?',
    body: `Cancel your booking for ${className}? You are within the free cancellation window (until ${untilLabel}). If approved, ${refundNote.toLowerCase()} will be restored to your account.`,
  };
}
