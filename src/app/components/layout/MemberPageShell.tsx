import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { usePortalSearchOverride } from '../../context/PortalChromeContext';
import { CURRENT_DOCUMENTS, memberNeedsReaccept } from '../../../lib/member-documents';

/** Shared member content column. Bottom inset comes from the portal main gutter. */
export const MEMBER_PAGE_COLUMN =
  'max-w-8xl mx-auto w-full min-w-0 px-4 md:px-8';

interface MemberPageShellProps {
  children: ReactNode;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  /** Override default immediate logout (e.g. show a confirm modal). */
  onLogout?: () => void;
  className?: string;
  /**
   * Dashboard only: fill viewport below the header on md+.
   * Header markup is identical to other pages — it is NOT placed inside a flex column with the body.
   */
  viewportBody?: 'desktop';
}

export function DocumentReacceptBanner() {
  const { user } = useAuth();
  const profile = user?.profile;
  const needed = memberNeedsReaccept({
    terms: {
      path: profile?.termsDocumentPath,
      version: profile?.termsAcceptedVersion,
      accepted: profile?.termsAccepted,
    },
    privacy: {
      path: profile?.privacyPolicyDocumentPath,
      version: profile?.privacyAcceptedVersion,
    },
  });
  if (!needed) return null;

  const termsNeeds = CURRENT_DOCUMENTS.terms.requiresReaccept
    && profile?.termsAcceptedVersion !== CURRENT_DOCUMENTS.terms.version;
  const href = termsNeeds ? '/profile?tab=terms' : '/profile?tab=privacy';

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      A studio policy was updated and needs a new signature.{' '}
      <Link to={href} className="font-semibold underline underline-offset-2">
        Review and re-sign
      </Link>
    </div>
  );
}

/**
 * Standard content column for member pages. Greeting and subnav stay in MemberSidebar.
 */
export function MemberPageShell({
  children,
  searchPlaceholder,
  onSearch,
  className = '',
  viewportBody,
}: MemberPageShellProps) {
  usePortalSearchOverride(
    onSearch || searchPlaceholder
      ? { onSearch, placeholder: searchPlaceholder }
      : null,
  );

  if (viewportBody === 'desktop') {
    return (
      <div className="min-h-full bg-[#F8F3E8] md:flex md:h-0 md:min-h-0 md:flex-1 md:flex-col">
        <div
          className={`${MEMBER_PAGE_COLUMN} md:flex md:h-full md:min-h-0 md:flex-1 md:flex-col${className ? ` ${className}` : ''}`}
        >
          <div className="min-h-0 md:flex md:h-full md:min-h-0 md:flex-1 md:flex-col">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F3E8] min-h-full">
      <div className={`${MEMBER_PAGE_COLUMN}${className ? ` ${className}` : ''}`}>
        {children}
      </div>
    </div>
  );
}
