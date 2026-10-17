/** Full-viewport loading state: centered spinner with message below. */
export function PageLoadingScreen({
  message = 'Please wait a moment.',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#FBF9F3]/88 backdrop-blur-sm ${
        className ?? ''
      }`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <span
        className="h-10 w-10 rounded-full border-[3px] border-[#c49a3c]/25 border-t-[#c49a3c] animate-spin"
        aria-hidden
      />
      <p className="mt-4 text-[#5A5048] text-sm font-medium tracking-wide">{message}</p>
    </div>
  );
}
