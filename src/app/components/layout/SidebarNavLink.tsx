import { Link } from 'react-router';
import type { ReactNode } from 'react';

export function SidebarNavLink({
  to,
  icon,
  label,
  active,
  onNavigate,
  statusDotClass,
  statusLabel,
  pendingCount,
  disabled = false,
  disabledTitle = 'Finish setting up your profile to unlock this',
  appearance = 'nav',
}: {
  to: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  onNavigate: () => void;
  statusDotClass?: string;
  statusLabel?: string;
  /** Red count badge on the right (e.g. pending coach requests). */
  pendingCount?: number;
  disabled?: boolean;
  disabledTitle?: string;
  /** Full-width brand-gold button, used for System Feedback. */
  appearance?: 'nav' | 'gold';
}) {
  const showPendingBadge = pendingCount != null && pendingCount > 0;

  const content = (
    <>
      <span className={disabled ? 'text-[#C4B8A0]' : active ? 'text-[#c49a3c]' : 'text-[#8A7E6E]'}>{icon}</span>
      <span className="flex-1">{label}</span>
      {showPendingBadge && (
        <span
          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white"
          aria-label={`${pendingCount} pending`}
        >
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
      {statusDotClass && (
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass}`}
          aria-label={statusLabel || 'Incomplete'}
        />
      )}
    </>
  );

  if (appearance === 'gold') {
    const goldClass = disabled
      ? 'flex w-full cursor-not-allowed items-center gap-3 rounded-xl bg-[#c49a3c]/35 px-3 py-2.5 text-sm font-medium text-white/80'
      : `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-all ${
          active ? 'bg-[#a67f2e]' : 'bg-[#c49a3c] hover:bg-[#a67f2e]'
        }`;
    const goldContent = (
      <>
        <span className="text-white">{icon}</span>
        <span className="flex-1">{label}</span>
      </>
    );

    if (disabled) {
      return (
        <span aria-disabled="true" title={disabledTitle} className={goldClass}>
          {goldContent}
        </span>
      );
    }

    return (
      <Link to={to} onClick={onNavigate} className={goldClass} aria-current={active ? 'page' : undefined}>
        {goldContent}
      </Link>
    );
  }

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        title={disabledTitle}
        className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#B0A898] opacity-60"
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? 'bg-[#1E2A35] text-white shadow-sm'
          : 'text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
      }`}
    >
      {content}
    </Link>
  );
}
