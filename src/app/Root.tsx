import { Outlet, useLocation } from 'react-router';
import { NavBar } from './components/layout/NavBar';
import { BottomCTA } from './components/layout/BottomCTA';
import { AuthProvider } from './context/AuthContext';
import { StaffAuthProvider } from './context/StaffAuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { DevAuthProvider } from './context/DevAuthContext';

const PAGES_WITH_CTA = ['/', '/studio', '/studio/guidelines', '/pricing', '/services', '/classes', '/disciplines'];

// Standalone portals — hide the public NavBar
const PORTAL_PREFIXES = [
  '/development',
  '/staff-',
  '/admin',
];

function Shell() {
  const location = useLocation();
  const isPortal = PORTAL_PREFIXES.some((p) => location.pathname.startsWith(p));
  const showBottomCTA = PAGES_WITH_CTA.includes(location.pathname);
  const lockScroll =
    location.pathname === '/login'
    || location.pathname === '/signup'
    || location.pathname === '/coaches'
    || location.pathname === '/disciplines';

  if (isPortal) {
    return (
      <div className="min-h-screen bg-[#F8F3E8]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className={`bg-[#F8F3E8] flex flex-col ${lockScroll ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
      <NavBar />
      <main className={`flex-1 ${lockScroll ? 'min-h-0 overflow-hidden' : ''}`}>
        <Outlet />
      </main>
      {showBottomCTA && <BottomCTA />}
    </div>
  );
}

export function Root() {
  return (
    <DevAuthProvider>
      <AdminAuthProvider>
        <StaffAuthProvider>
          <AuthProvider>
            <Shell />
          </AuthProvider>
        </StaffAuthProvider>
      </AdminAuthProvider>
    </DevAuthProvider>
  );
}