import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getAdminPageMeta } from '../../lib/admin-page-meta';
import { getFrontdeskPageMeta } from '../../lib/frontdesk-page-meta';
import { getMarketingPageMeta } from '../../lib/marketing-page-meta';
import { getStaffPageMeta } from '../../lib/staff-page-meta';
import { useAdminHeaderActionsContext } from '../../context/AdminHeaderActionsContext';
import { usePortalChrome } from '../../context/PortalChromeContext';
import { ConciergeBell, Crown, Megaphone, Search, ShieldCheck, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useStaffAuth } from '../../context/StaffAuthContext';
import {
  getMemberPortalNavItems,
  searchMemberPortalNav,
} from '../../lib/member-portal-nav-search';
import { searchAdminGlobal } from '../../../lib/admin-global-search-service';
import { searchFrontdeskGlobal } from '../../../lib/frontdesk-global-search-service';
import { searchMarketingGlobal } from '../../../lib/marketing-global-search-service';
import { AccountMenu } from './AccountMenu';
import { PortalNotificationBell } from './PortalNotificationBell';
import { PAGE_HEADING_TOOLBAR_ROW_CLASS, PortalAppHeader, PortalPageHeading, PortalRoleBadge } from './PortalAppHeader';
import { PortalSectionSubnav } from './PortalSectionSubnav';
import logoMainWhite from '@/assets/logo_main_white.svg';

const ADMIN_PORTAL_PATH_PREFIX = '/admin';
const MARKETING_PORTAL_PATH_PREFIX = '/marketing';
const FRONTDESK_PORTAL_PATH_PREFIX = '/frontdesk';

/** Feedback pages that render Inbox / My Submissions in the page; keep the h1 in that content, not in chrome. */
const FEEDBACK_PAGES_WITH_QUEUE_NAV = new Set([
  '/feedback',
  '/admin-feedback',
  '/frontdesk-feedback',
  '/development/feedback',
]);

