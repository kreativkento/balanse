import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Menu } from 'lucide-react';

interface AppSidebarLayoutProps {
  children: ReactNode;
  renderSidebar: (closeMobile: () => void) => ReactNode;
  mobileBrand: ReactNode;
  mainOverflow?: 'auto' | 'hidden';
}

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
      <aside className="hidden md:flex w-56 bg-white border-r border-[#D4CDB5]/60 shadow-sm flex-col shrink-0 z-30">
        {renderSidebar(closeMobile)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-[#1E2A35]/40 backdrop-blur-sm" onClick={closeMobile} />
          <aside className="absolute left-0 top-0 h-full w-56 bg-white shadow-2xl z-50 flex flex-col">
            {renderSidebar(closeMobile)}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden bg-white border-b border-[#D4CDB5]/60 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-xl bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35]"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          {mobileBrand}
        </div>

        <main className={`flex-1 min-h-0 flex flex-col ${mainOverflow === 'hidden' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
