import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AuthResult,
  deriveNameFromEmail,
  mapAuthError,
  profileRowToCoachProfile,
  coachProfileToDbUpdate,
  validateEmailPassword,
  wrongStaffPortalMessage,
} from '../../lib/auth-helpers';
import {
  fetchDisciplinesForPublic,
  saveCoachDisciplineTagsForProfile,
  syncCoachDisciplinesFromProfileClasses,
} from '../../lib/discipline-service';
import { normalizeStaffPortalType } from '../components/staff/staffProfileShared';
import { fetchAccountWithProfileByAuthUserId, updateOwnProfileImages, updateProfileByAuthUserId } from '../../lib/profile-service';
import { loadOwnProfileImageUrls, mergeProfileImageUrls } from '../../lib/storage-service';
import { isStaffUserRole, type AccountWithStaffProfile } from '../../lib/database.types';
import { isStaffPortalRole, staffPortalHomePath, type StaffPortalRole } from '../../lib/staff-portal-routes';

export interface CoachProfileData {
  displayName: string;
  photo: string;
  coverImage: string;
  bio: string;
  experience: string;
  classes: string[];
  nationality: string;
  phone: string;
}

interface StaffUser {
  accountId: string;
  name: string;
  email: string;
  /** Account role from `accounts.role` (coach, frontdesk, marketing). */
  accountRole: StaffPortalRole;
  /** From `profiles_staff.staff_type` (Coach vs ops Administrator). */
  staffType: 'Coach' | 'Administrator';
  role: 'Coach' | 'Administrator';
}

interface StaffAuthContextType {
  staffUser: StaffUser | null;
  staffProfile: CoachProfileData | null;
  isStaffAuthenticated: boolean;
  /** False until the initial Supabase session has been read (avoids logout on refresh). */
  staffAuthReady: boolean;
  staffLogin: (email: string, password: string) => Promise<AuthResult>;
  staffLogout: () => Promise<void>;
  updateStaffProfile: (data: Partial<CoachProfileData>) => void;
  /** Writes `coach_disciplines` and syncs `profiles_staff.classes`. */
  saveStaffCoachDisciplines: (disciplineIds: string[]) => Promise<{
    ok: boolean;
    error?: string;
    disciplineIds?: string[];
    classNames?: string[];
  }>;
}

function mapToStaffUser(data: AccountWithStaffProfile): StaffUser {
  const name =
    data.profile.name?.trim()
    || data.profile.display_name?.trim()
    || deriveNameFromEmail(data.account.email);
  const staffType = normalizeStaffPortalType(data.profile.staff_type);
  const accountRole = data.account.role as StaffPortalRole;
  return {
    accountId: data.account.id,
    name,
    email: data.account.email.toLowerCase(),
    accountRole,
    staffType,
    role: staffType,
  };
}

function canUseStaffPortalSession(data: Awaited<ReturnType<typeof fetchAccountWithProfileByAuthUserId>>): data is AccountWithStaffProfile {
  return Boolean(data && isStaffUserRole(data.account.role) && isStaffPortalRole(data.account.role));
}

