import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  name: string;
  email: string;
}

interface RegisteredUser {
  name: string;
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (name: string, email: string, password: string) => { success: boolean; error?: string };
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
    // If this email was registered via signup, verify the stored password
    const registered = registeredUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (registered && registered.password !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }
    const name = registered?.name ?? deriveNameFromEmail(email);
    setUser({ name, email: email.toLowerCase() });
    return { success: true };
  };

  const signup = (
    name: string,
    email: string,
    password: string
  ): { success: boolean; error?: string } => {
    const exists = registeredUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      return { success: false, error: 'ACCOUNT_EXISTS' };
    }
    const newUser: RegisteredUser = { name, email, password };
    setRegisteredUsers((prev) => [...prev, newUser]);
    setUser({ name, email });
    return { success: true };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, isAuthenticated: !!user }}
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