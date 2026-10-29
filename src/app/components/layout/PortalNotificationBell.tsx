import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell } from 'lucide-react';
import {
  fetchAccountNotifications,
  markAccountNotificationRead,
  markAllAccountNotificationsRead,
  type AccountNotification,
} from '../../../lib/feedback-comment-service';
import { useUnreadAccountNotifications } from '../../hooks/useUnreadAccountNotifications';

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PortalNotificationBell() {
  const navigate = useNavigate();
  const unreadCount = useUnreadAccountNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AccountNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetchAccountNotifications().then((result) => {
      setItems(result.data);
      setLoading(false);
    });
  }, [open, unreadCount]);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  const openItem = async (item: AccountNotification) => {
    setOpen(false);
    await markAccountNotificationRead(item.id);
    if (item.href) navigate(item.href);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#D4CDB5]/70 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#D4CDB5]/50 px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8A7E6E]">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  void markAllAccountNotificationsRead();
                }}
                className="text-[11px] font-semibold text-[#c49a3c] hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-[#8A7E6E]">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#8A7E6E]">No notifications yet.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    void openItem(item);
                  }}
                  className={`flex w-full flex-col gap-0.5 border-b border-[#F0EBE0] px-4 py-3 text-left transition-colors hover:bg-[#F8F3E8] ${
                    item.readAt ? 'opacity-70' : ''
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-[#1E2A35]">{item.title}</span>
                    {!item.readAt ? (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />
                    ) : null}
                  </span>
                  <span className="line-clamp-2 text-xs text-[#5A5048]">{item.body}</span>
                  <span className="text-[11px] text-[#9A8E7E]">{formatWhen(item.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
