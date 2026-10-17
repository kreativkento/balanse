import { supabase } from './supabase';
import type { GalleryMediaKind, GalleryPostMediaRow, GalleryPostRow, GalleryTag } from './database.types';

export const GALLERY_MEDIA_BUCKET = 'gallery_media';
export const GALLERY_CAPTION_MAX = 500;
/** Max posts with “feature in gallery” on the public studio gallery section. */
export const GALLERY_FEATURED_LIMIT = 12;
/** Max Amenities-tagged posts featured in the studio amenities hero carousel. */
export const AMENITIES_FEATURED_LIMIT = 6;
export const GALLERY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const GALLERY_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export const GALLERY_TAGS: GalleryTag[] = ['Studio', 'Classes', 'Events', 'Community', 'Amenities'];

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export interface GalleryMediaItem {
  id: string;
  sortOrder: number;
  storagePath: string;
  url: string;
  mediaKind: GalleryMediaKind;
}

export interface GalleryPost {
  id: string;
  caption: string;
  tag: GalleryTag;
  featuredInGallery: boolean;
  featuredInHomeStudio: boolean;
  featuredInAmenities: boolean;
  masonryTall: boolean;
  createdAt: string;
  updatedAt: string;
  media: GalleryMediaItem[];
  thumbnailUrl: string | null;
}

export interface GalleryPostInput {
  caption: string;
  tag: GalleryTag;
  featuredInGallery: boolean;
  featuredInHomeStudio: boolean;
  featuredInAmenities: boolean;
  masonryTall?: boolean;
  newFiles?: File[];
  removeMediaIds?: string[];
}

type MediaRowJoined = GalleryPostMediaRow;

function extensionForFile(file: File): string | null {
  const fromMime = EXT_BY_MIME[file.type];
  if (fromMime) return fromMime;
  const nameExt = file.name.split('.').pop()?.toLowerCase();
  if (nameExt === 'jpeg') return 'jpg';
  if (nameExt && ['jpg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov'].includes(nameExt)) {
    return nameExt === 'mov' ? 'mov' : nameExt;
  }
  return null;
}

export function galleryMediaPublicUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(GALLERY_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function mediaKindForFile(file: File): GalleryMediaKind | null {
  if (IMAGE_MIME.has(file.type) || /\.(jpe?g|png|webp|gif)$/i.test(file.name)) return 'image';
  if (VIDEO_MIME.has(file.type) || /\.(mp4|webm|mov)$/i.test(file.name)) return 'video';
  return null;
}

export function validateGalleryFile(file: File): string | null {
  const kind = mediaKindForFile(file);
  if (!kind) return 'Each file must be an image (JPG, PNG, WEBP, GIF) or video (MP4, WEBM, MOV).';
  const max = kind === 'video' ? GALLERY_VIDEO_MAX_BYTES : GALLERY_IMAGE_MAX_BYTES;
  if (file.size > max) {
    return kind === 'video'
      ? 'Each video must be 50 MB or smaller.'
      : 'Each image must be 10 MB or smaller.';
  }
  return null;
}

function mapMediaRow(row: MediaRowJoined): GalleryMediaItem {
  return {
    id: row.id,
    sortOrder: row.sort_order,
    storagePath: row.storage_path,
    url: galleryMediaPublicUrl(row.storage_path),
    mediaKind: row.media_kind,
  };
}

function mapPost(row: GalleryPostRow, mediaRows: MediaRowJoined[]): GalleryPost {
  const media = mediaRows
    .filter((m) => m.post_id === row.id)
    .sort((a, m) => a.sort_order - m.sort_order)
    .map(mapMediaRow);
  return {
    id: row.id,
    caption: row.caption,
    tag: row.tag,
    featuredInGallery: row.featured_in_gallery,
    featuredInHomeStudio: row.featured_in_home_studio,
    featuredInAmenities: row.featured_in_amenities ?? false,
    masonryTall: row.masonry_tall,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    media,
    thumbnailUrl: media[0]?.url ?? null,
  };
}

async function currentAccountId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  return data?.id ?? null;
}

