import { isDemoMode } from './mode.ts';

const keyFor = (userId: string) => `balanse-flow-onboarding:${userId}`;

export function isOnboardingPending(userId: string | null | undefined): boolean {
  if (!userId || isDemoMode()) return false;
  try {
    return localStorage.getItem(keyFor(userId)) === 'pending';
  } catch {
    return false;
  }
}

export function markOnboardingPending(userId: string): void {
  if (!userId || isDemoMode()) return;
  try {
    const key = keyFor(userId);
    if (!localStorage.getItem(key)) localStorage.setItem(key, 'pending');
  } catch {
    /* ignore */
  }
}

export function clearOnboarding(userId: string): void {
  try {
    localStorage.setItem(keyFor(userId), 'done');
  } catch {
    /* ignore */
  }
}
