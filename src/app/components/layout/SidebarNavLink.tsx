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
  disabled = false,
  disabledTitle = 'Finish setting up your profile to unlock this',
}: {
  to: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  onNavigate: () => void;
  statusDotClass?: string;
  statusLabel?: string;
  disabled?: boolean;
  disabledTitle?: string;
}) {
  const content = (
    <>
      <span className={disabled ? 'text-[#C4B8A0]' : active ? 'text-[#c49a3c]' : 'text-[#8A7E6E]'}>{icon}</span>
      <span className="flex-1">{label}</span>
      {statusDotClass && (
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass}`}
          aria-label={statusLabel || 'Incomplete'}
        />
      )}
    </>
  );

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
