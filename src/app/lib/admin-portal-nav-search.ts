/**
 * Admin portal navigation search — mirrors AdminSidebar destinations.
 */

export interface AdminPortalNavItem {
  path: string;
  label: string;
  group: string;
  keywords: string[];
}

export function getAdminPortalNavItems(): AdminPortalNavItem[] {
  return [
    {
      path: '/admin-dashboard',
      label: 'Dashboard',
      group: 'Home',
      keywords: ['home', 'overview', 'metrics', 'admin'],
    },
    {
      path: '/admin-students',
      label: 'Clients',
      group: 'Community',
      keywords: ['students', 'members', 'clients', 'users', 'accounts'],
    },
    {
      path: '/admin-coaches',
      label: 'Coaches',
      group: 'Community',
      keywords: ['trainers', 'instructors', 'staff coaches'],
    },
    {
      path: '/admin-disciplines',
      label: 'Disciplines',
      group: 'Community',
      keywords: ['programs', 'catalog', 'yoga', 'classes types'],
    },
    {
      path: '/admin-schedule',
      label: 'Time Blocking',
      group: 'Schedule',
      keywords: ['calendar', 'blocks', 'availability', 'schedule'],
    },
    {
      path: '/admin-classes',
      label: 'Class Schedule',
      group: 'Schedule',
      keywords: ['classes', 'sessions', 'calendar', 'timetable'],
    },
    {
      path: '/admin-coach-requests',
      label: 'Coach Requests',
      group: 'Schedule',
      keywords: ['portal', 'slot', 'cancellation', 'booking requests'],
    },
    {
      path: '/admin-gallery',
      label: 'Gallery',
      group: 'Marketing',
      keywords: ['photos', 'media', 'images', 'studio gallery'],
    },
    {
      path: '/admin-amenities',
      label: 'Amenities',
      group: 'Marketing',
      keywords: ['facilities', 'services', 'studio perks'],
    },
    {
      path: '/admin-bulletin',
      label: 'Bulletin',
      group: 'Marketing',
      keywords: ['news', 'announcements', 'posts', 'community'],
    },
    {
      path: '/admin-credits',
      label: 'Credits',
      group: 'Finance',
      keywords: ['finance', 'session', 'balance', 'ledger', 'membership credits'],
    },
    {
      path: '/admin-payment-channels',
      label: 'Payment Channels',
      group: 'Finance',
      keywords: ['gcash', 'bank', 'qr', 'payment methods'],
    },
    {
      path: '/admin-payments',
      label: 'Payments',
      group: 'Finance',
      keywords: ['receipts', 'proof', 'billing', 'transactions'],
    },
    {
      path: '/admin-official-receipts',
      label: 'OR Register',
      group: 'Finance',
      keywords: ['official receipt', 'bir', 'vat', 'bookkeeper', 'tax', 'or number'],
    },
    {
      path: '/admin-staff',
      label: 'Staffing',
      group: 'Admin',
      keywords: ['staff', 'front desk', 'marketing', 'dev', 'employees'],
    },
    {
      path: '/admin-policies',
      label: 'Policies',
      group: 'Admin',
      keywords: ['settings', 'cancellation', 'rules', 'business policy'],
    },
    {
      path: '/admin-feedback',
      label: 'System Feedback',
      group: 'Support',
      keywords: ['tickets', 'bugs', 'support', 'inbox'],
    },
    {
      path: '/admin-account',
      label: 'My Profile',
      group: 'Account',
      keywords: ['account', 'profile', 'admin user'],
    },
  ];
}

export function searchAdminPortalNav(
  query: string,
  items: AdminPortalNavItem[] = getAdminPortalNavItems(),
): AdminPortalNavItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return items
    .map((item) => {
      const haystack = `${item.label} ${item.group} ${item.keywords.join(' ')}`.toLowerCase();
      const labelStart = item.label.toLowerCase().startsWith(q);
      const wordMatch = haystack.includes(q);
      if (!wordMatch) return null;
      const score = labelStart ? 0 : haystack.indexOf(q);
      return { item, score };
    })
    .filter((row): row is { item: AdminPortalNavItem; score: number } => row != null)
    .sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label))
    .map((row) => row.item)
    .slice(0, 6);
}
