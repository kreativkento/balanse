import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AuthResult,
  EMAIL_RE,
  buildFullName,
  deriveNameFromEmail,
  mapAuthError,
  profileRowToUserProfile,
  userProfileToDbUpdate,
  validateEmailPassword,
  wrongRoleMessage,
} from '../../lib/auth-helpers';
import { fetchAccountWithProfileByAuthUserId, isRoleMatch, updateProfileByAuthUserId } from '../../lib/profile-service';
import type { AccountWithProfile } from '../../lib/database.types';

export interface UserProfile {
  firstName: string;
  lastName: string;
  middleInitial: string;
  name: string;
  birthday: string;
  sex: 'male' | 'female' | 'prefer_not_to_say' | '';
  phone: string;
  cellNumber: string;
  address: string;
  weight: string;
  height: string;
  medicalHistory: string;
  healthDeclarationSigned: boolean;
  termsAccepted: boolean;
  shareAvailability: boolean;
  profileComplete: boolean;
}

export interface User {
  name: string;
  email: string;
  profile: UserProfile;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  profileComplete: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    middleInitial?: string,
  ) => Promise<AuthResult>;
  completeProfile: (data: Partial<UserProfile>) => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  logout: () => Promise<void>;
}

const defaultProfile = (): UserProfile => ({
  firstName: '',
  lastName: '',
  middleInitial: '',
  name: '',
  birthday: '',
  sex: '',
  phone: '',
  cellNumber: '',
  address: '',
  weight: '',
  height: '',
  medicalHistory: '',
  healthDeclarationSigned: false,
  termsAccepted: false,
  shareAvailability: false,
  profileComplete: false,
});

function mapToUser(data: AccountWithProfile): User {
  const profile = profileRowToUserProfile(data.profile, data.account.email);
  return {
    name: profile.name || deriveNameFromEmail(data.account.email),
    email: data.account.email.toLowerCase(),
    profile,
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const hydrateUserSession = useCallback(async (authUserId: string) => {
    const data = await fetchAccountWithProfileByAuthUserId(authUserId);
    if (data && isRoleMatch(data.account, 'user')) {
      setUser(mapToUser(data));
      return;
    }
    setUser(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session?.user) {
        await hydrateUserSession(session.user.id);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        await hydrateUserSession(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateUserSession]);

  const login = async (email: string, password: string): Promise<AuthResult> => {
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
    if (!accountData || !isRoleMatch(accountData.account, 'user')) {
      await supabase.auth.signOut();
      return { success: false, error: wrongRoleMessage('user') };
    }

    setUser(mapToUser(accountData));
    return { success: true };
  };

  const signup = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    middleInitial = '',
  ): Promise<AuthResult> => {
    if (!EMAIL_RE.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    if (!firstName.trim() || !lastName.trim()) {
      return { success: false, error: 'First and last name are required.' };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedMiddle = middleInitial.trim();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          first_name: trimmedFirst,
          last_name: trimmedLast,
          middle_initial: trimmedMiddle,
        },
      },
    });

    if (error) {
      const mapped = mapAuthError(error, 'Sign up failed. Please try again.');
      return { success: false, error: mapped };
    }

    if (!data.user) {
      return { success: false, error: 'Sign up failed. Please try again.' };
    }

    if (data.user.identities?.length === 0) {
      return { success: false, error: 'ACCOUNT_EXISTS' };
    }

    const accountData = await fetchAccountWithProfileByAuthUserId(data.user.id);

    if (data.session && accountData) {
      setUser(mapToUser(accountData));
    } else if (accountData) {
      setUser(mapToUser(accountData));
    } else {
      const fullName = buildFullName(trimmedFirst, trimmedMiddle, trimmedLast);
      setUser({
        name: fullName || deriveNameFromEmail(normalizedEmail),
        email: normalizedEmail,
        profile: {
          ...defaultProfile(),
          firstName: trimmedFirst,
          lastName: trimmedLast,
          middleInitial: trimmedMiddle,
          name: fullName,
        },
      });
    }

    return { success: true };
  };

  const persistProfile = async (update: Partial<UserProfile>) => {
    const dbUpdate = userProfileToDbUpdate(update);
    if (Object.keys(dbUpdate).length === 0) return;

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await updateProfileByAuthUserId(authUser.id, dbUpdate);
    }
  };

  const completeProfile = (data: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev.profile, ...data, profileComplete: true };
      const fn = merged.firstName || prev.profile.firstName;
      const ln = merged.lastName || prev.profile.lastName;
      const mi = merged.middleInitial ?? prev.profile.middleInitial;
      const derivedName = buildFullName(fn, mi, ln) || prev.name;
      const updated: UserProfile = { ...merged, name: data.name || derivedName };

      void persistProfile(updated);
      return { ...prev, name: updated.name, profile: updated };
    });
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated: UserProfile = { ...prev.profile, ...data };
      void persistProfile(updated);
      return { ...prev, name: data.name || prev.name, profile: updated };
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        completeProfile,
        updateProfile,
        logout,
        isAuthenticated: !!user,
        profileComplete: !!user?.profile?.profileComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
