import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getAdminPageMeta } from '../../lib/admin-page-meta';
import { getFrontdeskPageMeta } from '../../lib/frontdesk-page-meta';
import { getMarketingPageMeta } from '../../lib/marketing-page-meta';
import { getStaffPageMeta } from '../../lib/staff-page-meta';
import { useAdminHeaderActionsContext } from '../../context/AdminHeaderActionsContext';
import { Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useStaffAuth } from '../../context/StaffAuthContext';
import { getPhilippinesGreeting } from '../../../lib/philippines-time';
import {
  getMemberPortalNavItems,
  searchMemberPortalNav,
} from '../../lib/member-portal-nav-search';
import { searchAdminGlobal } from '../../../lib/admin-global-search-service';
import { searchFrontdeskGlobal } from '../../../lib/frontdesk-global-search-service';
import { searchMarketingGlobal } from '../../../lib/marketing-global-search-service';
import { AccountMenu } from './AccountMenu';

const ADMIN_PORTAL_PATH_PREFIX = '/admin';
const MARKETING_PORTAL_PATH_PREFIX = '/marketing';
const FRONTDESK_PORTAL_PATH_PREFIX = '/frontdesk';

const MEMBER_PORTAL_PATH_PREFIXES = [
  '/dashboard',
  '/profile',
  '/payment-history',
  '/my-classes',
  '/class-schedule',
  '/studio-',
  '/member-',
  '/feedback',
  '/performance',
  '/subscriptions',
  '/credits',
] as const;

function isMemberPortalNavPath(path: string): boolean {
  if (!path.startsWith('/') || path.includes('://')) return false;
  return MEMBER_PORTAL_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix),
  );
}

export interface AdminPageHeaderChrome {
  crumb: string;
  title: string;
  icon?: ReactNode;
}

export interface PortalNavSearchMatch {
  path: string;
  label: string;
  group: string;
  subtitle?: string;
  disabled?: boolean;
}

interface DashboardGreetingBarProps {
  greeting: string;
  firstName: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  /** When set, typing shows member-portal navigation matches (not used with page `onSearch`). */
  navSearchMatches?: (query: string) => PortalNavSearchMatch[];
  onPickNavMatch?: (path: string) => void;
  /** Debounced Supabase / record search (e.g. admin global search). */
  fetchSearchResults?: (query: string, signal: AbortSignal) => Promise<PortalNavSearchMatch[]>;
  accountMenu: ReactNode;
  leadingExtra?: ReactNode;
  compact?: boolean;
  pageHeader?: AdminPageHeaderChrome;
  headerActions?: ReactNode;
}

/**
 * Responsive greeting chrome for member (and staff) dashboards.
 * < lg: greeting + account on row 1, search full-width on row 2
 * ≥ lg: one row — greeting | search (w-72) | account
 */
