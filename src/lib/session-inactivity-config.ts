import type { UserRole } from './database.types';

/** Show the “still there?” prompt this long before forced logout. */
export const INACTIVITY_WARN_BEFORE_MS = 60_000;

/**
 * Max idle time per role before logout (includes the warning window).
 * Adjust per role as needed; all portals use the same warning flow.
 */
export const INACTIVITY_IDLE_MS_BY_ROLE: Record<UserRole, number> = {
  user: 5 * 60_000,
  coach: 5 * 60_000,
  admin: 5 * 60_000,
  dev: 5 * 60_000,
  frontdesk: 5 * 60_000,
  marketing: 5 * 60_000,
};

export function loginPathForRole(role: UserRole): string {
  switch (role) {
    case 'user':
      return '/login';
    case 'coach':
    case 'frontdesk':
    case 'marketing':
      return '/staff-login';
    case 'admin':
      return '/admin-login';
    case 'dev':
      return '/development';
    default:
      return '/login';
  }
}
