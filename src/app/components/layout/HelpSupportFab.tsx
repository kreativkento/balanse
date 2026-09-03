import { useEffect, useRef, useState } from 'react';
import { BookOpen, Headphones, MessageCircle, Send, X } from 'lucide-react';
import { cn } from '../ui/utils';

const menuItems = [
  { id: 'help', label: 'FAQs', icon: BookOpen },
  { id: 'support', label: 'Support', icon: Headphones },
  { id: 'chatbot', label: 'Chatbot', icon: MessageCircle },
] as const;

type MenuItemId = (typeof menuItems)[number]['id'];

export function HelpSupportFab() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleMenuSelect = (id: MenuItemId) => {
    setMenuOpen(false);

    if (id === 'help') {
      document.getElementById('why-balanse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (id === 'support') {
      window.location.href = 'mailto:support@balanse.com?subject=BALANS%C3%89%20Support%20Request';
      return;
    }

    setChatOpen(true);
  };

  return (
    <>
      {!chatOpen && (
        <div
          ref={containerRef}
          className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3 md:bottom-6 md:right-6"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div
            role="menu"
            aria-label="Help options"
            aria-hidden={!menuOpen}
            className={cn(
              'min-w-[168px] rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8] p-2 shadow-[0_8px_32px_rgba(30,42,53,0.12)] origin-bottom-right transition-all duration-200 ease-out',
              menuOpen
                ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                : 'pointer-events-none translate-y-2 scale-95 opacity-0',
            )}
          >
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => handleMenuSelect(item.id)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#1E2A35] transition-colors hover:bg-[#EDE8D8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50 active:scale-[0.98]"
              >
                <item.icon size={18} className="shrink-0 text-[#c49a3c]" aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={menuOpen ? 'Close help menu' : 'Open help menu'}
            onClick={() => setMenuOpen((prev) => !prev)}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full bg-[#c49a3c] text-xl font-bold text-white shadow-[0_4px_20px_rgba(196,154,60,0.35)] transition-all duration-200 hover:bg-[#a67f2e] hover:shadow-[0_6px_24px_rgba(196,154,60,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F3E8] active:scale-[0.97]',
              menuOpen && 'scale-105 bg-[#a67f2e]',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'leading-none transition-transform duration-200',
                menuOpen && 'rotate-12 scale-110',
              )}
            >
              ?
            </span>
          </button>
        </div>
      )}

      {chatOpen && (
        <div
          className="fixed bottom-24 right-4 z-40 w-[min(calc(100vw-2rem),320px)] md:bottom-6 md:right-6"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div
            className="overflow-hidden rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8] shadow-[0_8px_32px_rgba(30,42,53,0.14)] animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
            role="dialog"
            aria-label="Chatbot"
          >
            <div className="flex items-center justify-between border-b border-[#D4CDB5]/60 bg-[#EDE8D8] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#1E2A35]">BALANSÉ Assistant</p>
                <p className="text-xs text-[#8A7E6E]">Ask us anything about classes & membership</p>
              </div>
              <button
                type="button"
                aria-label="Close chatbot"
                onClick={() => setChatOpen(false)}
                className="rounded-full p-2 text-[#8A7E6E] transition-colors hover:bg-[#F8F3E8] hover:text-[#1E2A35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <div className="rounded-2xl rounded-tl-sm border border-[#D4CDB5]/60 bg-white px-3 py-2.5 text-sm text-[#5A5048]">
                Hi! I can help with class schedules, pricing, and booking. How can I assist you today?
              </div>

              <div className="flex items-center gap-2 rounded-full border border-[#D4CDB5]/60 bg-white px-3 py-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  aria-label="Chat message"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#1E2A35] placeholder:text-[#8A7E6E] focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Send message"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c49a3c] text-white transition-colors hover:bg-[#a67f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
