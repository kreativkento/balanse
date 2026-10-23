import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AuthResult,
  mapAuthError,
  validateEmailPassword,
  wrongRoleMessage,
} from '../../lib/auth-helpers';
import { fetchAccountWithProfileByAuthUserId, getProfileDisplayName, updateOwnProfileImages } from '../../lib/profile-service';
import { loadOwnProfileImageUrls, mergeProfileImageUrls } from '../../lib/storage-service';
import type { AccountWithProfile } from '../../lib/database.types';

export interface DevUser {
  name: string;
  email: string;
  photo: string;
  coverImage: string;
}

interface DevAuthContextType {
  devUser: DevUser | null;
  /** False until the initial Supabase session has been read (avoids logout on refresh). */
  devAuthReady: boolean;
  devLogin: (email: string, password: string) => Promise<AuthResult>;
  devLogout: () => Promise<void>;
  updateDevImages: (images: { photo?: string; coverImage?: string }) => void;
}

function mapToDevUser(data: AccountWithProfile): DevUser {
  return {
    name: getProfileDisplayName(data.profile, data.account.email),
    email: data.account.email.toLowerCase(),
    photo: data.profile.photo ?? '',
    coverImage: data.profile.cover_image ?? '',
  };
}

function isDevRole(role: string): boolean {
  return role === 'dev';
}

const DevAuthContext = createContext<DevAuthContextType | null>(null);

export function DevAuthProvider({ children }: { children: ReactNode }) {
  const [devUser, setDevUser] = useState<DevUser | null>(null);
  const [devAuthReady, setDevAuthReady] = useState(false);

  const hydrateDevSession = useCallback(async (authUserId: string, isCurrent: () => boolean) => {
    const data = await fetchAccountWithProfileByAuthUserId(authUserId);
    if (data && isDevRole(data.account.role)) {
      const mapped = mapToDevUser(data);
      const user = mapped.photo && mapped.coverImage
        ? mapped
        : mergeProfileImageUrls(mapped, await loadOwnProfileImageUrls());
      if (isCurrent()) setDevUser(user);
      return;
    }
    if (isCurrent()) setDevUser(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    let generation = 0;

    const init = async () => {
      const current = generation;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && current === generation && session?.user) {
          await hydrateDevSession(session.user.id, () => mounted && current === generation);
        }
      } catch {
        if (mounted && current === generation) setDevUser(null);
      } finally {
        if (mounted && current === generation) setDevAuthReady(true);
      }
    };

    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      const current = ++generation;
      if (!session?.user) {
        setDevUser(null);
        setDevAuthReady(true);
        return;
      }
      setDevAuthReady(false);
      setTimeout(() => {
        if (!mounted || current !== generation) return;
        void hydrateDevSession(session.user.id, () => mounted && current === generation)
          .catch(() => {
            if (mounted && current === generation) setDevUser(null);
          })
          .finally(() => {
            if (mounted && current === generation) setDevAuthReady(true);
          });
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateDevSession]);

  const devLogin = async (email: string, password: string): Promise<AuthResult> => {
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
    if (!accountData || !isDevRole(accountData.account.role)) {
      await supabase.auth.signOut();
      return { success: false, error: wrongRoleMessage('dev') };
    }

    const mapped = mapToDevUser(accountData);
    setDevUser(mapped.photo && mapped.coverImage
      ? mapped
      : mergeProfileImageUrls(mapped, await loadOwnProfileImageUrls()));
    return { success: true };
  };

  const devLogout = async () => {
    await supabase.auth.signOut();
    setDevUser(null);
  };

  const updateDevImages = (images: { photo?: string; coverImage?: string }) => {
    setDevUser((prev) => (prev ? { ...prev, ...images } : prev));
    void (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await updateOwnProfileImages(authUser.id, images);
      }
    })();
  };

  return (
    <DevAuthContext.Provider value={{ devUser, devAuthReady, devLogin, devLogout, updateDevImages }}>
      {children}
    </DevAuthContext.Provider>
  );
}

export function useDevAuth() {
  const ctx = useContext(DevAuthContext);
  if (!ctx) throw new Error('useDevAuth must be used within DevAuthProvider');
  return ctx;
}
