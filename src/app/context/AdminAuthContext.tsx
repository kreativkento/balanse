import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AuthResult,
  deriveNameFromEmail,
  mapAuthError,
  validateEmailPassword,
  wrongRoleMessage,
} from '../../lib/auth-helpers';
import { fetchAccountWithProfileByAuthUserId, getProfileDisplayName, isRoleMatch } from '../../lib/profile-service';
import type { AccountWithProfile, UserRole } from '../../lib/database.types';

export interface AdminUser {
  name: string;
  email: string;
  role: UserRole;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  adminLogin: (email: string, password: string) => Promise<AuthResult>;
  adminLogout: () => Promise<void>;
}

function mapToAdminUser(data: AccountWithProfile): AdminUser {
  return {
    name: getProfileDisplayName(data.profile, data.account.email),
    email: data.account.email.toLowerCase(),
    role: data.account.role,
  };
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const hydrateAdminSession = useCallback(async (authUserId: string) => {
    const data = await fetchAccountWithProfileByAuthUserId(authUserId);
    if (data && isRoleMatch(data.account, 'admin')) {
      setAdminUser(mapToAdminUser(data));
      return;
    }
    setAdminUser(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session?.user) {
        await hydrateAdminSession(session.user.id);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        await hydrateAdminSession(session.user.id);
      } else {
        setAdminUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateAdminSession]);

  const adminLogin = async (email: string, password: string): Promise<AuthResult> => {
    const validationError = validateEmailPassword(email, password);
    if (validationError) return validationError;

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return { success: false, error: mapAuthError(error, 'Login failed. Please try again.') };
    }

    const accountData = await fetchAccountWithProfileByAuthUserId(data.user.id);
    if (!accountData || !isRoleMatch(accountData.account, 'admin')) {
      await supabase.auth.signOut();
      return { success: false, error: wrongRoleMessage('admin') };
    }

    setAdminUser(mapToAdminUser(accountData));
    return { success: true };
  };

  const adminLogout = async () => {
    await supabase.auth.signOut();
    setAdminUser(null);
  };

  return (
    <AdminAuthContext.Provider value={{ adminUser, adminLogin, adminLogout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
