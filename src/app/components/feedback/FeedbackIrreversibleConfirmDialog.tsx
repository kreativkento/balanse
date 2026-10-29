import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function FeedbackIrreversibleConfirmDialog({
  title,
  message,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-3xl border border-[#D4CDB5]/60 bg-white p-6 shadow-2xl"
      >
        <h3
          className="text-[#1E2A35] leading-none"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}
        >
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[#8A7E6E]">{message}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-[#D4CDB5]/70 px-4 py-2.5 text-sm font-semibold text-[#1E2A35] hover:bg-[#F8F3E8] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="action-button inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1E2A35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#263545] disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
