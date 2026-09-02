import { Link } from 'react-router';

interface PublicBreadcrumbProps {
  parent: string;
  current: string;
  /** Optional link for the parent crumb (e.g. default child route). */
  parentTo?: string;
  /** Use on dark hero backgrounds. */
  tone?: 'default' | 'onDark';
}

/** Public-site breadcrumb: Parent › Current */
export function PublicBreadcrumb({ parent, current, parentTo, tone = 'default' }: PublicBreadcrumbProps) {
  const parentClass =
    tone === 'onDark'
      ? 'text-white/70 text-xs uppercase tracking-widest hover:text-white transition-colors'
      : 'text-[#8A7E6E] text-xs uppercase tracking-widest hover:text-[#745b3c] transition-colors';
  const parentPlainClass =
    tone === 'onDark'
      ? 'text-white/70 text-xs uppercase tracking-widest'
      : 'text-[#8A7E6E] text-xs uppercase tracking-widest';
  const sepClass = tone === 'onDark' ? 'text-white/40 text-xs' : 'text-[#D4CDB5] text-xs';
  const currentClass =
    tone === 'onDark'
      ? 'text-[#E8D5A8] text-xs uppercase tracking-widest font-semibold'
      : 'text-[#745b3c] text-xs uppercase tracking-widest font-semibold';

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 mb-2 flex-wrap">
      {parentTo ? (
        <Link to={parentTo} className={parentClass}>
          {parent}
        </Link>
      ) : (
        <span className={parentPlainClass}>{parent}</span>
      )}
      <span className={sepClass} aria-hidden>
        ›
      </span>
      <span className={currentClass}>{current}</span>
    </nav>
  );
}
