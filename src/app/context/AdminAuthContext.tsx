import { createContext, useContext, useState, ReactNode } from 'react';

interface AdminUser {
  name: string;
  email: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  adminLogin: (email: string, password: string) => { success: boolean; error?: string };
  adminLogout: () => void;
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

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const adminLogin = (email: string, password: string) => {
    if (!EMAIL_RE.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    const name = deriveNameFromEmail(email);
    setAdminUser({ name, email: email.toLowerCase() });
    return { success: true };
  };

  const adminLogout = () => setAdminUser(null);

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