import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
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
  /** False until the initial Supabase session has been read (avoids logout on refresh). */
  adminAuthReady: boolean;
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
  const [adminAuthReady, setAdminAuthReady] = useState(false);
  const hasUserRef = useRef(false);
  hasUserRef.current = adminUser != null;

  const hydrateAdminSession = useCallback(async (authUserId: string, isCurrent: () => boolean) => {
    const data = await fetchAccountWithProfileByAuthUserId(authUserId);
    if (data && isRoleMatch(data.account, 'admin')) {
      const mapped = mapToAdminUser(data);
      const user = mapped.photo && mapped.coverImage
        ? mapped
        : mergeProfileImageUrls(mapped, await loadOwnProfileImageUrls());
      if (isCurrent()) setAdminUser(user);
      return;
    }
    if (isCurrent()) setAdminUser(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    let generation = 0;

    const init = async () => {
      const current = generation;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && current === generation && session?.user) {
          await hydrateAdminSession(session.user.id, () => mounted && current === generation);
        }
      } catch {
        if (mounted && current === generation) setAdminUser(null);
      } finally {
        if (mounted && current === generation) setAdminAuthReady(true);
      }
    };

    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      const current = ++generation;
      if (!session?.user) {
        setAdminUser(null);
        setAdminAuthReady(true);
        return;
      }
      if (!hasUserRef.current) setAdminAuthReady(false);
      setTimeout(() => {
        if (!mounted || current !== generation) return;
        void hydrateAdminSession(session.user.id, () => mounted && current === generation)
          .catch(() => {
            if (mounted && current === generation) setAdminUser(null);
          })
          .finally(() => {
            if (mounted && current === generation) setAdminAuthReady(true);
          });
      }, 0);
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

    const mapped = mapToAdminUser(accountData);
    setAdminUser(mapped.photo && mapped.coverImage
      ? mapped
      : mergeProfileImageUrls(mapped, await loadOwnProfileImageUrls()));
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
    <AdminAuthContext.Provider value={{ adminUser, adminAuthReady, adminLogin, adminLogout, updateAdminImages }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
