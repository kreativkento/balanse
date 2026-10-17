import type { LucideIcon } from 'lucide-react';
import {
  Award,
  Ban,
  CalendarRange,
  ClipboardList,
  CreditCard,
  Layers,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react';

export interface FrontdeskPageMeta {
  crumb: string;
  title: string;
  icon?: LucideIcon;
}

const FRONTDESK_PAGE_META: Record<string, FrontdeskPageMeta> = {
  '/frontdesk-dashboard': {
    crumb: 'Front Desk › Overview',
    title: 'Dashboard',
    icon: LayoutDashboard,
  },
  '/frontdesk-account': { crumb: 'Front Desk › Account', title: 'My Profile', icon: UserCircle },
  '/frontdesk-students': { crumb: 'Front Desk › Clients', title: 'Client Accounts', icon: Users },
  '/frontdesk-coaches': { crumb: 'Front Desk › Coaches', title: 'Coaches', icon: Award },
  '/frontdesk-disciplines': { crumb: 'Class Catalog', title: 'Disciplines', icon: Layers },
  '/frontdesk-classes': { crumb: 'Front Desk › Class Schedule', title: 'Class Schedule', icon: CalendarRange },
  '/frontdesk-bookings': { crumb: 'Front Desk › Enrollments', title: 'Bookings', icon: ClipboardList },
  '/frontdesk-cancellations': { crumb: 'Front Desk › Enrollments', title: 'Cancellations', icon: Ban },
  '/frontdesk-payments': { crumb: 'Front Desk › Payments', title: 'Payments & Receipts', icon: CreditCard },
  '/frontdesk-policies': { crumb: 'Front Desk › Policy Settings', title: 'Business Policy Settings', icon: ShieldCheck },
  '/frontdesk-feedback': { crumb: 'Front Desk Portal', title: 'System Feedback', icon: MessageSquare },
};

export function getFrontdeskPageMeta(pathname: string): FrontdeskPageMeta | null {
  return FRONTDESK_PAGE_META[pathname] ?? null;
}
