import { Loader2 } from 'lucide-react';

export type PendingPortalRequestWithdrawActionsProps = {
  confirmingWithdraw: boolean;
  withdrawing: boolean;
  withdrawError: string | null;
  onClose: () => void;
  onStartWithdraw: () => void;
  onConfirmWithdraw: () => void;
  onKeepRequest: () => void;
  /** Panel footer on class schedule block side sheet. */
  variant?: 'modal' | 'panel';
  closeLabel?: string;
};

const btnModalSecondary =
  'flex-1 py-3 rounded-2xl border border-[#D4CDB5] text-[#1E2A35] text-sm font-semibold hover:bg-[#F8F3E8] transition-colors disabled:opacity-50';
const btnModalDanger =
  'flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2';
const btnModalCancelOutline =
  'flex-1 py-3 rounded-2xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors';

const btnPanelSecondary =
  'min-w-0 rounded-full border border-[#D4CDB5]/70 px-4 py-2.5 text-sm font-medium text-[#8A7E6E] transition-all hover:bg-[#EDE8D8] disabled:opacity-50';
const btnPanelDanger =
  'min-w-0 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-600 disabled:opacity-50 inline-flex items-center justify-center gap-1.5';
const btnPanelCancelOutline =
  'min-w-0 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-100';

export function PendingPortalRequestWithdrawActions({
  confirmingWithdraw,
  withdrawing,
  withdrawError,
  onClose,
  onStartWithdraw,
  onConfirmWithdraw,
  onKeepRequest,
  variant = 'modal',
  closeLabel = 'Close',
}: PendingPortalRequestWithdrawActionsProps) {
  const isPanel = variant === 'panel';
  const secondaryBtn = isPanel ? btnPanelSecondary : btnModalSecondary;
  const dangerBtn = isPanel ? btnPanelDanger : btnModalDanger;
  const cancelOutlineBtn = isPanel ? btnPanelCancelOutline : btnModalCancelOutline;
  const wrapperClass = isPanel
    ? 'flex flex-col gap-2'
    : 'flex flex-col gap-3';
  const rowClass = isPanel ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3' : 'flex gap-2';

  if (confirmingWithdraw) {
    return (
      <div className={wrapperClass}>
        <p
          className={
            isPanel
              ? 'text-[#5A5048] text-xs text-center leading-relaxed px-1'
              : 'text-[#5A5048] text-sm text-center'
          }
        >
          Withdraw this request? It will be removed from admin review and you can request this slot
          again.
        </p>
        {withdrawError && (
          <p className="text-red-600 text-xs text-center" role="alert">
            {withdrawError}
          </p>
        )}
        <div className={rowClass}>
          <button type="button" onClick={onKeepRequest} disabled={withdrawing} className={secondaryBtn}>
            Keep request
          </button>
          <button
            type="button"
            onClick={onConfirmWithdraw}
            disabled={withdrawing}
            className={dangerBtn}
          >
            {withdrawing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Confirm withdraw
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {withdrawError && (
        <p className="text-red-600 text-xs text-center" role="alert">
          {withdrawError}
        </p>
      )}
      <div className={rowClass}>
        <button type="button" onClick={onClose} className={secondaryBtn}>
          {closeLabel}
        </button>
        <button type="button" onClick={onStartWithdraw} className={cancelOutlineBtn}>
          Cancel request
        </button>
      </div>
    </div>
  );
}