async function fetchPostsWithMedia(
  filter?: {
    featuredInGallery?: boolean;
    featuredInHomeStudio?: boolean;
    featuredInAmenities?: boolean;
    tag?: GalleryTag;
  },
  order: { ascending: boolean } = { ascending: false },
): Promise<GalleryPost[]> {
  let query = supabase
    .from('gallery_posts')
    .select('*, gallery_post_media(*)')
    .order('created_at', { ascending: order.ascending });

  if (filter?.featuredInGallery) {
    query = query.eq('featured_in_gallery', true);
  }
  if (filter?.featuredInHomeStudio) {
    query = query.eq('featured_in_home_studio', true);
  }
  if (filter?.featuredInAmenities) {
    query = query.eq('featured_in_amenities', true);
  }
  if (filter?.tag) {
    query = query.eq('tag', filter.tag);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to load gallery posts:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const media = (row.gallery_post_media ?? []) as MediaRowJoined[];
    const { gallery_post_media: _omit, ...postRow } = row as GalleryPostRow & {
      gallery_post_media: MediaRowJoined[];
    };
    return mapPost(postRow, media);
  });
}

export async function loadGalleryPostsForAdmin(): Promise<GalleryPost[]> {
  const { data, error } = await supabase
    .from('gallery_posts')
    .select('*, gallery_post_media(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load admin gallery posts:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const media = (row.gallery_post_media ?? []) as MediaRowJoined[];
    const { gallery_post_media: _omit, ...postRow } = row as GalleryPostRow & {
      gallery_post_media: MediaRowJoined[];
    };
    return mapPost(postRow, media);
  });
}

export async function loadPublicGalleryPosts(): Promise<GalleryPost[]> {
  return fetchPostsWithMedia({ featuredInGallery: true }, { ascending: true });
}

export async function loadHomeStudioFeaturedPosts(): Promise<GalleryPost[]> {
  return fetchPostsWithMedia({ featuredInHomeStudio: true, tag: 'Studio' }, { ascending: true });
}

export async function loadPublicAmenitiesCarouselPosts(): Promise<GalleryPost[]> {
  return fetchPostsWithMedia(
    { featuredInAmenities: true, tag: 'Amenities' },
    { ascending: true },
  );
}

async function uploadGalleryFile(
  postId: string,
  sortOrder: number,
  file: File,
): Promise<{ path: string; kind: GalleryMediaKind } | { error: string }> {
  const kind = mediaKindForFile(file);
  if (!kind) return { error: 'Unsupported file type.' };
  const validation = validateGalleryFile(file);
  if (validation) return { error: validation };

  const ext = extensionForFile(file) ?? (kind === 'video' ? 'mp4' : 'jpg');
  const objectPath = `${postId}/${sortOrder}.${ext}`;
  const contentType = file.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg');

  const { error } = await supabase.storage.from(GALLERY_MEDIA_BUCKET).upload(objectPath, file, {
    upsert: true,
    contentType,
    cacheControl: '3600',
  });

  if (error) {
    console.error('Failed to upload gallery media:', error.message);
    return { error: error.message };
  }

  return { path: objectPath, kind };
}

export function countFeaturedGalleryPosts(posts: GalleryPost[], excludePostId?: string): number {
  return posts.filter((p) => p.featuredInGallery && p.id !== excludePostId).length;
}

export function countFeaturedAmenitiesPosts(posts: GalleryPost[], excludePostId?: string): number {
  return posts.filter(
    (p) => p.tag === 'Amenities' && p.featuredInAmenities && p.id !== excludePostId,
  ).length;
}

async function countFeaturedGalleryInDb(excludePostId?: string): Promise<number> {
  let query = supabase
    .from('gallery_posts')
    .select('id', { count: 'exact', head: true })
    .eq('featured_in_gallery', true);
  if (excludePostId) query = query.neq('id', excludePostId);
  const { count, error } = await query;
  if (error) {
    console.error('Failed to count gallery featured posts:', error.message);
    return GALLERY_FEATURED_LIMIT;
  }
  return count ?? 0;
}

