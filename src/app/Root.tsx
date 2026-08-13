import { Outlet, useLocation } from 'react-router';
import { NavBar } from './components/layout/NavBar';
import { BottomCTA } from './components/layout/BottomCTA';
import { AuthProvider } from './context/AuthContext';
import { StaffAuthProvider } from './context/StaffAuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { DevAuthProvider } from './context/DevAuthContext';

const PAGES_WITH_CTA = ['/', '/gallery', '/pricing', '/classes'];

// Paths that are standalone portals — hide the public NavBar
const PORTAL_PREFIXES = ['/development', '/staff-login', '/staff-dashboard', '/staff-schedule', '/staff-gallery', '/staff-account', '/staff-availability', '/staff-profile', '/admin-login', '/admin-dashboard', '/admin-staff', '/admin-students', '/admin-schedule', '/admin-payments', '/admin-gallery', '/admin-disciplines', '/admin-events', '/admin-subscriptions', '/admin-promos', '/admin-policies', '/admin-absence', '/admin-coach-availability'];

function Shell() {
  const location = useLocation();
  const isPortal    = PORTAL_PREFIXES.some((p) => location.pathname.startsWith(p));
  const showBottomCTA = PAGES_WITH_CTA.includes(location.pathname);

  if (isPortal) {
    return (
      <div className="min-h-screen bg-[#F8F3E8]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F3E8] flex flex-col">
      <NavBar />
      <main className="flex-1">
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