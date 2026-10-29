import type { ReactNode } from 'react';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../ui/utils';

function GhostCard({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[#D4CDB5]/55 bg-white/80 p-4 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Placeholder cards / rows that match typical portal layouts. */
export function ContentSkeleton({
  variant = 'page',
  className,
}: {
  variant?: 'page' | 'cards' | 'list' | 'form' | 'calendar';
  className?: string;
}) {
  if (variant === 'cards') {
    return (
      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {Array.from({ length: 6 }, (_, i) => (
          <GhostCard key={i} className="overflow-hidden p-0">
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </GhostCard>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 6 }, (_, i) => (
          <GhostCard key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-7 w-16 shrink-0 rounded-full" />
          </GhostCard>
        ))}
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 4 }, (_, i) => (
          <GhostCard key={i}>
            <Skeleton className="mb-3 h-3 w-24" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </GhostCard>
        ))}
        <Skeleton className="h-12 w-40 rounded-full" />
      </div>
    );
  }

  if (variant === 'calendar') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>
        <GhostCard className="overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-[#D4CDB5]/50">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="m-2 h-4" />
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }, (_, i) => (
              <div key={i} className="min-h-16 border-b border-r border-[#D4CDB5]/35 p-2">
                <Skeleton className="mb-2 h-3 w-6" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </GhostCard>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <Skeleton className="mb-2 h-3 w-28" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="mt-2 h-3 w-48 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <GhostCard key={i}>
            <Skeleton className="mb-3 h-3 w-16" />
            <Skeleton className="h-7 w-20" />
          </GhostCard>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GhostCard className="lg:col-span-2 space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </GhostCard>
        <GhostCard className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </GhostCard>
      </div>
    </div>
  );
}

function PageShellSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-dvh overflow-hidden bg-[#F8F3E8]', className)}>
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[#D4CDB5]/60 bg-white px-4 py-5 md:flex">
        <div className="mb-8 flex items-center gap-3 px-1">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D4CDB5]/60 bg-white px-4 py-3 md:px-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-6 md:px-8">
          <ContentSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loading screen (ghost placeholders).
 * Default: app-shell skeleton when no page is mounted yet.
 * `overlay`: blur whatever is already on screen and layer placeholders on top.
 */
export function PageLoadingScreen({
  message = 'Loading',
  className,
  overlay = false,
  variant = 'page',
}: {
  message?: string;
  className?: string;
  overlay?: boolean;
  variant?: 'page' | 'cards' | 'list' | 'form' | 'calendar';
}) {
  if (overlay) {
    return (
      <div
        className={cn('absolute inset-0 z-10 overflow-hidden', className)}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <div className="absolute inset-0 bg-[#F8F3E8]/30 backdrop-blur-[8px]" />
        <div className="relative h-full overflow-auto px-4 py-6 md:px-8">
          <ContentSkeleton variant={variant} />
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" aria-label={message}>
      <PageShellSkeleton className={className} />
    </div>
  );
}