async function countFeaturedAmenitiesInDb(excludePostId?: string): Promise<number> {
  let query = supabase
    .from('gallery_posts')
    .select('id', { count: 'exact', head: true })
    .eq('tag', 'Amenities')
    .eq('featured_in_amenities', true);
  if (excludePostId) query = query.neq('id', excludePostId);
  const { count, error } = await query;
  if (error) {
    console.error('Failed to count amenities featured posts:', error.message);
    return AMENITIES_FEATURED_LIMIT;
  }
  return count ?? 0;
}

async function validateFeaturedLimits(
  input: GalleryPostInput,
  existing?: Pick<GalleryPostRow, 'featured_in_gallery' | 'featured_in_amenities' | 'tag'>,
  postId?: string,
): Promise<string | null> {
  const wasGalleryFeatured = existing?.featured_in_gallery ?? false;
  if (input.featuredInGallery && !wasGalleryFeatured) {
    const used = await countFeaturedGalleryInDb(postId);
    if (used >= GALLERY_FEATURED_LIMIT) {
      return `Only ${GALLERY_FEATURED_LIMIT} posts can be featured in the public gallery. Unfeature another post first.`;
    }
  }

  const wasAmenitiesFeatured =
    existing?.tag === 'Amenities' && (existing?.featured_in_amenities ?? false);
  const wantsAmenitiesFeatured = input.tag === 'Amenities' && input.featuredInAmenities;
  if (wantsAmenitiesFeatured && !wasAmenitiesFeatured) {
    const used = await countFeaturedAmenitiesInDb(postId);
    if (used >= AMENITIES_FEATURED_LIMIT) {
      return `Only ${AMENITIES_FEATURED_LIMIT} posts can be featured in the amenities carousel. Unfeature another post first.`;
    }
  }

  return null;
}

