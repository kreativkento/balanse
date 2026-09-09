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
  /** Replace the default greeting header (e.g. custom logout confirm). */
  header?: ReactNode;
  className?: string;
  /** Fill the sidebar main pane so the page itself does not scroll. */
  fill?: boolean;
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

/**
 * Standard chrome for MemberSidebar pages:
 * `bg` + `max-w-6xl mx-auto px-4 md:px-8 pb-16` + greeting bar.
 */
export function MemberPageShell({
  children,
  searchPlaceholder,
  onSearch,
  header,
  className = '',
  fill = false,
}: MemberPageShellProps) {
  return (
    <div className={fill ? 'flex h-full min-h-0 flex-col overflow-hidden bg-[#F8F3E8]' : 'bg-[#F8F3E8] min-h-full'}>
      <div
        className={
          fill
            ? `mx-auto flex h-full min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col overflow-hidden px-4 pb-4 md:px-8${className ? ` ${className}` : ''}`
            : `${MEMBER_PAGE_COLUMN}${className ? ` ${className}` : ''}`
        }
      >
        <div className={fill ? 'shrink-0' : undefined}>
          {header ?? (
            <MemberGreetingHeader
              searchPlaceholder={searchPlaceholder}
              onSearch={onSearch}
            />
          )}
          <DocumentReacceptBanner />
        </div>
        {fill ? (
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
