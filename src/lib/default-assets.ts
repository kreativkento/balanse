import { supabase } from './supabase';

export const DEFAULT_ASSETS_BUCKET = 'default_assets';
export const DEFAULT_ASSET_LOGO_FOLDER = 'logo';
export const DEFAULT_ASSET_COVER_FOLDER = 'cover';
export const DEFAULT_ASSET_COLORS_FOLDER = 'colors';

export interface DefaultAssetImage {
  path: string;
  url: string;
}

export interface DefaultColorSwatch {
  name: string;
  hex: string;
  path: string;
}

/** Canonical palette seeded into default_assets/colors when missing (admin session). */
export const DEFAULT_COLOR_SWATCH_DEFINITIONS: ReadonlyArray<{ name: string; hex: string }> = [
  { name: 'Slate Gray', hex: '#64748B' },
  { name: 'Charcoal', hex: '#334155' },
  { name: 'Soft Red', hex: '#FCA5A5' },
  { name: 'Coral Pink', hex: '#FDA4AF' },
  { name: 'Warm Peach', hex: '#FDBA74' },
  { name: 'Soft Amber', hex: '#FDE047' },
  { name: 'Olive Lime', hex: '#BEF264' },
  { name: 'Mint Green', hex: '#86EFAC' },
  { name: 'Sage Green', hex: '#6EE7B7' },
  { name: 'Soft Teal', hex: '#5EEAD4' },
  { name: 'Sky Blue', hex: '#7DD3FC' },
  { name: 'Soft Blue', hex: '#93C5FD' },
  { name: 'Periwinkle', hex: '#A5B4FC' },
  { name: 'Lavender', hex: '#C4B5FD' },
  { name: 'Soft Plum', hex: '#D8B4FE' },
  { name: 'Rose Pink', hex: '#F472B6' },
];

function slugifyAssetName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function defaultAssetPublicUrl(path: string): string {
  const { data } = supabase.storage.from(DEFAULT_ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function isDefaultAssetPublicUrl(url: string): boolean {
  return url.includes(`/storage/v1/object/public/${DEFAULT_ASSETS_BUCKET}/`);
}

function listDefaultAssetImages(folder: string): Promise<DefaultAssetImage[]> {
  return supabase.storage
    .from(DEFAULT_ASSETS_BUCKET)
    .list(folder, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
    .then(({ data, error }) => {
      if (error) {
        console.error(`Failed to list default_assets/${folder}:`, error.message);
        return [];
      }
      return (data ?? [])
        .filter(
          (entry) =>
            entry.name
            && !entry.name.startsWith('.')
            && /\.(png|jpe?g|webp|gif|svg)$/i.test(entry.name),
        )
        .map((entry) => {
          const path = `${folder}/${entry.name}`;
          return { path, url: defaultAssetPublicUrl(path) };
        });
    });
}

export function listDefaultAssetLogoImages(): Promise<DefaultAssetImage[]> {
  return listDefaultAssetImages(DEFAULT_ASSET_LOGO_FOLDER);
}

export function listDefaultAssetCoverImages(): Promise<DefaultAssetImage[]> {
  return listDefaultAssetImages(DEFAULT_ASSET_COVER_FOLDER);
}

function parseColorSwatchJson(raw: unknown, path: string): DefaultColorSwatch | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const hexRaw = typeof record.hex === 'string' ? record.hex.trim() : '';
  if (!name || !/^#[0-9A-Fa-f]{6}$/.test(hexRaw)) return null;
  return { name, hex: hexRaw.toUpperCase(), path };
}

async function downloadColorSwatch(path: string): Promise<DefaultColorSwatch | null> {
  const { data, error } = await supabase.storage.from(DEFAULT_ASSETS_BUCKET).download(path);
  if (error || !data) {
    console.error(`Failed to download color swatch ${path}:`, error?.message);
    return null;
  }
  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as unknown;
    return parseColorSwatchJson(parsed, path);
  } catch {
    return null;
  }
}

async function seedMissingColorSwatches(existingPaths: Set<string>): Promise<void> {
  await Promise.all(
    DEFAULT_COLOR_SWATCH_DEFINITIONS.map(async (def) => {
      const fileName = `${slugifyAssetName(def.name)}.json`;
      const path = `${DEFAULT_ASSET_COLORS_FOLDER}/${fileName}`;
      if (existingPaths.has(fileName)) return;

      const body = JSON.stringify({ name: def.name, hex: def.hex.toUpperCase() });
      const { error } = await supabase.storage.from(DEFAULT_ASSETS_BUCKET).upload(path, body, {
        upsert: false,
        contentType: 'application/json',
        cacheControl: '31536000',
      });
      if (error && !/already exists|duplicate|resource already/i.test(error.message)) {
        console.error('Failed to seed default color swatch:', error.message);
      }
    }),
  );
}

/**
 * Lists calendar color suggestions from default_assets/colors/*.json.
 * Admins may auto-seed missing files on first load.
 */
export async function listDefaultColorSwatches(options?: {
  seedIfMissing?: boolean;
}): Promise<DefaultColorSwatch[]> {
  const { data, error } = await supabase.storage
    .from(DEFAULT_ASSETS_BUCKET)
    .list(DEFAULT_ASSET_COLORS_FOLDER, { limit: 100, sortBy: { column: 'name', order: 'asc' } });

  if (error) {
    console.error('Failed to list default_assets/colors:', error.message);
    return DEFAULT_COLOR_SWATCH_DEFINITIONS.map((def) => ({
      name: def.name,
      hex: def.hex.toUpperCase(),
      path: `${DEFAULT_ASSET_COLORS_FOLDER}/${slugifyAssetName(def.name)}.json`,
    }));
  }

  const jsonFiles = (data ?? []).filter(
    (entry) => entry.name && !entry.name.startsWith('.') && entry.name.endsWith('.json'),
  );

  if (options?.seedIfMissing && jsonFiles.length < DEFAULT_COLOR_SWATCH_DEFINITIONS.length) {
    const existingNames = new Set(jsonFiles.map((f) => f.name));
    await seedMissingColorSwatches(existingNames);
    return listDefaultColorSwatches({ seedIfMissing: false });
  }

  if (jsonFiles.length === 0) {
    return DEFAULT_COLOR_SWATCH_DEFINITIONS.map((def) => ({
      name: def.name,
      hex: def.hex.toUpperCase(),
      path: `${DEFAULT_ASSET_COLORS_FOLDER}/${slugifyAssetName(def.name)}.json`,
    }));
  }

  const swatches = await Promise.all(
    jsonFiles.map((file) => downloadColorSwatch(`${DEFAULT_ASSET_COLORS_FOLDER}/${file.name}`)),
  );

  return swatches
    .filter((item): item is DefaultColorSwatch => item !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeDisciplineColorHex(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(withHash)) return '';
  return withHash.toUpperCase();
}