async function removeStoragePaths(paths: string[]) {
  const bucketPaths = paths.filter((path) => !/^https?:\/\//i.test(path));
  if (!bucketPaths.length) return;
  const { error } = await supabase.storage.from(GALLERY_MEDIA_BUCKET).remove(bucketPaths);
  if (error) console.error('Failed to remove gallery files:', error.message);
}

export async function createGalleryPost(input: GalleryPostInput): Promise<{ post: GalleryPost } | { error: string }> {
  const caption = input.caption.trim();
  if (!caption) return { error: 'Caption is required.' };
  if (caption.length > GALLERY_CAPTION_MAX) return { error: `Caption must be ${GALLERY_CAPTION_MAX} characters or fewer.` };

  const files = input.newFiles ?? [];
  if (!files.length) return { error: 'Add at least one photo or video.' };

  for (const file of files) {
    const err = validateGalleryFile(file);
    if (err) return { error: err };
  }

  const limitError = await validateFeaturedLimits(input);
  if (limitError) return { error: limitError };

  const accountId = await currentAccountId();
  const featuredHome =
    input.tag === 'Studio' ? input.featuredInHomeStudio : false;
  const featuredAmenities =
    input.tag === 'Amenities' ? input.featuredInAmenities : false;

  const { data: inserted, error: insertError } = await supabase
    .from('gallery_posts')
    .insert({
      caption,
      tag: input.tag,
      featured_in_gallery: input.featuredInGallery,
      featured_in_home_studio: featuredHome,
      featured_in_amenities: featuredAmenities,
      masonry_tall: input.masonryTall ?? false,
      created_by: accountId,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    console.error('Failed to create gallery post:', insertError?.message);
    return { error: insertError?.message ?? 'Could not create post.' };
  }

  const mediaRows: MediaRowJoined[] = [];
  const uploadedPaths: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const upload = await uploadGalleryFile(inserted.id, i, files[i]);
    if ('error' in upload) {
      await supabase.from('gallery_posts').delete().eq('id', inserted.id);
      await removeStoragePaths(uploadedPaths);
      return { error: upload.error };
    }
    uploadedPaths.push(upload.path);

    const { data: mediaRow, error: mediaError } = await supabase
      .from('gallery_post_media')
      .insert({
        post_id: inserted.id,
        sort_order: i,
        storage_path: upload.path,
        media_kind: upload.kind,
      })
      .select('*')
      .single();

    if (mediaError || !mediaRow) {
      await supabase.from('gallery_posts').delete().eq('id', inserted.id);
      await removeStoragePaths(uploadedPaths);
      return { error: mediaError?.message ?? 'Could not save media.' };
    }
    mediaRows.push(mediaRow);
  }

  return { post: mapPost(inserted, mediaRows) };
}

export async function updateGalleryPost(
  postId: string,
  input: GalleryPostInput,
): Promise<{ post: GalleryPost } | { error: string }> {
  const caption = input.caption.trim();
  if (!caption) return { error: 'Caption is required.' };
  if (caption.length > GALLERY_CAPTION_MAX) return { error: `Caption must be ${GALLERY_CAPTION_MAX} characters or fewer.` };

  const { data: existing, error: loadError } = await supabase
    .from('gallery_posts')
    .select('*, gallery_post_media(*)')
    .eq('id', postId)
    .maybeSingle();

  if (loadError || !existing) {
    return { error: loadError?.message ?? 'Post not found.' };
  }

  const limitError = await validateFeaturedLimits(input, existing, postId);
  if (limitError) return { error: limitError };

  const existingMedia = (existing.gallery_post_media ?? []) as MediaRowJoined[];
  const removeIds = new Set(input.removeMediaIds ?? []);
  const keptMedia = existingMedia
    .filter((m) => !removeIds.has(m.id))
    .sort((a, b) => a.sort_order - b.sort_order);

  const newFiles = input.newFiles ?? [];
  if (!keptMedia.length && !newFiles.length) {
    return { error: 'Keep at least one photo or video.' };
  }

  for (const file of newFiles) {
    const err = validateGalleryFile(file);
    if (err) return { error: err };
  }

  const featuredHome =
    input.tag === 'Studio' ? input.featuredInHomeStudio : false;
  const featuredAmenities =
    input.tag === 'Amenities' ? input.featuredInAmenities : false;

  const { error: updateError } = await supabase
    .from('gallery_posts')
    .update({
      caption,
      tag: input.tag,
      featured_in_gallery: input.featuredInGallery,
      featured_in_home_studio: featuredHome,
      featured_in_amenities: featuredAmenities,
      masonry_tall: input.masonryTall ?? existing.masonry_tall,
    })
    .eq('id', postId);

  if (updateError) {
    return { error: updateError.message };
  }

  const removed = existingMedia.filter((m) => removeIds.has(m.id));
  if (removed.length) {
    await supabase.from('gallery_post_media').delete().in('id', removed.map((m) => m.id));
    await removeStoragePaths(removed.map((m) => m.storage_path));
  }

  let sortOrder = 0;
  for (const row of keptMedia) {
    if (row.sort_order !== sortOrder) {
      await supabase.from('gallery_post_media').update({ sort_order: sortOrder }).eq('id', row.id);
      row.sort_order = sortOrder;
    }
    sortOrder += 1;
  }

  const finalMedia: MediaRowJoined[] = keptMedia.map((m) => ({ ...m }));

  for (const file of newFiles) {
    const upload = await uploadGalleryFile(postId, sortOrder, file);
    if ('error' in upload) return { error: upload.error };

    const { data: mediaRow, error: mediaError } = await supabase
      .from('gallery_post_media')
      .insert({
        post_id: postId,
        sort_order: sortOrder,
        storage_path: upload.path,
        media_kind: upload.kind,
      })
      .select('*')
      .single();

    if (mediaError || !mediaRow) {
      await removeStoragePaths([upload.path]);
      return { error: mediaError?.message ?? 'Could not save new media.' };
    }
    finalMedia.push(mediaRow);
    sortOrder += 1;
  }

  const { data: refreshed } = await supabase
    .from('gallery_posts')
    .select('*')
    .eq('id', postId)
    .single();

  return {
    post: mapPost(refreshed ?? existing, finalMedia.sort((a, b) => a.sort_order - b.sort_order)),
  };
}

export async function deleteGalleryPost(postId: string): Promise<{ error?: string }> {
  const { data: media } = await supabase
    .from('gallery_post_media')
    .select('storage_path')
    .eq('post_id', postId);

  const { error } = await supabase.from('gallery_posts').delete().eq('id', postId);
  if (error) return { error: error.message };

  await removeStoragePaths((media ?? []).map((m) => m.storage_path));
  return {};
}

export function formatGalleryDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
