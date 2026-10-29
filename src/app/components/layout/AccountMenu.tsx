import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileAvatar } from '../ProfileImages';

interface AccountMenuProps {
  onLogout: () => void;
  name?: string;
  email?: string;
  photo?: string | null;
  profilePath?: string;
  variant?: 'card' | 'avatar' | 'header';
}

export function AccountMenu({
  onLogout,
  name,
  email,
  photo,
  profilePath = '/profile?tab=account',
  variant = 'header',
}: AccountMenuProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayName = name ?? user?.name ?? 'Member';
  const displayEmail = email ?? user?.email ?? '';
  const displayPhoto = photo ?? user?.profile.photo;
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'M';

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={variant === 'header' || variant === 'avatar' ? `Open account menu for ${displayName}` : undefined}
        className={
          variant === 'avatar'
            ? `flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 bg-[#c49a3c]/15 transition-all hover:bg-[#c49a3c]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50 active:scale-95 ${
                open ? 'border-[#c49a3c]' : 'border-[#c49a3c]/40'
              }`
            : variant === 'header'
              ? 'flex max-w-[14rem] items-center gap-2 rounded-md bg-transparent p-0 text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50'
              : 'flex max-w-[18rem] items-center gap-3 rounded-xl border border-[#D4CDB5]/60 bg-white px-3 py-2 shadow-sm transition-colors hover:bg-[#EDE8D8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50'
        }
      >
        <div
          className={
            variant === 'avatar'
              ? 'h-full w-full overflow-hidden rounded-full'
              : variant === 'header'
                ? 'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#c49a3c]/20'
                : 'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#c49a3c]/30 bg-[#c49a3c]/15'
          }
        >
          <ProfileAvatar
            src={displayPhoto}
            initials={initials}
            alt=""
            className="h-full w-full"
            initialsClassName={`text-[#c49a3c] font-bold ${variant === 'avatar' ? 'text-sm' : 'text-xs'}`}
          />
        </div>
        {variant === 'header' && (
          <>
            <span className="hidden min-w-0 truncate text-left text-sm font-medium leading-none text-white md:inline">
              {displayName}
            </span>
            <ChevronDown
              size={15}
              className={`hidden shrink-0 text-white/70 transition-transform md:block ${open ? 'rotate-180' : ''}`}
            />
          </>
        )}
        {variant === 'card' && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold leading-none text-[#1E2A35]">{displayName}</p>
              <p className="mt-0.5 truncate text-[0.68rem] text-[#B0A898]">{displayEmail}</p>
            </div>
            <ChevronDown
              size={16}
              className={`shrink-0 text-[#8A7E6E] transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-[#D4CDB5]/70 bg-white py-1.5 shadow-xl"
        >
          {variant === 'header' && displayEmail ? (
            <div className="border-b border-[#D4CDB5]/40 px-3.5 py-2">
              <p className="truncate text-sm font-semibold text-[#1E2A35]">{displayName}</p>
              <p className="truncate text-[0.68rem] text-[#B0A898]">{displayEmail}</p>
            </div>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate(profilePath);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-[#1E2A35] transition-colors hover:bg-[#EDE8D8]"
          >
            <Settings size={15} className="text-[#c49a3c]" />
            Account Settings
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={15} />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
