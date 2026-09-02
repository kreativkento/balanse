import { supabase } from './supabase';

export const PROFILE_IMAGES_BUCKET = 'profile_images';
export type ProfileImageKind = 'photo' | 'cover';

const MAX_BYTES = 5 * 1024 * 1024;
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function extensionForFile(file: File): string | null {
  const fromMime = EXT_BY_MIME[file.type];
  if (fromMime) return fromMime;

  const nameExt = file.name.split('.').pop()?.toLowerCase();
  if (nameExt === 'jpeg') return 'jpg';
  if (nameExt && ['jpg', 'png', 'webp', 'gif'].includes(nameExt)) return nameExt;
  return null;
}

export function profileImageObjectPath(authUserId: string, kind: ProfileImageKind): string {
  return `${authUserId}/${kind}`;
}

export function profileImagePublicUrl(authUserId: string, kind: ProfileImageKind, cacheBust = false): string {
  const { data } = supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .getPublicUrl(profileImageObjectPath(authUserId, kind));
  return cacheBust ? `${data.publicUrl}?t=${Date.now()}` : data.publicUrl;
}

export async function uploadProfileImage(
  kind: ProfileImageKind,
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!file.type.startsWith('image/') && !extensionForFile(file)) {
    return { ok: false, error: 'Please choose a JPG, PNG, WEBP, or GIF image.' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'Image must be 5 MB or smaller.' };
  }

  if (!extensionForFile(file)) {
    return { ok: false, error: 'Please choose a JPG, PNG, WEBP, or GIF image.' };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: 'You must be signed in to upload an image.' };
  }

  const objectPath = profileImageObjectPath(user.id, kind);
  const ext = extensionForFile(file);
  const contentType = file.type.startsWith('image/')
    ? file.type
    : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(objectPath, file, {
      upsert: true,
      contentType,
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Failed to upload profile image:', uploadError.message);
    return { ok: false, error: uploadError.message };
  }

  const { data: listed } = await supabase.storage.from(PROFILE_IMAGES_BUCKET).list(user.id);
  const stale = (listed ?? [])
    .map((entry) => entry.name)
    .filter((name) => name !== kind && name.startsWith(`${kind}.`))
    .map((name) => `${user.id}/${name}`);

  if (stale.length > 0) {
    await supabase.storage.from(PROFILE_IMAGES_BUCKET).remove(stale);
  }

  const url = profileImagePublicUrl(user.id, kind, true);
  if (kind === 'photo') {
    const existing = await loadProfileImageUrlsForUser(user.id);
    if (!existing.coverImage) {
      const copied = await copyOwnPhotoToCover(user.id);
      if (copied) {
        await persistOwnImageUrls(user.id, {
          photo: url,
          coverImage: profileImagePublicUrl(user.id, 'cover', true),
        });
      }
    } else {
      await persistOwnImageUrls(user.id, { photo: url });
    }
  } else {
    await persistOwnImageUrls(user.id, { coverImage: url });
  }

  return { ok: true, url };
}

export async function loadProfileImageUrlsForUser(
  authUserId: string,
): Promise<{ photo: string; coverImage: string }> {
  if (!authUserId) return { photo: '', coverImage: '' };

  const { data } = await supabase.storage.from(PROFILE_IMAGES_BUCKET).list(authUserId);
  const names = (data ?? []).map((entry) => entry.name);
  const hasPhoto = names.some((name) => name === 'photo' || name.startsWith('photo.'));
  const hasCover = names.some((name) => name === 'cover' || name.startsWith('cover.'));

  return {
    photo: hasPhoto ? profileImagePublicUrl(authUserId, 'photo', true) : '',
    coverImage: hasCover ? profileImagePublicUrl(authUserId, 'cover', true) : '',
  };
}

async function copyOwnPhotoToCover(authUserId: string): Promise<boolean> {
  const photoPath = profileImageObjectPath(authUserId, 'photo');
  const coverPath = profileImageObjectPath(authUserId, 'cover');

  let blob: Blob | null = null;
  const { data: downloaded, error: downloadError } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .download(photoPath);
  if (!downloadError && downloaded) {
    blob = downloaded;
  } else {
    const publicRes = await fetch(profileImagePublicUrl(authUserId, 'photo'));
    if (publicRes.ok) blob = await publicRes.blob();
  }
  if (!blob) return false;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(coverPath, blob, {
      upsert: true,
      contentType: blob.type || 'image/png',
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Failed to seed cover image from photo:', uploadError.message);
    return false;
  }
  return true;
}

async function persistOwnImageUrls(
  authUserId: string,
  images: { photo?: string; coverImage?: string },
): Promise<void> {
  const { data: account } = await supabase
    .from('accounts')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (!account) return;

  const update: Record<string, unknown> = {};
  if (images.photo) update.photo = images.photo;
  if (images.coverImage) update.cover_image = images.coverImage;
  if (Object.keys(update).length === 0) return;

  const table = account.role === 'user' ? 'profiles_client' : 'profiles_staff';
  const { error } = await supabase.from(table).update(update).eq('account_id', account.id);
  if (error && !/column|schema cache|does not exist/i.test(error.message)) {
    console.error('Failed to persist profile image URLs:', error.message);
  }
}

export async function loadOwnProfileImageUrls(): Promise<{ photo: string; coverImage: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { photo: '', coverImage: '' };

  let urls = await loadProfileImageUrlsForUser(user.id);
  if (urls.photo && !urls.coverImage) {
    const copied = await copyOwnPhotoToCover(user.id);
    if (copied) {
      urls = await loadProfileImageUrlsForUser(user.id);
      await persistOwnImageUrls(user.id, urls);
    }
  }
  return urls;
}

export function mergeProfileImageUrls<T extends { photo?: string; coverImage?: string }>(
  row: T,
  bucket: { photo: string; coverImage: string },
): T {
  return {
    ...row,
    photo: row.photo || bucket.photo,
    coverImage: row.coverImage || bucket.coverImage,
  };
}
