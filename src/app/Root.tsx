import { Outlet, useLocation } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { StaffAuthProvider } from './context/StaffAuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { DevAuthProvider } from './context/DevAuthContext';

// Standalone portals — hide the public NavBar / student sidebar
const PORTAL_PREFIXES = [
  '/development',
  '/staff-',
  '/admin',
];

function Shell() {
  const location = useLocation();
  const isPortal = PORTAL_PREFIXES.some((p) => location.pathname.startsWith(p));

  if (isPortal) {
    return (
      <div className="min-h-screen bg-[#F8F3E8]">
        <Outlet />
      </div>
    );
  }

  return <Outlet />;
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
