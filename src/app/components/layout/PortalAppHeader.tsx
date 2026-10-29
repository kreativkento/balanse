import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Menu } from 'lucide-react';
import { usePortalChrome } from '../../context/PortalChromeContext';

export function PortalRoleBadge({
  label,
  icon,
  tone = 'gold',
}: {
  label: string;
  icon: ReactNode;
  tone?: 'gold' | 'navy' | 'sage';
}) {
  const toneClass =
    tone === 'navy'
      ? 'bg-[#1E2A35] text-white'
      : tone === 'sage'
        ? 'bg-[#5A7A6A] text-white'
        : 'bg-[#c49a3c] text-[#1E2A35]';

  return (
    <div className={`flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 ${toneClass}`}>
      {icon}
      <span className="font-bold uppercase tracking-widest text-[0.5rem]">{label}</span>
    </div>
  );
}

/** Fixed space between the page h1 and the first control (search, filters, actions). */
export const PAGE_HEADING_TOOLBAR_ROW_CLASS =
  'flex min-w-0 w-full items-center gap-x-4 gap-y-2 flex-wrap md:gap-x-12 md:gap-y-3';

export function PortalPageHeading({
  title,
  compact = false,
}: {
  crumb?: string;
  title: string;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0">
      <h1
        className="text-[#1E2A35] leading-tight"
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: compact ? 'clamp(1.25rem, 2.5vw, 1.6rem)' : 'clamp(1.4rem, 2.9vw, 1.85rem)',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </h1>
    </div>
  );
}

export function PortalAppHeader({
  homeHref,
  logoSrc,
  badge,
  search,
  accountMenu,
  headerActions,
  notifications,
}: {
  homeHref: string;
  logoSrc: string;
  badge: ReactNode;
  search: ReactNode;
  accountMenu: ReactNode;
  headerActions?: ReactNode;
  notifications?: ReactNode;
}) {
  const chrome = usePortalChrome();

  return (
    <header className="relative z-40 shrink-0 border-b border-white/10 bg-[#1E2A35]">
      <div className="flex items-center gap-2 px-3 py-2 md:gap-3 md:px-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => chrome?.openMobileMenu()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white md:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <Link to={homeHref} className="flex min-w-0 items-center gap-2">
            <img src={logoSrc} alt="BALANSÉ Wellness Hub" className="h-8 w-auto object-contain" />
            <span className="hidden md:flex">{badge}</span>
          </Link>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
          {headerActions ? <div className="hidden md:flex">{headerActions}</div> : null}
          {search}
          {notifications}
          {accountMenu}
        </div>
      </div>
    </header>
  );
}