const StaffAuthContext = createContext<StaffAuthContextType | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [staffProfile, setStaffProfile] = useState<CoachProfileData | null>(null);
  const [staffAuthReady, setStaffAuthReady] = useState(false);

  const hydrateStaffSession = useCallback(async (authUserId: string, isCurrent: () => boolean) => {
    const data = await fetchAccountWithProfileByAuthUserId(authUserId);
    if (canUseStaffPortalSession(data)) {
      if (!isCurrent()) return;
      setStaffUser(mapToStaffUser(data));
      if (data.account.role === 'coach') {
        const mapped = profileRowToCoachProfile(data.profile, data.account.email);
        const profile = mapped.photo && mapped.coverImage
          ? mapped
          : mergeProfileImageUrls(mapped, await loadOwnProfileImageUrls());
        if (isCurrent()) setStaffProfile(profile);
      } else {
        setStaffProfile(null);
      }
      return;
    }
    if (isCurrent()) {
      setStaffUser(null);
      setStaffProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let generation = 0;

    const init = async () => {
      const current = generation;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && current === generation && session?.user) {
          await hydrateStaffSession(session.user.id, () => mounted && current === generation);
        }
      } catch {
        if (mounted && current === generation) {
          setStaffUser(null);
          setStaffProfile(null);
        }
      } finally {
        if (mounted && current === generation) setStaffAuthReady(true);
      }
    };

    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      const current = ++generation;
      if (!session?.user) {
        setStaffUser(null);
        setStaffProfile(null);
        setStaffAuthReady(true);
        return;
      }
      setStaffAuthReady(false);
      setTimeout(() => {
        if (!mounted || current !== generation) return;
        void hydrateStaffSession(session.user.id, () => mounted && current === generation)
          .catch(() => {
            if (mounted && current === generation) {
              setStaffUser(null);
              setStaffProfile(null);
            }
          })
          .finally(() => {
            if (mounted && current === generation) setStaffAuthReady(true);
          });
      }, 0);
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
    if (!canUseStaffPortalSession(accountData)) {
      await supabase.auth.signOut();
      return { success: false, error: wrongStaffPortalMessage() };
    }

    setStaffUser(mapToStaffUser(accountData));
    if (accountData.account.role === 'coach') {
      const mapped = profileRowToCoachProfile(accountData.profile, accountData.account.email);
      setStaffProfile(mapped.photo && mapped.coverImage
        ? mapped
        : mergeProfileImageUrls(mapped, await loadOwnProfileImageUrls()));
    } else {
      setStaffProfile(null);
    }
    return {
      success: true,
      redirectTo: staffPortalHomePath(accountData.account.role),
    };
  };

  const staffLogout = async () => {
    await supabase.auth.signOut();
    setStaffUser(null);
    setStaffProfile(null);
  };

  const updateStaffProfile = (data: Partial<CoachProfileData>) => {
    if (staffUser?.accountRole !== 'coach') return;
    setStaffProfile((prev) => (prev ? { ...prev, ...data } : null));
    void (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      if (data.photo || data.coverImage) {
        await updateOwnProfileImages(authUser.id, {
          photo: data.photo,
          coverImage: data.coverImage,
        });
      }

      const profilePayload = { ...data, photo: undefined, coverImage: undefined };
      const dbUpdate = coachProfileToDbUpdate(profilePayload);

      if (data.classes != null) {
        delete dbUpdate.classes;
      }

      if (Object.keys(dbUpdate).length > 0) {
        await updateProfileByAuthUserId(authUser.id, dbUpdate);
      }

      if (data.classes != null) {
        const { data: account } = await supabase
          .from('accounts')
          .select('id, role')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();
        if (account?.role === 'coach') {
          const sync = await syncCoachDisciplinesFromProfileClasses(account.id, data.classes);
          if (sync.ok && sync.classNames) {
            setStaffProfile((prev) =>
              prev ? { ...prev, classes: sync.classNames! } : null,
            );
          }
        }
      }
    })();
  };

  const saveStaffCoachDisciplines = async (
    disciplineIds: string[],
  ): Promise<{
    ok: boolean;
    error?: string;
    disciplineIds?: string[];
    classNames?: string[];
  }> => {
    if (!staffUser || staffUser.accountRole !== 'coach') return { ok: false, error: 'Not signed in.' };

    const { data: catalog, error: catalogError } = await fetchDisciplinesForPublic();
    if (catalogError) return { ok: false, error: catalogError };

    const {
      ok,
      error,
      classNames,
      disciplineIds: savedIds,
    } = await saveCoachDisciplineTagsForProfile(
      staffUser.accountId,
      disciplineIds,
      catalog,
    );

    if (!ok) return { ok: false, error };

    setStaffProfile((prev) => (prev ? { ...prev, classes: classNames } : null));
    return { ok: true, disciplineIds: savedIds, classNames };
  };

  return (
    <StaffAuthContext.Provider
      value={{
        staffUser,
        staffProfile,
        isStaffAuthenticated: !!staffUser,
        staffAuthReady,
        staffLogin,
        staffLogout,
        updateStaffProfile,
        saveStaffCoachDisciplines,
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
