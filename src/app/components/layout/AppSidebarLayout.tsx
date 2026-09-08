import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Menu } from 'lucide-react';

interface AppSidebarLayoutProps {
  children: ReactNode;
  renderSidebar: (closeMobile: () => void) => ReactNode;
  mobileBrand: ReactNode;
  mainOverflow?: 'auto' | 'hidden';
}

/**
 * Shared sidebar shell for member / admin / staff.
 * < md: hamburger + brand bar; drawer overlay (w-56)
 * ≥ md: fixed w-56 sidebar; main uses flex-1 min-w-0 (avoids horizontal overflow)
 */
export function AppSidebarLayout({
  children,
  renderSidebar,
  mobileBrand,
  mainOverflow = 'auto',
}: AppSidebarLayoutProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F3E8]">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-[#D4CDB5]/60 bg-white shadow-sm z-30">
        {renderSidebar(closeMobile)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-[#1E2A35]/40 backdrop-blur-sm" onClick={closeMobile} />
          <aside className="absolute left-0 top-0 z-50 flex h-full w-56 flex-col bg-white shadow-2xl">
            {renderSidebar(closeMobile)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-[#D4CDB5]/60 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDE8D8] text-[#1E2A35]"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          {mobileBrand}
        </div>

        <main
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${
            mainOverflow === 'hidden' ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
