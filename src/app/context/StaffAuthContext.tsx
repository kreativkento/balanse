import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AuthResult,
  deriveNameFromEmail,
  mapAuthError,
  profileRowToCoachProfile,
  coachProfileToDbUpdate,
  validateEmailPassword,
  wrongRoleMessage,
} from '../../lib/auth-helpers';
import { fetchAccountWithProfileByAuthUserId, isRoleMatch, updateProfileByAuthUserId } from '../../lib/profile-service';
import type { AccountWithStaffProfile } from '../../lib/database.types';

export interface CoachProfileData {
  displayName: string;
  photo: string;
  bio: string;
  experience: string;
  classes: string[];
  nationality: string;
}

interface StaffUser {
  name: string;
  email: string;
  role: 'Coach' | 'Administrator';
}

interface StaffAuthContextType {
  staffUser: StaffUser | null;
  staffProfile: CoachProfileData | null;
  isStaffAuthenticated: boolean;
  staffLogin: (email: string, password: string) => Promise<AuthResult>;
  staffLogout: () => Promise<void>;
  updateStaffProfile: (data: Partial<CoachProfileData>) => void;
}

function mapToStaffUser(data: AccountWithStaffProfile): StaffUser {
  const name =
    data.profile.name?.trim()
    || data.profile.display_name?.trim()
    || deriveNameFromEmail(data.account.email);
  return {
    name,
    email: data.account.email.toLowerCase(),
    role: 'Coach',
  };
}

const StaffAuthContext = createContext<StaffAuthContextType | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [staffProfile, setStaffProfile] = useState<CoachProfileData | null>(null);

  const hydrateStaffSession = useCallback(async (authUserId: string) => {
    const data = await fetchAccountWithProfileByAuthUserId(authUserId);
    if (data && isRoleMatch(data.account, 'coach') && data.account.role !== 'user') {
      const staffData = data as AccountWithStaffProfile;
      setStaffUser(mapToStaffUser(staffData));
      setStaffProfile(profileRowToCoachProfile(staffData.profile, staffData.account.email));
      return;
    }
    setStaffUser(null);
    setStaffProfile(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session?.user) {
        await hydrateStaffSession(session.user.id);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        await hydrateStaffSession(session.user.id);
      } else {
        setStaffUser(null);
        setStaffProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateStaffSession]);

  const staffLogin = async (email: string, password: string): Promise<AuthResult> => {
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
    if (!accountData || !isRoleMatch(accountData.account, 'coach') || accountData.account.role === 'user') {
      await supabase.auth.signOut();
      return { success: false, error: wrongRoleMessage('coach') };
    }

    const staffData = accountData as AccountWithStaffProfile;
    setStaffUser(mapToStaffUser(staffData));
    setStaffProfile(profileRowToCoachProfile(staffData.profile, staffData.account.email));
    return { success: true };
  };

  const staffLogout = async () => {
    await supabase.auth.signOut();
    setStaffUser(null);
    setStaffProfile(null);
  };

  const updateStaffProfile = (data: Partial<CoachProfileData>) => {
    setStaffProfile((prev) => (prev ? { ...prev, ...data } : null));
    void (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await updateProfileByAuthUserId(authUser.id, coachProfileToDbUpdate(data));
      }
    })();
  };

  return (
    <StaffAuthContext.Provider
      value={{
        staffUser,
        staffProfile,
        isStaffAuthenticated: !!staffUser,
        staffLogin,
        staffLogout,
        updateStaffProfile,
      }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error('useStaffAuth must be used within StaffAuthProvider');
  return ctx;
}
