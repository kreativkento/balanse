import { useAuth } from '../context/AuthContext';
import { useStaffAuth } from '../context/StaffAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useDevAuth } from '../context/DevAuthContext';
import type { UserRole } from '../../lib/database.types';

export function useAuthenticatedSession(): {
  sessionReady: boolean;
  role: UserRole | null;
} {
  const { user, authReady } = useAuth();
  const { staffUser, staffAuthReady } = useStaffAuth();
  const { adminUser, adminAuthReady } = useAdminAuth();
  const { devUser, devAuthReady } = useDevAuth();

  const sessionReady = authReady && staffAuthReady && adminAuthReady && devAuthReady;

  let role: UserRole | null = null;
  if (user) role = 'user';
  else if (devUser) role = 'dev';
  else if (adminUser) role = adminUser.role;
  else if (staffUser) role = staffUser.accountRole;

  return { sessionReady, role };
}
