import { useEffect, useState } from 'react';

export type BulletinPostType = 'Event' | 'Promo' | 'Announcement' | 'Update';

export const BULLETIN_POST_TYPES: BulletinPostType[] = [
  'Event',
  'Promo',
  'Announcement',
  'Update',
];

export const BULLETIN_CATEGORIES = ['All', ...BULLETIN_POST_TYPES] as const;
export type BulletinCategory = (typeof BULLETIN_CATEGORIES)[number];

export interface BulletinPost {
  id: number;
  title: string;
  category: BulletinPostType;
  excerpt: string;
  body: string;
  date: string;
  imageColor: string;
  badgeColor: string;
  badgeText: string;
  imageUrl?: string;
  pinned?: boolean;
}

export const BULLETIN_TYPE_STYLES: Record<
  BulletinPostType,
  { badgeColor: string; badgeText: string; imageColor: string }
> = {
  Event: {
    badgeColor: 'bg-[#c49a3c]/12 text-[#a67f2e]',
    badgeText: 'Event',
    imageColor: '#c49a3c',
  },
  Promo: {
    badgeColor: 'bg-green-100 text-green-700',
    badgeText: 'Promo',
    imageColor: '#6B8E6B',
  },
  Announcement: {
    badgeColor: 'bg-amber-100 text-amber-700',
    badgeText: 'Announcement',
    imageColor: '#A07050',
  },
  Update: {
    badgeColor: 'bg-[#3A4A5A]/10 text-[#3A4A5A]',
    badgeText: 'Update',
    imageColor: '#3A4A5A',
  },
};

export const SEED_BULLETIN_POSTS: BulletinPost[] = [
  {
    id: 1,
    title: 'Summer Grand Open Mat — Free Community Session!',
    category: 'Event',
    excerpt: 'Join us this June 21 for a free open mat event celebrating the summer solstice. All fitness levels welcome.',
    body: `Celebrate summer with BALANSÉ! On June 21, we're opening our studio doors for a free Community Open Mat session from 8:00 AM to 11:00 AM. Expect a fun-filled morning of mixed movement classes, partner drills, and a light refreshment break. Bring a friend and experience BALANSÉ together.`,
    date: 'Jun 5, 2026',
    imageColor: '#c49a3c',
    badgeColor: 'bg-[#c49a3c]/12 text-[#a67f2e]',
    badgeText: 'Event',
    pinned: true,
  },
  {
    id: 2,
    title: 'Referral Promo: Bring a Friend, Get 20% Off',
    category: 'Promo',
    excerpt: `Refer a new member this July and both of you get 20% off your next month's membership. Valid until July 31.`,
    body: `We're celebrating our growing community! When you refer a new member who signs up for a Gold or Silver membership in July 2026, both you and your friend will receive 20% off your next billing cycle. No limits on referrals — the more friends you bring, the more you save!`,
    date: 'Jul 1, 2026',
    imageColor: '#6B8E6B',
    badgeColor: 'bg-green-100 text-green-700',
    badgeText: 'Promo',
    pinned: true,
  },
  {
    id: 3,
    title: 'New Class: Capoeira Beginners — Starting August',
    category: 'Announcement',
    excerpt: `We're launching a dedicated Capoeira Beginners track this August, coached by Rex. Sign up now to reserve your spot.`,
    body: 'Exciting news! Starting August 4, we are introducing a beginner-friendly Capoeira track every Monday and Thursday at 6:00 PM. Coach Rex will guide new students through the fundamentals of movement, music, and Ginga. Class size is limited to 10 — reserve your spot through the booking system.',
    date: 'Jul 15, 2026',
    imageColor: '#A07050',
    badgeColor: 'bg-amber-100 text-amber-700',
    badgeText: 'Announcement',
  },
  {
    id: 4,
    title: 'Studio Renovation: Temporary Schedule Adjustments',
    category: 'Update',
    excerpt: 'Studio 2 will be temporarily unavailable July 28–30 for flooring upgrades. Some classes will move to Studio 1.',
    body: `We're investing in a better experience for you! Studio 2 will undergo flooring upgrades from July 28 to July 30, 2026. During this period, all affected classes will be rescheduled to Studio 1 or the outdoor courtyard. Specific schedule adjustments will be reflected on the class calendar. We apologize for the inconvenience and appreciate your patience.`,
    date: 'Jul 20, 2026',
    imageColor: '#3A4A5A',
    badgeColor: 'bg-[#3A4A5A]/10 text-[#3A4A5A]',
    badgeText: 'Update',
  },
  {
    id: 5,
    title: 'Silver Membership Flash Sale — This Weekend Only',
    category: 'Promo',
    excerpt: 'Get the Silver Membership at ₱2,800/month (save ₱800!) when you sign up July 26–27. Limited slots.',
    body: 'This weekend only — July 26 and 27 — sign up for a Silver Membership at the special rate of ₱2,800/month instead of the regular ₱3,600/month. This offer is available to new members only, and only while slots last. Lock in your rate and start your wellness journey with BALANSÉ today!',
    date: 'Jul 24, 2026',
    imageColor: '#9A7A8A',
    badgeColor: 'bg-pink-100 text-pink-700',
    badgeText: 'Promo',
    pinned: true,
  },
  {
    id: 6,
    title: 'Coach Jodi Returns from International Yoga Retreat',
    category: 'Announcement',
    excerpt: 'Coach Jodi is back! She spent three weeks training in Bali and will be bringing new sequences to our Yoga program.',
    body: `We're thrilled to welcome Coach Jodi back! She recently completed a 21-day immersive yoga teacher training retreat in Ubud, Bali. Expect fresh flows, deeper breath-work techniques, and new restorative sequences in her upcoming Yoga classes. Her first class back is Monday, August 3 at 8:00 AM.`,
    date: 'Jul 27, 2026',
    imageColor: '#8B6F5A',
    badgeColor: 'bg-orange-100 text-orange-700',
    badgeText: 'Announcement',
  },
];

let posts: BulletinPost[] = [...SEED_BULLETIN_POSTS];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getBulletinPosts() {
  return posts;
}

export function addBulletinPost(input: {
  title: string;
  description: string;
  category: BulletinPostType;
  imageUrl?: string;
}) {
  const styles = BULLETIN_TYPE_STYLES[input.category];
  const description = input.description.trim();
  const excerpt =
    description.length > 140 ? `${description.slice(0, 137).trim()}…` : description;

  const post: BulletinPost = {
    id: Date.now(),
    title: input.title.trim(),
    category: input.category,
    excerpt,
    body: description,
    date: new Date().toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    imageColor: styles.imageColor,
    badgeColor: styles.badgeColor,
    badgeText: styles.badgeText,
    imageUrl: input.imageUrl,
  };

  posts = [post, ...posts];
  notify();
  return post;
}

export function useBulletinPosts() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return posts;
}
