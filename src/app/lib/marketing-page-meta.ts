import type { LucideIcon } from 'lucide-react';
import { Images, Megaphone, Newspaper, Sparkles, UserCircle } from 'lucide-react';

export interface MarketingPageMeta {
  crumb: string;
  title: string;
  icon?: LucideIcon;
}

const MARKETING_PAGE_META: Record<string, MarketingPageMeta> = {
  '/marketing-dashboard': {
    crumb: 'Marketing › Bulletin',
    title: 'Bulletin',
    icon: Newspaper,
  },
  '/marketing-account': { crumb: 'Marketing › Account', title: 'My Profile', icon: UserCircle },
  '/marketing-gallery': { crumb: 'Marketing › Gallery', title: 'Gallery', icon: Images },
  '/marketing-amenities': { crumb: 'Marketing › Amenities', title: 'Studio Amenities', icon: Sparkles },
  '/marketing-feedback': { crumb: 'Marketing › Feedback', title: 'System Feedback', icon: Megaphone },
};

export function getMarketingPageMeta(pathname: string): MarketingPageMeta | undefined {
  return MARKETING_PAGE_META[pathname];
}

export const MARKETING_PORTAL_LABEL = 'Marketing';

export function marketingPortalIcon(): LucideIcon {
  return Megaphone;
}
