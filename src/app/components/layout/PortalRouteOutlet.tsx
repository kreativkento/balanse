import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { ContentSkeleton } from './PageLoadingScreen';

/** Skeleton for the page body only — portal chrome stays mounted. */
export function ContentAreaFallback({
  variant = 'page',
}: {
  variant?: 'page' | 'cards' | 'list' | 'form' | 'calendar';
}) {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-8xl flex-1 px-4 py-4 md:px-6 md:py-8"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <ContentSkeleton variant={variant} />
    </div>
  );
}

/** Route outlet that suspends inside the layout instead of replacing header/sidebar/subtabs. */
export function PortalRouteOutlet({ remountOnPath = true }: { remountOnPath?: boolean }) {
  const { pathname } = useLocation();
  return (
    <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col">
      <Suspense fallback={<ContentAreaFallback />}>
        {remountOnPath ? <Outlet key={pathname} /> : <Outlet />}
      </Suspense>
    </div>
  );
}
