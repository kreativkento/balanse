import type { ClassPaymentDisplay } from './class-payment-service';
import type { SubscriptionPackagePaymentDisplay } from './subscription-package-payment-service';

const PH_TZ = 'Asia/Manila';

export type OfficialReceiptKind = 'class_drop_in' | 'subscription';

export interface OfficialReceiptRow {
  key: string;
  kind: OfficialReceiptKind;
  receiptPaymentId: string;
  orNumber: string;
  title: string;
  subtitle: string;
  amount: number;
  issuedAtLabel: string;
  sortAt: string;
}

export interface EscrowAuthorizationRow {
  key: string;
  className: string;
  amount: number;
  lockAtLabel: string;
  pendingVerification: boolean;
  paymentId: string;
}

function formatPhDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

function formatIssuedLabel(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

/** Mode 2 — subscription / pack purchases: OR as soon as payment is finalized. */
export function buildSubscriptionOfficialReceipts(
  rows: SubscriptionPackagePaymentDisplay[],
): OfficialReceiptRow[] {
  return rows
    .filter((row) => row.finalTransactionId && row.escrowState === 'finalized')
    .map((row) => ({
      key: `sub-${row.id}`,
      kind: 'subscription' as const,
      receiptPaymentId: row.id,
      orNumber: row.officialReceiptNumber?.trim() || row.uid,
      title: row.packageName,
      subtitle: `${row.creditsGranted} credits · Membership / pack`,
      amount: row.amountPaid,
      issuedAtLabel: formatIssuedLabel(row.receiptIssuedAt, formatPhDateTime(row.createdAt)),
      sortAt: row.receiptIssuedAt ?? row.createdAt,
    }));
}

/** Mode 1 — class drop-ins: OR only after escrow lock (cancel window) → finalized. */
export function buildClassDropInOfficialReceipts(
  rows: ClassPaymentDisplay[],
): OfficialReceiptRow[] {
  return rows
    .filter((row) => Boolean(row.finalTransactionId) && row.escrowState === 'finalized')
    .map((row) => ({
      key: `class-${row.id}`,
      kind: 'class_drop_in' as const,
      receiptPaymentId: row.id,
      orNumber: row.officialReceiptNumber?.trim() || row.uid,
      title: row.className?.trim() || 'Class booking',
      subtitle: `Drop-in · ${row.paymentMethodLabel || 'Payment'}`,
      amount: row.amountPaid,
      issuedAtLabel: formatIssuedLabel(row.receiptIssuedAt, formatPhDateTime(row.createdAt)),
      sortAt: row.receiptIssuedAt ?? row.createdAt,
    }));
}

export function buildEscrowAuthorizations(rows: ClassPaymentDisplay[]): EscrowAuthorizationRow[] {
  return rows
    .filter((row) => {
      if (row.status === 'rejected' || row.escrowState === 'rejected') return false;
      if (row.escrowState === 'refunded') return false;
      if (row.finalTransactionId && row.escrowState === 'finalized') return false;
      return (
        row.status === 'pending'
        || row.escrowState === 'pending_review'
        || row.escrowState === 'in_escrow'
        || (row.status === 'approved' && !row.finalTransactionId)
      );
    })
    .map((row) => ({
      key: row.id,
      paymentId: row.id,
      className: row.className?.trim() || 'Class',
      amount: row.amountPaid,
      lockAtLabel: formatPhDateTime(row.refundableUntil),
      pendingVerification: row.status === 'pending' || row.escrowState === 'pending_review',
    }));
}

export function mergeOfficialReceipts(
  classRows: ClassPaymentDisplay[],
  subscriptionRows: SubscriptionPackagePaymentDisplay[],
): OfficialReceiptRow[] {
  const merged = [
    ...buildSubscriptionOfficialReceipts(subscriptionRows),
    ...buildClassDropInOfficialReceipts(classRows),
  ];
  merged.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());
  return merged;
}
