import { supabase } from './supabase';

export const DISCIPLINES_IMAGES_BUCKET = 'disciplines_images';
export const DISCIPLINE_SWATCH_FOLDER = 'swatches';
export const DISCIPLINE_LOGO_FOLDER = 'logo';
export const DISCIPLINE_COVER_FOLDER = 'cover';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const LOGO_EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const SWATCH_SIZE = 256;
const SWATCH_COLORS = [
  '#c49a3c',
  '#1E2A35',
  '#6B8E6B',
  '#B86A4A',
  '#9A7A8A',
  '#3A4A5A',
  '#C4A574',
  '#EDE8D8',
  '#8B6F5A',
  '#4A6B4A',
] as const;

export interface DisciplineBucketImage {
  path: string;
  url: string;
}

function swatchPath(index: number): string {
  return `${DISCIPLINE_SWATCH_FOLDER}/${String(index + 1).padStart(2, '0')}.png`;
}

export function disciplineImagePublicUrl(path: string): string {
  const { data } = supabase.storage.from(DISCIPLINES_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function isDisciplineBucketImageUrl(url: string): boolean {
  return url.includes(`/storage/v1/object/public/${DISCIPLINES_IMAGES_BUCKET}/`);
}

function solidSquareBlob(hex: string, size = SWATCH_SIZE): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.reject(new Error('Could not create a discipline swatch.'));
  }
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, size, size);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Could not create a discipline swatch.'));
      else resolve(blob);
    }, 'image/png');
  });
}

function listFolderImages(folder: string): Promise<DisciplineBucketImage[]> {
  return supabase.storage
    .from(DISCIPLINES_IMAGES_BUCKET)
    .list(folder, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
    .then(({ data, error }) => {
      if (error) {
        console.error(`Failed to list ${folder} images:`, error.message);
        return [];
      }
      return (data ?? [])
        .filter((entry) => entry.name && !entry.name.startsWith('.') && /\.(png|jpe?g|webp|gif)$/i.test(entry.name))
        .map((entry) => {
          const path = `${folder}/${entry.name}`;
          return { path, url: disciplineImagePublicUrl(path) };
        });
    });
}

export async function listDisciplineBucketImages(): Promise<DisciplineBucketImage[]> {
  return listFolderImages(DISCIPLINE_SWATCH_FOLDER);
}

export async function listDisciplineLogoImages(): Promise<DisciplineBucketImage[]> {
  return listFolderImages(DISCIPLINE_LOGO_FOLDER);
}

export async function listDisciplineCoverImages(): Promise<DisciplineBucketImage[]> {
  return listFolderImages(DISCIPLINE_COVER_FOLDER);
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

export async function ensureDisciplineBucketSwatches(): Promise<DisciplineBucketImage[]> {
  const existing = await listDisciplineBucketImages();
  const existingNames = new Set(existing.map((item) => item.path.split('/').pop()));

  const missingIndexes = SWATCH_COLORS
    .map((_, index) => index)
    .filter((index) => !existingNames.has(`${String(index + 1).padStart(2, '0')}.png`));

  if (missingIndexes.length > 0) {
    await Promise.all(
      missingIndexes.map(async (index) => {
        const blob = await solidSquareBlob(SWATCH_COLORS[index]);
        const path = swatchPath(index);
        const { error } = await supabase.storage
          .from(DISCIPLINES_IMAGES_BUCKET)
          .upload(path, blob, {
            upsert: false,
            contentType: 'image/png',
            cacheControl: '31536000',
          });
        if (error && !/already exists|duplicate|resource already/i.test(error.message)) {
          console.error('Failed to seed discipline swatch:', error.message);
        }
      }),
    );
  }

  return listDisciplineBucketImages();
}