export function DashboardGreetingBar({
  greeting,
  firstName,
  searchPlaceholder = 'Search…',
  onSearch,
  navSearchMatches,
  onPickNavMatch,
  fetchSearchResults,
  accountMenu,
  leadingExtra,
  compact = false,
  pageHeader,
  headerActions,
}: DashboardGreetingBarProps) {
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<PortalNavSearchMatch[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchFormRef = useRef<HTMLFormElement>(null);
  const searchId = useId();
  const portalSearchMode = Boolean(onPickNavMatch && !onSearch && (navSearchMatches || fetchSearchResults));

  const navResults = useMemo(() => {
    if (!portalSearchMode || !navSearchMatches) return [];
    return navSearchMatches(query);
  }, [portalSearchMode, navSearchMatches, query]);

  useEffect(() => {
    if (!fetchSearchResults || !portalSearchMode) {
      setRemoteResults([]);
      setRemoteLoading(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setRemoteResults([]);
      setRemoteLoading(false);
      return;
    }

    const controller = new AbortController();
    setRemoteLoading(true);
    const timer = window.setTimeout(() => {
      void fetchSearchResults(trimmed, controller.signal)
        .then((rows) => {
          if (!controller.signal.aborted) setRemoteResults(rows);
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemoteResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setRemoteLoading(false);
        });
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchSearchResults, portalSearchMode, query]);

  const combinedResults = useMemo(() => {
    if (!portalSearchMode) return [];
    const seen = new Set<string>();
    const merged: PortalNavSearchMatch[] = [];
    for (const row of [...navResults, ...remoteResults]) {
      const key = `${row.path}:${row.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }
    return merged;
  }, [portalSearchMode, navResults, remoteResults]);

  const hasSuggestions =
    portalSearchMode && query.trim().length > 0 && (combinedResults.length > 0 || remoteLoading);

  const showNavDropdown = hasSuggestions && suggestionsOpen;

  useEffect(() => {
    if (!portalSearchMode) return;
    const onPointerDown = (event: MouseEvent) => {
      const root = searchFormRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setSuggestionsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [portalSearchMode]);

  const openSuggestionsIfEligible = () => {
    if (portalSearchMode && query.trim().length > 0) {
      setSuggestionsOpen(true);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (onSearch) {
      onSearch(trimmed);
      return;
    }
    if (portalSearchMode && onPickNavMatch) {
      const pick = combinedResults.find((row) => !row.disabled) ?? combinedResults[0];
      if (pick && !pick.disabled) {
        onPickNavMatch(pick.path);
        setQuery('');
        setRemoteResults([]);
        setSuggestionsOpen(false);
      }
    }
  };

  const pickNav = (path: string, disabled?: boolean) => {
    if (disabled || !onPickNavMatch) return;
    onPickNavMatch(path);
    setQuery('');
    setRemoteResults([]);
    setSuggestionsOpen(false);
  };

  return (
    <div className={`border-b border-[#D4CDB5]/60 ${compact ? 'pt-4 pb-3' : 'pt-6 pb-5'}`}>
      <div className={`grid grid-cols-[1fr_auto] items-start lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-x-4 ${compact ? 'gap-x-3 gap-y-2' : 'gap-x-3 gap-y-4'}`}>
        <div className="min-w-0 col-start-1 row-start-1">
          {leadingExtra}
          {pageHeader ? (
            <>
              <div className="mb-1 flex items-center gap-2">
                {pageHeader.icon}
                <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">{pageHeader.crumb}</span>
              </div>
              <h1
                className="text-[#1E2A35] leading-tight"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: compact ? 'clamp(1.45rem, 2.8vw, 1.9rem)' : 'clamp(1.8rem, 3vw, 2.4rem)',
                  letterSpacing: '0.04em',
                }}
              >
                {pageHeader.title}
              </h1>
            </>
          ) : (
            <>
              <p className={`text-[#8A7E6E] ${compact ? 'text-xs' : 'text-sm'}`}>{greeting},</p>
              <h1
                className="text-[#1E2A35] leading-tight"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: compact ? 'clamp(1.25rem, 2.8vw, 1.75rem)' : 'clamp(1.45rem, 3.4vw, 2.1rem)',
                  letterSpacing: '0.04em',
                }}
              >
                {firstName}
              </h1>
            </>
          )}
        </div>

        <div className="col-start-2 row-start-1 flex max-w-[min(100%,20rem)] flex-wrap items-center justify-end gap-2 self-start sm:max-w-none lg:col-start-3 lg:self-center">
          {headerActions}
          {accountMenu}
        </div>

        <form
          ref={searchFormRef}
          onSubmit={handleSubmit}
          className="relative z-20 col-span-2 row-start-2 w-full min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:w-72"
          role="search"
        >
          <label htmlFor={searchId} className="sr-only">
            Search
          </label>
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#c49a3c]"
            aria-hidden
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value.trim().length > 0) setSuggestionsOpen(true);
              else setSuggestionsOpen(false);
            }}
            onFocus={openSuggestionsIfEligible}
            onClick={openSuggestionsIfEligible}
            placeholder={searchPlaceholder}
            className={`w-full rounded-xl border border-[#D4CDB5]/60 bg-white pl-9 pr-[4.75rem] text-sm text-[#1E2A35] placeholder:text-[#B0A898] shadow-sm outline-none transition-colors focus:border-[#c49a3c]/50 focus:ring-2 focus:ring-[#c49a3c]/25 ${compact ? 'h-9' : 'h-11'}`}
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-8 items-center justify-center rounded-lg bg-[#c49a3c] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#a67f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
          >
            Search
          </button>
          {showNavDropdown ? (
            <ul
              className="absolute left-0 right-0 top-[calc(100%+0.35rem)] max-h-72 overflow-y-auto rounded-xl border border-[#D4CDB5]/60 bg-white py-1 shadow-lg"
              role="listbox"
              aria-label="Portal navigation matches"
            >
              {remoteLoading && combinedResults.length === 0 ? (
                <li className="px-3 py-2 text-xs text-[#9A8E7E]">Searching…</li>
              ) : null}
              {combinedResults.map((row) => (
                <li key={`${row.path}:${row.label}`}>
                  <button
                    type="button"
                    role="option"
                    disabled={row.disabled}
                    onClick={() => pickNav(row.path, row.disabled)}
                    className={`flex w-full flex-col items-start px-3 py-2 text-left transition-colors ${
                      row.disabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-[#F8F3E8] focus-visible:bg-[#F8F3E8] outline-none'
                    }`}
                  >
                    <span className="text-sm font-semibold text-[#1E2A35]">{row.label}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[#9A8E7E]">
                      {row.group}
                      {row.disabled ? ' · Unavailable' : ''}
                    </span>
                    {row.subtitle ? (
                      <span className="mt-0.5 line-clamp-1 text-[11px] normal-case tracking-normal text-[#8A7E6E]">
                        {row.subtitle}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      </div>
    </div>
  );
}

/** Shared dashboard chrome: greeting, search, and account menu. */
export function MemberGreetingHeader({
  searchPlaceholder = 'Search…',
  onSearch,
  onLogout,
  pageHeader,
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  /** Override default immediate logout (e.g. show a confirm modal). */
  onLogout?: () => void;
  pageHeader?: AdminPageHeaderChrome;
}) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const displayName = (user?.profile.nickname ?? '').trim() || 'User';

  const handleLogout = onLogout ?? (() => {
    logout();
    navigate('/');
  });

  const memberPortalNavActive = isAuthenticated && !!user && !onSearch;

  const resolveNavMatches = memberPortalNavActive
    ? (q: string) =>
        searchMemberPortalNav(q, getMemberPortalNavItems()).map((item) => ({
          path: item.path,
          label: item.label,
          group: item.group,
          disabled: item.navigable === false,
        }))
    : undefined;

  const handlePickNav = memberPortalNavActive
    ? (path: string) => {
        if (!isMemberPortalNavPath(path)) return;
        navigate(path);
      }
    : undefined;

  return (
    <DashboardGreetingBar
      greeting={getPhilippinesGreeting()}
      firstName={displayName}
      searchPlaceholder={
        searchPlaceholder
        ?? (memberPortalNavActive ? 'Search pages and shortcuts…' : 'Search…')
      }
      onSearch={onSearch}
      navSearchMatches={resolveNavMatches}
      onPickNavMatch={handlePickNav}
      pageHeader={pageHeader}
      accountMenu={<AccountMenu onLogout={handleLogout} />}
    />
  );
}

/** Shared front desk chrome: page title, search, and account menu. */
export function FrontdeskGreetingHeader({
  searchPlaceholder = 'Search…',
  onSearch,
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminUser, adminLogout } = useAdminAuth();
  const headerActionsCtx = useAdminHeaderActionsContext();
  const firstName = adminUser?.name.trim().split(/\s+/)[0] || 'Front Desk';
  const pageMeta = getFrontdeskPageMeta(location.pathname);
  const pageHeader = pageMeta
    ? {
        crumb: pageMeta.crumb,
        title: pageMeta.title,
        icon: pageMeta.icon ? (
          <pageMeta.icon size={14} className="shrink-0 text-[#c49a3c]" aria-hidden />
        ) : undefined,
      }
    : undefined;

  const handleFrontdeskPick = (path: string) => {
    if (!path.startsWith(FRONTDESK_PORTAL_PATH_PREFIX)) return;
    navigate(path);
  };

  const handleFrontdeskFetch = onSearch
    ? undefined
    : (q: string, signal: AbortSignal) =>
        searchFrontdeskGlobal(q, signal).then((rows) =>
          rows.map((row) => ({
            path: row.path,
            label: row.label,
            group: row.group,
            subtitle: row.subtitle,
          })),
        );

  return (
    <DashboardGreetingBar
      greeting={getPhilippinesGreeting()}
      firstName={firstName}
      pageHeader={pageHeader}
      headerActions={pageHeader ? headerActionsCtx?.actions : undefined}
      searchPlaceholder={searchPlaceholder}
      onSearch={onSearch}
      fetchSearchResults={handleFrontdeskFetch}
      onPickNavMatch={onSearch ? undefined : handleFrontdeskPick}
      accountMenu={
        <AccountMenu
          onLogout={() => {
            void adminLogout();
            navigate('/staff-login');
          }}
          name={adminUser?.name}
          email={adminUser?.email}
          photo={adminUser?.photo}
          profilePath="/frontdesk-account"
        />
      }
    />
  );
}

/** Shared marketing chrome: page title, search, and account menu. */
export function MarketingGreetingHeader({
  searchPlaceholder = 'Search…',
  onSearch,
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminUser, adminLogout } = useAdminAuth();
  const headerActionsCtx = useAdminHeaderActionsContext();
  const firstName = adminUser?.name.trim().split(/\s+/)[0] || 'Marketing';
  const pageMeta = getMarketingPageMeta(location.pathname);
  const pageHeader = pageMeta
    ? {
        crumb: pageMeta.crumb,
        title: pageMeta.title,
        icon: pageMeta.icon ? (
          <pageMeta.icon size={14} className="shrink-0 text-[#c49a3c]" aria-hidden />
        ) : undefined,
      }
    : undefined;

  const handleMarketingPick = (path: string) => {
    if (!path.startsWith(MARKETING_PORTAL_PATH_PREFIX)) return;
    navigate(path);
  };

  const handleMarketingFetch = onSearch
    ? undefined
    : (q: string, signal: AbortSignal) =>
        searchMarketingGlobal(q, signal).then((rows) =>
          rows.map((row) => ({
            path: row.path,
            label: row.label,
            group: row.group,
            subtitle: row.subtitle,
          })),
        );

  return (
    <DashboardGreetingBar
      greeting={getPhilippinesGreeting()}
      firstName={firstName}
      pageHeader={pageHeader}
      headerActions={pageHeader ? headerActionsCtx?.actions : undefined}
      searchPlaceholder={searchPlaceholder}
      onSearch={onSearch}
      fetchSearchResults={handleMarketingFetch}
      onPickNavMatch={onSearch ? undefined : handleMarketingPick}
      accountMenu={
        <AccountMenu
          onLogout={() => {
            void adminLogout();
            navigate('/staff-login');
          }}
          name={adminUser?.name}
          email={adminUser?.email}
          photo={adminUser?.photo}
          profilePath="/marketing-account"
        />
      }
    />
  );
}

/** Shared admin chrome: greeting, search, and account menu. */
export function AdminGreetingHeader({
  searchPlaceholder = 'Search…',
  onSearch,
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminUser, adminLogout } = useAdminAuth();
  const headerActionsCtx = useAdminHeaderActionsContext();
  const firstName = adminUser?.name.trim().split(/\s+/)[0] || 'Admin';
  const pageMeta = getAdminPageMeta(location.pathname);
  const pageHeader = pageMeta
    ? {
        crumb: pageMeta.crumb,
        title: pageMeta.title,
        icon: pageMeta.icon ? (
          <pageMeta.icon size={14} className="shrink-0 text-[#c49a3c]" aria-hidden />
        ) : undefined,
      }
    : undefined;

  const handleAdminPick = (path: string) => {
    if (!path.startsWith(ADMIN_PORTAL_PATH_PREFIX)) return;
    navigate(path);
  };

  const handleAdminFetch = onSearch
    ? undefined
    : (q: string, signal: AbortSignal) =>
        searchAdminGlobal(q, signal).then((rows) =>
          rows.map((row) => ({
            path: row.path,
            label: row.label,
            group: row.group,
            subtitle: row.subtitle,
          })),
        );

  return (
    <DashboardGreetingBar
      greeting={getPhilippinesGreeting()}
      firstName={firstName}
      pageHeader={pageHeader}
      headerActions={pageHeader ? headerActionsCtx?.actions : undefined}
      searchPlaceholder={searchPlaceholder}
      onSearch={onSearch}
      fetchSearchResults={handleAdminFetch}
      onPickNavMatch={onSearch ? undefined : handleAdminPick}
      accountMenu={
        <AccountMenu
          onLogout={() => {
            void adminLogout();
            navigate('/admin-login');
          }}
          name={adminUser?.name}
          email={adminUser?.email}
          photo={adminUser?.photo}
          profilePath="/admin-account"
        />
      }
    />
  );
}

/** Shared staff portal chrome: greeting or page title, search, account menu. */
export function StaffGreetingHeader({
  searchPlaceholder = 'Search classes, students…',
  onSearch,
  compact = false,
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { staffUser, staffProfile, staffLogout } = useStaffAuth();
  const firstName = staffUser?.name.trim().split(/\s+/)[0] || 'Coach';
  const pageMeta = getStaffPageMeta(location.pathname);
  const pageHeader = pageMeta
    ? {
        crumb: pageMeta.crumb,
        title: pageMeta.title,
        icon: pageMeta.icon ? (
          <pageMeta.icon size={14} className="shrink-0 text-[#c49a3c]" aria-hidden />
        ) : undefined,
      }
    : undefined;

  const leadingExtra =
    !pageHeader && staffUser ? (
      <div className="mb-1 flex items-center gap-2">
        <ShieldCheck size={13} className="text-[#c49a3c]" />
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-widest ${
            staffUser.role === 'Administrator'
              ? 'bg-[#3A4A5A]/10 text-[#3A4A5A]'
              : 'bg-[#c49a3c]/12 text-[#a67f2e]'
          }`}
        >
          {staffUser.role}
        </span>
      </div>
    ) : undefined;

  return (
    <DashboardGreetingBar
      greeting={getPhilippinesGreeting()}
      firstName={firstName}
      compact={compact}
      pageHeader={pageHeader}
      leadingExtra={leadingExtra}
      searchPlaceholder={searchPlaceholder}
      onSearch={onSearch}
      accountMenu={
        <AccountMenu
          onLogout={() => {
            staffLogout();
            navigate('/staff-login');
          }}
          name={staffProfile?.displayName || staffUser?.name}
          email={staffUser?.email}
          photo={staffProfile?.photo}
          profilePath="/staff-profile"
        />
      }
    />
  );
}
