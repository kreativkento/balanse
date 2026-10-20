import { searchAdminPortalNav, type AdminPortalNavItem } from './admin-portal-nav-search';

export type FrontdeskPortalNavItem = AdminPortalNavItem;

export function getFrontdeskPortalNavItems(): FrontdeskPortalNavItem[] {
  return [
    { path: '/frontdesk-dashboard', label: 'Dashboard', group: 'Overview', keywords: ['home'] },
    { path: '/frontdesk-students', label: 'Clients', group: 'Community', keywords: ['students', 'members'] },
    { path: '/frontdesk-coaches', label: 'Coaches', group: 'Community', keywords: ['staff', 'trainers'] },
    { path: '/frontdesk-disciplines', label: 'Disciplines', group: 'Community', keywords: ['classes', 'catalog'] },
    { path: '/frontdesk-classes', label: 'Class Schedule', group: 'Schedule', keywords: ['calendar', 'schedule'] },
    { path: '/frontdesk-bookings', label: 'Bookings', group: 'Enrollments', keywords: ['slot requests'] },
    { path: '/frontdesk-cancellations', label: 'Cancellations', group: 'Enrollments', keywords: ['cancel'] },
    { path: '/frontdesk-gallery', label: 'Gallery', group: 'Marketing', keywords: ['photos', 'media', 'captions'] },
    { path: '/frontdesk-amenities', label: 'Amenities', group: 'Marketing', keywords: ['facilities', 'studio'] },
    { path: '/frontdesk-bulletin', label: 'Bulletin', group: 'Marketing', keywords: ['news', 'announcements', 'posts'] },
    { path: '/frontdesk-payments', label: 'Payments', group: 'Finance', keywords: ['receipts'] },
    { path: '/frontdesk-policies', label: 'Policies', group: 'Finance', keywords: ['rules', 'settings'] },
    { path: '/frontdesk-feedback', label: 'System Feedback', group: 'Support', keywords: ['tickets', 'bugs'] },
    { path: '/frontdesk-account', label: 'My Profile', group: 'Account', keywords: ['account', 'profile'] },
  ];
}

export function searchFrontdeskPortalNav(
  query: string,
  items: FrontdeskPortalNavItem[] = getFrontdeskPortalNavItems(),
): FrontdeskPortalNavItem[] {
  return searchAdminPortalNav(query, items);
}
