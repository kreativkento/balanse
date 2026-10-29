const MODE_KEY = 'balanse-flow-demo';
const USER_KEY = 'balanse-flow-demo-user';

export type BalanseFlowRole = 'admin' | 'coach' | 'user' | 'frontdesk' | 'marketing';

export type DemoSessionUser = {
  id: string;
  email: string;
  role: BalanseFlowRole;
  accountId: string;
  name: string;
};

let demoOn = false;
let currentUser: DemoSessionUser | null = null;
const listeners = new Set<() => void>();

function readStored(): DemoSessionUser | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    if (sessionStorage.getItem(MODE_KEY) !== '1') return null;
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as DemoSessionUser) : null;
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  const stored = readStored();
  if (stored) {
    demoOn = true;
    currentUser = stored;
  }
}

function persist() {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (demoOn && currentUser) {
      sessionStorage.setItem(MODE_KEY, '1');
      sessionStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem(MODE_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
  } catch {
    /* private mode */
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

export function isDemoMode(): boolean {
  return demoOn;
}

export function getDemoUser(): DemoSessionUser | null {
  return currentUser;
}

export function enterDemoMode(user: DemoSessionUser): void {
  demoOn = true;
  currentUser = user;
  persist();
  emit();
}

export function exitDemoMode(): void {
  demoOn = false;
  currentUser = null;
  persist();
  emit();
}

export function subscribeDemoMode(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
