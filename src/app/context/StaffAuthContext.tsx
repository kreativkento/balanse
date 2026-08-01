import { createContext, useContext, useState, ReactNode } from 'react';

export interface CoachProfileData {
  displayName: string;
  photo: string;
  bio: string;
  experience: string;
  classes: string[];
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
  staffLogin: (email: string, password: string) => { success: boolean; error?: string };
  staffLogout: () => void;
  updateStaffProfile: (data: Partial<CoachProfileData>) => void;
}

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0];
  return local
    .replace(/[._\-+]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const StaffAuthContext = createContext<StaffAuthContextType | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [staffProfile, setStaffProfile] = useState<CoachProfileData | null>(null);

  const staffLogin = (email: string, password: string): { success: boolean; error?: string } => {
    if (!EMAIL_RE.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    const name = deriveNameFromEmail(email);
    setStaffUser({ name, email: email.toLowerCase(), role: 'Coach' });
    setStaffProfile({
      displayName: name,
      photo: '',
      bio: '',
      experience: '',
      classes: [],
    });
    return { success: true };
  };

  const staffLogout = () => {
    setStaffUser(null);
    setStaffProfile(null);
  };

  const updateStaffProfile = (data: Partial<CoachProfileData>) => {
    setStaffProfile(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <StaffAuthContext.Provider
      value={{ staffUser, staffProfile, isStaffAuthenticated: !!staffUser, staffLogin, staffLogout, updateStaffProfile }}
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
