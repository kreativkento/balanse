import { supabase } from './supabase';

export const DISCIPLINES_IMAGES_BUCKET = 'disciplines_images';
export const DISCIPLINE_LOGO_FOLDER = 'logo';
export const DISCIPLINE_COVER_FOLDER = 'cover';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const LOGO_EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export interface DisciplineBucketImage {
  path: string;
  url: string;
}

export function disciplineImagePublicUrl(path: string): string {
  const { data } = supabase.storage.from(DISCIPLINES_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function isDisciplineBucketImageUrl(url: string): boolean {
  return url.includes(`/storage/v1/object/public/${DISCIPLINES_IMAGES_BUCKET}/`);
}

function logoExtension(file: File): string | null {
  const fromMime = LOGO_EXT_BY_MIME[file.type];
  if (fromMime) return fromMime;
  const nameExt = file.name.split('.').pop()?.toLowerCase();
  if (nameExt === 'jpeg') return 'jpg';
  if (nameExt && ['jpg', 'png', 'webp', 'gif'].includes(nameExt)) return nameExt;
  return null;
}

async function uploadDisciplineFolderImage(
  folder: string,
  file: File,
  label: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!file.type.startsWith('image/') && !logoExtension(file)) {
    return { ok: false, error: 'Please choose a JPG, PNG, WEBP, or GIF image.' };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: `${label} must be 5 MB or smaller.` };
  }
  const ext = logoExtension(file);
  if (!ext) {
    return { ok: false, error: 'Please choose a JPG, PNG, WEBP, or GIF image.' };
  }

  const base = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || folder;
  const path = `${folder}/${Date.now()}-${base}.${ext}`;
  const contentType = file.type.startsWith('image/')
    ? file.type
    : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const { error } = await supabase.storage.from(DISCIPLINES_IMAGES_BUCKET).upload(path, file, {
    upsert: false,
    contentType,
    cacheControl: '31536000',
  });

  if (error) {
    console.error(`Failed to upload discipline ${label.toLowerCase()}:`, error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, url: disciplineImagePublicUrl(path) };
}

export async function uploadDisciplineLogo(
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  return uploadDisciplineFolderImage(DISCIPLINE_LOGO_FOLDER, file, 'Logo');
}

export async function uploadDisciplineCover(
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  return uploadDisciplineFolderImage(DISCIPLINE_COVER_FOLDER, file, 'Cover');
}
