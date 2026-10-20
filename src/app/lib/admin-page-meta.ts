import type { LucideIcon } from 'lucide-react';
import {
  Award,
  Briefcase,
  Coins,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  CreditCard,
  Images,
  Layers,
  MessageSquare,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCircle,
  Users,
} from 'lucide-react';

export interface AdminPageMeta {
  crumb: string;
  title: string;
  icon?: LucideIcon;
}

const ADMIN_PAGE_META: Record<string, AdminPageMeta> = {
  '/admin-account': { crumb: 'Admin › Account', title: 'My Profile', icon: UserCircle },
  '/admin-students': { crumb: 'Admin › Clients', title: 'Client Accounts', icon: Users },
  '/admin-coaches': { crumb: 'Admin › Coaches', title: 'Coaches Management', icon: Award },
  '/admin-disciplines': { crumb: 'Class Catalog', title: 'Disciplines', icon: Layers },
  '/admin-schedule': { crumb: 'Admin › Time Blocking', title: 'Time Blocking', icon: CalendarDays },
  '/admin-classes': { crumb: 'Admin › Class Schedule', title: 'Class Schedule', icon: CalendarRange },
  '/admin-coach-requests': { crumb: 'Admin › Schedule', title: 'Coach Requests', icon: ClipboardList },
  '/admin-credits': {
    crumb: 'Admin › Finance',
    title: 'Credits',
    icon: Coins,
  },
  '/admin-staff': { crumb: 'Admin › Staffing', title: 'Staffing Management', icon: Briefcase },
  '/admin-payments': { crumb: 'Admin › Payments', title: 'Payments & Receipts', icon: CreditCard },
  '/admin-payment-channels': {
    crumb: 'Admin › Finance',
    title: 'Payment Channels',
    icon: Layers,
  },
  '/admin-subscriptions': { crumb: 'Admin › Subscriptions', title: 'Subscription Plans', icon: CreditCard },
  '/admin-policies': { crumb: 'Admin › Policy Settings', title: 'Business Policy Settings', icon: ShieldCheck },
  '/admin-gallery': { crumb: 'Admin › Gallery', title: 'Gallery Manager', icon: Images },
  '/admin-amenities': { crumb: 'Admin › Marketing', title: 'Studio Amenities', icon: Sparkles },
  '/admin-bulletin': { crumb: 'Admin › Marketing', title: 'Bulletin', icon: Newspaper },
  '/admin-promos': { crumb: 'Admin › Promos & Discounts', title: 'Promos & Discounts', icon: Tag },
  '/admin-feedback': { crumb: 'Admin Portal', title: 'System Feedback', icon: MessageSquare },
};

/** Page chrome for admin routes; `null` on dashboard (greeting header). */
export function getAdminPageMeta(pathname: string): AdminPageMeta | null {
  if (pathname === '/admin-dashboard') return null;
  return ADMIN_PAGE_META[pathname] ?? null;
}
