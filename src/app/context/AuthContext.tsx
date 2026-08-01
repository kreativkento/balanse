import { createContext, useContext, useState, ReactNode } from 'react';

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

interface RegisteredUser {
  email: string;
  password: string;
  profile: UserProfile;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  profileComplete: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (email: string, password: string, firstName: string, lastName: string, middleInitial?: string) => { success: boolean; error?: string };
  completeProfile: (data: Partial<UserProfile>) => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  logout: () => void;
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

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);

  const login = (email: string, password: string): { success: boolean; error?: string } => {
    if (!EMAIL_RE.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    const registered = registeredUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (registered && registered.password !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }
    const profile = registered?.profile ?? { ...defaultProfile(), name: deriveNameFromEmail(email), profileComplete: true };
    setUser({ name: profile.name || deriveNameFromEmail(email), email: email.toLowerCase(), profile });
    return { success: true };
  };

  const signup = (email: string, password: string, firstName: string, lastName: string, middleInitial = ''): { success: boolean; error?: string } => {
    if (!EMAIL_RE.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    const exists = registeredUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return { success: false, error: 'ACCOUNT_EXISTS' };
    }
    const fullName = [firstName.trim(), middleInitial ? middleInitial.trim() + '.' : '', lastName.trim()].filter(Boolean).join(' ');
    const profile: UserProfile = { ...defaultProfile(), firstName: firstName.trim(), lastName: lastName.trim(), middleInitial: middleInitial.trim(), name: fullName };
    const newUser: RegisteredUser = { email, password, profile };
    setRegisteredUsers((prev) => [...prev, newUser]);
    setUser({ name: fullName || deriveNameFromEmail(email), email: email.toLowerCase(), profile });
    return { success: true };
  };

  const completeProfile = (data: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return prev;
      const merged = { ...prev.profile, ...data, profileComplete: true };
      const fn = merged.firstName || prev.profile.firstName;
      const ln = merged.lastName || prev.profile.lastName;
      const mi = merged.middleInitial ?? prev.profile.middleInitial;
      const derivedName = [fn, mi ? mi + '.' : '', ln].filter(Boolean).join(' ') || prev.name;
      const updated: UserProfile = { ...merged, name: data.name || derivedName };
      setRegisteredUsers(users => users.map(u =>
        u.email === prev.email ? { ...u, profile: updated } : u
      ));
      return { ...prev, name: updated.name, profile: updated };
    });
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated: UserProfile = { ...prev.profile, ...data };
      setRegisteredUsers(users => users.map(u =>
        u.email === prev.email ? { ...u, profile: updated } : u
      ));
      return { ...prev, name: data.name || prev.name, profile: updated };
    });
  };

  const logout = () => setUser(null);

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
