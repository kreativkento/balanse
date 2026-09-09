import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { MemberGreetingHeader } from './DashboardGreetingBar';
import { useAuth } from '../../context/AuthContext';
import { CURRENT_DOCUMENTS, memberNeedsReaccept } from '../../../lib/member-documents';

/** Shared member content column: full-width on phones, capped at 1152px when wide. */
export const MEMBER_PAGE_COLUMN =
  'max-w-6xl mx-auto w-full min-w-0 px-4 md:px-8 pb-16';

interface MemberPageShellProps {
  children: ReactNode;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  /** Override default immediate logout (e.g. show a confirm modal). */
  onLogout?: () => void;
  header?: ReactNode;
  className?: string;
  /**
   * Dashboard only: fill viewport below the header on md+.
   * Header markup is identical to other pages — it is NOT placed inside a flex column with the body.
   */
  viewportBody?: 'desktop';
}

function DocumentReacceptBanner() {
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

function PageHeader({
  header,
  searchPlaceholder,
  onSearch,
  onLogout,
}: Pick<MemberPageShellProps, 'header' | 'searchPlaceholder' | 'onSearch' | 'onLogout'>) {
  return (
    <div>
      {header ?? (
        <MemberGreetingHeader
          searchPlaceholder={searchPlaceholder}
          onSearch={onSearch}
          onLogout={onLogout}
        />
      )}
      <DocumentReacceptBanner />
    </div>
  );
}

/**
 * Standard chrome for MemberSidebar pages:
 * `bg` + `max-w-6xl mx-auto px-4 md:px-8 pb-16` + greeting bar.
 */
export function MemberPageShell({
  children,
  searchPlaceholder,
  onSearch,
  onLogout,
  header,
  className = '',
  viewportBody,
}: MemberPageShellProps) {
  if (viewportBody === 'desktop') {
    return (
      <div className="min-h-full bg-[#F8F3E8] md:flex md:h-0 md:min-h-0 md:flex-1 md:flex-col">
        {/* Same MEMBER_PAGE_COLUMN wrapper as every other page — only the children slot fills on desktop */}
        <div
          className={`${MEMBER_PAGE_COLUMN} md:grid md:h-full md:min-h-0 md:flex-1 md:grid-rows-[auto_minmax(0,1fr)] md:pb-3${className ? ` ${className}` : ''}`}
        >
          <PageHeader
            header={header}
            searchPlaceholder={searchPlaceholder}
            onSearch={onSearch}
            onLogout={onLogout}
          />
          <div className="min-h-0 md:h-full">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F3E8] min-h-full">
      <div className={`${MEMBER_PAGE_COLUMN}${className ? ` ${className}` : ''}`}>
        <PageHeader
          header={header}
          searchPlaceholder={searchPlaceholder}
          onSearch={onSearch}
          onLogout={onLogout}
        />
        {children}
      </div>
    </div>
  );
}
