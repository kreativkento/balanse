import type { LucideIcon } from 'lucide-react';
import {
  Bookmark,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Clock,
  MessageSquare,
  Newspaper,
  User,
} from 'lucide-react';

export interface StaffPageMeta {
  crumb: string;
  title: string;
  icon?: LucideIcon;
}

const STAFF_PAGE_META: Record<string, StaffPageMeta> = {
  '/staff-bulletin': { crumb: 'Staff › Community', title: 'Bulletin', icon: Newspaper },
  '/staff-requests': { crumb: 'Staff › Schedule', title: 'Requests', icon: CalendarDays },
  '/staff-my-classes': { crumb: 'Staff › Schedule', title: 'My Classes', icon: Bookmark },
  '/staff-time-slots': { crumb: 'Staff › Schedule', title: 'Time Slots', icon: Clock },
  '/staff-class-schedule': { crumb: 'Staff › Schedule', title: 'Class Schedule', icon: CalendarRange },
  '/staff-availability': { crumb: 'Staff › Schedule', title: 'Availability', icon: CalendarCheck },
  '/staff-profile': { crumb: 'Staff › Account', title: 'My Profile', icon: User },
  '/staff-feedback': { crumb: 'Staff Portal', title: 'System Feedback', icon: MessageSquare },
};

/** Page chrome for staff routes; `null` on dashboard (greeting header). */
export function getStaffPageMeta(pathname: string): StaffPageMeta | null {
  if (pathname === '/staff-dashboard') return null;
  return STAFF_PAGE_META[pathname] ?? null;
}

/** Match admin list/calendar pages: max width + horizontal padding. */
export const STAFF_PAGE_CONTAINER = 'mx-auto w-full min-w-0 max-w-8xl px-4 md:px-6';

export const STAFF_PAGE_CONTAINER_PADDED = `${STAFF_PAGE_CONTAINER} py-4 md:py-8`;
