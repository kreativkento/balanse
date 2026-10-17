import type { UserRole } from './database.types';

/** Roles that sign in through `/staff-login` (not admin/dev). */
export type StaffPortalRole = 'coach' | 'frontdesk' | 'marketing';

export function isStaffPortalRole(role: UserRole): role is StaffPortalRole {
  return role === 'coach' || role === 'frontdesk' || role === 'marketing';
}

export function staffPortalHomePath(role: StaffPortalRole): string {
  switch (role) {
    case 'coach':
      return '/staff-dashboard';
    case 'frontdesk':
      return '/frontdesk-dashboard';
    case 'marketing':
      return '/marketing-dashboard';
    default:
      return '/staff-login';
  }
}
