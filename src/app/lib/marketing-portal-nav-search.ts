import { searchAdminPortalNav, type AdminPortalNavItem } from './admin-portal-nav-search';

export type MarketingPortalNavItem = AdminPortalNavItem;

export function getMarketingPortalNavItems(): MarketingPortalNavItem[] {
  return [
    {
      path: '/marketing-dashboard',
      label: 'Bulletin',
      group: 'Content',
      keywords: ['news', 'announcements', 'posts', 'dashboard', 'bulletin'],
    },
    {
      path: '/marketing-gallery',
      label: 'Gallery',
      group: 'Content',
      keywords: ['photos', 'media', 'images', 'studio gallery'],
    },
    {
      path: '/marketing-amenities',
      label: 'Amenities',
      group: 'Content',
      keywords: ['facilities', 'services', 'studio perks'],
    },
    {
      path: '/marketing-feedback',
      label: 'System Feedback',
      group: 'Support',
      keywords: ['tickets', 'bugs', 'support'],
    },
    {
      path: '/marketing-account',
      label: 'My Profile',
      group: 'Account',
      keywords: ['account', 'profile'],
    },
  ];
}

export function searchMarketingPortalNav(
  query: string,
  items: MarketingPortalNavItem[] = getMarketingPortalNavItems(),
): MarketingPortalNavItem[] {
  return searchAdminPortalNav(query, items);
}