const MEMBER_PORTAL_PATH_PREFIXES = [
  '/dashboard',
  '/profile',
  '/payment-history',
  '/my-classes',
  '/class-schedule',
  '/studio-',
  '/member-',
  '/feedback',
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

interface PortalSearchProps {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  navSearchMatches?: (query: string) => PortalNavSearchMatch[];
  onPickNavMatch?: (path: string) => void;
  fetchSearchResults?: (query: string, signal: AbortSignal) => Promise<PortalNavSearchMatch[]>;
}

export function PortalSearch({
  searchPlaceholder = 'Search…',
  onSearch,
  navSearchMatches,
  onPickNavMatch,
  fetchSearchResults,
}: PortalSearchProps) {
  const chrome = usePortalChrome();
  const override = chrome?.searchOverride;
  const effectiveOnSearch = override?.onSearch ?? onSearch;
  const effectivePlaceholder = override?.placeholder ?? searchPlaceholder;

  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<PortalNavSearchMatch[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchFormRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchId = useId();
  const portalSearchMode = Boolean(onPickNavMatch && !effectiveOnSearch && (navSearchMatches || fetchSearchResults));

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
    if (!portalSearchMode && !mobileOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const root = searchFormRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setSuggestionsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [portalSearchMode, mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    searchInputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const closeMobileSearch = () => {
    setMobileOpen(false);
    setSuggestionsOpen(false);
  };

  const openSuggestionsIfEligible = () => {
    if (portalSearchMode && query.trim().length > 0) {
      setSuggestionsOpen(true);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (effectiveOnSearch) {
      effectiveOnSearch(trimmed);
      closeMobileSearch();
      return;
    }
    if (portalSearchMode && onPickNavMatch) {
      const pick = combinedResults.find((row) => !row.disabled) ?? combinedResults[0];
      if (pick && !pick.disabled) {
        onPickNavMatch(pick.path);
        setQuery('');
        setRemoteResults([]);
        setSuggestionsOpen(false);
        closeMobileSearch();
      }
    }
  };

  const pickNav = (path: string, disabled?: boolean) => {
    if (disabled || !onPickNavMatch) return;
    onPickNavMatch(path);
    setQuery('');
    setRemoteResults([]);
    setSuggestionsOpen(false);
    closeMobileSearch();
  };

  const searchField = (
    <>
      <label htmlFor={searchId} className="sr-only">
        Search
      </label>
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#c49a3c]"
        aria-hidden
      />
      <input
        ref={searchInputRef}
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
        placeholder={effectivePlaceholder}
        className="h-10 w-full rounded-xl border border-white/15 bg-white pl-9 pr-[4.5rem] text-sm text-[#1E2A35] placeholder:text-[#B0A898] outline-none transition-colors focus:border-[#c49a3c]/50 focus:ring-2 focus:ring-[#c49a3c]/25"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 inline-flex h-7 -translate-y-1/2 items-center justify-center rounded-lg bg-[#c49a3c] px-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#a67f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
      >
        Search
      </button>
      {showNavDropdown ? (
        <ul
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 max-h-72 overflow-y-auto rounded-xl border border-[#D4CDB5]/60 bg-white py-1 shadow-lg"
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
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white md:hidden"
        aria-label="Open search"
      >
        <Search size={18} />
      </button>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-[80] bg-[#1E2A35]/50 md:hidden"
          onClick={closeMobileSearch}
          aria-hidden
        />
      ) : null}

      <form
        ref={searchFormRef}
        onSubmit={handleSubmit}
        role="search"
        className={
          mobileOpen
            ? 'fixed inset-x-0 top-0 z-[90] flex items-start gap-2 border-b border-white/10 bg-[#1E2A35] px-3 py-2 md:relative md:inset-auto md:z-20 md:block md:w-72 md:border-0 md:bg-transparent md:p-0'
            : 'relative z-20 hidden min-w-0 w-72 md:block'
        }
      >
        {mobileOpen ? (
          <button
            type="button"
            onClick={closeMobileSearch}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white md:hidden"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        ) : null}
        <div className="relative min-w-0 flex-1">{searchField}</div>
      </form>
    </>
  );
}

export function PortalContentHeading({
  pageHeader,
  leadingExtra,
  compact = false,
  includeSubnav = true,
  flushTop = false,
  slot = 'both',
}: {
  pageHeader?: AdminPageHeaderChrome;
  leadingExtra?: ReactNode;
  compact?: boolean;
  includeSubnav?: boolean;
  flushTop?: boolean;
  slot?: 'nav' | 'title' | 'both';
}) {
  const { pathname } = useLocation();
  const headingLivesInPage = FEEDBACK_PAGES_WITH_QUEUE_NAV.has(pathname);
  const setTitleToolbarHost = usePortalChrome()?.setTitleToolbarHost;

  if (slot === 'nav') {
    if (!includeSubnav) return null;
    return <PortalSectionSubnav />;
  }

  if (slot === 'title' && (headingLivesInPage || !pageHeader)) {
    return null;
  }

  const title = (
    <>
      {leadingExtra}
      <PortalPageHeading
        crumb={pageHeader!.crumb}
        title={pageHeader!.title}
        icon={pageHeader!.icon}
        compact={compact}
      />
    </>
  );

  const titleRow = (
    <div className={PAGE_HEADING_TOOLBAR_ROW_CLASS}>
      <div className="min-w-0 shrink-0">{title}</div>
      <div
        ref={(node) => setTitleToolbarHost?.(node)}
        className="flex min-w-0 flex-1 items-center gap-3 flex-wrap"
      />
    </div>
  );

  if (slot === 'title') {
    return (
      <div
        className={`shrink-0 ${
          flushTop ? 'pb-2 md:pb-3' : compact ? 'pt-2 pb-1.5 md:pt-3 md:pb-2' : 'pt-2.5 pb-2 md:pt-4 md:pb-3'
        }`}
      >
        {titleRow}
      </div>
    );
  }

  const spacing = flushTop
    ? 'pb-2.5 md:pb-4'
    : compact
      ? 'pt-2.5 pb-2 md:pt-4 md:pb-3'
      : 'pt-3 pb-2.5 md:pt-5 md:pb-4';

  return (
    <div className={`shrink-0 ${spacing}`}>
      {includeSubnav ? <PortalSectionSubnav /> : null}
      {headingLivesInPage || !pageHeader ? null : titleRow}
    </div>
  );
}

/** Member app header (brand, search, account). */
export function MemberPortalHeader({
  searchPlaceholder = 'Search pages and shortcuts…',
  onSearch,
  onLogout,
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onLogout?: () => void;
}) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

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
    <PortalAppHeader
      homeHref="/dashboard"
      logoSrc={logoMainWhite}
      badge={
        <PortalRoleBadge
          label="Member"
          icon={<User size={8} className="text-[#1E2A35]" />}
        />
      }
      search={
        <PortalSearch
          searchPlaceholder={searchPlaceholder}
          onSearch={onSearch}
          navSearchMatches={resolveNavMatches}
          onPickNavMatch={handlePickNav}
        />
      }
      notifications={<PortalNotificationBell />}
      accountMenu={<AccountMenu onLogout={handleLogout} />}
    />
  );
}

/** In-content page title chrome for member pages (when route meta provides a title). */
export function MemberGreetingHeader({
  searchPlaceholder = 'Search…',
  onSearch,
  onLogout,
  pageHeader,
  flushTop = false,
  slot = 'both',
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  pageHeader?: AdminPageHeaderChrome;
  flushTop?: boolean;
  slot?: 'nav' | 'title' | 'both';
}) {
  void searchPlaceholder;
  void onSearch;
  void onLogout;
  return (
    <PortalContentHeading
      pageHeader={pageHeader}
      includeSubnav={false}
      flushTop={flushTop}
      slot={slot}
    />
  );
}

export function FrontdeskPortalHeader({
  searchPlaceholder = 'Search…',
  onSearch,
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}) {
  const navigate = useNavigate();
  const { adminUser, adminLogout } = useAdminAuth();
  const headerActionsCtx = useAdminHeaderActionsContext();

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
    <PortalAppHeader
      homeHref="/frontdesk-dashboard"
      logoSrc={logoMainWhite}
      badge={
        <PortalRoleBadge
          label="Front Desk"
          tone="sage"
          icon={<ConciergeBell size={8} className="text-white" />}
        />
      }
      headerActions={headerActionsCtx?.actions}
      search={
        <PortalSearch
          searchPlaceholder={searchPlaceholder}
          onSearch={onSearch}
          fetchSearchResults={handleFrontdeskFetch}
          onPickNavMatch={onSearch ? undefined : handleFrontdeskPick}
        />
      }
      notifications={<PortalNotificationBell />}
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

export function FrontdeskGreetingHeader({ slot = 'both' }: { slot?: 'nav' | 'title' | 'both' }) {
  const location = useLocation();
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

  return (
    <PortalContentHeading
      pageHeader={pageHeader}
      slot={slot}
    />
  );
}

export function MarketingPortalHeader({
  searchPlaceholder = 'Search…',
  onSearch,
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}) {
  const navigate = useNavigate();
  const { adminUser, adminLogout } = useAdminAuth();
  const headerActionsCtx = useAdminHeaderActionsContext();

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
    <PortalAppHeader
      homeHref="/marketing-dashboard"
      logoSrc={logoMainWhite}
      badge={
        <PortalRoleBadge
          label="Marketing"
          icon={<Megaphone size={8} className="text-[#1E2A35]" />}
        />
      }
      headerActions={headerActionsCtx?.actions}
      search={
        <PortalSearch
          searchPlaceholder={searchPlaceholder}
          onSearch={onSearch}
          fetchSearchResults={handleMarketingFetch}
          onPickNavMatch={onSearch ? undefined : handleMarketingPick}
        />
      }
      notifications={<PortalNotificationBell />}
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

export function MarketingGreetingHeader({ slot = 'both' }: { slot?: 'nav' | 'title' | 'both' }) {
  const location = useLocation();
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

  return (
    <PortalContentHeading
      pageHeader={pageHeader}
      slot={slot}
    />
  );
}

export function AdminPortalHeader({
  searchPlaceholder = 'Search…',
  onSearch,
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}) {
  const navigate = useNavigate();
  const { adminUser, adminLogout } = useAdminAuth();
  const headerActionsCtx = useAdminHeaderActionsContext();

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
    <PortalAppHeader
      homeHref="/admin-dashboard"
      logoSrc={logoMainWhite}
      badge={
        <PortalRoleBadge
          label="Admin"
          icon={<Crown size={8} className="text-[#1E2A35]" />}
        />
      }
      headerActions={headerActionsCtx?.actions}
      search={
        <PortalSearch
          searchPlaceholder={searchPlaceholder}
          onSearch={onSearch}
          fetchSearchResults={handleAdminFetch}
          onPickNavMatch={onSearch ? undefined : handleAdminPick}
        />
      }
      notifications={<PortalNotificationBell />}
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

export function AdminGreetingHeader({ slot = 'both' }: { slot?: 'nav' | 'title' | 'both' }) {
  const location = useLocation();
  if (location.pathname === '/admin-dashboard') return null;

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

  return (
    <PortalContentHeading
      pageHeader={pageHeader}
      slot={slot}
    />
  );
}

export function StaffPortalHeader({
  searchPlaceholder = 'Search classes, students…',
  onSearch,
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}) {
  const navigate = useNavigate();
  const { staffUser, staffProfile, staffLogout } = useStaffAuth();

  return (
    <PortalAppHeader
      homeHref="/staff-dashboard"
      logoSrc={logoMainWhite}
      badge={
        <PortalRoleBadge
          label="Staff"
          icon={<ShieldCheck size={8} className="text-[#1E2A35]" />}
        />
      }
      search={<PortalSearch searchPlaceholder={searchPlaceholder} onSearch={onSearch} />}
      notifications={<PortalNotificationBell />}
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

export function StaffGreetingHeader({
  compact = false,
  slot = 'both',
}: {
  compact?: boolean;
  slot?: 'nav' | 'title' | 'both';
}) {
  const location = useLocation();
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

  return (
    <PortalContentHeading
      compact={compact}
      pageHeader={pageHeader}
      slot={slot}
    />
  );
}
