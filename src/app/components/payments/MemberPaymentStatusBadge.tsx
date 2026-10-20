import type { ClassPaymentStatus } from '../../../lib/class-payment-service';
import type { SubscriptionPackagePaymentStatus } from '../../../lib/subscription-package-payment-service';

type MemberPaymentStatus = ClassPaymentStatus | SubscriptionPackagePaymentStatus;

export type MemberPaymentDisplayStatus =
  | MemberPaymentStatus
  | 'posted'
  | 'held'
  | 'cleared'
  | 'refund_approved';

/** Member-facing payment status (rejected → Returned). */
export function MemberPaymentStatusBadge({ status }: { status: MemberPaymentStatus }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex text-[10px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
        Pending
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex text-[10px] font-bold uppercase text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full whitespace-nowrap">
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex text-[10px] font-bold uppercase text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full whitespace-nowrap">
      Returned
    </span>
  );
}

function LifecycleBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className={`inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}>
      {label}
    </span>
  );
}

function PostedBadge() {
  return (
    <span className="inline-flex text-[10px] font-bold uppercase text-[#5A5048] bg-[#EDE8D8] border border-[#D4CDB5]/70 px-2 py-0.5 rounded-full whitespace-nowrap">
      Posted
    </span>
  );
}

export function MemberPaymentStatusCell({ status }: { status: MemberPaymentDisplayStatus }) {
  return (
    <div className="flex justify-end">
      {status === 'posted' ? (
        <PostedBadge />
      ) : status === 'held' ? (
        <LifecycleBadge label="Held" className="text-sky-800 bg-sky-50 border border-sky-200" />
      ) : status === 'cleared' ? (
        <LifecycleBadge label="Cleared" className="text-green-700 bg-green-50 border border-green-200" />
      ) : status === 'refund_approved' ? (
        <LifecycleBadge label="Refund approved" className="text-amber-800 bg-amber-50 border border-amber-200" />
      ) : (
        <MemberPaymentStatusBadge status={status} />
      )}
    </div>
  );
}

export function MemberPaymentChannelText({ label }: { label: string }) {
  return (
    <span className="whitespace-nowrap text-xs font-medium text-[#8A7E6E]">
      {label}
    </span>
  );
}

export function MemberPaymentAmountText({ amountPaid }: { amountPaid: number | null }) {
  return (
    <span className="whitespace-nowrap text-xs font-bold tabular-nums text-[#1E2A35]">
      {amountPaid != null ? `₱${amountPaid.toLocaleString()}` : '—'}
    </span>
  );
}

/** Aligned channel · amount · status (e.g. payment history rows). */
export function MemberPaymentTableMeta({
  channelLabel,
  amountPaid,
  status,
  className = '',
}: {
  channelLabel: string;
  amountPaid: number | null;
  status: MemberPaymentDisplayStatus;
  className?: string;
}) {
  return (
    <div
      className={`grid w-max max-w-full grid-cols-[auto_auto_auto] items-center justify-items-end gap-x-4 sm:gap-x-5 ${className}`}
      role="presentation"
    >
      <MemberPaymentChannelText label={channelLabel} />
      <MemberPaymentAmountText amountPaid={amountPaid} />
      <MemberPaymentStatusCell status={status} />
    </div>
  );
}
