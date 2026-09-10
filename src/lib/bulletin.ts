import { useCallback, useEffect, useState } from 'react';
import type { BulletinPostRow, BulletinPostType, BulletinVisibility } from './database.types';
import {
  approveBulletinPost as approveBulletinPostRow,
  createBulletinPost as createBulletinPostRow,
  deleteBulletinPost as deleteBulletinPostRow,
  holdBulletinPost as holdBulletinPostRow,
  listBulletinPosts,
  updateBulletinPost as updateBulletinPostRow,
  bulletinResourcePublicUrl,
  type BulletinPostInput,
} from './bulletin-service';

export type { BulletinPostInput };

export type { BulletinPostType, BulletinVisibility };

export const BULLETIN_POST_TYPES: BulletinPostType[] = [
  'Event',
  'Promo',
  'Announcement',
  'Update',
];

export const BULLETIN_CATEGORIES = ['All', ...BULLETIN_POST_TYPES] as const;
export type BulletinCategory = (typeof BULLETIN_CATEGORIES)[number];

export const BULLETIN_VISIBILITIES: BulletinVisibility[] = [
  'public',
  'private',
  'staff',
  'user',
  'coach',
  'marketing',
  'frontdesk',
];

export const BULLETIN_VISIBILITY_META: Record<
  BulletinVisibility,
  { label: string; hint: string; badgeClass: string }
> = {
  public: {
    label: 'Public',
    hint: 'Everyone, including the public page',
    badgeClass: 'bg-[#c49a3c]/12 text-[#a67f2e]',
  },
  private: {
    label: 'Private',
    hint: 'Internal — staff and members',
    badgeClass: 'bg-[#3A4A5A]/10 text-[#3A4A5A]',
  },
  staff: {
    label: 'Staff',
    hint: 'Staff only — no members',
    badgeClass: 'bg-[#6B8E6B]/15 text-[#4A6B4A]',
  },
  user: {
    label: 'User',
    hint: 'Members only',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  coach: {
    label: 'Coach',
    hint: 'Coaches only',
    badgeClass: 'bg-orange-100 text-orange-800',
  },
  marketing: {
    label: 'Marketing',
    hint: 'Marketing only',
    badgeClass: 'bg-pink-100 text-pink-800',
  },
  frontdesk: {
    label: 'Frontdesk',
    hint: 'Front desk only',
    badgeClass: 'bg-[#7A7EBC]/15 text-[#4A4E8C]',
  },
};

export interface BulletinPost {
  id: string;
  uid: string;
  title: string;
  category: BulletinPostType;
  excerpt: string;
  body: string;
  date: string;
  imageColor: string;
  badgeColor: string;
  badgeText: string;
  imageUrl?: string;
  imagePath?: string | null;
  attachmentUrl?: string;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  pinned?: boolean;
  visibility: BulletinVisibility;
  isPublic: boolean;
  adminApproved: boolean;
  createdAt: string;
  postedAt: string;
  activeUntil: string | null;
  isActive: boolean;
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

export function excerptFromBody(body: string) {
  const text = body.trim();
  return text.length > 140 ? `${text.slice(0, 137).trim()}…` : text;
}

export function formatBulletinDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatBulletinDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function isImageAttachment(mime?: string | null, name?: string | null) {
  if (mime?.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(name ?? '');
}

export function bulletinDisplayImageUrl(post: Pick<BulletinPost, 'imageUrl' | 'attachmentUrl' | 'attachmentMime' | 'attachmentName'>) {
  if (post.imageUrl) return post.imageUrl;
  if (post.attachmentUrl && isImageAttachment(post.attachmentMime, post.attachmentName)) {
    return post.attachmentUrl;
  }
  return undefined;
}

export function isBulletinPostActive(
  post: Pick<BulletinPost, 'adminApproved' | 'isActive' | 'postedAt' | 'activeUntil'>,
  now = new Date(),
) {
  if (!post.adminApproved || !post.isActive) return false;
  const posted = new Date(post.postedAt).getTime();
  if (Number.isNaN(posted) || posted > now.getTime()) return false;
  if (!post.activeUntil) return true;
  const until = new Date(post.activeUntil).getTime();
  return !Number.isNaN(until) && until > now.getTime();
}

export function bulletinScheduleState(
  post: Pick<BulletinPost, 'adminApproved' | 'isActive' | 'postedAt' | 'activeUntil'>,
  now = new Date(),
): 'pending' | 'scheduled' | 'active' | 'inactive' {
  const posted = new Date(post.postedAt).getTime();
  if (!Number.isNaN(posted) && posted > now.getTime()) return 'scheduled';
  if (isBulletinPostActive(post, now)) return 'active';
  if (!post.adminApproved) return 'pending';
  return 'inactive';
}

export function mapBulletinRow(row: BulletinPostRow): BulletinPost {
  const styles = BULLETIN_TYPE_STYLES[row.category];
  return {
    id: row.id,
    uid: row.uid,
    title: row.title,
    category: row.category,
    excerpt: excerptFromBody(row.body),
    body: row.body,
    date: formatBulletinDate(row.posted_at || row.created_at),
    imageColor: styles.imageColor,
    badgeColor: styles.badgeColor,
    badgeText: styles.badgeText,
    imageUrl: row.image_path ? bulletinResourcePublicUrl(row.image_path) : undefined,
    imagePath: row.image_path,
    attachmentUrl: row.attachment_path ? bulletinResourcePublicUrl(row.attachment_path) : undefined,
    attachmentPath: row.attachment_path,
    attachmentName: row.attachment_name,
    attachmentMime: row.attachment_mime,
    pinned: row.pinned,
    visibility: row.visibility,
    isPublic: row.is_public,
    adminApproved: row.admin_approved,
    createdAt: row.created_at,
    postedAt: row.posted_at || row.created_at,
    activeUntil: row.active_until,
    isActive: row.is_active !== false,
  };
}

export function useBulletinPosts(options?: {
  publicOnly?: boolean;
  approvedOnly?: boolean;
  pendingOnly?: boolean;
}) {
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const publicOnly = Boolean(options?.publicOnly);
  const approvedOnly = Boolean(options?.approvedOnly);
  const pendingOnly = Boolean(options?.pendingOnly);

  const refresh = useCallback(async () => {
    const result = await listBulletinPosts({ publicOnly, approvedOnly, pendingOnly });
    setPosts(result.data.map(mapBulletinRow));
    setError(result.error);
    setLoading(false);
  }, [publicOnly, approvedOnly, pendingOnly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { posts, loading, error, refresh };
}

export async function createBulletinPost(input: BulletinPostInput) {
  const result = await createBulletinPostRow(input);
  return { data: result.data ? mapBulletinRow(result.data) : null, error: result.error };
}

export async function updateBulletinPost(
  id: string,
  input: BulletinPostInput,
  current?: Pick<BulletinPost, 'imagePath' | 'attachmentPath'>,
) {
  const result = await updateBulletinPostRow(id, input, current);
  return { data: result.data ? mapBulletinRow(result.data) : null, error: result.error };
}

export async function deleteBulletinPost(post: Pick<BulletinPost, 'id' | 'imagePath' | 'attachmentPath'>) {
  return deleteBulletinPostRow(post);
}

export async function approveBulletinPost(id: string) {
  const result = await approveBulletinPostRow(id);
  return { data: result.data ? mapBulletinRow(result.data) : null, error: result.error };
}

export async function holdBulletinPost(id: string) {
  const result = await holdBulletinPostRow(id);
  return { data: result.data ? mapBulletinRow(result.data) : null, error: result.error };
}
