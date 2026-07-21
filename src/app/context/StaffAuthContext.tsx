import { createContext, useContext, useState, ReactNode } from 'react';

interface StaffUser {
  name: string;
  email: string;
  role: 'Coach' | 'Administrator';
}

interface StaffAuthContextType {
  staffUser: StaffUser | null;
  isStaffAuthenticated: boolean;
  staffLogin: (email: string, password: string) => { success: boolean; error?: string };
  staffLogout: () => void;
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

  const staffLogin = (email: string, password: string): { success: boolean; error?: string } => {
    if (!EMAIL_RE.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    const name = deriveNameFromEmail(email);
    setStaffUser({ name, email: email.toLowerCase(), role: 'Coach' });
    return { success: true };
  };

  const staffLogout = () => setStaffUser(null);

  return (
    <StaffAuthContext.Provider
      value={{ staffUser, isStaffAuthenticated: !!staffUser, staffLogin, staffLogout }}
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