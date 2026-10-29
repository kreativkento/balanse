import { Link, useLocation } from 'react-router';
import { isPublicNavActive } from './NavBar';
import { usePortalSectionNav } from '../../context/PortalSectionNavContext';

export function PortalSectionSubnav() {
  const { activeGroup } = usePortalSectionNav();
  const { pathname } = useLocation();

  if (!activeGroup || activeGroup.links.length < 2) return null;

  const current = activeGroup.links.find((link) => isPublicNavActive(pathname, link.path));

  return (
    <>
      <nav
        className="mt-2 mb-0.5 flex items-center gap-1.5 border-b border-[#D4CDB5]/60 pb-2 md:hidden"
        aria-label="Breadcrumb"
      >
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#8A7E6E]">
          <span className="shrink-0 text-[#c49a3c]">{activeGroup.icon}</span>
          <span className="truncate">{activeGroup.label}</span>
          <span className="text-[#C0B8A8]" aria-hidden>
            ›
          </span>
          <span className="truncate text-[#1E2A35]">{current?.label ?? activeGroup.links[0]?.label}</span>
        </span>
      </nav>

      <nav
        className="mt-3 mb-1 hidden flex-wrap items-center gap-2 border-b border-[#D4CDB5]/60 pb-3 md:flex"
        aria-label={`${activeGroup.label} pages`}
      >
        <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#8A7E6E]">
          <span className="text-[#c49a3c]">{activeGroup.icon}</span>
          {activeGroup.label}
          <span className="text-[#C0B8A8]" aria-hidden>
            ›
          </span>
        </span>
        {activeGroup.links.map((link) => {
          const active = isPublicNavActive(pathname, link.path);
          const showPending = (link.pendingCount ?? 0) > 0;
          const className = `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold font-sans transition-all ${
            link.disabled
              ? 'cursor-not-allowed text-[#B0A898] opacity-60'
              : active
                ? 'bg-[#1E2A35] text-white shadow-sm'
                : 'bg-white text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
          }`;

          const body = (
            <>
              <span className={link.disabled ? 'text-[#C4B8A0]' : active ? 'text-[#c49a3c]' : 'text-[#8A7E6E]'}>
                {link.icon}
              </span>
              {link.label}
              {showPending ? (
                <span
                  className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white"
                  aria-label={`${link.pendingCount} pending`}
                >
                  {(link.pendingCount ?? 0) > 99 ? '99+' : link.pendingCount}
                </span>
              ) : null}
            </>
          );

          if (link.disabled) {
            return (
              <span key={link.path} className={className} aria-disabled="true">
                {body}
              </span>
            );
          }

          return (
            <Link key={link.path} to={link.path} className={className} aria-current={active ? 'page' : undefined}>
              {body}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
