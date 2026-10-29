type InactivityWarningDialogProps = {
  secondsRemaining: number;
  onConfirm: () => void;
  onLogoutNow: () => void;
};

export function InactivityWarningDialog({
  secondsRemaining,
  onConfirm,
  onLogoutNow,
}: InactivityWarningDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="inactivity-dialog-title"
        aria-describedby="inactivity-dialog-desc"
        className="w-full max-w-sm rounded-3xl border border-[#D4CDB5]/60 bg-white p-6 shadow-2xl"
      >
        <h3
          id="inactivity-dialog-title"
          className="text-[#1E2A35] leading-none"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}
        >
          Are you still there?
        </h3>
        <p id="inactivity-dialog-desc" className="mt-2 text-sm leading-relaxed text-[#8A7E6E]">
          You have been inactive. You will be signed out in{' '}
          <span className="font-semibold text-[#1E2A35]">{secondsRemaining}</span>{' '}
          second{secondsRemaining === 1 ? '' : 's'} unless you confirm you are still here.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onLogoutNow}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-[#D4CDB5]/70 px-4 py-2.5 text-sm font-semibold text-[#1E2A35] hover:bg-[#F8F3E8]"
          >
            Sign out now
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="action-button inline-flex flex-1 items-center justify-center rounded-full bg-[#1E2A35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#263545]"
          >
            Yes, I&apos;m still here
          </button>
        </div>
      </div>
    </div>
  );
}
