import { AlertTriangle, Home, RotateCcw, SearchX } from 'lucide-react';

export function homePathFor(pathname: string) {
  if (pathname.startsWith('/development')) return '/development/dashboard';
  if (pathname.startsWith('/staff-')) return '/staff-dashboard';
  if (pathname.startsWith('/admin')) return '/admin-dashboard';
  return '/';
}

export function homeLabelFor(pathname: string) {
  if (
    pathname.startsWith('/development')
    || pathname.startsWith('/staff-')
    || pathname.startsWith('/admin')
  ) {
    return 'Back to Dashboard';
  }
  return 'Back to Home';
}

export function ErrorScreen({
  code = '500',
  title,
  description,
  details,
  homeTo = '/',
  homeLabel = 'Back to Home',
  onHome,
  onRetry,
}: {
  code?: string;
  title: string;
  description: string;
  details?: string;
  homeTo?: string;
  homeLabel?: string;
  onHome?: () => void;
  onRetry?: () => void;
}) {
  const isNotFound = code === '404';
  const Icon = isNotFound ? SearchX : AlertTriangle;

  const goHome = () => {
    if (onHome) {
      onHome();
      return;
    }
    window.location.assign(homeTo);
  };

  return (
    <div className="h-full min-h-[28rem] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-8 md:p-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#745b3c]/10 border border-[#745b3c]/25 flex items-center justify-center mb-5">
          <Icon size={28} className="text-[#745b3c]" />
        </div>
        <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">{code}</p>
        <h1
          className="text-[#1E2A35] leading-none mb-3"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '2rem',
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </h1>
        <p className="text-[#8A7E6E] text-sm leading-relaxed mb-7">{description}</p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full border border-[#D4CDB5]/70 bg-white text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] active:scale-[0.97] transition-all"
            >
              <RotateCcw size={15} />
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={goHome}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-[#1E2A35] text-white text-sm font-bold hover:bg-[#263545] active:scale-[0.97] transition-all"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
          >
            <Home size={15} />
            {homeLabel}
          </button>
        </div>

        {details && import.meta.env.DEV && (
          <details className="mt-6 text-left rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8] px-4 py-3">
            <summary className="cursor-pointer text-[#8A7E6E] text-xs font-semibold uppercase tracking-widest">
              Error details
            </summary>
            <pre className="mt-2 text-[11px] leading-relaxed text-[#5A5048] whitespace-pre-wrap break-words">
              {details}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
