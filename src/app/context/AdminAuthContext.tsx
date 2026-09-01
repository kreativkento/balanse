import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AuthResult,
  deriveNameFromEmail,
  mapAuthError,
  validateEmailPassword,
  wrongRoleMessage,
} from '../../lib/auth-helpers';
import { fetchAccountWithProfileByAuthUserId, getProfileDisplayName, isRoleMatch, updateOwnProfileImages } from '../../lib/profile-service';
import { loadOwnProfileImageUrls, mergeProfileImageUrls } from '../../lib/storage-service';
import type { AccountWithProfile, UserRole } from '../../lib/database.types';

export interface AdminUser {
  name: string;
  email: string;
  role: UserRole;
  photo: string;
  coverImage: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  adminLogin: (email: string, password: string) => Promise<AuthResult>;
  adminLogout: () => Promise<void>;
  updateAdminImages: (images: { photo?: string; coverImage?: string }) => void;
}

function mapToAdminUser(data: AccountWithProfile): AdminUser {
  return {
    name: getProfileDisplayName(data.profile, data.account.email),
    email: data.account.email.toLowerCase(),
    role: data.account.role,
    photo: data.profile.photo ?? '',
    coverImage: data.profile.cover_image ?? '',
  };
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const hydrateAdminSession = useCallback(async (authUserId: string) => {
    const data = await fetchAccountWithProfileByAuthUserId(authUserId);
    if (data && isRoleMatch(data.account, 'admin')) {
      const bucket = await loadOwnProfileImageUrls();
      setAdminUser(mergeProfileImageUrls(mapToAdminUser(data), bucket));
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

    setAdminUser(mergeProfileImageUrls(mapToAdminUser(accountData), await loadOwnProfileImageUrls()));
    return { success: true };
  };

  const adminLogout = async () => {
    await supabase.auth.signOut();
    setAdminUser(null);
  };

  const updateAdminImages = (images: { photo?: string; coverImage?: string }) => {
    setAdminUser((prev) => (prev ? { ...prev, ...images } : prev));
    void (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await updateOwnProfileImages(authUser.id, images);
      }
    })();
  };

  return (
    <AdminAuthContext.Provider value={{ adminUser, adminLogin, adminLogout, updateAdminImages }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
