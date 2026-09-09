import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPhilippinesGreeting } from '../../../lib/philippines-time';
import { AccountMenu } from './AccountMenu';

interface DashboardGreetingBarProps {
  greeting: string;
  firstName: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  accountMenu: ReactNode;
  leadingExtra?: ReactNode;
  compact?: boolean;
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
  accountMenu,
  leadingExtra,
  compact = false,
}: DashboardGreetingBarProps) {
  const [query, setQuery] = useState('');
  const searchId = useId();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSearch?.(query.trim());
  };

  return (
    <div className={`border-b border-[#D4CDB5]/60 ${compact ? 'pt-4 pb-3' : 'pt-6 pb-5'}`}>
      <div className={`grid grid-cols-[1fr_auto] items-start lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-x-4 ${compact ? 'gap-x-3 gap-y-2' : 'gap-x-3 gap-y-4'}`}>
        <div className="min-w-0 col-start-1 row-start-1">
          {leadingExtra}
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
        </div>

        <div className="col-start-2 row-start-1 self-start lg:self-center lg:col-start-3">
          {accountMenu}
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative col-span-2 row-start-2 w-full min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:w-72"
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className={`w-full rounded-xl border border-[#D4CDB5]/60 bg-white pl-9 pr-[4.75rem] text-sm text-[#1E2A35] placeholder:text-[#B0A898] shadow-sm outline-none transition-colors focus:border-[#c49a3c]/50 focus:ring-2 focus:ring-[#c49a3c]/25 ${compact ? 'h-9' : 'h-11'}`}
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-8 items-center justify-center rounded-lg bg-[#c49a3c] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#a67f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
          >
            Search
          </button>
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
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  /** Override default immediate logout (e.g. show a confirm modal). */
  onLogout?: () => void;
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const displayName = (user?.profile.nickname ?? '').trim() || 'User';

  const handleLogout = onLogout ?? (() => {
    logout();
    navigate('/');
  });

  return (
    <DashboardGreetingBar
      greeting={getPhilippinesGreeting()}
      firstName={displayName}
      searchPlaceholder={searchPlaceholder}
      onSearch={onSearch}
      accountMenu={<AccountMenu onLogout={handleLogout} />}
    />
  );
}
