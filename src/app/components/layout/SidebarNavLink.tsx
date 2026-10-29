import { Link, useLocation } from 'react-router';
import { ChevronLeft, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { usePortalChrome, usePortalMobileDrawer, usePortalNavIconOnly } from '../../context/PortalChromeContext';
import { isPublicNavActive } from './NavBar';
import {
  groupPendingCount,
  recalledSectionPath,
  type PortalSectionGroup,
  type PortalSectionLink,
} from '../../context/PortalSectionNavContext';

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
  onActivate,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  onNavigate: () => void;
  /** When set, renders a button (used to open a mobile section flyout). */
  onActivate?: () => void;
  statusDotClass?: string;
  statusLabel?: string;
  /** Red count badge on the right (e.g. pending coach requests). */
  pendingCount?: number;
  disabled?: boolean;
  disabledTitle?: string;
  /** Soft gold fill, used for System Feedback. */
  appearance?: 'nav' | 'gold';
}) {
  const iconOnly = usePortalNavIconOnly();
  const showPendingBadge = pendingCount != null && pendingCount > 0;
  const labelClass =
    'min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left text-sm leading-none opacity-100';

  const badge = showPendingBadge ? (
    <span
      className={`flex items-center justify-center rounded-full bg-red-500 font-bold text-white tabular-nums ${
        iconOnly
          ? 'pointer-events-none absolute right-0 top-0 z-20 h-4 min-w-4 translate-x-1/3 -translate-y-0.5 px-0.5 text-[9px]'
          : 'h-5 min-w-5 px-1.5 text-[10px]'
      }`}
      aria-label={`${pendingCount} pending`}
    >
      {pendingCount > 99 ? '99+' : pendingCount}
    </span>
  ) : null;

  const content = (
    <>
      <span
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center ${
          disabled ? 'text-[#C4B8A0]' : active || appearance === 'gold' ? 'text-[#c49a3c]' : 'text-[#8A7E6E]'
        }`}
      >
        {icon}
        {iconOnly && statusDotClass ? (
          <span
            className={`absolute right-0 top-0 z-20 h-2 w-2 translate-x-1/4 -translate-y-0.5 rounded-full ${statusDotClass}`}
            aria-label={statusLabel || 'Incomplete'}
          />
        ) : null}
        {iconOnly ? badge : null}
      </span>
      {iconOnly ? null : (
        <>
          <span className={labelClass}>{label}</span>
          <span className="ml-auto flex h-5 w-8 shrink-0 items-center justify-end">
            {badge}
            {statusDotClass ? (
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass}`}
                aria-label={statusLabel || 'Incomplete'}
              />
            ) : null}
          </span>
        </>
      )}
    </>
  );

  const navClass =
    appearance === 'gold'
      ? `relative flex w-full items-center rounded-xl text-sm font-medium font-sans transition-colors duration-300 ${
          iconOnly ? 'justify-center overflow-visible px-0' : 'justify-start overflow-hidden px-1'
        } ${
          disabled
            ? 'cursor-not-allowed bg-[#c49a3c]/10 text-[#B0A898] opacity-70'
            : active
              ? 'bg-[#c49a3c]/28 text-[#1E2A35]'
              : 'bg-[#c49a3c]/16 text-[#5A5048] hover:bg-[#c49a3c]/24 hover:text-[#1E2A35]'
        }`
      : `relative flex w-full items-center rounded-xl text-sm font-medium font-sans transition-colors duration-300 ${
          iconOnly ? 'justify-center overflow-visible px-0' : 'justify-start overflow-hidden px-1'
        } ${
          disabled
            ? 'cursor-not-allowed text-[#B0A898] opacity-60'
            : active
              ? 'bg-[#1E2A35] text-white shadow-sm'
              : 'text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
        }`;

  if (disabled) {
    return (
      <span aria-disabled="true" title={disabledTitle} className={navClass} data-tour={`nav-${label}`}>
        {content}
      </span>
    );
  }

  if (onActivate) {
    return (
      <button
        type="button"
        onClick={onActivate}
        title={iconOnly ? label : undefined}
        aria-label={iconOnly ? label : undefined}
        className={navClass}
        aria-expanded={active}
        data-tour={`nav-${label}`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={to}
      onClick={onNavigate}
      title={iconOnly ? label : undefined}
      aria-label={iconOnly ? label : undefined}
      className={navClass}
      aria-current={active ? 'page' : undefined}
      data-tour={`nav-${label}`}
    >
      {content}
    </Link>
  );
}

export function SidebarNavGroupButton({
  group,
  active,
  onNavigate,
}: {
  group: PortalSectionGroup;
  active: boolean;
  onNavigate: () => void;
}) {
  const pendingCount = groupPendingCount(group);
  const target = recalledSectionPath(group);
  const isMobileDrawer = usePortalMobileDrawer();
  const chrome = usePortalChrome();
  const enabledLinks = group.links.filter((link) => !link.disabled);
  const opensFlyout = isMobileDrawer && enabledLinks.length >= 2 && !group.disabled;
  const sectionOpen = chrome?.mobileSectionKey === group.key;

  return (
    <SidebarNavLink
      to={target ?? '#'}
      icon={group.icon}
      label={group.label}
      active={active || sectionOpen}
      onNavigate={onNavigate}
      onActivate={
        opensFlyout
          ? () => {
              chrome?.openMobileSection(group.key);
            }
          : undefined
      }
      disabled={Boolean(group.disabled)}
      pendingCount={pendingCount || undefined}
    />
  );
}

export function MobileSectionSubnav({
  group,
  onNavigate,
}: {
  group: PortalSectionGroup;
  onNavigate: () => void;
}) {
  const { pathname } = useLocation();
  const chrome = usePortalChrome();

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center gap-1 border-b border-[#D4CDB5]/40 px-2 py-2.5">
        <button
          type="button"
          onClick={() => chrome?.closeMobileSection()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8A7E6E] hover:bg-[#EDE8D8]"
          aria-label="Back to main menu"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="truncate text-[11px] font-bold uppercase tracking-widest text-[#8A7E6E]">
          {group.label}
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label={`${group.label} pages`}>
        <div className="flex flex-col gap-1">
          {group.links.map((link: PortalSectionLink) => (
            <SidebarNavLink
              key={link.path}
              to={link.path}
              icon={link.icon}
              label={link.label}
              active={isPublicNavActive(pathname, link.path)}
              onNavigate={onNavigate}
              disabled={Boolean(link.disabled)}
              pendingCount={link.pendingCount}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

export function SidebarNav({ children }: { children: ReactNode }) {
  const iconOnly = usePortalNavIconOnly();
  return (
    <nav className={`flex-1 px-2.5 py-3 ${iconOnly ? 'overflow-visible' : 'min-h-0 overflow-y-auto'}`}>
      {children}
    </nav>
  );
}

export function SidebarCollapseBar({ onCloseMobile }: { onCloseMobile: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-end border-b border-[#D4CDB5]/30 px-3 py-2.5 md:hidden">
      <button
        type="button"
        onClick={onCloseMobile}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8]"
        aria-label="Close menu"
      >
        <X size={16} />
      </button>
    </div>
  );
}
