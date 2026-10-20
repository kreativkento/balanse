/**
 * Member portal navigation search — same destinations as MemberSidebar.
 * Only routes under MemberSiteLayout; no staff/admin/public paths.
 */

export interface MemberPortalNavItem {
  path: string;
  label: string;
  group: string;
  keywords: string[];
  /** Shown in results but not auto-navigated (e.g. Performance). */
  navigable?: boolean;
}

/** Keep in sync with MemberSidebar NAV_GROUPS + dashboard + bulletin + feedback. */
export function getMemberPortalNavItems(): MemberPortalNavItem[] {
  return [
    {
      path: '/dashboard',
      label: 'Dashboard',
      group: 'Home',
      keywords: ['home', 'overview', 'member'],
    },
    {
      path: '/profile',
      label: 'Profile',
      group: 'Home',
      keywords: ['account', 'settings', 'personal', 'documents', 'terms', 'privacy', 'photo'],
    },
    {
      path: '/my-classes',
      label: 'My Bookings',
      group: 'Class Management',
      keywords: ['my bookings', 'enrolled', 'bookings', 'sessions', 'waitlist', 'classes'],
    },
    {
      path: '/class-schedule',
      label: 'Class Schedules',
      group: 'Class Management',
      keywords: ['calendar', 'book', 'schedule', 'sessions'],
    },
    {
      path: '/studio-guidelines',
      label: 'Studio Guidelines',
      group: 'Class Management',
      keywords: ['rules', 'policies', 'studio', 'guidelines'],
    },
    {
      path: '/credits',
      label: 'Credits & Pass',
      group: 'Finances',
      keywords: [
        'session',
        'balance',
        'ledger',
        'pack',
        'pass',
        'membership credits',
        'subscription',
        'membership',
        'plan',
        'pricing',
        'gold',
        'silver',
      ],
    },
    {
      path: '/payment-history',
      label: 'Billing & Receipts',
      group: 'Finances',
      keywords: ['payment', 'history', 'receipt', 'billing', 'paid', 'refund', 'invoice'],
    },
    {
      path: '/member-payment-portal',
      label: 'Pay for a class',
      group: 'Finances',
      keywords: ['pay', 'checkout', 'upload', 'proof', 'class payment'],
    },
    {
      path: '/studio-services',
      label: 'Services',
      group: 'Studio',
      keywords: ['amenities', 'offerings', 'pricing'],
    },
    {
      path: '/studio-coaches',
      label: 'Coaches',
      group: 'Studio',
      keywords: ['trainer', 'instructor', 'coach'],
    },
    {
      path: '/studio-disciplines',
      label: 'Disciplines',
      group: 'Studio',
      keywords: ['classes', 'yoga', 'calisthenics', 'programs'],
    },
    {
      path: '/member-bulletin',
      label: 'Community Bulletin',
      group: 'Community',
      keywords: ['news', 'announcements', 'bulletin', 'posts'],
    },
    {
      path: '/feedback',
      label: 'System Feedback',
      group: 'Support',
      keywords: ['feedback', 'support', 'bug', 'suggest'],
    },
  ];
}

export function searchMemberPortalNav(
  query: string,
  items: MemberPortalNavItem[] = getMemberPortalNavItems(),
): MemberPortalNavItem[] {
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
    .filter((row): row is { item: MemberPortalNavItem; score: number } => row != null)
    .sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label))
    .map((row) => row.item)
    .slice(0, 8);
}

export function bestMemberPortalNavMatch(
  query: string,
  items: MemberPortalNavItem[] = getMemberPortalNavItems(),
): MemberPortalNavItem | null {
  const matches = searchMemberPortalNav(query, items);
  const first = matches.find((m) => m.navigable !== false) ?? matches[0] ?? null;
  return first?.navigable === false ? null : first;
}
